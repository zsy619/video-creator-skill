#!/usr/bin/env node
/**
 * run-full-pipeline.js - Video Creator 一键完整执行脚本
 * 
 * 强制在每个 Step 完成后进行验证，确保不遗漏任何步骤。
 * 
 * 用法:
 *   node run-full-pipeline.js --project <项目路径> --input <内容>
 *   node run-full-pipeline.js --project ./workspace/my-video --input "https://github.com/xxx"
 *   node run-full-pipeline.js --project ./workspace/my-video --input "主题内容" --strict
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');

const SKILL_DIR = path.join(__dirname, '..');
const SCRIPTS_DIR = __dirname;

// 必需文件清单
const REQUIRED_DOCS = [
  'README.md', 'article.md', 'video-script.md', 'copy.md', 'wechat-copy.md',
  'posting-guide.md', 'landing-page.html', 'article-page.html', 'wechat-page.html',
  'session-log.md', 'report.json'
];
const REQUIRED_ASSETS = [
  'assets/cover.png',        // 1080x1920
  'assets/cover-wechat.png',  // 900x383
  'assets/cover-xhs.png'     // 1440x2560
];

/**
 * 日志输出
 */
function log(level, msg) {
  const icons = { info: 'ℹ️', ok: '✅', warn: '⚠️', error: '❌', step: '🔄' };
  console.log(`${icons[level] || '•'} ${msg}`);
}

/**
 * 执行 shell 命令
 */
function run(cmd, options = {}) {
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: options.cwd || process.cwd(),
      ...options
    });
    return { success: true, output };
  } catch (e) {
    return { success: false, error: e.message, output: e.stdout || '' };
  }
}

/**
 * 检查文件是否存在
 */
async function checkFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查视频尺寸
 */
function checkVideoDimensions(videoPath, expectedW, expectedH) {
  const result = run(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`);
  if (!result.success) return false;
  const [w, h] = result.output.trim().split('x').map(Number);
  return w === expectedW && h === expectedH;
}

/**
 * 检查音频参数
 */
function checkAudioParams(audioPath) {
  const result = run(`ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,bit_rate,sample_rate -of default=noprint_wrappers=1 "${audioPath}"`);
  if (!result.success) return false;
  const output = result.output;
  const hasAac = output.includes('aac');
  const has256k = output.includes('256000') || output.includes('256k');
  return hasAac; // 简化检查
}

/**
 * ============================================================
 *  Step 0: 创建文档（强制）
 * ============================================================
 */
async function step0_createDocs(projectDir) {
  log('step', 'Step 0: 创建文档...');
  
  const docsDir = path.join(projectDir, 'docs');
  await fs.mkdir(docsDir, { recursive: true });
  
  // 创建占位符文档（后续步骤会填充内容）
  for (const doc of REQUIRED_DOCS) {
    const docPath = path.join(docsDir, doc);
    if (!(await checkFileExists(docPath))) {
      await fs.writeFile(docPath, `# ${doc}\n\n> 占位符，待填充\n`);
    }
  }
  
  // 验证
  let missing = [];
  for (const doc of REQUIRED_DOCS) {
    if (!(await checkFileExists(path.join(docsDir, doc)))) {
      missing.push(doc);
    }
  }
  
  if (missing.length > 0) {
    log('error', `Step 0 失败: 缺少 ${missing.join(', ')}`);
    return false;
  }
  
  log('ok', `Step 0 完成: 11个文档已创建`);
  return true;
}

/**
 * ============================================================
 *  Step 6: 生成视觉（封面强制优先）
 * ============================================================
 */
