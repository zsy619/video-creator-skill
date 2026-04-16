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
  console.log('  tech-modern    现代科技风 (默认)');
  console.log('  cyberpunk      赛博朋克风');
  console.log('  neon-future    霓虹未来风');
  console.log('  minimal-tech   极简科技风');
  console.log('  gradient-wave  渐变波纹风');
  console.log('  particle-tech  粒子科技风');
  console.log('  glass-morphism 玻璃拟态风');
  console.log('  holographic    全息投影风');
  console.log('  data-stream    数据流风');
  console.log('  quantum-tech   量子科技风');
  console.log('');
  console.log(chalk.yellow('📱 目标平台:'));
  console.log('  xhs      小红书优化');
  console.log('  wechat   视频号优化');
  console.log('  all      所有平台 (默认)');
}

// 主函数
async function main() {
  showWelcome();
  
  program
    .name('video-creator')
    .description('自动化视频创作工具，整合宝玉技能生态')
    .version('1.0.0');
  
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
    .option('-s, --style <style>', '主题风格', 'tech-modern')
    .option('-p, --platform <platform>', '目标平台', 'all');
  
  // 其他选项
  program
    .option('--skip-images', '跳过图片生成')
    .option('--skip-html', '跳过HTML生成')
    .option('--skip-video', '跳过视频生成')
    .option('--debug', '启用调试模式');
  
  program.parse(process.argv);
  
  const options = program.opts();
  
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
    // 创建视频创作实例（映射 CLI 选项到 VideoCreator 选项）
    const creatorOptions = {
      ...options,
      outputDir: options.output
    };
    const creator = new VideoCreator(creatorOptions);
    
    // 运行创作流程
    await creator.run();
    
    console.log(chalk.green('\n🎉 视频创作完成！'));
    console.log(chalk.blue('📁 生成的文件:'));
    
    // 显示生成的文件列表
    const outputDir = path.resolve(options.output);
    const files = await listGeneratedFiles(outputDir);
    
    files.forEach(file => {
      const relativePath = path.relative(process.cwd(), file);
      console.log(`  ${chalk.green('✓')} ${relativePath}`);
    });
    
    console.log(chalk.yellow('\n🚀 下一步:'));
    console.log(`  查看HTML页面: open ${path.join(outputDir, 'html', 'article-summary.html')}`);
    console.log(`  查看生成报告: cat ${path.join(outputDir, 'report.md')}`);
    
  } catch (error) {
    console.log(chalk.red(`\n❌ 视频创作失败: ${error.message}`));
    
    if (options.debug) {
      console.log(chalk.gray('\n🔧 调试信息:'));
      console.error(error);
    }
    
    process.exit(1);
  }
}

// 列出生成的文件
async function listGeneratedFiles(dir) {
  const files = [];
  
  async function scanDirectory(currentDir) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else {
          // 跳过临时文件和隐藏文件
          if (!entry.name.startsWith('.') && !entry.name.startsWith('_')) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // 忽略目录不存在的错误
    }
  }
  
  await scanDirectory(dir);
  return files.sort();
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('❌ 未处理的错误:'), error);
    process.exit(1);
  });
}

module.exports = { main, showHelp };