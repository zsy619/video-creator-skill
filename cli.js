#!/usr/bin/env node

/**
 * Video Creator CLI 入口
 * 提供命令行界面来使用视频创作技能
 */

const fs = require('fs').promises;
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const VideoCreator = require('./scripts/main');
const { VALID_STYLES, VALID_PLATFORMS } = require('./scripts/themes');

// 显示欢迎信息
function showWelcome() {
  console.log(chalk.cyan(figlet.textSync('Video Creator', { horizontalLayout: 'full' })));
  console.log(chalk.gray('🎬 自动化视频创作工具 - 整合宝玉技能生态\n'));
}

// 显示帮助信息
function showHelp() {
  console.log(chalk.yellow('📖 使用示例:'));
  console.log('  video-creator --url https://example.com/article');
  console.log('  video-creator --topic "人工智能发展趋势"');
  console.log('  video-creator --content "# 我的内容\\n\\n详细内容..."');
  console.log('');
  console.log(chalk.yellow('🎨 主题风格:'));
  VALID_STYLES.forEach(s => {
    const theme = require('./scripts/themes').THEMES[s];
    console.log(`  ${s.padEnd(18)} ${theme ? theme.name || '' : ''}`);
  });
  console.log('');
  console.log(chalk.yellow('📱 目标平台:'));
  console.log('  xiaohongshu  小红书优化');
  console.log('  wechat       视频号优化');
  console.log('  douyin       抖音优化');
  console.log('  youtube_shorts YouTube Shorts');
  console.log('  all          所有平台 (默认)');
}

