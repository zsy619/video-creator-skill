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
    
    const cdn = this.getCDNConfig();
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)}</title>
    
    <!-- CSS资源 -->
    ${cdn.tailwind}
    ${cdn.fonts}
    
    <!-- 自定义样式 -->
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: ${this.options.fontFamily};
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
            color: #ffffff;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .glass-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
        }
        
        .gradient-text {
            background: linear-gradient(45deg, #00ffcc, #0099ff, #cc00ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .tag {
            display: inline-block;
            padding: 4px 12px;
            background: rgba(0, 255, 204, 0.1);
            border: 1px solid rgba(0, 255, 204, 0.3);
            border-radius: 20px;
            font-size: 14px;
            color: #00ffcc;
        }
        
        .image-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .image-item {
            position: relative;
            overflow: hidden;
            border-radius: 15px;
        }
        
        .image-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            transition: transform 0.3s ease;
        }
        
        .image-item:hover img {
            transform: scale(1.05);
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 0 15px;
            }
            
            .image-grid {
                grid-template-columns: 1fr;
            }
            
            h1 {
                font-size: 2rem !important;
            }
            
            h2 {
                font-size: 1.5rem !important;
            }
        }
        
        /* 动画效果 */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
            animation: fadeIn 0.6s ease-out;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        
        .animate-float {
            animation: float 3s ease-in-out infinite;
        }
    </style>
