#!/usr/bin/env node
/**
 * pre-render-check.js
 * 
 * Remotion 视频渲染前置检查 - 渲染前验证所有配置
 * 检查帧数计算、Sequence结构、字体大小等
 * 
 * 用法: 
 *   node pre-render-check.js <tsx-file> [fps] [duration]
 *   node pre-render-check.js <project-dir>  ← 自动查找 tsx 文件并推断 fps/duration
 * 
 * 退出码:
 *   0 = 检查通过，可以渲染
 *   1 = 检查失败，不能渲染
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let TSX_FILE = process.argv[2];
const FPS_ARG = process.argv[3];
const EXPECTED_DURATION_ARG = process.argv[4];

let FPS = FPS_ARG ? parseFloat(FPS_ARG) : 59.94;
let EXPECTED_DURATION = EXPECTED_DURATION_ARG ? parseFloat(EXPECTED_DURATION_ARG) : 60;

// 自动检测：如果传入的是目录而非文件，自动查找 tsx 并推断 fps/duration
if (TSX_FILE && fs.existsSync(TSX_FILE) && fs.statSync(TSX_FILE).isDirectory()) {
  const projDir = TSX_FILE;
  // 查找 tsx 文件
  const candidates = ['Video.tsx', 'VerticalVideo.tsx', 'MainVideo.tsx', 'App.tsx'];
  let foundTsx = null;
  for (const name of candidates) {
    const p = path.join(projDir, 'src', name);
    if (fs.existsSync(p)) { foundTsx = p; break; }
  }
  if (!foundTsx) {
    const srcDir = path.join(projDir, 'src');
    if (fs.existsSync(srcDir)) {
      const tsxFiles = fs.readdirSync(srcDir).filter(f => /\.tsx$/.test(f));
      if (tsxFiles.length > 0) foundTsx = path.join(srcDir, tsxFiles[0]);
    }
  }
  if (!foundTsx) {
    console.error(`❌ 在 ${projDir}/src/ 下找不到 .tsx 文件`);
    process.exit(1);
  }
  TSX_FILE = foundTsx;
  // 从 video-config.json 推断 fps 和 duration
  const configFile = path.join(projDir, 'video-config.json');
  const configFileAlt = path.join(projDir, 'video-project', 'video-config.json');
  const cfg = fs.existsSync(configFile)
    ? JSON.parse(fs.readFileSync(configFile, 'utf8'))
    : (fs.existsSync(configFileAlt) ? JSON.parse(fs.readFileSync(configFileAlt, 'utf8')) : null);
  if (cfg) {
    if (cfg.fps) FPS = cfg.fps;
    if (cfg.duration) EXPECTED_DURATION = cfg.duration;
  }
  // 从音频时长推断
  const audioFile = path.join(projDir, 'audio', 'neural_1_2x.m4a');
  if (fs.existsSync(audioFile)) {
    try {
      const out = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioFile}"`, { encoding: 'utf8', timeout: 10000 });
      const dur = parseFloat(out.trim());
      if (dur > 0) EXPECTED_DURATION = dur;
    } catch (e) { /* ignore */ }
  }
}

// ANSI颜色
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function extractSequenceInfo(content) {
  // 提取所有 Sequence 组件的 from 和 durationInFrames
  const sequences = [];
  const regex = /<Sequence\s+from=\{(\d+)\}\s+durationInFrames=\{(\d+)\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    sequences.push({
      from: parseInt(match[1]),
      duration: parseInt(match[2]),
      end: parseInt(match[1]) + parseInt(match[2])
    });
  }
  return sequences;
}

function extractFrameDefinitions(content) {
  // 提取 FRAMES 或 SCENE_FRAMES 定义
  const frames = [];
  const regex = /(?:const|let|var)\s+(?:FRAMES|SCENE_FRAMES)\s*=\s*\{([^}]+(?:\[[^\]]*\][^}]*)*)\}/gs;
  const match = regex.exec(content);
  return match ? match[0] : null;
}

