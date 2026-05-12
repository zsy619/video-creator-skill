#!/usr/bin/env node
/**
 * video-quality-gate.js
 *
 * 视频创作一键质量门禁 — 在关键节点验证所有输出
 *
 * 用法:
 *   node video-quality-gate.js <project-dir> [node-name]
 *
 * node-name: audio|subtitle|render|final|cover|all (默认: all)
 *
 * 退出码:
 *   0 = 所有检查通过
 *   1 = 至少一项检查失败
 *
 * 示例:
 *   node video-quality-gate.js ~/VideoProjects/my-video audio
 *   node video-quality-gate.js ~/VideoProjects/my-video all
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = path.resolve(process.argv[2] || '.');
const NODE_NAME = process.argv[3] || 'all';

// ANSI颜色
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let exitCode = 0;

function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function section(name) {
  console.log(`\n${BLUE}━━━ ${name} ━━━${RESET}`);
}

function pass(msg) {
  log(`  ✅ ${msg}`, GREEN);
}

function fail(msg) {
  log(`  ❌ ${msg}`, RED);
  exitCode = 1;
}

function warn(msg) {
  log(`  ⚠️  ${msg}`, YELLOW);
}

/** 执行命令，返回 {stdout, stderr, status} */
function run(cmd, opts = {}) {
  try {
    const stdout = execSync(cmd, {
      cwd: PROJECT_DIR,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...opts
    });
    return { stdout: stdout || '', stderr: '', status: 0 };
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || '', status: e.status || 1 };
  }
}

/** 用 astats 检查音频是否有效（非全静音） */
function checkAudioNotSilent(filePath, label) {
  const r = run(`ffmpeg -i "${filePath}" -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - 2>&1 | grep "RMS_level" | grep -v "\\-inf" | wc -l`);
  const count = parseInt(r.stdout.trim() || '0');
  if (count > 0) {
    pass(`${label}: 音频有效（${count}个有效样本）`);
    return true;
  } else {
    fail(`${label}: 音频无效（全静音）`);
    return false;
  }
}

/** 检查文件存在 */
function checkFile(filePath, label) {
  if (fs.existsSync(filePath)) {
    pass(`${label}: ${path.basename(filePath)} 存在`);
    return true;
  } else {
    fail(`${label}: ${path.basename(filePath)} 不存在`);
    return false;
  }
}

/** 查找视频组件文件（支持多种命名） */
function findTsxFile(vpDir) {
  const candidates = ['Video.tsx', 'VerticalVideo.tsx', 'MainVideo.tsx', 'App.tsx'];
  for (const name of candidates) {
    const p = path.join(vpDir, 'src', name);
    if (fs.existsSync(p)) return p;
  }
  // 搜索 src/ 目录下第一个 .tsx 文件
  const srcDir = path.join(vpDir, 'src');
  if (fs.existsSync(srcDir)) {
    for (const f of fs.readdirSync(srcDir)) {
      if (/\.tsx$/.test(f)) return path.join(srcDir, f);
    }
  }
  return null;
}

/** 获取音频时长和码率（一次 ffprobe 获取两个值） */
function getAudioMeta(filePath) {
  try {
    const r = execSync(
      `ffprobe -v error -show_entries format=duration:stream=bit_rate -of csv=p=0 \"${filePath}\" 2>/dev/null`,
      { encoding: 'utf8', timeout: 10000 }
    );
    const lines = r.stdout.trim().split('\n').filter(l => l.trim());
    // format行: duration
    // stream行: bit_rate (音频)
    const duration = parseFloat(lines.find(l => !l.includes(',')) || '0') || null;
    // 找 bit_rate 行（有逗号的，stream行）
    const bitrateLine = lines.find(l => l.includes(','));
    const bitrate = bitrateLine ? parseInt(bitrateLine.split(',')[0] || '0') || 0 : 0;
    return { duration, bitrate };
  } catch (e) {
    return { duration: null, bitrate: 0 };
  }
}

