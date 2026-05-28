#!/usr/bin/env node
/**
 * video-quality-gate.js
 *
 * 视频创作一键质量门禁 — 在关键节点验证所有输出
 *
 * 用法:
 *   node video-quality-gate.js <project-dir> [node-name]
 *
 * node-name: audio|subtitle|narration|render|final|cover|all (默认: all)
 *
 * 退出码:
 *   0 = 所有检查通过
 *   1 = 至少一项检查失败
 *
 * 示例:
 *   node video-quality-gate.js {WORKSPACE_DIR}/{project-name} audio
 *   node video-quality-gate.js {WORKSPACE_DIR}/{project-name} all
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
    const raw = execSync(
      `ffprobe -v error -show_entries format=duration:stream=bit_rate -of csv=p=0 \"${filePath}\" 2>/dev/null`,
      { encoding: 'utf8', timeout: 10000 }
    );
    const output = typeof raw === 'string' ? raw : (raw.stdout || '');
    const lines = output.trim().split('\n').filter(l => l.trim());
    let duration = null;
    let bitrate = 0;

    // 策略：遍历所有行，分别识别 duration 和 bitrate
    // duration: 无逗号的纯数字（秒），或逗号分隔的第一个值
    // bitrate: 有逗号分隔的第二个值，或只有纯数字行时查 stream 行
    for (const line of lines) {
      if (line.includes(',')) {
        // CSV 格式: duration,bitrate 或 stream 分隔
        const parts = line.split(',');
        const d = parseFloat(parts[0]);
        const b = parseInt(parts[1]);
        if (!isNaN(d) && d > 0 && d < 10000) duration = d; // 过滤异常大值
        if (!isNaN(b) && b > 0) bitrate = b;
      } else {
        const n = parseFloat(line);
        if (!isNaN(n) && n > 0) {
          // 判断是 duration（<10000秒）还是 bitrate（>1000）
          if (n < 10000 && duration === null) duration = n;
          else if (n >= 1000) bitrate = n;
        }
      }
    }

    // 如果只有一条 CSV 行（duration,bitrate），上面已解析
    // 如果上面没解析到 bitrate，尝试从 stream 行单独获取
    if (bitrate === 0) {
      try {
        const brRaw = execSync(
          `ffprobe -v error -select_streams a:0 -show_entries stream=bit_rate -of csv=p=0 \"${filePath}\" 2>/dev/null`,
          { encoding: 'utf8', timeout: 10000 }
        );
        const brOut = typeof brRaw === 'string' ? brRaw : (brRaw.stdout || '');
        const brLine = brOut.trim();
        const br = parseInt(brLine) || 0;
        if (br > 0) bitrate = br;
      } catch (e) { /* ignore */ }
    }

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

  // 检查 Fontsize=72 + STHeiti Medium（launch.sh sed 替换后为 STHeiti Medium，不再是 PingFang SC）
  const styleLine = content.split('\n').find(l => l.startsWith('Style: Default,'));
  if (!styleLine) {
    fail('ASS: 未找到 Style: Default 行');
    ok = false;
  } else if (styleLine.includes('STHeiti Medium') && styleLine.includes(',72,')) {
    pass('ASS: Fontsize=72, STHeiti Medium ✓');
  } else {
    fail('ASS: 字体或字号错误，launch.sh sed 替换后应为 STHeiti Medium');
    ok = false;
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

  if (bitrate >= 96000) {
    pass(`音频码率: ${(bitrate / 1000).toFixed(0)}kbps`);
  } else if (bitrate >= 64000) {
    warn(`音频码率偏低: ${(bitrate / 1000).toFixed(0)}kbps（语音内容 <96k 可接受）`);
  } else {
    fail(`音频码率过低: ${(bitrate / 1000).toFixed(0)}kbps（应≥64k）`);
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
// 节点 B: subtitle — 字幕生成检查（Remotion Native: captions.json）
// ─────────────────────────────────────────────
function checkSubtitle() {
  section('节点 B: 字幕检查（Remotion Native）');

  const captionFile = path.join(PROJECT_DIR, 'audio', 'captions.json');

  if (!fs.existsSync(captionFile)) {
    fail(`captions.json: 文件不存在（应在 audio/ 目录）`);
  } else {
    try {
      const captions = JSON.parse(fs.readFileSync(captionFile, 'utf8'));
      if (!Array.isArray(captions)) {
        fail('captions.json: 根对象必须是数组');
      } else if (captions.length === 0) {
        fail('captions.json: 数组为空');
      } else {
        // 检查每条字幕格式
        let valid = 0;
        for (const c of captions) {
          if (typeof c.text === 'string' && typeof c.startMs === 'number' && typeof c.endMs === 'number') {
            valid++;
          }
        }
        if (valid === captions.length) {
          pass(`captions.json: ${captions.length} 条字幕，格式正确（text/startMs/endMs）`);
          // 显示第一条示例
          const sample = captions[0];
          pass(`示例: "${sample.text.substring(0, 30)}..." startMs=${sample.startMs} endMs=${sample.endMs}`);
        } else {
          fail(`captions.json: 仅 ${valid}/${captions.length} 条格式正确（需 text/startMs/endMs）`);
        }
      }
    } catch (e) {
      fail(`captions.json: 解析失败 - ${e.message}`);
    }
  }

  const audioFile = path.join(PROJECT_DIR, 'audio', 'neural_1_2x.m4a');
  const audioDur = getAudioMeta(audioFile).duration;
  if (audioDur) {
    pass(`参考音频时长: ${audioDur.toFixed(2)}s`);
  }
}

// ─────────────────────────────────────────────
// T-9: 节点 N: narration — 配音文本字数门禁（175-337字）
// ─────────────────────────────────────────────
function checkNarration() {
  section('T-9: 节点 N: 配音文本字数检查');

  const narrationFile = path.join(PROJECT_DIR, 'docs', 'narration.txt');
  if (!checkFile(narrationFile, 'narration.txt')) return;

  const text = fs.readFileSync(narrationFile, 'utf8');
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const MIN_CHARS = 175;
  const configFile = path.join(PROJECT_DIR, 'video-config.json');
  const targetDuration = (() => {
    try {
      if (fs.existsSync(configFile)) {
        const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        return cfg.duration || 52;
      }
    } catch (e) { /* ignore */ }
    return 52;
  })();
  const MAX_CHARS = Math.floor(targetDuration * 3.37);

  pass(`配音字数: ${chineseChars}字（目标 ${MIN_CHARS}-${MAX_CHARS}字）`);

  if (chineseChars < MIN_CHARS) {
    fail(`narration.txt 不足 ${MIN_CHARS}字（当前${chineseChars}字），内容可能太短`);
  } else if (chineseChars > MAX_CHARS) {
    warn(`narration.txt 超过上限 ${MAX_CHARS}字（当前${chineseChars}字），可能超出目标时长`);
  } else {
    pass(`字数在合理范围内（${MIN_CHARS}-${MAX_CHARS}字）`);
  }

  // 检查 narration.txt 是否为自动生成的占位内容
  const placeholderPhrases = ['请手动编写配音文本', '请在此处粘贴'];
  if (placeholderPhrases.some(p => text.includes(p))) {
    fail('narration.txt 仍为占位内容，请手动编写配音文本');
  }
}

// ─────────────────────────────────────────────
// 节点 C: render — Remotion 渲染前置检查（Remotion Native 唯一路径）
// ─────────────────────────────────────────────
function checkRender() {
  section('节点 C: 渲染前置检查（Remotion Native）');

  const vpDir = path.join(PROJECT_DIR, 'video-project');
  const tsxFile = findTsxFile(vpDir);

  // Remotion Native 路径：检查 tsx + captions.json
  if (!tsxFile) {
    fail('未找到 .tsx 视频组件（请先运行 create-remotion-project.js）');
    return;
  }
  pass(`找到视频组件: ${path.relative(vpDir, tsxFile)}`);

  const content = fs.readFileSync(tsxFile, 'utf8');

  // ══ Remotion Native 路径 ═══════════════════════════════════════════════

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
        const tsxContent = fs.readFileSync(tsxFile, 'utf8');
        if (tsxContent.includes("from '@remotion/core'")) {
          fail('Video.tsx 使用 @remotion/core import（不存在）');
        } else if (tsxContent.includes("from 'remotion'")) {
          pass('Video.tsx 使用正确导入: from \'remotion\'');
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

  // C7: @remotion/captions 包检查（Remotion Native 字幕渲染必需）
  const captionsFile = path.join(vpDir, 'node_modules', '@remotion', 'captions', 'package.json');
  if (fs.existsSync(captionsFile)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(captionsFile, 'utf8'));
      pass(`@remotion/captions@${pkg.version} 已安装`);
    } catch {
      warn('@remotion/captions 版本未知');
    }
  } else {
    warn('@remotion/captions 未安装（Remotion Native 字幕渲染将不可用）');
  }

  // C8: Video.tsx 必须包含 <CaptionOverlay 组件（Remotion Native 字幕渲染）
  if (/<CaptionOverlay\b/.test(content)) {
    pass('Video.tsx 包含 <CaptionOverlay（字幕渲染通过）');
  } else {
    fail('Video.tsx 缺少 <CaptionOverlay 组件（字幕将不会渲染）');
    warn('请在 VerticalVideo 的 <AbsoluteFill> 内添加 <CaptionOverlay captionsFile="audio/captions.json" />');
  }
}

// ─────────────────────────────────────────────
// 节点 D: final — 最终视频检查
// ─────────────────────────────────────────────
function checkFinal() {
  section('节点 D: 最终视频检查');

  const finalFile = path.join(PROJECT_DIR, 'video-project', 'out', 'final.mp4');

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
      fail('最终视频音频无效，请检查 Remotion 渲染步骤');
    }
  }

  // D1: 帧率检查（60fps）
  if (finalFile) {
    const fpsOut = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "${finalFile}" 2>/dev/null`,
      { encoding: 'utf8' }
    ).trim();
    if (fpsOut) {
      const [num, den] = fpsOut.split('/').map(Number);
      const fps = den ? (num / den).toFixed(2) : num.toFixed(2);
      if (parseFloat(fps) >= 59.9 && parseFloat(fps) <= 60.1) {
        pass(`帧率: ${fps} fps ✓`);
      } else {
        warn(`帧率: ${fps} fps（期望 60fps）`);
      }
    }
  }

  // D2: 编码格式（H.264 / libx264）
  if (finalFile) {
    const codecOut = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "${finalFile}" 2>/dev/null`,
      { encoding: 'utf8' }
    ).trim();
    if (codecOut === 'h264') {
      pass(`视频编码: H.264 ✓`);
    } else {
      fail(`视频编码: ${codecOut}（期望 h264）`);
    }
  }

  // D3: 分辨率（1080×1920）
  if (finalFile) {
    const sizeOut = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${finalFile}" 2>/dev/null`,
      { encoding: 'utf8' }
    ).trim();
    const [w, h] = sizeOut.split('x').map(Number);
    if (w === 1080 && h === 1920) {
      pass(`分辨率: ${w}×${h} ✓`);
    } else {
      fail(`分辨率: ${w}×${h}（期望 1080×1920）`);
    }
  }

  // D4: captions.json 存在检查（Remotion Native 字幕验证）
  const captionsJson = path.join(PROJECT_DIR, 'video-project', 'public', 'audio', 'captions.json');
  if (fs.existsSync(captionsJson)) {
    try {
      const data = JSON.parse(fs.readFileSync(captionsJson, 'utf8'));
      if (Array.isArray(data) && data.length > 0) {
        pass(`captions.json: ${data.length} 条字幕记录 ✓`);

        // D4b: 末段 endMs 必须与视频时长同步（防止最后几秒无字幕）
        if (finalFile) {
          const durOut = execSync(
            `ffprobe -v error -show_entries format=duration -of csv=p=0 "${finalFile}" 2>/dev/null`,
            { encoding: 'utf8' }
          ).trim();
          const videoDurSec = parseFloat(durOut);
          const expectedEndMs = Math.round(videoDurSec * 1000);
          const lastEndMs = data[data.length - 1].endMs;
          if (Math.abs(lastEndMs - expectedEndMs) > 500) {
            warn(`captions.json 末段 endMs=${lastEndMs} 与视频时长 ${videoDurSec.toFixed(2)}s 不同步（期望 ${expectedEndMs}）`);
          } else {
            pass(`captions.json 末段 endMs=${lastEndMs} 与视频时长同步 ✓`);
          }
        }
      } else {
        warn('captions.json 格式异常或为空');
      }
    } catch {
      warn('captions.json 解析失败');
    }
  } else {
    warn('captions.json 不存在（Remotion Native 字幕渲染未启用）');
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

  // E2: video-config.json 必须包含 cover.attrs（封面属性标签）
  const configFile = path.join(PROJECT_DIR, 'video-config.json');
  if (fs.existsSync(configFile)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      const attrs = config.cover?.attrs || config.attrs || [];
      if (Array.isArray(attrs) && attrs.length > 0) {
        pass(`video-config.json 包含封面属性标签: ${attrs.join(', ')}`);
      } else {
        warn('video-config.json 缺少 cover.attrs（封面将没有属性标签）');
      }
    } catch {
      warn('video-config.json 解析失败');
    }
  } else {
    warn('video-config.json 不存在（无法验证封面属性标签）');
  }

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
if (NODE_NAME === 'all' || NODE_NAME === 'narration') checkNarration();
if (NODE_NAME === 'all' || NODE_NAME === 'render') checkRender();
if (NODE_NAME === 'all' || NODE_NAME === 'cover') checkCover();
if (NODE_NAME === 'all' || NODE_NAME === 'font') checkCoverFont();
if (NODE_NAME === 'all' || NODE_NAME === 'final') checkFinal();

section('检查结果');
if (exitCode === 0) {
  log('✅ 全部检查通过，质量门禁开放', GREEN);
  console.log(`\n下一步建议:`);
  const hasAudio = fs.existsSync(path.join(PROJECT_DIR, 'audio', 'neural_1_2x.m4a'));
  const hasCaption = fs.existsSync(path.join(PROJECT_DIR, 'audio', 'captions.json'));
  if (!hasAudio) console.log('  → 生成音频（edge-tts）');
  if (hasAudio && !hasCaption) console.log('  → 生成字幕时间戳（captions.json）');
  if (hasAudio && hasCaption) console.log('  → 可以渲染视频（Remotion）');
} else {
  log('❌ 存在失败项，质量门禁关闭', RED);
  console.log('\n请修复上述 ❌ 项后再继续。');
}

process.exit(exitCode);
