#!/usr/bin/env node
/**
 * check-subtitle.js - 字幕质量检查脚本
 * 
 * 检查 ASS 字幕文件是否符合 video-creator 技能规范：
 * 1. Fontsize=10 (标准化像素值)
 * 2. Fontname=PingFang SC
 * 3. Alignment=2 (底部居中)
 * 4. PrimaryColour=&H00FFFF (黄色)
 * 5. Format 行字段数 = 10
 * 6. Dialogue 行字段数 = 10
 * 7. 使用 \N 换行（不是 \\N）
 * 8. 不使用 PlayResX/PlayResY
 * 
 * 用法: node check-subtitle.js <字幕文件路径>
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FIELDS = 10;
const VALIDATION_RULES = {
  fontsize: { value: '10', field: 2 },
  fontname: { value: 'PingFang SC', field: 1 },
  alignment: { value: '2', field: 18 },
  primaryColour: { value: '&H00FFFF', field: 3 },
};

function parseASS(content) {
  const lines = content.split('\n');
  let styleLine = null;
  let formatFields = [];
  let dialogues = [];
  let hasPlayRes = false;
  let inEventsSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 检测 section 切换
    if (trimmed === '[Events]') {
      inEventsSection = true;
      continue;
    }
    if (trimmed.startsWith('[') && trimmed !== '[Events]') {
      inEventsSection = false;
    }

    if (trimmed.startsWith('PlayResX') || trimmed.startsWith('PlayResY')) {
      hasPlayRes = true;
    }

    if (trimmed.startsWith('Style:')) {
      styleLine = trimmed;
    }

    // 只在 [Events] section 中解析 Format 行
    if (inEventsSection && trimmed.startsWith('Format:')) {
      const fields = trimmed.replace(/^Format:\s*/, '').split(',').map(f => f.trim());
      formatFields = fields;
    }

    if (trimmed.startsWith('Dialogue:')) {
      dialogues.push(trimmed);
    }
  }

  return { styleLine, formatFields, dialogues, hasPlayRes };
}

function validateStyleLine(styleLine) {
  const errors = [];
  const warnings = [];
  
  if (!styleLine) {
    errors.push('❌ 缺少 Style 行');
    return { errors, warnings };
  }
  
  const fields = styleLine.replace(/^Style:\s*/, '').split(',');
  
  // 检查字段数
  if (fields.length !== 23) {
    errors.push(`❌ Style 行字段数错误: ${fields.length} (应为 23)`);
  }
  
  // 检查各字段
  const fontsize = fields[2];
  if (fontsize !== '10') {
    errors.push(`❌ Fontsize 错误: ${fontsize} (应为 10)`);
  }

  const fontname = fields[1];
  if (fontname !== 'PingFang SC') {
    errors.push(`❌ Fontname 错误: ${fontname} (应为 PingFang SC)`);
  }

  const alignment = fields[18];
  if (alignment !== '2') {
    errors.push(`❌ Alignment 错误: ${alignment} (应为 2=底部居中)`);
  }

  const primaryColour = fields[3];
  if (primaryColour !== '&H00FFFF') {
    errors.push(`❌ PrimaryColour 错误: ${primaryColour} (应为 &H00FFFF=黄色)`);
  }
  
  return { errors, warnings };
}

function validateFormatLine(formatFields) {
  const errors = [];

  if (formatFields.length === 0) {
    errors.push('❌ 缺少 Format 行');
    return errors;
  }

  if (formatFields.length !== REQUIRED_FIELDS) {
    errors.push(`❌ Format 行字段数错误: ${formatFields.length} (应为 ${REQUIRED_FIELDS})`);
  }

  // 验证字段顺序 (Format: 前缀已在前面的 parseASS 中去除)
  const fields = formatFields; // 不再 slice(1)，因为 parseASS 已经去除了 "Format:" 前缀
  const expected = ['Layer', 'Start', 'End', 'Style', 'Name', 'MarginL', 'MarginR', 'MarginV', 'Effect', 'Text'];
  for (let i = 0; i < Math.min(fields.length, expected.length); i++) {
    if (fields[i] !== expected[i]) {
      errors.push(`❌ Format 行字段顺序错误: 期望 ${expected[i]}, 实际 ${fields[i]}`);
    }
  }

  return errors;
}

function validateDialogues(dialogues) {
  const errors = [];
  
  for (let i = 0; i < dialogues.length; i++) {
    const dialogue = dialogues[i].replace(/^Dialogue:\s*/, '');
    const fields = dialogue.split(',');
    
    if (fields.length !== REQUIRED_FIELDS) {
      errors.push(`❌ Dialogue #${i + 1} 字段数错误: ${fields.length} (应为 ${REQUIRED_FIELDS})`);
      errors.push(`   内容: ${dialogues[i].substring(0, 80)}...`);
    }
    
    // 检查是否使用了 \\N (错误)
    const textField = fields.slice(9).join(',');
    if (textField.includes('\\\\N')) {
      errors.push(`❌ Dialogue #${i + 1} 使用了 \\\\N 换行 (应使用 \\N)`);
    }
  }
  
  return errors;
}

function checkSubtitle(filePath) {
  console.log(`\n📝 字幕质量检查`);
  console.log(`============================================================`);
  console.log(`文件: ${filePath}`);
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`============================================================\n`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ 文件不存在: ${filePath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const { styleLine, formatFields, dialogues, hasPlayRes } = parseASS(content);
  
  const allErrors = [];
  
  // 1. 检查 PlayResX/PlayResY (不应该存在)
  if (hasPlayRes) {
    allErrors.push({ type: '❌', msg: '使用了 PlayResX/PlayResY (应删除，使用标准化像素值)' });
  }
  
  // 2. 检查 Style 行
  const styleValidation = validateStyleLine(styleLine);
  allErrors.push(...styleValidation.errors.map(e => ({ type: '❌', msg: e })));
  
  // 3. 检查 Format 行
  const formatErrors = validateFormatLine(formatFields);
  allErrors.push(...formatErrors.map(e => ({ type: '❌', msg: e })));
  
  // 4. 检查 Dialogue 行
  const dialogueErrors = validateDialogues(dialogues);
  allErrors.push(...dialogueErrors.map(e => ({ type: '❌', msg: e })));
  
  // 输出结果
  if (allErrors.length === 0) {
    console.log('✅ 字幕质量检查通过！\n');
    console.log('规范检查:');
    console.log('  • Fontsize = 10 ✅');
    console.log('  • Fontname = PingFang SC ✅');
    console.log('  • Alignment = 2 (底部居中) ✅');
    console.log('  • PrimaryColour = &H00FFFF (黄色) ✅');
    console.log('  • Format 字段数 = 10 ✅');
    console.log('  • 无 PlayResX/PlayResY ✅');
    console.log('  • 无 \\\\N 换行 ✅');
    console.log(`  • 共 ${dialogues.length} 条字幕\n`);
    return true;
  } else {
    console.log(`❌ 发现 ${allErrors.length} 个错误:\n`);
    allErrors.forEach(e => console.log(`  ${e.type} ${e.msg}`));
    console.log('');
    return false;
  }
}

// CLI 入口
if (require.main === module) {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log('用法: node check-subtitle.js <字幕文件路径>');
    console.log('示例: node check-subtitle.js ./audio/subtitles.ass');
    process.exit(1);
  }
  
  const passed = checkSubtitle(path.resolve(filePath));
  process.exit(passed ? 0 : 1);
}

module.exports = { checkSubtitle };