/** 检查字幕文件 ASS 格式 */
function checkASSFormat(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`ASS字幕: 文件不存在`);
    return false;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  let ok = true;

  // 检查 PlayRes
  if (!content.includes('PlayResX: 1080') || !content.includes('PlayResY: 1920')) {
    fail('ASS: 缺少 PlayResX=1080 / PlayResY=1920');
    ok = false;
  } else {
    pass('ASS: PlayResX=1080, PlayResY=1920');
  }

  // 检查 Fontsize=72
  if (!content.includes('Style: Default,PingFang SC,72,')) {
    fail('ASS: Fontsize 不是 72');
    ok = false;
  } else {
    pass('ASS: Fontsize=72');
  }

  // 检查 Outline=2（Style行格式: Name,Fontname,Fontsize,...,BorderStyle,Outline,Shadow,...）
  // Outline在BorderStyle之后，匹配 "1,2,0,2" 中的 2
  const outlineMatch = content.match(/Style: Default,[^,]+,\d+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,\d+,(\d+),/);
  if (outlineMatch) {
    const outlineVal = outlineMatch[1];
    if (outlineVal === '2') {
      pass('ASS: Outline=2');
    } else {
      fail('ASS: Outline=' + outlineVal + '（应为2）');
      ok = false;
    }
  } else {
    warn('ASS: 无法解析Outline值');
  }

  // 检查 Format 10字段
  if (content.includes('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text')) {
    pass('ASS: Format 10字段正确');
  } else {
    fail('ASS: Format 字段数不正确（应为10字段）');
    ok = false;
  }

  // 检查 Dialogue 行是10字段
  const dialogueLines = content.split('\n').filter(l => l.startsWith('Dialogue:'));
  if (dialogueLines.length > 0) {
    const parts = dialogueLines[0].split(',');
    // Dialogue: 0,start,end,Default,,0,0,50,,text → 10个逗号分隔 = 11部分，第10部分是text
    // Layer(0), Start, End, Style(Default), Name(), MarginL(0), MarginR(0), MarginV(50), Effect(), Text
    // 格式: Dialogue: 0,{start},{end},Default,{name},{ml},{mr},{mv},{effect},{text}
    // 共10字段: Layer=0, Start, End, Style=Default, Name=空, MarginL=0, MarginR=0, MarginV=50, Effect=空, Text
    const commaCount = dialogueLines[0].split(',').length - 1;
    if (commaCount === 9) {
      pass(`ASS: Dialogue 10字段正确（${dialogueLines.length}条）`);
    } else {
      fail(`ASS: Dialogue 字段数=${commaCount+1}（应为10）`);
      ok = false;
    }
  }

  // 检查换行符不是 \\N
  if (dialogueLines.some(l => l.includes('\\\\N'))) {
    fail('ASS: 包含 \\\\N（应为 \\N）');
    ok = false;
  } else {
    pass('ASS: 换行符 \\N 正确');
  }

  return ok;
}

// ─────────────────────────────────────────────
// 节点 A: audio — 音频后处理完成检查
// ─────────────────────────────────────────────
function checkAudio() {
  section('节点 A: 音频后处理检查');

  const audioFile = path.join(PROJECT_DIR, 'audio', 'neural_1_2x.m4a');
  checkFile(audioFile, '音频文件');

  if (!fs.existsSync(audioFile)) return;

  const meta = getAudioMeta(audioFile);
  const duration = meta.duration;
  const bitrate = meta.bitrate;

  if (duration !== null && duration > 0) {
    pass(`音频时长: ${duration.toFixed(2)}s`);
    if (duration < 30) warn('音频时长偏短（<30s）');
    if (duration > 120) warn('音频时长偏长（>120s）');

    // ⚠️ 5% 偏差阈值检查（atempo+裁剪反模式门禁）
    const configFile = path.join(PROJECT_DIR, 'video-project', 'video-config.json');
    const durationFile = path.join(PROJECT_DIR, 'video-project', 'duration.txt');
    let targetDuration = null;
    if (fs.existsSync(configFile)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        targetDuration = cfg.duration || cfg.totalFrames
          ? (cfg.duration || cfg.totalFrames / 60)
          : null;
      } catch (e) { /* ignore */ }
    } else if (fs.existsSync(durationFile)) {
      targetDuration = parseFloat(fs.readFileSync(durationFile, 'utf8').trim()) || null;
    }

    if (targetDuration && targetDuration > 0) {
      const pct = Math.abs(duration - targetDuration) / targetDuration * 100;
      if (pct > 5) {
        fail(`音频时长偏差 ${pct.toFixed(1)}%（目标 ${targetDuration.toFixed(1)}s，实际 ${duration.toFixed(1)}s，可能存在 atempo+裁剪反模式）`);
      } else {
        pass(`音频时长偏差 ${pct.toFixed(1)}%（≤5%，正常）`);
      }
    }
  } else {
    fail('音频时长无效');
  }

  if (bitrate >= 128000) {
    pass(`音频码率: ${(bitrate / 1000).toFixed(0)}kbps`);
  } else {
    fail(`音频码率过低: ${(bitrate / 1000).toFixed(0)}kbps（应≥128k）`);
  }

  checkAudioNotSilent(audioFile, '音频有效性');

  // 检查 full_narration.txt 是否存在（提示文本来源）
  const txtFile = path.join(PROJECT_DIR, 'audio', 'full_narration.txt');
  if (fs.existsSync(txtFile)) {
    const charCount = fs.readFileSync(txtFile, 'utf8').length;
    pass(`配音文本: ${charCount}字符`);
    // 粗略检查：1.2x语速下约12字/秒
    const estimatedDuration = charCount / 12;
    if (duration && Math.abs(estimatedDuration - duration) > 20) {
      warn(`文本长度(${charCount}字)与音频时长(${duration.toFixed(1)}s)可能不匹配`);
    }
  }
}

