#!/usr/bin/env node

/**
 * Video Creator 质量检查与字幕生成工具
 * 集成字幕生成、质量检查、自动修复功能
 */

const fs = require('fs').promises;
const path = require('path');
const { program } = require('commander');
const SubtitleGenerator = require('./subtitle-generator');
const QualityChecker = require('./quality-checker');

program
  .name('video-check')
  .description('视频创作质量检查与字幕生成工具')
  .version('1.0.0');

// 字幕生成命令
program
  .command('generate-subtitles')
  .description('生成ASS字幕文件')
  .option('-i, --input <file>', '输入文本文件路径')
  .option('-o, --output <file>', '输出ASS文件路径', 'subtitles.ass')
  .option('-d, --duration <seconds>', '视频总时长（秒）', '60')
  .option('-f, --font <font>', '字体名称（默认自动选择）')
  .option('-s, --size <size>', '字体大小', '10')
  .option('--color <color>', '字体颜色', '&H0000FFFF')
  .action(async (options) => {
    try {
      console.log('📝 开始生成字幕...');
      
      const generator = new SubtitleGenerator({
        font: options.font,
        fontSize: parseInt(options.size),
        color: options.color
      });
      
      // 读取输入文本
      const text = await fs.readFile(options.input, 'utf8');
      
      // 生成字幕
      const subtitles = await generator.generateFromText(
        text,
        parseFloat(options.duration)
      );
      
      // 保存ASS文件
      await generator.generateASS(subtitles, options.output);
      
      console.log(`✅ 字幕生成完成: ${options.output}`);
      
    } catch (error) {
      console.error('❌ 字幕生成失败:', error.message);
      process.exit(1);
    }
  });

// 质量检查命令
program
  .command('check-quality')
  .description('检查视频项目质量')
  .option('-p, --project <dir>', '项目目录', '.')
  .option('-f, --fix', '自动修复问题', false)
  .option('--no-fonts', '跳过字体检查', false)
  .option('--no-audio', '跳过音频检查', false)
  .option('--no-subtitles', '跳过年幕检查', false)
  .option('--no-video', '跳过视频检查', false)
  .option('--no-structure', '跳过结构检查', false)
  .option('-o, --output <file>', '输出报告文件')
  .action(async (options) => {
    try {
      const checker = new QualityChecker({
        projectDir: options.project,
        checkFonts: options.fonts,
        checkAudio: options.audio,
        checkSubtitles: options.subtitles,
        checkVideo: options.video,
        checkStructure: options.structure,
        fixIssues: options.fix,
        verbose: true
      });
      
      const report = await checker.runFullCheck();
      
      if (options.output) {
        await checker.saveReport(report, options.output);
      }
      
      // 根据检查结果退出码
      const hasErrors = report.summary.errors > 0;
      process.exit(hasErrors ? 1 : 0);
      
    } catch (error) {
      console.error('❌ 质量检查失败:', error.message);
      process.exit(1);
    }
  });

// 字体修复命令
program
  .command('fix-fonts')
  .description('修复字体兼容性问题')
  .option('-p, --project <dir>', '项目目录', '.')
  .option('-r, --recursive', '递归处理子目录', false)
  .action(async (options) => {
    try {
      console.log('🔤 开始修复字体兼容性...');
      
      const generator = new SubtitleGenerator();
      let fixedCount = 0;
      let totalCount = 0;
      
      async function processDirectory(dir) {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory() && options.recursive) {
              await processDirectory(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.ass')) {
              totalCount++;
              const fixed = await generator.fixFontCompatibility(fullPath);
              if (fixed) fixedCount++;
            }
          }
        } catch (error) {
          console.warn(`⚠️  无法访问目录: ${dir}`, error.message);
        }
      }
      
      await processDirectory(options.project);
      
      console.log(`✅ 字体修复完成: 处理了 ${totalCount} 个文件，修复了 ${fixedCount} 个问题`);
      
    } catch (error) {
      console.error('❌ 字体修复失败:', error.message);
      process.exit(1);
    }
  });

