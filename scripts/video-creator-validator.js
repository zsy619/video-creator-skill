#!/usr/bin/env node
/**
 * video-creator-validator.js - 项目文件完整性验证脚本
 * 
 * 检查 video-creator 项目是否包含所有必需的文件和资源：
 * 1. 11个文档文件
 * 2. 3个封面图 (cover.png, cover-wechat.png, cover-xhs.png)
 * 3. 音频文件 (neural_1_2x.m4a)
 * 4. 字幕文件 (subtitles.ass)
 * 5. 最终视频 (final-with-subs.mp4)
 * 
 * 用法: node video-creator-validator.js <项目目录>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 必需文件清单
const REQUIRED_DOCS = [
  'README.md',
  'article.md',
  'video-script.md',
  'copy.md',
  'wechat-copy.md',
  'posting-guide.md',
  'landing-page.html',
  'article-page.html',
  'wechat-page.html',
  'session-log.md',
  'report.json',
];

const REQUIRED_ASSETS = [
  'assets/cover.png',           // 1080x1920 竖屏封面
  'assets/cover-wechat.png',     // 900x383 公众号封面
  'assets/cover-xhs.png',       // 1440x2560 小红书封面
];

const REQUIRED_AUDIO = 'audio/neural_1_2x.m4a';
const REQUIRED_SUBTITLES = 'audio/subtitles.ass';
const REQUIRED_VIDEO = 'video-project/out/final-with-subs.mp4';

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  return {
    path: filePath,
    description,
    exists,
    status: exists ? '✅' : '❌',
  };
}

function checkImageDimensions(filePath, expectedWidth, expectedHeight) {
  try {
    const output = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`,
      { encoding: 'utf8' }
    ).trim();
    
    const [width, height] = output.split('x').map(Number);
    const correct = width === expectedWidth && height === expectedHeight;
    
    return {
      path: filePath,
      dimensions: `${width}x${height}`,
      expected: `${expectedWidth}x${expectedHeight}`,
      status: correct ? '✅' : '⚠️',
      message: correct ? '尺寸正确' : `尺寸错误 (期望 ${expectedWidth}x${expectedHeight})`,
    };
  } catch (e) {
    return {
      path: filePath,
      dimensions: '未知',
      status: '❌',
      message: '无法读取尺寸',
    };
  }
}

function checkAudio(filePath) {
  try {
    const duration = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: 'utf8' }
    ).trim();
    
    return {
      path: filePath,
      duration: `${parseFloat(duration).toFixed(2)}s`,
      status: '✅',
    };
  } catch (e) {
    return {
      path: filePath,
      status: '❌',
      message: '无法读取音频',
    };
  }
}

function checkVideo(filePath) {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries stream=codec_name,width,height -show_entries format=duration,size -of default=noprint_wrappers=1 "${filePath}"`,
      { encoding: 'utf8' }
    );
    
    const lines = output.trim().split('\n');
    const info = {};
    lines.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) info[key.trim()] = value.trim();
    });
    
    return {
      path: filePath,
      codec: info.codec_name || '未知',
      dimensions: `${info.width || '?'}x${info.height || '?'}`,
      duration: `${info.duration || '?'}s`,
      size: `${(info.size / 1024 / 1024).toFixed(2)}MB`,
      status: '✅',
    };
  } catch (e) {
    return {
      path: filePath,
      status: '❌',
      message: '无法读取视频',
    };
  }
}

function validateProject(projectDir) {
  console.log(`\n🎬 Video Creator 项目验证`);
  console.log(`============================================================`);
  console.log(`项目: ${projectDir}`);
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`============================================================\n`);
  
  const results = {
    docs: [],
    assets: [],
    audio: null,
    subtitles: null,
    video: null,
  };
  
  // 1. 检查文档文件
  console.log(`📄 文档文件 (11个):\n`);
  let docsPassed = 0;
  for (const doc of REQUIRED_DOCS) {
    const filePath = path.join(projectDir, 'docs', doc);
    const result = checkFileExists(filePath, doc);
    results.docs.push(result);
    console.log(`  ${result.status} ${doc}`);
  }
  docsPassed = results.docs.filter(d => d.exists).length;
  console.log(`\n  小计: ${docsPassed}/${REQUIRED_DOCS.length} 通过\n`);
  
  // 2. 检查封面图
  console.log(`🖼️  封面图 (3个):\n`);
  let assetsPassed = 0;
  const assetDimensions = [
    [1080, 1920],  // cover.png
    [900, 383],    // cover-wechat.png
    [1440, 2560], // cover-xhs.png
  ];
  
  for (let i = 0; i < REQUIRED_ASSETS.length; i++) {
    const asset = REQUIRED_ASSETS[i];
    const filePath = path.join(projectDir, 'docs', asset);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      const dim = checkImageDimensions(filePath, assetDimensions[i][0], assetDimensions[i][1]);
      console.log(`  ${dim.status} ${asset}`);
      console.log(`     ${dim.dimensions} ${dim.message}`);
      if (dim.status === '✅') assetsPassed++;
    } else {
      console.log(`  ❌ ${asset} (文件不存在)`);
    }
    results.assets.push({ path: asset, exists, ...(exists ? { dimensions: assetDimensions[i] } : {}) });
  }
  console.log(`\n  小计: ${assetsPassed}/${REQUIRED_ASSETS.length} 尺寸正确\n`);
  
  // 3. 检查音频文件
  console.log(`🔊 音频文件:\n`);
  const audioPath = path.join(projectDir, REQUIRED_AUDIO);
  if (fs.existsSync(audioPath)) {
    const audioResult = checkAudio(audioPath);
    results.audio = audioResult;
    console.log(`  ✅ ${REQUIRED_AUDIO}`);
    console.log(`     时长: ${audioResult.duration}`);
  } else {
    console.log(`  ❌ ${REQUIRED_AUDIO} (文件不存在)`);
    console.log(`  ⚠️  提示: 音频文件应重命名为 neural_1_2x.m4a`);
  }
  console.log('');
  
  // 4. 检查字幕文件
  console.log(`📝 字幕文件:\n`);
  const subtitlesPath = path.join(projectDir, REQUIRED_SUBTITLES);
  if (fs.existsSync(subtitlesPath)) {
    results.subtitles = { path: subtitlesPath, exists: true };
    console.log(`  ✅ ${REQUIRED_SUBTITLES}`);
    
    // 读取字幕检查 Fontsize
    const content = fs.readFileSync(subtitlesPath, 'utf8');
    const styleMatch = content.match(/Style:.*?,(\d+),/);
    if (styleMatch) {
      const fontsize = styleMatch[1];
      if (fontsize === '10') {
        console.log(`     Fontsize=10 ✅`);
      } else {
        console.log(`     ⚠️  Fontsize=${fontsize} (应为 10)`);
      }
    }
  } else {
    console.log(`  ❌ ${REQUIRED_SUBTITLES} (文件不存在)`);
    console.log(`  ⚠️  提示: 应生成 ASS 格式字幕 (不是 .srt)`);
  }
  console.log('');
  
  // 5. 检查最终视频
  console.log(`🎥 最终视频:\n`);
  const videoPath = path.join(projectDir, REQUIRED_VIDEO);
  if (fs.existsSync(videoPath)) {
    const videoResult = checkVideo(videoPath);
    results.video = videoResult;
    console.log(`  ✅ ${REQUIRED_VIDEO}`);
    console.log(`     编码: ${videoResult.codec}`);
    console.log(`     尺寸: ${videoResult.dimensions}`);
    console.log(`     时长: ${videoResult.duration}`);
    console.log(`     大小: ${videoResult.size}`);
  } else {
    console.log(`  ❌ ${REQUIRED_VIDEO} (文件不存在)`);
    console.log(`  ⚠️  提示: 最终视频应为 final-with-subs.mp4 (含字幕)`);
  }
  console.log('');
  
  // 总结
  const totalErrors = 
    (REQUIRED_DOCS.length - docsPassed) +
    (REQUIRED_ASSETS.length - assetsPassed) +
    (!results.audio ? 1 : 0) +
    (!results.subtitles ? 1 : 0) +
    (!results.video ? 1 : 0);
  
  console.log(`============================================================`);
  console.log(`📊 验证结果:\n`);
  console.log(`  文档: ${docsPassed}/${REQUIRED_DOCS.length}`);
  console.log(`  封面: ${assetsPassed}/${REQUIRED_ASSETS.length} 尺寸正确`);
  console.log(`  音频: ${results.audio ? '✅' : '❌'}`);
  console.log(`  字幕: ${results.subtitles ? '✅' : '❌'}`);
  console.log(`  视频: ${results.video ? '✅' : '❌'}`);
  console.log(`\n  总错误: ${totalErrors}`);
  console.log(`============================================================\n`);
  
  return totalErrors === 0;
}

// CLI 入口
if (require.main === module) {
  const projectDir = process.argv[2];
  
  if (!projectDir) {
    console.log('用法: node video-creator-validator.js <项目目录>');
    console.log('示例: node video-creator-validator.js ./workspace/ui-tars-desktop');
    process.exit(1);
  }
  
  const passed = validateProject(path.resolve(projectDir));
  process.exit(passed ? 0 : 1);
}

module.exports = { validateProject };
