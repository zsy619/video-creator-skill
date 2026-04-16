/**
 * SVG 占位图生成器
 * 当宝玉技能不可用时，生成有效的 SVG 占位图（而非 .txt 文件）
 * 确保 HTML 页面和视频流程能正常显示图片
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * 生成封面图 SVG
 * @param {object} options - 生成选项
 * @param {string} options.title - 标题文字
 * @param {object} options.theme - 主题配置
 * @param {string} options.outputPath - 输出路径
 */
async function generateCoverSvg({ title, theme, outputPath }) {
  const colors = theme.colors || ['#00ffcc', '#0099ff', '#cc00ff'];
  const gradientId = 'coverGradient';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${colors[1]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors[2] || colors[0]};stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="1080" height="1920" fill="url(#${gradientId})" opacity="0.3"/>
  <rect width="1080" height="1920" fill="#0F172A" opacity="0.7"/>
  <circle cx="540" cy="960" r="400" fill="none" stroke="${colors[0]}" stroke-width="2" opacity="0.3"/>
  <circle cx="540" cy="960" r="300" fill="none" stroke="${colors[1]}" stroke-width="1.5" opacity="0.2"/>
  <circle cx="540" cy="960" r="200" fill="none" stroke="${colors[2] || colors[0]}" stroke-width="1" opacity="0.15"/>
  <text x="540" y="900" font-family="'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="80" font-weight="bold" fill="#F8FAFC" text-anchor="middle" filter="url(#glow)">${escapeXml(truncate(title, 14))}</text>
  <text x="540" y="1000" font-family="'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="36" fill="${colors[0]}" text-anchor="middle" opacity="0.8">${escapeXml(theme.name)}</text>
  <rect x="440" y="1050" width="200" height="3" rx="1.5" fill="${colors[0]}" opacity="0.6"/>
</svg>`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, svg, 'utf-8');
  return outputPath;
}

/**
 * 生成插图 SVG
 * @param {object} options - 生成选项
 * @param {string} options.content - 插图内容描述
 * @param {object} options.theme - 主题配置
 * @param {number} options.index - 插图序号
 * @param {string} options.outputPath - 输出路径
 */
async function generateIllustrationSvg({ content, theme, index, outputPath }) {
  const colors = theme.colors || ['#00ffcc', '#0099ff', '#cc00ff'];
  const gradientId = `illusGradient${index}`;
  const shortContent = truncate(content.replace(/\n/g, ' '), 40);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 800" width="1080" height="800">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:0.4" />
      <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:0.2" />
    </linearGradient>
  </defs>
  <rect width="1080" height="800" fill="#0F172A"/>
  <rect width="1080" height="800" fill="url(#${gradientId})"/>
  <rect x="60" y="60" width="960" height="680" rx="20" fill="none" stroke="${colors[0]}" stroke-width="1" opacity="0.3"/>
  <text x="540" y="360" font-family="'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="48" font-weight="bold" fill="#F8FAFC" text-anchor="middle">插图 ${index + 1}</text>
  <text x="540" y="430" font-family="'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="28" fill="${colors[0]}" text-anchor="middle" opacity="0.7">${escapeXml(shortContent)}</text>
  <rect x="440" y="470" width="200" height="2" rx="1" fill="${colors[0]}" opacity="0.4"/>
  <text x="540" y="520" font-family="'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="22" fill="#94A3B8" text-anchor="middle">${escapeXml(theme.name)}</text>
</svg>`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, svg, 'utf-8');
  return outputPath;
}

/**
 * 生成信息图 SVG
 * @param {object} options - 生成选项
 * @param {Array} options.dataPoints - 数据点列表
 * @param {object} options.theme - 主题配置
 * @param {string} options.outputPath - 输出路径
 */
async function generateInfographicSvg({ dataPoints, theme, outputPath }) {
  const colors = theme.colors || ['#00ffcc', '#0099ff', '#cc00ff'];
  const gradientId = 'infoGradient';

  const dataItems = dataPoints.slice(0, 6).map((dp, i) => {
    const y = 280 + i * 120;
    const barWidth = Math.min(600, 200 + Math.random() * 400);
    return `
      <text x="120" y="${y}" font-family="'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="32" fill="#F8FAFC">${escapeXml(dp.value)}</text>
      <rect x="120" y="${y + 10}" width="${barWidth}" height="8" rx="4" fill="${colors[i % colors.length]}" opacity="0.6"/>
      <text x="120" y="${y + 45}" font-family="'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="20" fill="#94A3B8">${escapeXml(dp.type)}</text>`;
  }).join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1200" width="1080" height="1200">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:0.1" />
    </linearGradient>
  </defs>
  <rect width="1080" height="1200" fill="#0F172A"/>
  <rect width="1080" height="1200" fill="url(#${gradientId})"/>
  <text x="540" y="160" font-family="'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="56" font-weight="bold" fill="#F8FAFC" text-anchor="middle">数据概览</text>
  <rect x="440" y="190" width="200" height="3" rx="1.5" fill="${colors[0]}" opacity="0.6"/>
  ${dataItems}
</svg>`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, svg, 'utf-8');
  return outputPath;
}

/**
 * 截断字符串
 */
function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  generateCoverSvg,
  generateIllustrationSvg,
  generateInfographicSvg
};