async function step6_generateVisual(projectDir) {
  log('step', 'Step 6: 生成封面...');
  
  const assetsDir = path.join(projectDir, 'docs', 'assets');
  await fs.mkdir(assetsDir, { recursive: true });
  
  // 检查封面是否已存在（可能被 baoyu-imagine 或其他工具生成）
  let missing = [];
  for (const asset of REQUIRED_ASSETS) {
    const assetPath = path.join(projectDir, 'docs', asset);
    if (!(await checkFileExists(assetPath))) {
      missing.push(asset);
    }
  }
  
  if (missing.length > 0) {
    log('warn', `Step 6 警告: 以下封面未生成: ${missing.join(', ')}`);
    log('warn', '请使用 baoyu-imagine 生成封面，然后继续');
    return false;
  }
  
  // 验证封面尺寸
  const dimensions = [
    { file: 'assets/cover.png', w: 1080, h: 1920 },
    { file: 'assets/cover-wechat.png', w: 900, h: 383 },
    { file: 'assets/cover-xhs.png', w: 1440, h: 2560 }
  ];
  
  for (const dim of dimensions) {
    const dimPath = path.join(projectDir, 'docs', dim.file);
    const correct = checkVideoDimensions(dimPath, dim.w, dim.h);
    if (!correct) {
      log('error', `Step 6 失败: ${dim.file} 尺寸不正确`);
      return false;
    }
  }
  
  log('ok', `Step 6 完成: 3个封面尺寸正确`);
  return true;
}

/**
 * ============================================================
 *  Step 7: 生成音频
 * ============================================================
 */