// 批量处理命令
program
  .command('batch-process')
  .description('批量处理多个视频项目')
  .option('-d, --directory <dir>', '包含多个项目的目录', '.')
  .option('--check', '运行质量检查', true)
  .option('--fix', '自动修复问题', false)
  .option('--generate-subtitles', '生成缺失的字幕', false)
  .action(async (options) => {
    try {
      console.log('🔄 开始批量处理视频项目...');
      
      const entries = await fs.readdir(options.directory, { withFileTypes: true });
      const projectDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'));
      
      console.log(`找到 ${projectDirs.length} 个项目`);
      
      const results = [];
      
      for (const dirEntry of projectDirs) {
        const projectPath = path.join(options.directory, dirEntry.name);
        console.log(`\n📁 处理项目: ${dirEntry.name}`);
        
        try {
          const result = {
            project: dirEntry.name,
            path: projectPath,
            checks: {},
            fixes: []
          };
          
          // 运行质量检查
          if (options.check) {
            const checker = new QualityChecker({
              projectDir: projectPath,
              fixIssues: options.fix
            });
            
            const report = await checker.runFullCheck();
            result.checks = report.summary;
            result.issues = report.issues;
            
            if (options.fix) {
              result.fixes = checker.fixedIssues;
            }
          }
          
          // 生成缺失的字幕
          if (options.generateSubtitles) {
            const hasSubtitles = await checkSubtitlesExist(projectPath);
            if (!hasSubtitles) {
              console.log('📝 生成缺失的字幕...');
              await generateMissingSubtitles(projectPath);
              result.subtitlesGenerated = true;
            }
          }
          
          results.push(result);
          console.log(`✅ 项目处理完成: ${dirEntry.name}`);
          
        } catch (error) {
          console.error(`❌ 处理项目失败: ${dirEntry.name}`, error.message);
          results.push({
            project: dirEntry.name,
            error: error.message,
            failed: true
          });
        }
      }
      
      // 生成批量处理报告
      await generateBatchReport(results, options.directory);
      
      console.log(`\n🎉 批量处理完成: 成功处理 ${results.filter(r => !r.failed).length}/${results.length} 个项目`);
      
    } catch (error) {
      console.error('❌ 批量处理失败:', error.message);
      process.exit(1);
    }
  });

// 帮助函数：检查是否存在字幕文件
async function checkSubtitlesExist(projectPath) {
  try {
    const audioDir = path.join(projectPath, 'audio');
    const entries = await fs.readdir(audioDir);
    return entries.some(e => e.endsWith('.ass') || e.endsWith('.srt'));
  } catch {
    return false;
  }
}

// 帮助函数：生成缺失的字幕
async function generateMissingSubtitles(projectPath) {
  try {
    const generator = new SubtitleGenerator();
    
    // 查找配音文本
    const narrationPath = path.join(projectPath, 'audio', 'full_narration.txt');
    const text = await fs.readFile(narrationPath, 'utf8');
    
    // 假设视频时长60秒
    const subtitles = await generator.generateFromText(text, 60);
    
    // 保存ASS文件
    const outputPath = path.join(projectPath, 'audio', 'subtitles.ass');
    await generator.generateASS(subtitles, outputPath);
    
    return outputPath;
  } catch (error) {
    console.error('生成字幕失败:', error.message);
    return null;
  }
}

// 帮助函数：生成批量处理报告
async function generateBatchReport(results, directory) {
  const report = {
    timestamp: new Date().toISOString(),
    directory: directory,
    totalProjects: results.length,
    successful: results.filter(r => !r.failed).length,
    failed: results.filter(r => r.failed).length,
    projects: results.map(r => ({
      name: r.project,
      successful: !r.failed,
      checks: r.checks,
      issues: r.issues ? r.issues.length : 0,
      fixes: r.fixes ? r.fixes.length : 0,
      subtitlesGenerated: r.subtitlesGenerated || false,
      error: r.error
    }))
  };
  
  const reportPath = path.join(directory, 'batch-processing-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  console.log(`📄 批量处理报告已保存: ${reportPath}`);
  
  // 控制台摘要
  console.log('\n📊 批量处理摘要');
  console.log('=' .repeat(60));
  console.log(`总项目数: ${report.totalProjects}`);
  console.log(`成功: ${report.successful}`);
  console.log(`失败: ${report.failed}`);
  
  const totalIssues = results.reduce((sum, r) => sum + (r.issues ? r.issues.length : 0), 0);
  const totalFixes = results.reduce((sum, r) => sum + (r.fixes ? r.fixes.length : 0), 0);
  
  console.log(`发现问题: ${totalIssues}`);
  console.log(`修复问题: ${totalFixes}`);
  
  if (report.failed > 0) {
    console.log('\n❌ 失败项目:');
    results.filter(r => r.failed).forEach(r => {
      console.log(`  - ${r.project}: ${r.error}`);
    });
  }
}

// 如果没有子命令，显示帮助
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv);