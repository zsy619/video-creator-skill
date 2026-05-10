#!/usr/bin/env node
/**
 * pre-subtitle-check.js
 * 
 * 字幕生成前置检查 - 必须在生成字幕前执行
 * 检查音频文件是否已就绪（时长、后处理完成）
 * 
 * 用法: node pre-subtitle-check.js <project-dir>
 * 
 * 退出码:
 *   0 = 检查通过，可以生成字幕
 *   1 = 检查失败，不能生成字幕
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = process.argv[2] || '.';
// --target-duration 60 → 允许的配音文本最大字数
const TARGET_DURATION_ARG = process.argv.find(a => a.startsWith('--target-duration='));
const TARGET_DURATION = TARGET_DURATION_ARG
  ? parseInt(TARGET_DURATION_ARG.split('=')[1]) || 60
  : null;

// ANSI颜色
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function checkFileExists(filePath, name) {
  if (!fs.existsSync(filePath)) {
    log(`❌ ${name} 不存在: ${filePath}`, RED);
    return false;
  }
  log(`✅ ${name} 存在`, GREEN);
  return true;
}

function getAudioDuration(filePath) {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}" 2>/dev/null`,
      { encoding: 'utf8' }
    );
    return parseFloat(output.trim());
  } catch (e) {
    return null;
  }
}

function getAudioBitrate(filePath) {
  try {
    const output = execSync(
      `ffprobe -v error -select_streams a:0 -show_entries stream=bit_rate -of csv=p=0 "${filePath}" 2>/dev/null`,
      { encoding: 'utf8' }
    );
    return parseInt(output.trim()) || 0;
  } catch (e) {
    return 0;
  }
}

function checkAudioNotSilent(filePath) {
  try {
    // 使用astats检查音频是否有非静音帧
    const output = execSync(
      `ffmpeg -i "${filePath}" -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - 2>&1 | grep "RMS_level" | grep -v "\\-inf" | wc -l`,
      { encoding: 'utf8' }
    );
    const count = parseInt(output.trim()) || 0;
    return count > 0;
  } catch (e) {
    return false;
  }
}

// ─────────────────────────────────────────────
// 【新增 2026-05-10】配音文本长度校验
// ─────────────────────────────────────────────
function checkTextLength() {
  if (!TARGET_DURATION) return true; // 未指定目标时长则跳过

  console.log(`\n   [文本长度检查] 目标时长: ${TARGET_DURATION}s`);

  // 查找配音文本文件（video-script.md 或 raw/text.txt）
  const scriptFile = path.join(PROJECT_DIR, 'docs', 'video-script.md');
  const textFile = path.join(PROJECT_DIR, 'raw', 'text.txt');

  let text = null;
  let textSource = null;

  if (fs.existsSync(scriptFile)) {
    const content = fs.readFileSync(scriptFile, 'utf8');
    // 去掉 frontmatter、markdown 标记
    text = content.replace(/^---[\s\S]*?---\n/, '').replace(/[#*`\[\]]/g, '').trim();
    textSource = scriptFile;
  } else if (fs.existsSync(textFile)) {
    text = fs.readFileSync(textFile, 'utf8').trim();
    textSource = textFile;
  }

  if (!text) {
    warn('未找到配音文本文件（video-script.md 或 raw/text.txt），跳过文本长度检查');
    return true;
  }

  // 中文字符粗略计数
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const totalChars = text.length;

  // 字数上限 = floor(目标时长 / 1.2 * 4.5)
  const maxChars = Math.floor(TARGET_DURATION / 1.2 * 4.5);

  console.log(`   文本字数: ${chineseChars}字（中文）/ ${totalChars}字（总计）`);
  console.log(`   字数上限: ${maxChars}字（目标${TARGET_DURATION}s @1.2x语速）`);

  if (chineseChars > maxChars) {
    log(`❌ 配音文本过长（${chineseChars}字 > ${maxChars}字上限）`, RED);
    log(`   必须精简文本，禁止用 atempo 补救`, YELLOW);
    return false;
  } else {
    log(`   ✅ 文本字数在范围内`, GREEN);
    return true;
  }
}

function main() {
  console.log('\n========== 字幕生成前置检查 ==========\n');
  console.log(`项目目录: ${PROJECT_DIR}\n`);
  
  const audioDir = path.join(PROJECT_DIR, 'audio');
  const audioFile = path.join(audioDir, 'neural_1_2x.m4a');
  
  let passed = true;
  
  // 1. 检查音频目录
  if (!fs.existsSync(audioDir)) {
    log('❌ audio/ 目录不存在', RED);
    log('   必须先生成音频才能生成字幕', YELLOW);
    passed = false;
  } else {
    log('✅ audio/ 目录存在', GREEN);
  }
  
  // 2. 检查音频文件
  if (!checkFileExists(audioFile, '音频文件 (neural_1_2x.m4a)')) {
    log('   必须先生成1.2x加速后的音频文件', YELLOW);
    passed = false;
  } else {
    // 3. 检查音频时长
    const duration = getAudioDuration(audioFile);
    if (duration === null || duration <= 0) {
      log('❌ 音频时长无效', RED);
      passed = false;
    } else {
      log(`✅ 音频时长: ${duration.toFixed(2)}秒`, GREEN);
      
      // 检查时长是否合理（竖屏视频通常50-90秒）
      if (duration < 30) {
        log(`⚠️ 警告: 音频时长${duration.toFixed(2)}秒偏短，可能内容不足`, YELLOW);
      } else if (duration > 120) {
        log(`⚠️ 警告: 音频时长${duration.toFixed(2)}秒偏长，建议检查`, YELLOW);
      }
    }
    
    // 4. 检查音频码率
    const bitrate = getAudioBitrate(audioFile);
    if (bitrate > 0) {
      log(`✅ 音频码率: ${(bitrate/1000).toFixed(0)}kbps`, GREEN);
    } else {
      log('⚠️ 无法获取音频码率', YELLOW);
    }
    
    // 5. 检查音频是否静音
    log('   检查音频是否有效（非静音）...');
    if (checkAudioNotSilent(audioFile)) {
      log('   ✅ 音频包含有效内容', GREEN);
    } else {
      log('   ❌ 音频可能为静音，请检查', RED);
      passed = false;
    }

    // 6. 【新增 2026-05-10】配音文本长度校验
    if (!checkTextLength()) {
      passed = false;
    }
  }

  // 7. 检查视频帧数配置（如果存在 video-config.json 或 duration.txt）
  const configFile = path.join(PROJECT_DIR, 'video-project', 'video-config.json');
  const durationFile = path.join(PROJECT_DIR, 'video-project', 'duration.txt');
  const cfgFile = fs.existsSync(configFile) ? configFile
                  : fs.existsSync(durationFile) ? durationFile : null;
  if (cfgFile) {
    try {
      let totalFrames = null;
      if (cfgFile.endsWith('.json')) {
        const config = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
        totalFrames = config.totalFrames || null;
      } else {
        const dur = parseFloat(fs.readFileSync(cfgFile, 'utf8').trim());
        totalFrames = dur ? Math.ceil(dur * 60) : null;
      }
      if (totalFrames && duration) {
        const expectedFrames = Math.ceil(duration * 60);
        const diff = Math.abs(totalFrames - expectedFrames);
        if (diff > 30) {
          log(`⚠️ 警告: 视频帧数(${totalFrames})与音频时长×60fps(${expectedFrames})差异较大`, YELLOW);
          log(`   请确保音频后处理已完成（atempo加速），再生成字幕`, YELLOW);
        } else {
          log(`✅ 视频帧数与音频时长匹配`, GREEN);
        }
      }
    } catch (e) {
      // ignore
    }
  }
  
  // 7. 输出最终状态
  console.log('\n========== 检查结果 ==========\n');
  
  if (passed) {
    log('✅ 所有检查通过，可以生成字幕', GREEN);
    console.log('\n下一步: 生成 ASS 字幕文件');
    console.log('命令示例:');
    console.log(`  node scripts/gen_subtitles.js --duration ${(getAudioDuration(audioFile) || 60).toFixed(2)} --output audio/subtitles.ass`);
    console.log('');
    process.exit(0);
  } else {
    log('❌ 检查失败，必须修复上述问题后才能生成字幕', RED);
    console.log('\n常见问题解决方案:');
    console.log('1. 音频文件不存在 → 先运行音频后处理（atempo 1.2x）');
    console.log('2. 音频时长异常 → 重新生成配音或检查后处理步骤');
    console.log('3. 音频为静音 → 检查 Remotion 渲染的原始音频是否正常');
    console.log('');
    process.exit(1);
  }
}

main();
