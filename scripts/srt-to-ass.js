#!/usr/bin/env node
/**
 * srt-to-ass.js
 *
 * 将 edge-tts 导出的 SRT 格式（逗号分隔）转换为规范 ASS 字幕
 *
 * 问题：edge-tts --subtitles 生成的是 SRT 格式（用逗号分隔时间戳），
 *       不是 ASS 格式（用点号分隔），且缺少 ASS 文件头
 *
 * 规范（遵循 rules/SUBTITLES.md）：
 * - Fontsize: 72（PlayResY=1920时，约40px视觉）
 * - Outline: 2
 * - MarginV: 50
 * - Alignment: 2（底部居中）
 * - \\N 换行（不是 \\\\N）
 * - 2位厘秒（CC）时间戳
 *
 * 用法:
 *   node srt-to-ass.js <input.srt> <output.ass>
 *   node srt-to-ass.js <input.srt> <output.ass> --font "PingFang SC" --size 72
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
const outputFile = process.argv[3];

const fontSize = process.argv.includes('--size')
  ? parseInt(process.argv[process.argv.indexOf('--size') + 1]) || 72
  : 72;

const fontName = process.argv.includes('--font')
  ? process.argv[process.argv.indexOf('--font') + 1]
  : 'PingFang SC';

const platform = process.platform;
const systemFont = platform === 'darwin' ? 'PingFang SC'
  : platform === 'win32' ? 'Microsoft YaHei'
  : 'WenQuanYi Micro Hei';

// ─────────────────────────────────────────────
// ASS 文件头
// ─────────────────────────────────────────────
function buildASSHeader() {
  const lines = [];
  lines.push('[Script Info]');
  lines.push('Title: Video Creator Subtitles');
  lines.push('ScriptType: v4.00+');
  lines.push('WrapStyle: 0');
  lines.push('ScaledBorderAndShadow: yes');
  lines.push('PlayResX: 1080');
  lines.push('PlayResY: 1920');
  lines.push('');
  lines.push('[V4+ Styles]');
  lines.push('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding');
  lines.push(`Style: Default,${systemFont},${fontSize},&H00FFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,30,30,50,1`);
  lines.push('');
  lines.push('[Events]');
  lines.push('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text');
  return lines.join('\n');
}

// ─────────────────────────────────────────────
// 解析 SRT 时间戳: 00:00:00,123 → 00:00:00.12
// ─────────────────────────────────────────────
function parseSRTTime(srtTime) {
  // SRT: H:MM:SS,mmm（逗号，3位毫秒）
  const match = srtTime.trim().match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) return null;
  const [, h, m, s, ms] = match;
  // 转 ASS 2位厘秒: mmm → cc = floor(mmm / 10)
  const cs = Math.floor(parseInt(ms) / 10);
  return `${h}:${m}:${s}.${cs.toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────
// 解析 SRT 块
// ─────────────────────────────────────────────
function parseSRTBlocks(content) {
  // SRT 格式: 序号\nstart,end\ntext\n\n
  const blockRegex = /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n\d+\n|\n*$)/g;
  const blocks = [];
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    const start = parseSRTTime(match[2]);
    const end = parseSRTTime(match[3]);
    let text = match[4].trim();

    if (!start || !end) continue;

    // SRT 允许 <i> 等标签，ASS 不支持，移除
    text = text.replace(/<\/?i>/g, '');
    // 替换 \n 为 \\N（ASS 换行）
    text = text.replace(/\n/g, '\\N');

    blocks.push({ start, end, text });
  }

  return blocks;
}

// ─────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────
function main() {
  if (!inputFile || !outputFile) {
    console.log('用法: node srt-to-ass.js <input.srt> <output.ass> [--font "PingFang SC"] [--size 72]');
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ 文件不存在: ${inputFile}`);
    process.exit(1);
  }

  const content = fs.readFileSync(inputFile, 'utf8');
  const blocks = parseSRTBlocks(content);

  if (blocks.length === 0) {
    console.error('❌ 无法解析 SRT 文件，请确认格式为标准 SRT（用逗号分隔时间戳）');
    process.exit(1);
  }

  console.log(`✅ 解析 ${blocks.length} 条字幕`);

  const assLines = [buildASSHeader()];

  for (const block of blocks) {
    // 10字段 Dialogue: Layer=0, Start, End, Style=Default, Name=空, MarginL=0, MarginR=0, MarginV=50, Effect=空, Text
    assLines.push(`Dialogue: 0,${block.start},${block.end},Default,,0,0,50,,${block.text}`);
  }

  fs.writeFileSync(outputFile, assLines.join('\n'), 'utf8');
  console.log(`✅ ASS 字幕已生成: ${outputFile}`);
  console.log(`   字体: ${systemFont}, 字号: ${fontSize}, 描边: 2px, MarginV: 50`);
}

main();