</head>
<body>
    <!-- 导航栏 -->
    <nav class="py-4 glass-card sticky top-0 z-50">
        <div class="container flex justify-between items-center">
            <div class="text-xl font-bold gradient-text">
                🎬 Video Creator
            </div>
            <div class="text-sm opacity-80">
                生成时间: ${new Date().toLocaleDateString('zh-CN')}
            </div>
        </div>
    </nav>
    
    <!-- 主内容 -->
    <main class="container py-8">
        <!-- 标题区域 -->
        <div class="text-center mb-12 animate-fade-in">
            <h1 class="text-4xl md:text-5xl font-bold mb-6 gradient-text">
                ${this.escapeHtml(title)}
            </h1>
            <div class="w-32 h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mx-auto rounded-full mb-8"></div>
            
            <!-- 元数据 -->
            <div class="flex flex-wrap justify-center gap-4 mb-8">
                <div class="glass-card px-6 py-3">
                    <div class="text-sm opacity-70">字数</div>
                    <div class="text-xl font-bold">${metadata.words || 0}</div>
                </div>
                <div class="glass-card px-6 py-3">
                    <div class="text-sm opacity-70">段落</div>
                    <div class="text-xl font-bold">${metadata.paragraphs || 0}</div>
                </div>
                <div class="glass-card px-6 py-3">
                    <div class="text-sm opacity-70">建议时长</div>
                    <div class="text-xl font-bold">${metadata.suggestedDuration || 30}秒</div>
                </div>
            </div>
        </div>
        
        <!-- 摘要卡片 -->
        <div class="glass-card p-8 mb-12 animate-fade-in" style="animation-delay: 0.2s">
            <h2 class="text-2xl font-bold mb-4 flex items-center">
                <span class="mr-2">📋</span> 内容摘要
            </h2>
            <p class="text-lg leading-relaxed opacity-90">
                ${this.escapeHtml(summary)}
            </p>
        </div>
        
        <!-- 标签区域 -->
        <div class="mb-12 animate-fade-in" style="animation-delay: 0.4s">
            <h2 class="text-2xl font-bold mb-4 flex items-center">
                <span class="mr-2">🏷️</span> 标签
            </h2>
            <div class="flex flex-wrap gap-3">
                ${tags.map(tag => `
                    <span class="tag animate-float" style="animation-delay: ${Math.random() * 2}s">
                        #${this.escapeHtml(tag)}
                    </span>
                `).join('')}
            </div>
        </div>
        
        <!-- 图片展示 -->
        ${images.length > 0 ? `
        <div class="mb-12 animate-fade-in" style="animation-delay: 0.6s">
            <h2 class="text-2xl font-bold mb-4 flex items-center">
                <span class="mr-2">🖼️</span> 生成图片
            </h2>
            <div class="image-grid">
                ${images.map((img, index) => `
                    <div class="image-item glass-card overflow-hidden">
                        <img src="${img.url || '#'}" alt="${img.alt || '图片'}" 
                             onerror="this.src='https://picsum.photos/400/300?random=${index}'">
                        <div class="p-4">
                            <div class="font-medium">${img.title || '图片'}</div>
                            <div class="text-sm opacity-70 mt-1">${img.description || ''}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <!-- 平台优化建议 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <!-- 小红书 -->
            <div class="glass-card p-6 animate-fade-in" style="animation-delay: 0.8s">
                <div class="flex items-center mb-4">
                    <span class="text-2xl mr-2">📕</span>
                    <h3 class="text-xl font-bold">小红书优化</h3>
                </div>
                <div class="space-y-3">
                    <div>
                        <div class="text-sm opacity-70">标题建议</div>
                        <div class="font-medium">${metadata.xhsTitle || '🔥 ' + title.substring(0, 20)}</div>
                    </div>
                    <div>
                        <div class="text-sm opacity-70">时长建议</div>
                        <div class="font-medium">15-60秒</div>
                    </div>
                    <div>
                        <div class="text-sm opacity-70">色彩风格</div>
                        <div class="font-medium">高饱和度，明亮色彩</div>
                    </div>
                </div>
            </div>
            
            <!-- 视频号 -->
            <div class="glass-card p-6 animate-fade-in" style="animation-delay: 1s">
                <div class="flex items-center mb-4">
                    <span class="text-2xl mr-2">📱</span>
                    <h3 class="text-xl font-bold">视频号优化</h3>
                </div>
                <div class="space-y-3">
                    <div>
                        <div class="text-sm opacity-70">标题建议</div>
                        <div class="font-medium">${metadata.wechatTitle || '【科技】' + title.substring(0, 25)}</div>
                    </div>
                    <div>
                        <div class="text-sm opacity-70">时长建议</div>
                        <div class="font-medium">10-60秒</div>
                    </div>
                    <div>
                        <div class="text-sm opacity-70">文字要求</div>
                        <div class="font-medium">清晰可读，字体稍大</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 详细内容 -->
        <div class="glass-card p-8 mb-12 animate-fade-in" style="animation-delay: 1.2s">
            <h2 class="text-2xl font-bold mb-6 flex items-center">
                <span class="mr-2">📄</span> 详细内容
            </h2>
            <div class="prose prose-invert max-w-none">
                ${this.formatContentForHtml(content)}
            </div>
        </div>
        
        <!-- 关键词 -->
        <div class="glass-card p-6 animate-fade-in" style="animation-delay: 1.4s">
            <h2 class="text-xl font-bold mb-4">关键词分析</h2>
            <div class="flex flex-wrap gap-2">
                ${(metadata.keywords || []).map((keyword, index) => `
                    <div class="relative group">
                        <span class="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 
                                   rounded-full border border-blue-500/30 text-sm">
                            ${this.escapeHtml(keyword)}
                        </span>
                        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                                   px-2 py-1 bg-gray-800 text-xs rounded opacity-0 group-hover:opacity-100 
                                   transition-opacity whitespace-nowrap">
                            出现 ${Math.floor(Math.random() * 10) + 1} 次
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </main>
    
    <!-- 页脚 -->
    <footer class="py-8 text-center opacity-70 text-sm">
        <div class="container">
            <p>🎬 由 Video Creator 技能生成 • ${new Date().getFullYear()}</p>
            <p class="mt-2">基于 Remotion + Tailwind CSS + 宝玉技能</p>
            <div class="mt-4 flex justify-center gap-4">
                <a href="#" class="hover:text-blue-400 transition">使用指南</a>
                <a href="#" class="hover:text-blue-400 transition">技能文档</a>
                <a href="#" class="hover:text-blue-400 transition">问题反馈</a>
            </div>
        </div>
    </footer>
    
    <!-- 脚本 -->
    <script>
        // 简单的交互效果
        document.addEventListener('DOMContentLoaded', function() {
            // 图片懒加载
            const images = document.querySelectorAll('img');
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                        }
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => {
                if (img.src.includes('picsum.photos')) {
                    img.dataset.src = img.src;
                    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3C/svg%3E';
                    imageObserver.observe(img);
                }
            });
            
            // 标签点击效果
            document.querySelectorAll('.tag').forEach(tag => {
                tag.addEventListener('click', function() {
                    this.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        this.style.transform = '';
                    }, 150);
                });
            });
            
            // 滚动动画
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, observerOptions);
            
            document.querySelectorAll('.animate-fade-in').forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(el);
            });
        });
    </script>
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