function checkGlobalFrameUsage(content, sequences) {
  // 检查是否在 Sequence 内使用了全局帧（FRAMES.scene.start + X）
  const errors = [];
  const lines = content.split('\n');
  
  // 检查 interpolate 调用是否使用了全局帧
  const globalFramePattern = /interpolate\s*\(\s*frame\s*,\s*\[\s*FRAMES\.\w+\.start\s*\+/g;
  const globalFramePattern2 = /interpolate\s*\(\s*\w+\s*,\s*\[\s*FRAMES\.\w+\.start\s*\+/g;
  
  lines.forEach((line, idx) => {
    if (line.match(globalFramePattern) || line.match(globalFramePattern2)) {
      // 检查是否在 Sequence 内部
      const beforeLines = lines.slice(0, idx);
      const inSequence = beforeLines.some(l => l.includes('<Sequence'));
      if (inSequence) {
        errors.push({
          line: idx + 1,
          content: line.trim(),
          reason: '在 Sequence 内部使用了全局帧值 FRAMES.scene.start + X'
        });
      }
    }
  });
  
  return errors;
}

function checkFontSize(content, maxWidth = 1080) {
  // 检查字体大小是否合理
  // 竖屏 1080×1920 标准字号：
  //   - 字幕：ASS Fontsize=72（PlayResY=1920，约40px视觉），用字幕组件渲染
  //   - CSS fontSize（Remotion JSX）：主标题80-130px，副标题36-56px，正文28-36px
  // 注意：CSS fontSize 像素值与 ASS Fontsize 不是同一体系，不要混淆
  const warnings = [];

  // 只检查过小的字号（< 20px 在竖屏 1080×1920 下基本不可见）
  const tinyFontPattern = /fontSize:\s*['"]?(\d+)['"]?/g;
  let match;
  while ((match = tinyFontPattern.exec(content)) !== null) {
    const size = parseInt(match[1]);
    if (size > 0 && size < 20) {
      warnings.push({
        line: getLineNumber(content, match.index),
        size,
        reason: `字号${size}px过小（竖屏视频中<20px基本不可见）`
      });
    }
  }

  return warnings;
}

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

function main() {
  console.log('\n========== Remotion 渲染前置检查 ==========\n');
  
  if (!TSX_FILE) {
    log('用法: node pre-render-check.js <tsx-file> [fps] [duration]', BLUE);
    log('示例: node pre-render-check.js src/Video.tsx 60 60', BLUE);
    process.exit(1);
  }
  
  if (!fs.existsSync(TSX_FILE)) {
    log(`❌ 文件不存在: ${TSX_FILE}`, RED);
    process.exit(1);
  }
  
  const content = fs.readFileSync(TSX_FILE, 'utf8');
  const expectedFrames = Math.ceil(EXPECTED_DURATION * FPS);
  
  log(`文件: ${TSX_FILE}`, BLUE);
  log(`FPS: ${FPS}`, BLUE);
  log(`期望时长: ${EXPECTED_DURATION}秒 (${expectedFrames}帧)\n`, BLUE);
  
  let passed = true;
  
  // 1. 检查 Sequence 结构
  log('【1/5】检查 Sequence 结构...');
  const sequences = extractSequenceInfo(content);
  if (sequences.length === 0) {
    log('⚠️ 未找到 Sequence 组件，可能使用了全局帧模式', YELLOW);
  } else {
    log(`   找到 ${sequences.length} 个 Sequence 组件`, GREEN);
    
    // 验证帧数连续性
    let lastEnd = 0;
    let frameSum = 0;
    const gaps = [];
    
    sequences.forEach((seq, idx) => {
      frameSum += seq.duration;
      
      if (seq.from !== lastEnd) {
        gaps.push({
          expected: lastEnd,
          actual: seq.from,
          seq: idx + 1
        });
      }
      lastEnd = seq.end;
    });
    
    if (gaps.length > 0) {
      log('⚠️ Sequence 帧不连续:', YELLOW);
      gaps.forEach(g => {
        log(`   Sequence ${g.seq}: 期望from=${g.expected}, 实际from=${g.actual}`, YELLOW);
      });
    } else {
      log('   ✅ Sequence 帧连续', GREEN);
    }
    
    log(`   总帧数: ${frameSum}`, GREEN);
    
    if (frameSum !== expectedFrames) {
      log(`   ⚠️ 帧数(${frameSum})与期望(${expectedFrames})不匹配`, YELLOW);
      if (frameSum < expectedFrames) {
        log(`   ❌ 帧数不足，会导致黑屏！`, RED);
        passed = false;
      }
    } else {
      log('   ✅ 帧数匹配', GREEN);
    }
  }
  
  // 2. 检查全局帧误用
  log('\n【2/5】检查 Sequence 内全局帧误用...');
  const globalFrameErrors = checkGlobalFrameUsage(content, sequences);
  if (globalFrameErrors.length > 0) {
    log(`   ❌ 发现 ${globalFrameErrors.length} 处全局帧误用`, RED);
    globalFrameErrors.forEach(err => {
      log(`   行${err.line}: ${err.content}`, RED);
      log(`   原因: ${err.reason}`, YELLOW);
    });
    passed = false;
  } else {
    log('   ✅ 未发现全局帧误用', GREEN);
  }
  
  // 3. 检查字体大小
  log('\n【3/5】检查字体大小...');
  const fontWarnings = checkFontSize(content);
  if (fontWarnings.length > 0) {
    log(`   ⚠️ 发现 ${fontWarnings.length} 处可能过小的字号（<20px）`, YELLOW);
    fontWarnings.forEach(w => {
      log(`   行${w.line}: ${w.size}px - ${w.reason}`, YELLOW);
    });
  } else {
    log('   ✅ 字体大小正常', GREEN);
  }
  
  // 4. 检查 useCurrentFrame 使用
  log('\n【4/5】检查 useCurrentFrame 使用...');
  const hasUseCurrentFrame = content.includes('useCurrentFrame');
  if (!hasUseCurrentFrame) {
    log('⚠️ 未找到 useCurrentFrame，可能没有动画', YELLOW);
  } else {
    log('   ✅ 找到 useCurrentFrame', GREEN);
  }
  
  // 5. 检查 AbsoluteFill
  log('\n【5/5】检查 AbsoluteFill 结构...');
  const hasAbsoluteFill = content.includes('AbsoluteFill');
  if (!hasAbsoluteFill) {
    log('⚠️ 未找到 AbsoluteFill，视频可能无法正常渲染', YELLOW);
  } else {
    log('   ✅ 找到 AbsoluteFill', GREEN);
  }
  
  // 输出最终状态
  console.log('\n========== 检查结果 ==========\n');
  
  if (passed) {
    log('✅ 所有关键检查通过，可以渲染', GREEN);
    console.log('\n渲染命令示例:');
    console.log(`  npx remotion render Video --output out/video.mp4 --log=error`);
    console.log('');
    process.exit(0);
  } else {
    log('❌ 检查失败，必须修复上述问题后才能渲染', RED);
    console.log('\n常见问题解决方案:');
    console.log('1. 帧数不足 → 增加场景duration或减少总时长');
    console.log('2. 全局帧误用 → 改用局部帧（从0开始）');
    console.log('3. 字体过大 → 标题字号不超过80px');
    console.log('');
    process.exit(1);
  }
}

main();
