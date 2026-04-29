/**
 * HTML构建器
 * 使用Tailwind CSS构建响应式HTML页面
 */

const fs = require('fs').promises;
const path = require('path');

class HtmlBuilder {
  constructor(options = {}) {
    this.options = {
      useChinaCDN: true,
      fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      ...options
    };
    this.cdnMapping = {};
    this._loadCdnMapping();
  }

  async _loadCdnMapping() {
    try {
      const raw = await fs.readFile(path.join(__dirname, '..', 'references', 'cdn-mapping.json'), 'utf-8');
      this.cdnMapping = JSON.parse(raw);
    } catch (e) {
      this.cdnMapping = {};
    }
  }

  getCdnUrl(type) {
    const cdn = this.options.useChinaCDN ? this.cdnMapping.china : this.cdnMapping.global;
    if (type === 'tailwind') return cdn?.tailwind || 'https://cdn.tailwindcss.com';
    if (type === 'icons') return cdn?.icons || 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
    return null;
  }

  /**
   * 构建完整HTML页面
   */
  async buildPage(content, metadata, outputPath) {
    const html = this.generateHtml(content, metadata);
    await fs.writeFile(outputPath, html);
    return outputPath;
  }

  /**
   * 生成HTML内容
   */
  generateHtml(content, metadata) {
    const title = metadata.title || '内容摘要';
    const summary = metadata.summary || this.extractSummary(content);
    const tags = metadata.tags || [];
    const images = metadata.images || [];
    
    const p1 = '#FF0080', p2 = '#00FFFF';
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: ${this.options.fontFamily}; background: #0A0A14; color: #F8FAFC; line-height: 1.8; }
        .container { max-width: 920px; margin: 0 auto; padding: 0 24px; }
        .grid-bg { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-image: linear-gradient(${p1}10 1px, transparent 1px), linear-gradient(90deg, ${p1}10 1px, transparent 1px), linear-gradient(${p2}08 1px, transparent 1px), linear-gradient(90deg, ${p2}08 1px, transparent 1px); background-size: 100px 100px, 100px 100px, 50px 50px, 50px 50px; pointer-events: none; z-index: -1; }
        h1 { font-size: 72px; font-weight: 800; margin-bottom: 20px; background: linear-gradient(135deg, ${p1} 0%, ${p2} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1.15; }
        h2 { font-size: 36px; font-weight: 700; margin: 48px 0 20px; background: linear-gradient(135deg, ${p1} 0%, ${p2} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        h3 { font-size: 28px; font-weight: 600; margin: 32px 0 16px; color: #F8FAFC; }
        p { font-size: 20px; color: #C0C0D0; margin-bottom: 20px; }
        a { color: ${p2}; text-decoration: none; }
        a:hover { opacity: 0.8; }
        .stats { display: flex; justify-content: center; gap: 48px; margin: 48px 0; flex-wrap: wrap; }
        .stat-card { text-align: center; }
        .stat-num { font-size: 48px; font-weight: 800; color: ${p1}; }
        .stat-label { font-size: 20px; color: #808090; margin-top: 6px; }
        .card { background: linear-gradient(135deg, ${p1}10, ${p2}10); border: 1px solid ${p1}40; border-radius: 16px; padding: 28px 32px; margin-bottom: 28px; }
        .tag { display: inline-block; padding: 6px 16px; background: ${p1}20; border: 1px solid ${p1}60; border-radius: 20px; font-size: 14px; color: ${p1}; margin: 4px; }
        .image-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 30px 0; }
        .image-item { overflow: hidden; border-radius: 12px; }
        .image-item img { width: 100%; height: 200px; object-fit: cover; border-radius: 12px; }
        .feature-row { display: flex; align-items: flex-start; margin-bottom: 20px; }
        .feature-icon { width: 48px; height: 48px; background: ${p1}20; border: 2px solid ${p1}; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 20px; flex-shrink: 0; font-size: 24px; }
        .feature-text { font-size: 24px; color: #F8FAFC; line-height: 1.6; }
        .feature-text strong { color: ${p2}; }
        .footer { text-align: center; padding: 40px 0; color: #808090; font-size: 14px; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 60px; }
        .footer a { color: ${p2}; margin: 0 12px; }
        @media (max-width: 640px) { h1 { font-size: 48px; } h2 { font-size: 28px; } p { font-size: 18px; } .container { padding: 0 16px; } }
    </style>
</head>
<body>
    <div class="grid-bg"></div>
    <div style="padding: 60px 0;">
        <div class="container" style="text-align: center;">
            <h1>${this.escapeHtml(title)}</h1>
            <p style="font-size: 32px; color: #808090; margin-bottom: 48px;">${this.escapeHtml(summary)}</p>
            
            <div class="stats">
                <div class="stat-card"><div class="stat-num">${metadata.words || 0}</div><div class="stat-label">字数</div></div>
                <div class="stat-card"><div class="stat-num">${metadata.paragraphs || 0}</div><div class="stat-label">段落</div></div>
                <div class="stat-card"><div class="stat-num">${metadata.suggestedDuration || 30}秒</div><div class="stat-label">建议时长</div></div>
            </div>
            
            <div class="card" style="text-align: left;">
                <h2 style="margin-top: 0;">📋 内容摘要</h2>
                <p>${this.escapeHtml(summary)}</p>
            </div>
            
            ${tags.length > 0 ? `
            <div class="card" style="text-align: left;">
                <h2 style="margin-top: 0;">🏷️ 标签</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${tags.map(tag => `<span class="tag">#${this.escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>` : ''}
            
            ${images.length > 0 ? `
            <div class="card" style="text-align: left;">
                <h2 style="margin-top: 0;">🖼️ 生成图片</h2>
                <div class="image-grid">
                    ${images.map((img, index) => `
                        <div class="image-item">
                            <img src="${img.url || '#'}" alt="${img.alt || '图片'}" onerror="this.src='https://picsum.photos/400/300?random=${index}'">
                            <p style="margin: 8px 0 0; font-size: 16px; color: #F8FAFC;">${img.title || '图片'}</p>
                            <p style="margin: 4px 0 0; font-size: 14px; color: #808090;">${img.description || ''}</p>
                        </div>
                    `).join('')}
                </div>
            </div>` : ''}
            
            <div class="card" style="text-align: left;">
                <h2 style="margin-top: 0;">📄 详细内容</h2>
                ${this.formatContentForHtml(content)}
            </div>
            
            ${(metadata.keywords || []).length > 0 ? `
            <div class="card" style="text-align: left;">
                <h2 style="margin-top: 0;">🔑 关键词分析</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${(metadata.keywords || []).map(k => `<span class="tag">${this.escapeHtml(k)}</span>`).join('')}
                </div>
            </div>` : ''}
        </div>
    </div>
    
    <div class="footer">
        <p>🎬 由 Video Creator 技能生成 • ${new Date().getFullYear()}</p>
        <p style="margin-top: 8px;">基于 Remotion + 宝玉技能</p>
        <div style="margin-top: 16px;">
            <a href="#">使用指南</a>
            <a href="#">技能文档</a>
            <a href="#">问题反馈</a>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 获取CDN配置
   */
  getCDNConfig() {
    if (this.options.useChinaCDN) {
      return {
        tailwind: '<link href="https://cdn.bootcss.com/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">',
        fonts: '<link href="https://fonts.googleapis.cn/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">'
      };
    } else {
      return {
        tailwind: '<script src="https://cdn.tailwindcss.com"></script>',
        fonts: '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">'
      };
    }
  }

  /**
   * 提取摘要
   */
  extractSummary(content, maxLength = 200) {
    // 移除Markdown标记
    let text = content
      .replace(/[#*`\[\]]/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    
    return text;
  }

  /**
   * 格式化内容为HTML
   */
  formatContentForHtml(content) {
    // 简单的Markdown转HTML
    return content
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-800 px-2 py-1 rounded">$1</code>')
      .replace(/\n\n/g, '</p><p class="my-4">')
      .replace(/\n/g, '<br>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/(<li.*?>.*?<\/li>)/gs, '<ul class="list-disc ml-6 my-2">$1</ul>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-400 hover:underline">$1</a>');
  }

  /**
   * 转义 HTML 特殊字符
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

module.exports = HtmlBuilder;