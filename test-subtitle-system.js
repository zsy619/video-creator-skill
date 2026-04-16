#!/usr/bin/env node

/**
 * 测试字幕生成和质量检查系统
 */

const fs = require('fs').promises;
const path = require('path');
const SubtitleGenerator = require('./scripts/subtitle-generator');
const QualityChecker = require('./scripts/quality-checker');

async function testSubtitleGenerator() {
  console.log('🧪 测试字幕生成器...');
  
  try {
    const generator = new SubtitleGenerator();
    
    // 测试1: 生成字幕
    console.log('1. 测试字幕生成...');
    const testText = `这是一个测试视频的配音文本。我们将演示字幕生成功能。
视频介绍了AI工具如何提高工作效率。通过自动化流程，可以节省大量时间。
每个功能都有详细说明和实际案例。`;
    
    const subtitles = await generator.generateFromText(testText, 45);
    console.log(`   生成 ${subtitles.length} 条字幕`);
    
    // 测试2: 保存ASS文件
    console.log('2. 测试ASS文件生成...');
    const testDir = path.join(__dirname, 'test-output');
    await fs.mkdir(testDir, { recursive: true });
    
    const assPath = path.join(testDir, 'test-subtitles.ass');
    await generator.generateASS(subtitles, assPath);
    console.log(`   保存到: ${assPath}`);
    
    // 测试3: 检查质量
    console.log('3. 测试质量检查...');
    const qualityResult = await generator.checkQuality(assPath);
    console.log(`   质量检查: ${qualityResult.summary}`);
    
    // 测试4: 修复字体兼容性（模拟不兼容字体）
    console.log('4. 测试字体修复...');
    const badAssPath = path.join(testDir, 'bad-font.ass');
    const badContent = `[V4+ Styles]
Style: Default,STHeiti Medium,10,&H0000FFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,50,50,30,1`;
    
    await fs.writeFile(badAssPath, badContent, 'utf8');
    const fixed = await generator.fixFontCompatibility(badAssPath);
    console.log(`   字体修复: ${fixed ? '✅ 已修复' : '✅ 无需修复'}`);
    
    console.log('✅ 字幕生成器测试完成');
    return true;
    
  } catch (error) {
    console.error('❌ 字幕生成器测试失败:', error.message);
    return false;
  }
}

async function testQualityChecker() {
  console.log('\n🧪 测试质量检查器...');
  
  try {
    // 创建测试项目结构
    const testProject = path.join(__dirname, 'test-project');
    await createTestProject(testProject);
    
    // 运行质量检查
    const checker = new QualityChecker({
      projectDir: testProject,
      fixIssues: true,
      verbose: false
    });
    
    console.log('1. 运行完整质量检查...');
    const report = await checker.runFullCheck();
    
    console.log(`2. 检查结果:`);
    console.log(`   总问题: ${report.summary.totalIssues}`);
    console.log(`   错误: ${report.summary.errors}`);
    console.log(`   警告: ${report.summary.warnings}`);
    console.log(`   已修复: ${report.summary.fixed}`);
    console.log(`   通过: ${report.summary.passed ? '✅' : '❌'}`);
    
    // 保存报告
    const reportPath = path.join(testProject, 'test-report.json');
    await checker.saveReport(report, reportPath);
    console.log(`3. 报告保存到: ${reportPath}`);
    
    console.log('✅ 质量检查器测试完成');
    return true;
    
  } catch (error) {
    console.error('❌ 质量检查器测试失败:', error.message);
    return false;
  }
}

async function createTestProject(projectDir) {
  // 清理旧测试项目
  try {
    await fs.rm(projectDir, { recursive: true, force: true });
  } catch {}
  
  // 创建目录结构
  const dirs = [
    'docs',
    'docs/assets',
    'audio',
    'video-project',
    'video-project/src',
    'video-project/out'
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(path.join(projectDir, dir), { recursive: true });
  }
  
  // 创建测试文件
  await fs.writeFile(
    path.join(projectDir, 'docs', 'video-script.md'),
    '# 测试视频脚本\n\n这是一个测试视频。',
    'utf8'
  );
  
  await fs.writeFile(
    path.join(projectDir, 'docs', 'copy.md'),
    '# 测试文案\n\n小红书标题: 测试视频 🎬',
    'utf8'
  );
  
  await fs.writeFile(
    path.join(projectDir, 'audio', 'full_narration.txt'),
    '这是一个测试视频的配音文本。我们将演示各种功能。',
    'utf8'
  );
  
  // 创建有问题的ASS文件（使用不兼容字体）
  const generator = new SubtitleGenerator();
  const subtitles = await generator.generateFromText('测试字幕', 30);
  
  // 手动修改为不兼容字体
  let assContent = generator.buildASSContent(subtitles, {
    ...generator.options,
    font: 'STHeiti Medium' // 不兼容字体
  });
  
  await fs.writeFile(
    path.join(projectDir, 'audio', 'subtitles.ass'),
    assContent,
    'utf8'
  );
  
  // 创建SRT文件（建议转换）
  const srtContent = `1
00:00:00,000 --> 00:00:03,000
测试SRT字幕

2
00:00:03,000 --> 00:00:06,000
第二行字幕`;
  
  await fs.writeFile(
    path.join(projectDir, 'audio', 'subtitles.srt'),
    srtContent,
    'utf8'
  );
  
  console.log(`   创建测试项目: ${projectDir}`);
}

async function testCLITools() {
  console.log('\n🧪 测试CLI工具...');
  
  try {
    const { spawn } = require('child_process');
    const testProject = path.join(__dirname, 'test-project');
    
    // 测试video-check工具
    console.log('1. 测试video-check工具...');
    
    const args = [
      './scripts/video-check.js',
      'check-quality',
      '--project',
      testProject,
      '--fix'
    ];
    
    return new Promise((resolve) => {
      const process = spawn('node', args, {
        stdio: 'inherit',
        cwd: __dirname
      });
      
      process.on('close', (code) => {
        console.log(`   video-check退出码: ${code}`);
        resolve(code === 0);
      });
    });
    
  } catch (error) {
    console.error('❌ CLI工具测试失败:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 开始字幕系统测试套件\n');
  
  const results = [];
  
  // 运行测试
  results.push(await testSubtitleGenerator());
  results.push(await testQualityChecker());
  results.push(await testCLITools());
  
  // 总结
  console.log('\n📊 测试结果汇总');
  console.log('=' .repeat(40));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`通过: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 所有测试通过！字幕系统工作正常。');
  } else {
    console.log('⚠️  部分测试失败，请检查问题。');
    process.exit(1);
  }
  
  // 清理测试文件
  console.log('\n🧹 清理测试文件...');
  try {
    await fs.rm(path.join(__dirname, 'test-output'), { recursive: true, force: true });
    await fs.rm(path.join(__dirname, 'test-project'), { recursive: true, force: true });
    console.log('✅ 清理完成');
  } catch (error) {
    console.warn('⚠️  清理失败:', error.message);
  }
}

// 运行测试
runAllTests().catch(error => {
  console.error('❌ 测试套件执行失败:', error.message);
  process.exit(1);
});