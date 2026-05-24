#!/usr/bin/env node

/**
 * Video Creator 集成测试脚本
 * 测试宝玉技能集成和完整工作流程
 */

const fs = require('fs').promises;
const path = require('path');
const BaoyuIntegration = require('./baoyu-integration');
const VideoCreator = require('./main');

async function runTests() {
  console.log('🧪 Video Creator 集成测试');
  console.log('='.repeat(50));
  
  const testDir = path.join(__dirname, '..', 'test-output');
  await fs.mkdir(testDir, { recursive: true });
  
  const testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // 测试 1: BaoyuIntegration 类初始化
  console.log('\n1. 测试宝玉技能集成类...');
  try {
    const baoyu = new BaoyuIntegration({
      outputDir: testDir
    });
    
    if (baoyu && typeof baoyu.callBaoyuSkill === 'function') {
      console.log('  ✅ BaoyuIntegration 初始化成功');
      testResults.passed++;
    } else {
      throw new Error('BaoyuIntegration 方法缺失');
    }
    testResults.total++;
  } catch (error) {
    console.log(`  ❌ BaoyuIntegration 初始化失败: ${error.message}`);
    testResults.failed++;
    testResults.total++;
  }
  
  // 测试 2: VideoCreator 类初始化
  console.log('\n2. 测试 VideoCreator 类...');
  try {
    const creator = new VideoCreator({
      outputDir: testDir,
      style: 'tech-modern',
      duration: 15
    });
    
    if (creator && creator.baoyu && creator.options) {
      console.log('  ✅ VideoCreator 初始化成功');
      testResults.passed++;
    } else {
      throw new Error('VideoCreator 属性缺失');
    }
    testResults.total++;
  } catch (error) {
    console.log(`  ❌ VideoCreator 初始化失败: ${error.message}`);
    testResults.failed++;
    testResults.total++;
  }
  
  // 测试 3: 内容分析功能
  console.log('\n3. 测试内容分析功能...');
  try {
    const testContent = `# 测试文章

这是一篇测试文章，用于验证内容分析功能。

## 主要特点
- 功能一：智能分析
- 功能二：自动处理
- 功能三：优化输出

## 总结
测试完成。`;
    
    const ContentProcessor = require('./content-processor');
    const processor = new ContentProcessor();
    const result = await processor.process(testContent);
    
    if (result && result.content && result.metadata) {
      console.log(`  ✅ 内容分析成功: ${result.metadata.words}字, ${result.metadata.paragraphs}段`);
      testResults.passed++;
    } else {
      throw new Error('内容分析返回数据不完整');
    }
    testResults.total++;
  } catch (error) {
    console.log(`  ❌ 内容分析失败: ${error.message}`);
    testResults.failed++;
    testResults.total++;
  }
  
  // 测试 4: HTML构建功能
  console.log('\n4. 测试HTML构建功能...');
  try {
    const HtmlBuilder = require('./html-builder');
    const builder = new HtmlBuilder();
    
    const testContent = '# 测试标题\n\n测试内容';
    const testMetadata = {
      title: '测试标题',
      summary: '测试摘要',
      tags: ['测试', 'HTML', '构建'],
      words: 100,
      paragraphs: 2
    };
    
    const htmlPath = path.join(testDir, 'test.html');
    const result = await builder.buildPage(testContent, testMetadata, htmlPath);
    
    if (result && (await fs.stat(htmlPath)).isFile()) {
      const htmlContent = await fs.readFile(htmlPath, 'utf-8');
      if (htmlContent.includes('测试标题') && htmlContent.includes('<!DOCTYPE html>')) {
        console.log('  ✅ HTML构建成功');
        testResults.passed++;
      } else {
        throw new Error('HTML内容不正确');
      }
    } else {
      throw new Error('HTML文件未生成');
    }
    testResults.total++;
  } catch (error) {
    console.log(`  ❌ HTML构建失败: ${error.message}`);
    testResults.failed++;
    testResults.total++;
  }
  
  // 测试 5: 视频主题配置
  console.log('\n5. 测试视频主题配置...');
  try {
    const VideoComposer = require('./video-composer');
    const composer = new VideoComposer();
    
    const themes = composer.themes;
    const requiredThemes = ['tech-modern', 'cyberpunk', 'neon-future', 'minimal-tech'];
    
    const missingThemes = requiredThemes.filter(theme => !themes[theme]);
    
    if (missingThemes.length === 0) {
      console.log(`  ✅ 视频主题配置完整: ${Object.keys(themes).length} 种主题`);
      testResults.passed++;
    } else {
      throw new Error(`缺失主题: ${missingThemes.join(', ')}`);
    }
    testResults.total++;
  } catch (error) {
    console.log(`  ❌ 视频主题配置测试失败: ${error.message}`);
    testResults.failed++;
    testResults.total++;
  }
  
  // 测试 6: 配置文件检查
  console.log('\n6. 测试配置文件...');
  try {
    const configFiles = [
      'references/H-CONFIG/baoyu-config.json',
      'references/H-CONFIG/tailwind-config.json',
      'references/H-CONFIG/cdn-mapping.json'
    ];
    
    const missingFiles = [];
    
    for (const configFile of configFiles) {
      const filePath = path.join(__dirname, '..', configFile);
      try {
        await fs.access(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const config = JSON.parse(content);
        
        if (Object.keys(config).length > 0) {
          console.log(`  ✅ ${configFile} 配置有效`);
        } else {
          missingFiles.push(`${configFile} (空配置)`);
        }
      } catch (error) {
        missingFiles.push(`${configFile} (${error.message})`);
      }
    }
    
    if (missingFiles.length === 0) {
      console.log('  ✅ 所有配置文件检查通过');
      testResults.passed++;
    } else {
      throw new Error(`配置文件问题: ${missingFiles.join(', ')}`);
    }
    testResults.total++;
  } catch (error) {
    console.log(`  ❌ 配置文件测试失败: ${error.message}`);
    testResults.failed++;
    testResults.total++;
  }
  
  // 测试 7: 完整工作流程模拟
  console.log('\n7. 测试完整工作流程模拟...');
  try {
    const creator = new VideoCreator({
      outputDir: path.join(testDir, 'workflow'),
      content: `# 集成测试文章

## 测试目的
验证Video Creator技能的完整工作流程。

## 测试内容
1. 内容处理
2. 图片生成
3. HTML构建
4. 视频合成

## 预期结果
所有步骤成功完成，生成完整的输出文件。`,
      style: 'tech-modern',
      duration: 20,
      skipImages: true, // 跳过图片生成以加速测试
      skipVideo: true   // 跳过视频生成以加速测试
    });
    
    // 模拟运行（不实际生成文件）
    await creator.createOutputDir();
    await creator.getContent();
    await creator.analyzeContent();
    
    console.log('  ✅ 工作流程模拟成功');
    console.log(`     内容: ${creator.metadata.words}字`);
    console.log(`     建议时长: ${creator.metadata.suggestedDuration}秒`);
    console.log(`     关键词: ${creator.metadata.keywords.slice(0, 3).join(', ')}`);
    
    testResults.passed++;
    testResults.total++;
  } catch (error) {
    console.log(`  ❌ 工作流程模拟失败: ${error.message}`);
    testResults.failed++;
    testResults.total++;
  }
  
  // 总结
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总:');
  console.log(`   通过: ${testResults.passed}/${testResults.total}`);
  console.log(`   失败: ${testResults.failed}/${testResults.total}`);
  console.log(`   成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 所有测试通过！Video Creator 技能集成正常。');
    console.log('\n🚀 下一步:');
    console.log('   1. 运行完整示例: node examples/demo/scripts/run-demo.js');
    console.log('   2. 使用技能: /video-creator --topic "测试主题"');
    console.log('   3. 查看文档: cat SKILL.md | head -50');
  } else {
    console.log('\n⚠️  部分测试失败，请检查：');
    console.log('   1. 宝玉技能是否安装');
    console.log('   2. 依赖是否完整: npm install');
    console.log('   3. 配置文件是否正确');
    console.log('   4. 查看详细错误信息');
    
    process.exit(1);
  }
  
  // 清理测试文件
  try {
    await fs.rm(testDir, { recursive: true, force: true });
    console.log('\n🧹 测试文件已清理');
  } catch (error) {
    // 忽略清理错误
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = { runTests };