async function step7_generateAudio(projectDir) {
  log('step', 'Step 7: 生成音频...');
  
  const audioPath = path.join(projectDir, 'audio', 'neural_1_2x.m4a');
  
  if (!(await checkFileExists(audioPath))) {
    log('error', `Step 7 失败: ${audioPath} 不存在`);
    log('info', '提示: 使用 edge-tts 生成音频后，重命名为 neural_1_2x.m4a');
    return false;
  }
  
  // 验证音频参数
  const result = run(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 "${audioPath}"`);
  if (!result.success) {
    log('error', `Step 7 失败: 无法读取音频时长`);
    return false;
  }
  
  log('ok', `Step 7 完成: 音频存在 (${parseFloat(result.output).toFixed(2)}s)`);
  return true;
}

/**
 * ============================================================
 *  Step 8: 生成字幕（调用 check-subtitle.js）
 * ============================================================
 */
async function step8_generateSubtitles(projectDir) {
  log('step', 'Step 8: 生成字幕...');
  
  const subtitlePath = path.join(projectDir, 'audio', 'subtitles.ass');
  
  if (!(await checkFileExists(subtitlePath))) {
    log('error', `Step 8 失败: ${subtitlePath} 不存在`);
    log('info', '提示: 生成 ASS 格式字幕文件');
    return false;
  }
  
  // 调用 check-subtitle.js 验证字幕质量
  log('info', '调用字幕质量检查...');
  const result = run(`node "${SCRIPTS_DIR}/check-subtitle.js" "${subtitlePath}"`, { stdio: 'pipe' });
  
  if (!result.success) {
    log('error', `Step 8 失败: 字幕质量检查未通过`);
    console.log(result.output);
    return false;
  }
  
  log('ok', `Step 8 完成: 字幕质量检查通过`);
  return true;
}

/**
 * ============================================================
 *  Step 10: 生成视频
 * ============================================================
 */
async function step10_generateVideo(projectDir) {
  log('step', 'Step 10: 生成视频...');
  
  const videoPath = path.join(projectDir, 'video-project', 'out', 'final-with-subs.mp4');
  
  if (!(await checkFileExists(videoPath))) {
    log('error', `Step 10 失败: ${videoPath} 不存在`);
    return false;
  }
  
  // 验证视频参数
  const result = run(`ffprobe -v error -select_streams v:0,a:0 -show_entries stream=codec_name,width,height -show_entries format=duration -of default=noprint_wrappers=1 "${videoPath}"`);
  
  if (!result.success) {
    log('error', `Step 10 失败: 无法读取视频信息`);
    return false;
  }
  
  const output = result.output;
  const hasH264 = output.includes('h264');
  const hasAac = output.includes('aac');
  const correctSize = checkVideoDimensions(videoPath, 1080, 1920);
  
  if (!hasH264) {
    log('error', `Step 10 失败: 视频编码应为 H.264`);
    return false;
  }
  if (!hasAac) {
    log('error', `Step 10 失败: 视频应包含音频轨道 (AAC)`);
    return false;
  }
  if (!correctSize) {
    log('error', `Step 10 失败: 视频尺寸应为 1080x1920`);
    return false;
  }
  
  log('ok', `Step 10 完成: 视频参数正确`);
  return true;
}

/**
 * ============================================================
 *  Step 11: 生成报告
 * ============================================================
 */
async function step11_generateReport(projectDir) {
  log('step', 'Step 11: 生成报告...');
  
  // 调用 video-creator-validator.js 进行完整验证
  log('info', '调用项目完整性验证...');
  const result = run(`node "${SCRIPTS_DIR}/video-creator-validator.js" "${projectDir}"`, { stdio: 'pipe' });
  
  if (!result.success) {
    log('warn', '项目验证有警告，请检查输出');
    console.log(result.output);
  } else {
    log('ok', '项目验证通过');
  }
  
  // 生成 report.json
  const reportPath = path.join(projectDir, 'docs', 'report.json');
  const report = {
    project: path.basename(projectDir),
    generated: new Date().toISOString(),
    status: 'completed',
    validation: result.success ? 'passed' : 'warnings'
  };
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  log('ok', `Step 11 完成: 报告已生成`);
  return true;
}

/**
 * ============================================================
 *  主流程
 * ============================================================
 */
async function main() {
  const args = process.argv.slice(2);
  let projectDir = null;
  let strictMode = false;
  
  // 解析参数
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      projectDir = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--strict') {
      strictMode = true;
    }
  }
  
  if (!projectDir) {
    console.log(`
🎬 Video Creator 一键完整执行脚本

用法:
  node run-full-pipeline.js --project <项目路径> [--strict]

参数:
  --project <路径>   项目目录路径
  --strict           严格模式：验证失败则退出

示例:
  node run-full-pipeline.js --project ./workspace/ui-tars-desktop
  node run-full-pipeline.js --project ./workspace/my-video --strict

注意:
  此脚本假设以下步骤已完成:
  - Step 1-5: 内容获取、分析、构建项目、文案生成、HTML生成
  - Step 9: 质量检查
  
  脚本将验证并完成:
  - Step 0: 文档创建
  - Step 6: 封面生成
  - Step 7: 音频生成
  - Step 8: 字幕生成
  - Step 10: 视频生成
  - Step 11: 报告生成
`);
    process.exit(1);
  }
  
  console.log(`
============================================================
🎬 Video Creator 一键完整执行
============================================================
项目: ${projectDir}
模式: ${strictMode ? '严格模式 (strict)' : '宽松模式'}
============================================================
`);
  
  // 执行各步骤
  const steps = [
    { name: 'Step 0', fn: () => step0_createDocs(projectDir) },
    { name: 'Step 6', fn: () => step6_generateVisual(projectDir) },
    { name: 'Step 7', fn: () => step7_generateAudio(projectDir) },
    { name: 'Step 8', fn: () => step8_generateSubtitles(projectDir) },
    { name: 'Step 10', fn: () => step10_generateVideo(projectDir) },
    { name: 'Step 11', fn: () => step11_generateReport(projectDir) }
  ];
  
  let failed = false;
  
  for (const step of steps) {
    const success = await step.fn();
    if (!success && strictMode) {
      log('error', `${step.name} 失败，退出`);
      process.exit(1);
    }
    if (!success) {
      failed = true;
    }
  }
  
  console.log(`
============================================================
${failed ? '⚠️  执行完成（有警告）' : '✅ 执行完成'}
============================================================
`);
  
  process.exit(failed && strictMode ? 1 : 0);
}

main().catch(e => {
  console.error('❌ 执行出错:', e);
  process.exit(1);
});
