#!/usr/bin/env node
/**
 * fix-text-component.js
 *
 * 自动将 Video.tsx 中的 <Text> 组件替换为 <div>
 * Remotion 4.x 不存在 <Text> 组件（不在 47 个 exports 中），
 * 会导致 React Error #130: Element type is invalid
 *
 * 用法: node fix-text-component.js <project-dir>
 *       node fix-text-component.js <project-dir> --dry-run
 *
 * 退出码: 0 = 已修复或无问题, 1 = 出错
 */

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(process.argv[2] || '.');
const DRY_RUN = process.argv.includes('--dry-run');

const TSX_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// 查找 Video.tsx（支持多种常见命名）
function findVideoFile(dir) {
  const candidates = ['Video.tsx', 'VerticalVideo.tsx', 'MainVideo.tsx', 'App.tsx'];
  for (const name of candidates) {
    const p = path.join(dir, 'src', name);
    if (fs.existsSync(p)) return p;
  }
  // 递归搜索 src/ 下的第一个 .tsx 文件
  const srcDir = path.join(dir, 'src');
  if (fs.existsSync(srcDir)) {
    for (const f of fs.readdirSync(srcDir)) {
      if (TSX_EXTENSIONS.includes(path.extname(f))) {
        return path.join(srcDir, f);
      }
    }
  }
  return null;
}

function fixContent(content) {
  let changed = false;
  let textCount = 0;

  // 替换 <Text 或 <Text>
  let next = content.replace(/<Text\b/g, () => {
    textCount++;
    changed = true;
    return '<div';
  });

  // 替换 </Text>（支持空白）
  next = next.replace(/<\/\s*Text\s*>/g, () => {
    textCount++;
    changed = true;
    return '</div>';
  });

  return { content: next, count: textCount };
}

function main() {
  console.log(`\n========== <Text> → <div> 自动修复 ==========\n`);
  console.log(`项目目录: ${PROJECT_DIR}`);
  console.log(`模式: ${DRY_RUN ? 'DRY RUN（不写入）' : 'LIVE（写入文件）'}\n`);

  const tsxFile = findVideoFile(PROJECT_DIR);
  if (!tsxFile) {
    console.log('❌ 未找到 Video.tsx 文件');
    process.exit(1);
  }
  console.log(`找到: ${tsxFile}\n`);

  const original = fs.readFileSync(tsxFile, 'utf8');
  const { content, count } = fixContent(original);

  if (count === 0) {
    console.log('✅ 未发现 <Text> 组件，无需修复');
    process.exit(0);
  }

  console.log(`发现 ${count} 处 <Text> 组件引用`);
  if (DRY_RUN) {
    console.log('\nDRY RUN: 以下是拟议的更改（不写入）');
    console.log('实际运行时将替换全部:');
    console.log('  <Text → <div');
    console.log('  </Text> → </div>');
    // 展示前3处差异
    const lines = original.split('\n');
    let shown = 0;
    for (let i = 0; i < lines.length && shown < 3; i++) {
      if (/<Text|<\/Text>/.test(lines[i])) {
        console.log(`  行 ${i + 1}: ${lines[i].trim()}`);
        shown++;
      }
    }
    process.exit(0);
  }

  // 备份
  const backup = tsxFile + '.backup';
  fs.copyFileSync(tsxFile, backup);
  console.log(`✅ 备份: ${path.basename(backup)}`);

  // 写入修复后的内容
  fs.writeFileSync(tsxFile, content, 'utf8');
  console.log(`✅ 已修复 ${count} 处，写入: ${path.basename(tsxFile)}`);

  // 验证修复
  const verified = fs.readFileSync(tsxFile, 'utf8');
  if (/<Text[\s>]/.test(verified) || /<\/\s*Text\s*>/.test(verified)) {
    console.log('\n❌ 警告: 修复后文件中仍检测到 <Text>，可能需要手动检查');
    process.exit(1);
  } else {
    console.log('✅ 验证通过: 文件中已无 <Text> 组件');
  }

  console.log('\n下一步:');
  console.log('  1. 运行 video-quality-gate.js render 节点重新验证');
  console.log('  2. 运行 Remotion 渲染测试');
  console.log('');
  process.exit(0);
}

main();