// ─────────────────────────────────────────────
// 节点 B: subtitle — 字幕生成检查
// ─────────────────────────────────────────────
function checkSubtitle() {
  section('节点 B: 字幕检查');

  const assFile = path.join(PROJECT_DIR, 'audio', 'subtitles.ass');
  checkASSFormat(assFile);

  if (!fs.existsSync(assFile)) return;

  // 字幕时长与音频时长偏差
  const assContent = fs.readFileSync(assFile, 'utf8');
  const dialogueLines = assContent.split('\n').filter(l => l.startsWith('Dialogue:'));
  if (dialogueLines.length > 0) {
    const lastDialogue = dialogueLines[dialogueLines.length - 1];
    const match = lastDialogue.match(/Dialogue: 0,([^,]+),([^,]+),/);
    if (match) {
      // 提取最后一个 end 时间
      const lastEnd = match[2];
      pass(`字幕最后时间戳: ${lastEnd}`);
    }
  }

  const audioFile = path.join(PROJECT_DIR, 'audio', 'neural_1_2x.m4a');
  const audioDur = getAudioMeta(audioFile).duration;
  if (audioDur) {
    pass(`参考音频时长: ${audioDur.toFixed(2)}s`);
  }
}

// ─────────────────────────────────────────────
// 节点 C: render — Remotion 渲染前置检查 / ffmpeg PIL兜底帧序列检查
// ─────────────────────────────────────────────
function checkRender() {
  section('节点 C: 渲染前置检查');

  const vpDir = path.join(PROJECT_DIR, 'video-project');
  const framesDir = path.join(vpDir, 'frames');
  const tsxFile = findTsxFile(vpDir);

  // 判断渲染路径：frames/ 目录存在 → ffmpeg PIL兜底路径
  // Video.tsx 存在 → Remotion 标准路径
  const useFfmpegPIL = fs.existsSync(framesDir) && fs.readdirSync(framesDir).filter(f => f.endsWith('.png')).length > 0;
  const useRemotion = tsxFile !== null;

  if (useFfmpegPIL) {
    // ══ ffmpeg PIL 兜底路径：检查帧序列 ═══════════════════════════════
    pass('渲染路径: ffmpeg PIL 兜底（帧序列模式）');

    // C7: 帧数验证
    const frameFiles = fs.readdirSync(framesDir).filter(f => f.endsWith('.png')).sort();
    const frameCount = frameFiles.length;

    // 读取目标帧数（从 audio duration 或 config）
    let targetFrames = null;
    const audioFile = path.join(PROJECT_DIR, 'audio', 'neural_1_2x.m4a');
    const configFile = path.join(vpDir, 'video-config.json');
    if (fs.existsSync(audioFile)) {
      try {
        const { duration: audioDur } = getAudioMeta(audioFile);
        if (audioDur) {
          targetFrames = Math.ceil(audioDur * 60);
          pass(`目标帧数: ${targetFrames} (@60fps, 音频${audioDur.toFixed(2)}s)`);
        }
      } catch (e) {
        warn('无法获取音频时长');
      }
    }

    if (targetFrames !== null && frameCount !== targetFrames) {
      fail(`帧数不匹配: actual=${frameCount}, expected=${targetFrames}`);
    } else if (frameCount > 0) {
      pass(`帧数: ${frameCount}`);
    } else {
      fail(`frames/ 目录为空`);
    }

    // C8: 帧编号连续性
    if (frameCount > 0) {
      const firstFrame = frameFiles[0];
      const lastFrame = frameFiles[frameFiles.length - 1];
      const firstNum = parseInt(firstFrame.match(/frame_(\d+)\.png/)?.[1] || '-1');
      const lastNum = parseInt(lastFrame.match(/frame_(\d+)\.png/)?.[1] || '-1');
      const expectedLast = (targetFrames !== null ? targetFrames : frameCount) - 1;

      if (firstNum === 0 && lastNum === expectedLast) {
        pass(`帧编号连续: frame_0000.png - frame_${String(expectedLast).padStart(4, '0')}.png`);
      } else {
        fail(`帧编号不连续: first=${firstNum}, last=${lastNum}, expected_last=${expectedLast}`);
      }

      // 额外验证：中间是否有跳号
      let hasGap = false;
      for (let i = 1; i < frameFiles.length; i++) {
        const prev = parseInt(frameFiles[i-1].match(/frame_(\d+)\.png/)?.[1] || '0');
        const curr = parseInt(frameFiles[i].match(/frame_(\d+)\.png/)?.[1] || '0');
        if (curr !== prev + 1) {
          hasGap = true;
          fail(`帧跳号: frame_${String(prev).padStart(4,'0')}.png → frame_${String(curr).padStart(4,'0')}.png`);
          break;
        }
      }
      if (!hasGap) {
        pass('帧编号无跳号');
      }
    }

    // C9: gen_frames_template.py 存在性
    const SKILL_DIR = path.resolve(__dirname, '..');
    const genFramesScript = path.join(SKILL_DIR, 'scripts', 'gen_frames_template.py');
    if (fs.existsSync(genFramesScript)) {
      pass('gen_frames_template.py 存在');
    } else {
      fail('gen_frames_template.py 不存在');
    }

    // C10: 黑屏检测（抽样验证帧内容非全黑）
    try {
      const sampleIndices = [];
      if (frameCount >= 10) {
        sampleIndices.push(0, Math.floor(frameCount / 2), frameCount - 1);
        for (let p = 10; p <= 90; p += 10) {
          sampleIndices.push(Math.floor(frameCount * p / 100));
        }
      } else {
        for (let i = 0; i < frameCount; i++) sampleIndices.push(i);
      }

      const uniqueSamples = [...new Set(sampleIndices)].sort((a, b) => a - b);
      let blackFrames = 0;
      let allFramesBrightness = [];

      // TODO-6 优化：单次批量 Python 调用替代逐帧 execSync 循环
      // 优化前：12次进程创建（每帧一次）；优化后：1次进程创建
      const escapedFrames = uniqueSamples.map(idx => {
        const fp = path.join(framesDir, frameFiles[idx]);
        return fp.replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
      });
      const escapedFramesJson = JSON.stringify(escapedFrames);

      let batchResult = '';
      try {
        batchResult = execSync(
          `python3 -c "
import json, sys
from PIL import Image
import numpy as np

frames = json.loads('${escapedFramesJson}')
results = []
for fp in frames:
    try:
        img = Image.open(fp).convert('RGB')
        arr = np.array(img).astype(float)
        mean_brightness = arr.mean()
        is_black = 1 if mean_brightness < 5.0 else 0
        results.append(f'{mean_brightness:.2f},{is_black}')
    except Exception as e:
        results.append(f'ERR,{str(e)[:30]}')
print('\\n'.join(results))
" 2>/dev/null`,
          { encoding: 'utf8', timeout: 30000 }
        ).trim();
      } catch (e) {
        warn('黑屏检测跳过: ' + (e.message || 'unknown'));
      }

      const lines = batchResult.split('\n').filter(l => l.trim());
      for (let i = 0; i < uniqueSamples.length && i < lines.length; i++) {
        const parts = lines[i].split(',');
        const brightness = parseFloat(parts[0]) || 0;
        const isBlack = parseInt(parts[1] || '0');
        allFramesBrightness.push({ idx: uniqueSamples[i], brightness });
        if (isBlack) blackFrames++;
      }

      if (allFramesBrightness[0] && allFramesBrightness[0].brightness < 5.0) {
        fail(`首帧黑屏! brightness=${allFramesBrightness[0].brightness.toFixed(2)}`);
      } else if (blackFrames > uniqueSamples.length * 0.3) {
        warn(`近${Math.round((blackFrames/uniqueSamples.length)*100)}%抽样帧黑屏 (brightness<5)`);
      } else {
        const avgBrightness = allFramesBrightness.reduce((s, f) => s + f.brightness, 0) / allFramesBrightness.length;
        pass(`帧内容亮度正常: 平均=${avgBrightness.toFixed(1)}/255, 抽样${uniqueSamples.length}帧`);
      }
    } catch (e) {
      warn(`黑屏检测跳过: ${e.message}`);
    }

    return;
  }

  // ══ Remotion 标准路径 ═══════════════════════════════════════════════

  // C1: package.json 包名验证
  const pkgFile = path.join(vpDir, 'package.json');
  if (fs.existsSync(pkgFile)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      // 检查是否使用正确的 remotion 包（而非 @remotion/core）
      if (deps['@remotion/core']) {
        fail('package.json 引用 @remotion/core（不存在），应使用 remotion 包');
      } else if (deps['remotion']) {
        pass(`package.json: remotion@${deps['remotion']}`);

        // 额外验证：如果安装了 remotion，确保导入语句正确
        if (tsxFile) {
          const tsxContent = fs.readFileSync(tsxFile, 'utf8');
          if (tsxContent.includes("from '@remotion/core'")) {
            fail('Video.tsx 使用 @remotion/core import（不存在）');
          } else if (tsxContent.includes("from 'remotion'")) {
            pass('Video.tsx 使用正确导入: from \'remotion\'');
          }
        }
      } else {
        warn('package.json 未找到 remotion 依赖');
      }
    } catch (e) {
      warn('package.json 解析失败');
    }
  } else {
    warn('package.json 不存在（跳过包名检查）');
  }

  if (!tsxFile) {
    warn('未找到 .tsx 视频组件文件（跳过代码级检查）');
    return;
  }
  pass(`找到视频组件: ${path.relative(vpDir, tsxFile)}`);

  const content = fs.readFileSync(tsxFile, 'utf8');

  // C2: <Text> 组件检查（Remotion 4.x 不存在，会导致 React Error #130）
  if (/<Text[\s>]/.test(content) || /<\/\s*Text\s*>/.test(content)) {
    fail('<Text> 组件在 Remotion 4.x 中不存在，会导致 React Error #130');
    warn('自动修复: sed -i "" "s/<Text\\b/<div/g; s/<\\/Text>/<\\/div>/g" src/Video.tsx');
    warn('或运行: node scripts/fix-text-component.js <project-dir>');
  } else {
    pass('无 <Text> 组件（Remotion 4.x 兼容性通过）');
  }

  // C3: 检查 node_modules/remotion 是否存在
  const nodeModulesRemotion = path.join(vpDir, 'node_modules', 'remotion');
  if (fs.existsSync(nodeModulesRemotion)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(nodeModulesRemotion, 'package.json'), 'utf8'));
      pass(`node_modules/remotion@${pkg.version} 已安装`);
    } catch {
      warn('node_modules/remotion 版本未知');
    }
  } else {
    warn('node_modules/remotion 不存在（Remotion路径将不可用）');
  }

  // C4: useCurrentFrame（动画存在）
  if (content.includes('useCurrentFrame')) {
    pass('使用 useCurrentFrame 动画');
  } else {
    warn('未找到 useCurrentFrame，可能无动画');
  }

  // C5: Sequence 内无全局帧误用
  const globalFramePattern = /interpolate\s*\(\s*(?:frame|\w+)\s*,\s*\[\s*FRAMES\.\w+\.start\s*\+/g;
  const badLines = [];
  const inSequence = [false];

  content.split('\n').forEach((line, idx) => {
    if (line.includes('<Sequence')) inSequence[0] = true;
    if (line.includes('</Sequence>')) inSequence[0] = false;
    if (inSequence[0] && line.match(globalFramePattern)) {
      badLines.push(`行${idx + 1}: ${line.trim()}`);
    }
  });

  if (badLines.length > 0) {
    fail(`Sequence内全局帧误用（${badLines.length}处）:`);
    badLines.slice(0, 3).forEach(l => fail(`  ${l}`));
  } else {
    pass('Sequence 内无全局帧误用');
  }

  // C6: AbsoluteFill
  if (content.includes('AbsoluteFill')) {
    pass('使用 AbsoluteFill');
  } else {
    warn('未找到 AbsoluteFill');
  }
}

// ─────────────────────────────────────────────
// 节点 D: final — 最终视频检查
// ─────────────────────────────────────────────
function checkFinal() {
  section('节点 D: 最终视频检查');

  const videoFile = path.join(PROJECT_DIR, 'video-project', 'out', 'final-video.mp4');
  const altFile = path.join(PROJECT_DIR, 'video-project', 'out', 'final_with_subs.mp4');
  const finalFile = fs.existsSync(videoFile) ? videoFile : (fs.existsSync(altFile) ? altFile : null);

  if (finalFile) {
    pass(`最终视频: ${path.basename(finalFile)}`);
    const duration = getAudioMeta(finalFile).duration;
    if (duration) {
      pass(`视频时长: ${duration.toFixed(2)}s`);
    }
  } else {
    fail('最终视频文件不存在');
    return;
  }

  // 音频有效性（最终验证）
  if (finalFile) {
    const audioOk = checkAudioNotSilent(finalFile, '最终视频音频');
    if (!audioOk) {
      fail('最终视频音频无效，请检查混流步骤');
    }
  }
}

// ─────────────────────────────────────────────
// 节点 E: cover — 封面图检查（尺寸+文件大小）
// ─────────────────────────────────────────────
function checkCover() {
  section('节点 E: 封面图检查');

  // 三种封面及期望尺寸
  const covers = [
    { file: 'cover.png',       w: 1080, h: 1920, label: '竖屏封面 (1080×1920)' },
    { file: 'cover-wechat.png', w: 900,  h: 383,  label: '公众号封面 (900×383)'  },
    { file: 'cover-xhs.png',    w: 1440, h: 2560, label: '小红书封面 (1440×2560)' },
  ];

  let allPassed = true;

  covers.forEach(({ file, w, h, label }) => {
    const filePath = path.join(PROJECT_DIR, 'docs', 'assets', file);
    const altPath  = path.join(PROJECT_DIR, 'assets', file);

    // 1. 文件存在
    if (!fs.existsSync(filePath) && !fs.existsSync(altPath)) {
      fail(`${label}: ${file} 不存在`);
      allPassed = false;
      return;
    }

    const resolvedPath = fs.existsSync(filePath) ? filePath : altPath;
    pass(`${label}: ${path.basename(resolvedPath)} 存在`);

    // 2. 尺寸检查（用 ffprobe 读取，不依赖 PIL）
    try {
      const sizeOut = execSync(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${resolvedPath}" 2>/dev/null`,
        { encoding: 'utf8' }
      ).trim();
      const [vw, vh] = sizeOut.split('x').map(Number);
      if (vw === w && vh === h) {
        pass(`${label}: 尺寸正确 (${vw}×${vh})`);
      } else {
        fail(`${label}: 尺寸错误 (${vw}×${vh}，期望 ${w}×${h})`);
        allPassed = false;
      }
    } catch {
      warn(`${label}: 无法读取尺寸（ffprobe 失败）`);
    }

    // 3. 文件大小 > 20KB
    const sizeKB = fs.statSync(resolvedPath).size / 1024;
    if (sizeKB > 20) {
      pass(`${label}: 文件大小 ${sizeKB.toFixed(0)}KB (>20KB)`);
    } else {
      fail(`${label}: 文件过小 ${sizeKB.toFixed(0)}KB (<20KB)`);
      allPassed = false;
    }
  });

  return allPassed;
}

// ─────────────────────────────────────────────
// 节点 F: cover-font — 封面字体可用性检查
// ─────────────────────────────────────────────
function checkCoverFont() {
  section('节点 F: 封面字体检查');

  const SKILL_DIR = path.resolve(__dirname, '..');
  const scriptPath = path.join(SKILL_DIR, 'scripts', 'generate_cover.py');

  // 检测字体文件是否存在
  let fontPath = null;
  try {
    const out = execSync(
      `python3 - <<'PYEOF'\nimport subprocess, os
candidates = ['PingFang.ttc', 'PingFang SC', 'Hiragino Sans GB', 'HiraginoSansGB']
for name in candidates:
    result = subprocess.run(
        ['find', '/System/Library/Fonts', '-iname', f'*{name}*', '-type', 'f'],
        capture_output=True, text=True, timeout=5
    )
    for line in result.stdout.strip().split('\\n'):
        line = line.strip()
        if line and os.path.exists(line):
            print(line)
            break
PYEOF`,
      { encoding: 'utf8', timeout: 15000 }
    ).trim();
    if (out) {
      fontPath = out.split('\n')[0].trim();
    }
  } catch (e) {
    // ignore
  }

  if (!fontPath) {
    fail('字体探测: 未找到任何中文字体（PingFang/Hiragino）');
    return;
  }
  pass(`字体: ${path.basename(fontPath)}`);

  // CJK 渲染检测（textbbox 宽高比法，批量单次调用替代逐帧循环）
  // 优化前：3次 execSync；优化后：1次 execSync
  const testTexts = ['LlamaIndex 入门', '目标驱动协作', 'GitHub Stars'];
  const testTextsJson = JSON.stringify(testTexts);
  const fontPathEscaped = fontPath.replace(/'/g, "'\\''");
  let cjkOk = true;

  try {
    const batchResult = execSync(
      `python3 - <<'PYEOF'
from PIL import Image, ImageDraw, ImageFont
import json, sys

test_texts = json.loads('${testTextsJson}')
font = ImageFont.truetype('${fontPathEscaped}', 72)
dummy_img = Image.new('RGB', (1, 1))
dummy_draw = ImageDraw.Draw(dummy_img)

results = []
for text in test_texts:
    try:
        bbox = dummy_draw.textbbox((0, 0), text, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        if w <= 0 or h <= 0:
            results.append('EMPTY')
        else:
            aspect = w / h
            results.append('OK' if aspect > 1.1 else 'BLOCK')
    except Exception as e:
        results.append('ERR:' + str(e)[:30])

print('\\n'.join(results))
PYEOF`,
      { encoding: 'utf8', timeout: 10000 }
    ).trim();

    const lines = batchResult.split('\n').filter(l => l.trim());
    for (let i = 0; i < testTexts.length; i++) {
      const status = (lines[i] || '').trim();
      if (status === 'OK') {
        pass(`CJK渲染[${testTexts[i].slice(0, 6)}]: 正常`);
      } else {
        fail(`CJK渲染[${testTexts[i].slice(0, 6)}]: ${status === 'BLOCK' ? '方块/乱码' : status}`);
        cjkOk = false;
      }
    }
  } catch (e) {
    fail('封面字体: CJK渲染检测失败');
    cjkOk = false;
  }

  if (!cjkOk) {
    fail('封面字体: 存在 CJK 渲染问题，请修复 generate_cover.py 中的字体路径');
  }
}

// ─────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────
console.log(`\n${BLUE}═══════════════════════════════════════════${RESET}`);
log(`  video-quality-gate  ─  视频创作一键质量门禁`, BLUE);
log(`  项目: ${PROJECT_DIR}`, BLUE);
log(`  节点: ${NODE_NAME === 'all' ? '全部' : NODE_NAME.toUpperCase()}`, BLUE);
console.log(`${BLUE}═══════════════════════════════════════════${RESET}`);

if (NODE_NAME === 'all' || NODE_NAME === 'audio') checkAudio();
if (NODE_NAME === 'all' || NODE_NAME === 'subtitle') checkSubtitle();
if (NODE_NAME === 'all' || NODE_NAME === 'render') checkRender();
if (NODE_NAME === 'all' || NODE_NAME === 'cover') checkCover();
if (NODE_NAME === 'all' || NODE_NAME === 'font') checkCoverFont();
if (NODE_NAME === 'all' || NODE_NAME === 'final') checkFinal();

section('检查结果');
if (exitCode === 0) {
  log('✅ 全部检查通过，质量门禁开放', GREEN);
  console.log(`\n下一步建议:`);
  const hasAudio = fs.existsSync(path.join(PROJECT_DIR, 'audio', 'neural_1_2x.m4a'));
  const hasAss = fs.existsSync(path.join(PROJECT_DIR, 'audio', 'subtitles.ass'));
  if (!hasAudio) console.log('  → 生成音频（Step 7）');
  if (hasAudio && !hasAss) console.log('  → 生成字幕（Step 8）');
  if (hasAudio && hasAss) console.log('  → 可以渲染视频（Step 10）');
} else {
  log('❌ 存在失败项，质量门禁关闭', RED);
  console.log('\n请修复上述 ❌ 项后再继续。');
}

process.exit(exitCode);