// 主函数
async function main() {
  showWelcome();

  program
    .name('video-creator')
    .description('自动化视频创作工具，整合宝玉技能生态')
    .version('1.2.0');

  // 内容来源选项
  program
    .option('-u, --url <url>', '从网页链接获取内容')
    .option('-t, --topic <topic>', '搜索主题获取内容')
    .option('-c, --content <content>', '直接使用提供的内容')
    .option('-f, --file <file>', '从文件读取内容');

  // 输出选项
  program
    .option('-o, --output <dir>', '输出目录', './video-output')
    .option('--duration <seconds>', '视频时长（秒）', parseInt)
    .option('--fps <fps>', '视频帧率', parseInt, 60)
    .option('--width <width>', '视频宽度', parseInt, 1080)
    .option('--height <height>', '视频高度', parseInt, 1920)
    .option('--quality <quality>', '视频质量', 'high');

  // 样式选项
  program
    .option('-s, --style <style>', '主题风格', 'cyberpunk')
    .option('-p, --platform <platform>', '目标平台', 'all');

  // 跳过选项
  program
    .option('--skip-images', '跳过图片生成')
    .option('--skip-html', '跳过HTML生成')
    .option('--skip-audio', '跳过音频生成')
    .option('--skip-subtitles', '跳过字幕生成')
    .option('--skip-quality-check', '跳过质量检查')
    .option('--skip-video', '跳过视频生成')
    .option('--debug', '启用调试模式');

  // === 子命令: check（质量检查） ===
  program
    .command('check')
    .description('检查项目质量并自动修复')
    .option('-p, --project <dir>', '项目目录', './video-output')
    .option('--fix', '自动修复问题', true)
    .action(async (cmdOptions) => {
      try {
        const QualityChecker = require('./scripts/quality-checker');
        const checker = new QualityChecker({
          projectDir: cmdOptions.project,
          fixIssues: cmdOptions.fix,
          verbose: true
        });
        const report = await checker.runFullCheck();
        console.log(report.summary.passed
          ? chalk.green('✅ 质量检查通过')
          : chalk.red(`❌ 质量检查发现问题: ${report.summary.errors} 错误, ${report.summary.warnings} 警告`));
      } catch (error) {
        console.error(chalk.red('❌ 质量检查失败:'), error.message);
        process.exit(1);
      }
    });

  // === 子命令: subtitles（字幕修复） ===
  program
    .command('subtitles')
    .description('生成或修复字幕文件')
    .option('-p, --project <dir>', '项目目录', './video-output')
    .option('--generate', '生成字幕')
    .option('--fix', '修复字体兼容性')
    .action(async (cmdOptions) => {
      try {
        if (cmdOptions.generate) {
          const SubtitleGenerator = require('./scripts/subtitle-generator');
          const generator = new SubtitleGenerator({ fontSize: 10, color: '&H0000FFFF' });

          const audioPath = path.join(cmdOptions.project, 'audio', 'full_narration.txt');
          let text = '默认配音文本';
          try { text = await fs.readFile(audioPath, 'utf-8'); } catch {}

          const subtitles = await generator.generateFromText(text, 30);
          const outPath = path.join(cmdOptions.project, 'audio', 'subtitles.ass');
          await generator.generateASS(subtitles, outPath);
          console.log(chalk.green(`✅ 字幕生成完成: ${outPath}`));
        }
        if (cmdOptions.fix) {
          const SubtitleGenerator = require('./scripts/subtitle-generator');
          const generator = new SubtitleGenerator();
          const assPath = path.join(cmdOptions.project, 'audio', 'subtitles.ass');
          await generator.fixFontCompatibility(assPath);
          console.log(chalk.green('✅ 字体兼容性已修复'));
        }
      } catch (error) {
        console.error(chalk.red('❌ 字幕操作失败:'), error.message);
        process.exit(1);
      }
    });

  // === 子命令: batch（批量处理） ===
  program
    .command('batch')
    .description('批量处理多个视频项目')
    .option('-d, --directory <dir>', '项目根目录', './workspace')
    .option('--fix', '自动修复问题', true)
    .action(async (cmdOptions) => {
      try {
        const entries = await fs.readdir(cmdOptions.directory, { withFileTypes: true });
        const projects = entries.filter(e => e.isDirectory()).map(e => e.name);

        console.log(chalk.blue(`📦 发现 ${projects.length} 个项目`));

        const QualityChecker = require('./scripts/quality-checker');
        for (const project of projects) {
          const projectDir = path.join(cmdOptions.directory, project);
          console.log(chalk.yellow(`\n🔍 检查: ${project}`));
          try {
            const checker = new QualityChecker({ projectDir, fixIssues: cmdOptions.fix });
            const report = await checker.runFullCheck();
            console.log(report.summary.passed
              ? chalk.green(`  ✅ ${project}: 通过`)
              : chalk.red(`  ❌ ${project}: ${report.summary.errors} 错误, ${report.summary.warnings} 警告`));
          } catch (e) {
            console.warn(chalk.yellow(`  ⚠️  ${project}: ${e.message}`));
          }
        }
        console.log(chalk.green('\n✅ 批量处理完成'));
      } catch (error) {
        console.error(chalk.red('❌ 批量处理失败:'), error.message);
        process.exit(1);
      }
    });

  program.parse(process.argv);

  const options = program.opts();

  // 如果使用了子命令，不执行主流程
  if (process.argv.includes('check') || process.argv.includes('subtitles') || process.argv.includes('batch')) {
    return;
  }

  // 验证输入
  if (!options.url && !options.topic && !options.content && !options.file) {
    console.log(chalk.red('❌ 错误: 请提供内容来源'));
    console.log('使用 --help 查看帮助信息');
    showHelp();
    process.exit(1);
  }

  // 如果指定了文件，读取文件内容
  if (options.file) {
    try {
      const content = await fs.readFile(options.file, 'utf-8');
      options.content = content;
      console.log(chalk.green(`📄 从文件读取内容: ${options.file}`));
    } catch (error) {
      console.log(chalk.red(`❌ 读取文件失败: ${error.message}`));
      process.exit(1);
    }
  }

  // 验证主题风格
  if (!VALID_STYLES.includes(options.style)) {
    console.log(chalk.red(`❌ 错误: 无效的主题风格 "${options.style}"`));
    console.log(chalk.yellow('可用风格:'), VALID_STYLES.join(', '));
    process.exit(1);
  }

  // 验证平台
  if (!VALID_PLATFORMS.includes(options.platform)) {
    console.log(chalk.red(`❌ 错误: 无效的平台 "${options.platform}"`));
    console.log(chalk.yellow('可用平台:'), VALID_PLATFORMS.join(', '));
    process.exit(1);
  }

  // 显示配置信息
  console.log(chalk.blue('⚙️  配置信息:'));
  console.log(`  内容来源: ${options.url ? 'URL' : options.topic ? '主题' : '内容'}`);
  console.log(`  输出目录: ${options.output}`);
  console.log(`  视频规格: ${options.width}x${options.height} @ ${options.fps}fps`);
  console.log(`  主题风格: ${options.style}`);
  console.log(`  目标平台: ${options.platform}`);
  console.log('');

  try {
    const creatorOptions = { ...options, outputDir: options.output };
    const creator = new VideoCreator(creatorOptions);
    await creator.run();

    console.log(chalk.green('\n🎉 视频创作完成！'));
    console.log(chalk.blue('📁 输出目录:'), path.resolve(options.output));

  } catch (error) {
    console.log(chalk.red(`\n❌ 视频创作失败: ${error.message}`));
    if (options.debug) {
      console.log(chalk.gray('\n🔧 调试信息:'));
      console.error(error);
    }
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('❌ 未处理的错误:'), error);
    process.exit(1);
  });
}

module.exports = { main, showHelp };
