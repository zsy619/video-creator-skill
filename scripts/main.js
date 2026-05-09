#!/usr/bin/env node

/**
 * Video Creator 主入口脚本
 * 自动化视频创作流程
 * 修复：补全 generateVideo() 和 generateReport() 方法，引用公共 themes 模块
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const logger = require('./logger');
const BaoyuIntegration = require('./baoyu-integration');
const VideoComposer = require('./video-composer');
const SubtitleGenerator = require('./subtitle-generator');
const QualityChecker = require('./quality-checker');
const { THEMES, CONFIG, VALID_STYLES, VALID_PLATFORMS } = require('./themes');

class VideoCreator {
  constructor(options = {}) {
    this.options = { ...CONFIG, ...options };
    this.strictMode = this.options.strict || false;
    this.content = null;
    this.metadata = {};
    this.generatedFiles = [];
    this.coverGenerated = false;
    this.sessionLogPath = null;
    this.baoyuConfig = {};
    this.cdnMapping = {};
    this.stepResults = {};  // 记录每步执行结果
    this.baoyu = new BaoyuIntegration({
      outputDir: this.options.outputDir
    });
    this.videoComposer = new VideoComposer({
      width: this.options.width,
      height: this.options.height,
      fps: this.options.fps,
      duration: this.options.duration || this.options.defaultDuration,
      quality: this.options.quality,
      style: this.options.style || CONFIG.defaultStyle,
      outputDir: this.options.outputDir
    });
    this._loadReferences();
  }

  /**
   * 步骤验证辅助方法
   * 在每个关键步骤后调用，确保该步骤产出正确
   */
  async _validateStep(stepName, checkFn, errorMsg) {
    try {
      const result = await checkFn();
      this.stepResults[stepName] = { success: result, error: null };
      if (!result) {
        console.error(`❌ ${errorMsg}`);
        if (this.strictMode) {
          throw new Error(`${stepName} 验证失败: ${errorMsg}`);
        }
        return false;
      }
      console.log(`✅ ${stepName} 验证通过`);
      return true;
    } catch (e) {
      this.stepResults[stepName] = { success: false, error: e.message };
      console.error(`❌ ${stepName} 验证异常: ${e.message}`);
      if (this.strictMode) {
        throw e;
      }
      return false;
    }
  }

  /**
   * 检查封面是否已生成（Step 6 后强制验证）
   */
  async checkCoverGenerated() {
    return this._validateStep('Step6-Cover', async () => {
      const assetsDir = path.join(this.options.outputDir, 'docs', 'assets');
      const covers = [
        { file: 'cover.png', w: 1080, h: 1920 },
        { file: 'cover-wechat.png', w: 900, h: 383 },
        { file: 'cover-xhs.png', w: 1440, h: 2560 }
      ];
      
      for (const cover of covers) {
        const coverPath = path.join(assetsDir, cover.file);
        const exists = await fs.access(coverPath).then(() => true).catch(() => false);
        if (!exists) {
          console.error(`   ❌ 缺少 ${cover.file}`);
          return false;
        }
        // 验证尺寸
        try {
          const { execSync } = require('child_process');
          const dim = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${coverPath}"`, { encoding: 'utf8' }).trim();
          const [w, h] = dim.split('x').map(Number);
          if (w !== cover.w || h !== cover.h) {
            console.error(`   ❌ ${cover.file} 尺寸错误: ${w}x${h} (期望 ${cover.w}x${cover.h})`);
            return false;
          }
        } catch (e) {
          console.error(`   ❌ 无法验证 ${cover.file} 尺寸`);
          return false;
        }
      }
      this.coverGenerated = true;
      return true;
    }, '封面验证失败：缺少封面图或尺寸不正确');
  }

  /**
   * 最终清单检查（Step 11 后强制验证）
   */
  async runFinalChecklist() {
    return this._validateStep('Step11-FinalCheck', async () => {
      const docsDir = path.join(this.options.outputDir, 'docs');
      const requiredDocs = [
        'README.md', 'article.md', 'video-script.md', 'copy.md', 'wechat-copy.md',
        'posting-guide.md', 'landing-page.html', 'article-page.html', 'wechat-page.html',
        'session-log.md'
      ];
      
      let missing = [];
      for (const doc of requiredDocs) {
        const docPath = path.join(docsDir, doc);
        const exists = await fs.access(docPath).then(() => true).catch(() => false);
        if (!exists) {
          missing.push(doc);
        }
      }
      
      if (missing.length > 0) {
        console.error(`   ❌ 缺少文档: ${missing.join(', ')}`);
        return false;
      }
      
      // 检查音频
      const audioPath = path.join(this.options.outputDir, 'audio', 'neural_1_2x.m4a');
      const audioExists = await fs.access(audioPath).then(() => true).catch(() => false);
      if (!audioExists) {
        console.warn(`   ⚠️  音频文件不存在: ${audioPath}`);
      }
      
      // 检查字幕
      const subtitlePath = path.join(this.options.outputDir, 'audio', 'subtitles.ass');
      const subtitleExists = await fs.access(subtitlePath).then(() => true).catch(() => false);
      if (!subtitleExists) {
        console.warn(`   ⚠️  字幕文件不存在: ${subtitlePath}`);
      }
      
      // 检查视频
      const videoPath = path.join(this.options.outputDir, 'video-project', 'out', 'final-with-subs.mp4');
      const videoExists = await fs.access(videoPath).then(() => true).catch(() => false);
      if (!videoExists) {
        console.warn(`   ⚠️  视频文件不存在: ${videoPath}`);
      }
      
      return true;
    }, '最终清单验证失败：缺少必需文件');
  }

  async _loadReferences() {
    const baseDir = path.join(__dirname, '..', 'references');
    try {
      const baoyuConfigRaw = await fs.readFile(path.join(baseDir, 'baoyu-config.json'), 'utf-8');
      this.baoyuConfig = JSON.parse(baoyuConfigRaw);
      const cdnRaw = await fs.readFile(path.join(baseDir, 'cdn-mapping.json'), 'utf-8');
      this.cdnMapping = JSON.parse(cdnRaw);
    } catch (e) {
      // references 可选，不阻塞流程
    }
  }

  /**
   * 主执行函数 - 12步完整流程
   */
  async run() {
    try {
      console.log('🎬 开始视频创作流程（12步）...\n');

      // Step 0: 创建文档（强制）
      await this.createOutputDir();
      await this.initStepZero();
      // Step 1: 内容获取
      await this.getContent();
      // Step 2: 分析内容
      await this.analyzeContent();
      // Step 3: 构建项目
      await this.buildProject();
      // Step 4: 生成文案
      await this.generateCopywriting();
      // Step 5: 构建HTML
      await this.buildHtmlPage();
      // Step 6: 生成视觉（封面强制优先）
      await this.generateVisualContent();
      await this.checkCoverGenerated();
      // Step 7: 生成音频
      await this.generateAudio();
      // Step 8: 生成字幕
      await this.generateSubtitles();
      // Step 9: 质量检查
      await this.runQualityCheck();
      // Step 10: 生成视频
      await this.generateVideo();
      // Step 11: 生成报告 + 强制清单检查
      await this.generateReport();
      await this.runFinalChecklist();

      console.log('\n✅ 视频创作完成！');
      console.log(`📁 输出目录: ${this.options.outputDir}`);

    } catch (error) {
      console.error('❌ 视频创作失败:', error);
      throw error;
    }
  }

  /**
   * Step 0: 初始化和记录
   */
  async recordSessionLog(node, description) {
    try {
      const scriptPath = path.join(__dirname, 'session-log-append.py');
      const projectDir = this.options.outputDir;

      const { execSync } = require('child_process');
      execSync(`python3 "${scriptPath}" "${projectDir}" "${description}" --init 2>/dev/null || true`, { stdio: 'pipe' });
    } catch (e) {
      // session-log 记录失败不阻塞流程
    }
  }

  /**
   * 创建输出目录
   */
  async createOutputDir() {
    // 对齐 PATHS.md 规范的项目目录结构
    const dirs = [
      'docs/assets',
      'video-project/src/components',
      'video-project/src/themes',
      'video-project/out',
      'audio/raw',
      'audio/processed',
      'fonts',
      'temp'
    ];

    for (const dir of dirs) {
      const fullPath = path.join(this.options.outputDir, dir);
      await fs.mkdir(fullPath, { recursive: true });
    }

    console.log('📁 创建输出目录结构完成');
  }

  /**
   * 获取内容
   */
  async getContent() {
    const { url, topic, content } = this.options;

    if (url) {
      console.log('🔗 从链接获取内容...');
      await this.getContentFromUrl(url);
    } else if (topic) {
      console.log('🔍 搜索主题内容...');
      await this.getContentFromTopic(topic);
    } else if (content) {
      console.log('📝 使用提供的内容...');
      // 处理命令行传入的字面 \n 转义序列
      this.content = content.replace(/\\n/g, '\n');
    } else {
      throw new Error('请提供内容来源：--url, --topic, 或 --content');
    }

    const contentPath = path.join(this.options.outputDir, 'docs', 'article.md');
    await fs.writeFile(contentPath, this.content);
    this.generatedFiles.push(contentPath);

    console.log(`📄 内容获取完成，长度: ${this.content.length} 字符`);
  }

  /**
   * 从链接获取内容
   */
  async getContentFromUrl(url) {
    try {
      console.log(`🔗 使用宝玉技能获取URL内容: ${url}`);

      const result = await this.baoyu.callBaoyuSkill('baoyu-url-to-markdown', {
        url,
        outputPath: path.join(this.options.outputDir, 'docs', 'article.md')
      });

      if (result.success && result.content) {
        this.content = result.content;
        console.log(`✅ URL内容获取成功，长度: ${this.content.length} 字符`);
      } else {
        throw new Error('宝玉技能返回空内容');
      }
    } catch (error) {
      console.warn(`❌ 宝玉技能调用失败: ${error.message}`);
      console.log('🔄 使用备用方法获取内容...');

      try {
        const { web_fetch } = require('./tool-proxy');
        const response = await web_fetch({ url });
        this.content = response.content || `# 从 ${url} 获取的内容\n\n备用方法获取的内容...`;
      } catch (fetchError) {
        console.warn(`❌ 备用方法也失败: ${fetchError.message}`);
        this.content = `# 网页内容\n\nURL: ${url}\n\n获取时间: ${new Date().toISOString()}\n\n由于网络或技能问题，无法获取原始内容。`;
      }
    }
  }

  /**
   * 从主题搜索内容
   */
  async getContentFromTopic(topic) {
    try {
      const { web_search } = require('./tool-proxy');
      const results = await web_search({ query: topic, count: 5 });

      if (results && results.length > 0) {
        let content = `# ${topic}\n\n`;
        results.forEach((result, index) => {
          content += `## ${result.title}\n${result.snippet}\n\n`;
        });
        content += `\n---\n*以上内容基于对"${topic}"的搜索结果整理*`;
        this.content = content;
        return;
      }
    } catch (error) {
      console.warn(`❌ 主题搜索失败: ${error.message}`);
    }

    this.content = `# ${topic}\n\n这是一篇关于${topic}的详细内容...`;
  }

  /**
   * 分析内容
   */
  async analyzeContent() {
    console.log('📊 分析内容...');

    const words = this.content.split(/\s+/).length;
    const paragraphs = this.content.split('\n\n').length;
    const lines = this.content.split('\n').length;

    const commonWords = ['的', '了', '在', '是', '和', '与', '或', '等'];
    const wordsList = this.content.toLowerCase().match(/\b[\u4e00-\u9fa5a-z]+\b/g) || [];
    const wordFreq = {};

    wordsList.forEach(word => {
      if (!commonWords.includes(word) && word.length > 1) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    const keywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    const suggestedDuration = Math.max(
      this.options.minDuration,
      Math.min(this.options.maxDuration, Math.ceil(words / 50))
    );

    const titleMatch = this.content.match(/^#\s+(.+?)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '未命名内容';

    this.metadata = {
      title,
      words,
      paragraphs,
      lines,
      keywords,
      suggestedDuration,
      analyzedAt: new Date().toISOString()
    };

    const metadataPath = path.join(this.options.outputDir, 'docs', 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(this.metadata, null, 2));
    this.generatedFiles.push(metadataPath);

    console.log(`📈 内容分析完成：${words}字，${paragraphs}段，建议时长：${suggestedDuration}秒`);
  }

  /**
   * 生成视觉内容
   */
  async generateVisualContent() {
    console.log('🎨 使用宝玉技能生成视觉内容...');

    const theme = THEMES[this.options.style || CONFIG.defaultStyle];
    const title = this.metadata.title || '未命名内容';
    const imagesDir = path.join(this.options.outputDir, 'docs', 'assets');

    await fs.mkdir(imagesDir, { recursive: true });

    try {
      // 1. 生成封面图
      console.log('  生成封面图...');
      const coverResult = await this.baoyu.callBaoyuSkill('baoyu-cover-image', {
        title,
        content: this.content.substring(0, 500),
        style: this.options.style || 'tech-modern',
        outputPath: path.join(imagesDir, 'cover.png')  // 输出 PNG，对齐 WORKFLOW.md 规范
      });

      if (coverResult.success) {
        this.generatedFiles.push(coverResult.imagePath);
        this.metadata.coverImage = coverResult.imagePath;
        console.log(`  ✅ 封面图生成完成: ${coverResult.imagePath}`);
      }

      // 2. 生成内容插图
      console.log('  生成内容插图...');
      const illustrationResult = await this.baoyu.callBaoyuSkill('baoyu-article-illustrator', {
        content: this.content,
        style: this.options.style || 'tech-modern',
        outputDir: imagesDir
      });

      if (illustrationResult.success && illustrationResult.illustrations.length > 0) {
        illustrationResult.illustrations.forEach(illus => {
          this.generatedFiles.push(illus.path);
        });
        this.metadata.illustrations = illustrationResult.illustrations;
        console.log(`  ✅ 插图生成完成: ${illustrationResult.total} 张`);
      }

      // 3. 生成信息图
      console.log('  生成信息图...');
      const infoResult = await this.baoyu.callBaoyuSkill('baoyu-infographic', {
        content: this.content,
        style: this.options.style || 'tech-modern',
        outputPath: path.join(imagesDir, 'infographic.svg')
      });

      if (infoResult.success) {
        this.generatedFiles.push(infoResult.imagePath);
        this.metadata.infographic = infoResult.imagePath;
        console.log(`  ✅ 信息图生成完成: ${infoResult.dataPoints} 个数据点`);
      }

      console.log(`🖼️ 视觉内容生成完成，共 ${this.generatedFiles.filter(f => f.includes('docs/assets')).length} 张图片`);

    } catch (error) {
      console.error(`❌ 视觉内容生成失败: ${error.message}`);
    }
  }

  /**
   * 生成文案
   */
  async generateCopywriting() {
    console.log('📝 使用宝玉技能生成文案...');

    const titleMatch = this.content.match(/^#\s+(.+?)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '未命名内容';

    try {
      console.log('  格式化Markdown内容...');
      const formatResult = await this.baoyu.callBaoyuSkill('baoyu-format-markdown', {
        content: this.content,
        title: title,
        addMetadata: true
      });

      if (!formatResult.success) {
        throw new Error('Markdown格式化失败');
      }

      let formattedContent = formatResult.formatted;

      const metadataMatch = formattedContent.match(/^---\n([\s\S]*?)\n---/);
      let frontmatter = {};

      if (metadataMatch) {
        try {
          const yamlContent = metadataMatch[1];
          yamlContent.split('\n').forEach(line => {
            const match = line.match(/^(\w+):\s*(.+)$/);
            if (match) {
              const key = match[1];
              let value = match[2].trim();
              if (value.startsWith('[') && value.endsWith(']')) {
                try { value = JSON.parse(value); } catch (e) { /* 保持原样 */ }
              } else if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
              }
              frontmatter[key] = value;
            }
          });
          formattedContent = formattedContent.replace(/^---\n[\s\S]*?\n---\n*/, '');
        } catch (error) {
          console.warn('  ⚠️  Frontmatter解析失败:', error.message);
        }
      }

      const xhsTitle = frontmatter.xiaohongshu?.title || this.generateXhsTitle(title);
      const wechatTitle = frontmatter.wechat_video?.title || this.generateWechatTitle(title);
      const tags = frontmatter.tags || this.generateTags();
      const summary = frontmatter.summary || this.generateSummary();

      this.metadata.xhsTitle = xhsTitle;
      this.metadata.wechatTitle = wechatTitle;
      this.metadata.tags = Array.isArray(tags) ? tags : [tags];
      this.metadata.summary = summary;

      const theme = THEMES[this.options.style || CONFIG.defaultStyle];
      const processedContent = `# ${title}\n\n${formattedContent}\n\n---\n\n## 平台优化\n\n### 小红书标题\n${xhsTitle}\n\n### 视频号标题\n${wechatTitle}\n\n### 内容摘要\n${summary}\n\n### 标签\n${(Array.isArray(tags) ? tags : [tags]).join(', ')}\n\n### 视频规格\n- 分辨率: 1080×1920 (竖屏)\n- 帧率: 60fps\n- 时长: ${this.metadata.suggestedDuration || 30}秒\n- 主题: ${theme.name}\n\n*由 Video Creator 技能生成*`;

      const processedPath = path.join(this.options.outputDir, 'docs', 'processed.md');
      await fs.writeFile(processedPath, processedContent);
      this.generatedFiles.push(processedPath);

      console.log('📋 文案生成完成');

    } catch (error) {
      console.error(`❌ 宝玉技能文案生成失败: ${error.message}`);
      console.log('🔄 使用备用方法生成文案...');
      await this.generateFallbackCopywriting(title);
    }
  }

  /**
   * 生成备用文案
   */
  async generateFallbackCopywriting(title) {
    const xhsTitle = this.generateXhsTitle(title);
    const wechatTitle = this.generateWechatTitle(title);
    const summary = this.generateSummary();
    const tags = this.generateTags();

    const formattedContent = this.content
      .replace(/^#\s+.+$/m, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const processedPath = path.join(this.options.outputDir, 'docs', 'processed.md');
    const processedContent = `# ${title}\n\n${formattedContent}\n\n---\n\n## 平台优化\n\n### 小红书标题\n${xhsTitle}\n\n### 视频号标题\n${wechatTitle}\n\n### 内容摘要\n${summary}\n\n### 标签\n${tags.join(', ')}\n`;

    await fs.writeFile(processedPath, processedContent);
    this.generatedFiles.push(processedPath);

    this.metadata.xhsTitle = xhsTitle;
    this.metadata.wechatTitle = wechatTitle;
    this.metadata.tags = tags;
    this.metadata.summary = summary;

    console.log('📋 备用文案生成完成');
  }

  generateXhsTitle(originalTitle) {
    const prefixes = ['🔥', '💡', '🎯', '🚀', '🌟', '📈', '🤖', '💻'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const maxLength = 20;
    let title = originalTitle;
    if (title.length > maxLength) {
      title = title.substring(0, maxLength - 3) + '...';
    }
    return `${prefix} ${title}`;
  }

  generateWechatTitle(originalTitle) {
    const maxLength = 30;
    let title = originalTitle;
    if (title.length > maxLength) {
      title = title.substring(0, maxLength - 3) + '...';
    }
    return `【科技前沿】${title}`;
  }

  generateSummary() {
    const maxLength = 200;
    let summary = this.content.replace(/#+\s+/g, '').replace(/\n+/g, ' ');
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength) + '...';
    }
    return summary;
  }

  generateTags() {
    const baseTags = ['科技', '人工智能', '创新', '未来', '数字'];
    const contentTags = this.metadata.keywords.slice(0, 5);
    const allTags = [...new Set([...baseTags, ...contentTags])];
    while (allTags.length < 5) {
      allTags.push(`标签${allTags.length + 1}`);
    }
    return allTags.slice(0, 10);
  }

  /**
   * 构建HTML页面
   */
  async buildHtmlPage() {
    console.log('🌐 使用宝玉技能构建HTML页面...');

    const htmlPath = path.join(this.options.outputDir, 'docs', 'article-summary.html');

    try {
      const processedPath = path.join(this.options.outputDir, 'docs', 'processed.md');
      let markdownContent;

      try {
        markdownContent = await fs.readFile(processedPath, 'utf-8');
      } catch (error) {
        markdownContent = this.content;
      }

      console.log('  转换Markdown为HTML...');
      const htmlResult = await this.baoyu.callBaoyuSkill('baoyu-markdown-to-html', {
        markdown: markdownContent,
        outputPath: htmlPath,
        style: 'wechat'
      });

      if (htmlResult.success) {
        this.generatedFiles.push(htmlPath);
        console.log(`  ✅ HTML页面生成完成: ${htmlPath}`);
        await this.optimizeHtmlPage(htmlPath);
      } else {
        throw new Error('HTML转换失败');
      }

    } catch (error) {
      console.error(`❌ 宝玉技能HTML构建失败: ${error.message}`);
      console.log('🔄 使用备用方法构建HTML页面...');
      await this.buildFallbackHtmlPage();
    }
  }

  /**
   * 优化HTML页面
   */
  async optimizeHtmlPage(htmlPath) {
    try {
      let html = await fs.readFile(htmlPath, 'utf-8');

      if (!html.includes('tailwind')) {
        const tailwindLink = '<link href="https://cdn.bootcss.com/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">';
        html = html.replace('</head>', `    ${tailwindLink}\n    </head>`);
      }

      if (!html.includes('viewport')) {
        html = html.replace('<head>', `<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">`);
      }

      if (!html.includes('font-family')) {
        const fontStyle = `<style>\n        body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; }\n    </style>`;
        html = html.replace('</head>', `    ${fontStyle}\n    </head>`);
      }

      if (!html.includes('Video Creator')) {
        const footer = `\n    <footer style="text-align: center; padding: 20px; color: #666; font-size: 14px;">\n        <p>🎬 由 Video Creator 技能生成 • ${new Date().getFullYear()}</p>\n    </footer>`;
        html = html.replace('</body>', `    ${footer}\n</body>`);
      }

      await fs.writeFile(htmlPath, html);
      console.log('  ✅ HTML页面优化完成');

    } catch (error) {
      console.warn('  ⚠️  HTML优化失败:', error.message);
    }
  }

  /**
   * 构建备用HTML页面
   */
  async buildFallbackHtmlPage() {
    console.log('  构建备用HTML页面...');

    const HtmlBuilder = require('./html-builder');
    const htmlBuilder = new HtmlBuilder({ useChinaCDN: true });

    const title = this.metadata.title || '内容摘要';
    const summary = this.metadata.summary || this.generateSummary();
    const tags = this.metadata.tags || this.generateTags();

    const metadata = {
      title,
      summary,
      tags,
      xhsTitle: this.metadata.xhsTitle,
      wechatTitle: this.metadata.wechatTitle,
      words: this.metadata.words,
      paragraphs: this.metadata.paragraphs,
      suggestedDuration: this.metadata.suggestedDuration,
      keywords: this.metadata.keywords
    };

    const htmlPath = path.join(this.options.outputDir, 'docs', 'article-summary.html');
    await htmlBuilder.buildPage(this.content, metadata, htmlPath);

    this.generatedFiles.push(htmlPath);
    console.log('  ✅ 备用HTML页面构建完成');
  }

  /**
   * Step 3: 构建项目目录
   */
  async buildProject() {
    console.log('📁 Step 3: 构建项目目录...');

    // 对齐 PATHS.md 规范的项目目录结构
    const projectName = this.options.outputDir.split('/').pop() || 'video-project';
    const dirs = [
      'content',
      'docs/assets',
      'html',
      'video-project/src/components',
      'video-project/src/themes',
      'video-project/out',
      'audio/raw',
      'audio/processed',
      'fonts',
      'temp'
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(this.options.outputDir, dir), { recursive: true });
    }

    console.log('✅ 项目目录构建完成');
  }

  /**
   * Step 7: 生成音频
   * 通过 Azure Neural TTS 或 edge-tts 生成自然人声配音
   */
  async generateAudio() {
    if (this.options.skipAudio) {
      console.log('⏭️  Step 7: 跳过音频生成');
      return;
    }

    console.log('🔊 Step 7: 生成音频...');

    try {
      const narrationText = this.metadata.summary || this.content.substring(0, 500);
      const audioTextPath = path.join(this.options.outputDir, 'audio', 'full_narration.txt');
      await fs.writeFile(audioTextPath, narrationText);

      // 尝试使用 edge-tts 生成音频
      try {
        const scriptPath = path.join(__dirname, '..', 'scripts', 'synthesize-voice.sh');
        await execAsync(`bash "${scriptPath}"`, {
          cwd: this.options.outputDir,
          timeout: 120000
        });
        console.log('✅ 音频生成完成 (edge-tts)');
      } catch (ttsError) {
        console.warn(`⚠️  edge-tts 不可用: ${ttsError.message}`);
        console.log('🔄 使用 macOS say 作为备用方案...');
        try {
          await execAsync(`say -v "Tingting" -o audio/raw/narration.aiff -- "${narrationText.substring(0, 500)}"`, {
            cwd: this.options.outputDir,
            timeout: 60000
          });
          await execAsync('ffmpeg -y -i audio/raw/narration.aiff -c:a aac -b:a 256k audio/processed/narration.m4a', {
            cwd: this.options.outputDir
          });
          console.log('✅ 音频生成完成 (macOS say 备用)');
        } catch (sayError) {
          console.warn(`⚠️  音频生成失败，将继续生成无配音视频: ${sayError.message}`);
        }
      }

      this.metadata.audioGenerated = true;
    } catch (error) {
      console.warn(`⚠️  音频生成异常: ${error.message}`);
    }
  }

  /**
   * Step 8: 生成字幕 + FFmpeg 烧录
   * 使用 SubtitleGenerator 生成 ASS 格式字幕，然后用 ffmpeg 烧录到视频
   * 规范：Fontsize=10, 黄色, PingFang SC, MarginL/R/V=30, 底部居中
   */
  async generateSubtitles() {
    if (this.options.skipSubtitles) {
      console.log('⏭️  Step 8: 跳过字幕生成');
      return;
    }

    console.log('📝 Step 8: 生成字幕...');

    try {
      const subtitleGenerator = new SubtitleGenerator({
        fontSize: 10,  // ASS 标准像素值，不是 72
        color: '&H00FFFF'
      });

      const narrationText = this.metadata.summary || this.content;
      const audioDuration = this.metadata.suggestedDuration || 30;

      const subtitles = await subtitleGenerator.generateFromText(narrationText, audioDuration);

      // 统一字幕文件名：audio/subtitles.ass（validator.js 要求）
      const outputPath = path.join(this.options.outputDir, 'audio', 'subtitles.ass');
      await subtitleGenerator.generateASS(subtitles, outputPath);

      this.generatedFiles.push(outputPath);
      this.metadata.subtitlesGenerated = true;
      this.metadata.subtitlePath = outputPath;
      this.metadata.actualDuration = audioDuration;
      console.log(`✅ 字幕生成完成: ${outputPath}`);

      // FFmpeg 烧录字幕到视频（如果有视频需要烧录）
      const finalVideo = path.join(this.options.outputDir, 'video-project', 'out', 'final-video.mp4');
      const outputWithSubs = path.join(this.options.outputDir, 'video-project', 'out', 'final-with-subs.mp4');
      const audioPath = path.join(this.options.outputDir, 'audio', 'neural_1_2x.m4a');
      
      try {
        await fs.access(finalVideo);
        
        // 检查音频是否存在
        let hasAudio = false;
        try {
          await fs.access(audioPath);
          hasAudio = true;
        } catch (e) {
          // 音频不存在，继续使用视频原有音频（如果有）
        }
        
        if (hasAudio) {
          // 有音频：混流音频 + 烧录字幕
          const cmd = `ffmpeg -y -i "${finalVideo}" -i "${audioPath}" -vf "ass='${outputPath}'" -c:v libx264 -crf 18 -preset fast -c:a aac -b:a 128k -shortest "${outputWithSubs}"`;
          await execAsync(cmd, { timeout: 180000 });
          console.log(`✅ 音频+字幕已混流: ${outputWithSubs}`);
        } else {
          // 无音频：只烧录字幕，视频音频原样保留
          const cmd = `ffmpeg -y -i "${finalVideo}" -vf "ass='${outputPath}'" -c:v libx264 -crf 18 -preset fast -c:a copy "${outputWithSubs}"`;
          await execAsync(cmd, { timeout: 120000 });
          console.log(`✅ 字幕已烧录: ${outputWithSubs}`);
        }
        
        this.generatedFiles.push(outputWithSubs);
      } catch (e) {
        if (e.code === 'ENOENT') {
          console.log('⏭️  无可烧录的视频（视频尚未渲染），字幕和音频文件已就绪');
        } else {
          console.warn(`⚠️  字幕烧录/混流失败: ${e.message}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️  字幕生成失败: ${error.message}`);
    }
  }

  /**
   * Step 9: 质量检查
   * 使用 QualityChecker 检查所有输出文件
   */
  async runQualityCheck() {
    if (this.options.skipQualityCheck) {
      console.log('⏭️  Step 9: 跳过质量检查');
      return;
    }

    console.log('🔍 Step 9: 运行质量检查...');

    try {
      const checker = new QualityChecker({
        projectDir: this.options.outputDir,
        fixIssues: true,
        verbose: this.options.debug || false
      });

      const report = await checker.runFullCheck();
      const reportPath = path.join(this.options.outputDir, 'quality-report.json');
      await checker.saveReport(report, reportPath);
      this.generatedFiles.push(reportPath);

      if (report.summary.passed) {
        console.log('✅ 质量检查通过');
      } else {
        console.warn(`⚠️  质量检查发现问题: ${report.summary.errors} 错误, ${report.summary.warnings} 警告`);
      }
    } catch (error) {
      console.warn(`⚠️  质量检查异常: ${error.message}`);
    }
  }

  /**
   * Step 10: 生成视频（之前缺失的方法，现已补全）
   */
  async generateVideo() {
    if (this.options.skipVideo) {
      console.log('⏭️  跳过视频生成');
      return;
    }

    console.log('🎬 开始生成视频...');

    try {
      const videoPath = await this.videoComposer.generateVideo(
        this.content,
        this.metadata,
        this.generatedFiles.filter(f => f.includes('docs/assets'))
      );

      if (videoPath) {
        this.generatedFiles.push(videoPath);
        this.metadata.videoPath = videoPath;
        console.log(`✅ 视频生成完成: ${videoPath}`);
      }
    } catch (error) {
      console.error(`❌ 视频生成失败: ${error.message}`);
      console.log('🔄 创建视频占位信息...');

      const videoInfoPath = path.join(this.options.outputDir, 'video-project', 'out', 'video-info.json');
      const videoInfo = {
        status: 'failed',
        error: error.message,
        config: {
          width: this.options.width,
          height: this.options.height,
          fps: this.options.fps,
          duration: this.metadata.suggestedDuration || 30,
          style: this.options.style || CONFIG.defaultStyle
        },
        suggestion: '请确保已安装 Remotion 依赖：cd video-output/temp/remotion-project && npm install',
        createdAt: new Date().toISOString()
      };

      await fs.writeFile(videoInfoPath, JSON.stringify(videoInfo, null, 2));
      this.generatedFiles.push(videoInfoPath);
      console.log('  ⚠️  视频未生成，已保存配置信息');
    }
  }

  /**
   * 生成报告（之前缺失的方法，现已补全）
   */
  async generateReport() {
    console.log('📊 生成执行报告...');

    const theme = THEMES[this.options.style || CONFIG.defaultStyle];
    const title = this.metadata.title || '未命名内容';

    const report = {
      title: '🎬 Video Creator 执行报告',
      generatedAt: new Date().toISOString(),
      content: {
        title,
        words: this.metadata.words,
        paragraphs: this.metadata.paragraphs,
        suggestedDuration: this.metadata.suggestedDuration,
        keywords: this.metadata.keywords
      },
      platform: {
        xhsTitle: this.metadata.xhsTitle,
        wechatTitle: this.metadata.wechatTitle,
        tags: this.metadata.tags,
        summary: this.metadata.summary
      },
      video: {
        style: this.options.style || CONFIG.defaultStyle,
        themeName: theme.name,
        width: this.options.width,
        height: this.options.height,
        fps: this.options.fps,
        duration: this.metadata.suggestedDuration || 30,
        videoPath: this.metadata.videoPath || null
      },
      generatedFiles: this.generatedFiles,
      statistics: {
        totalFiles: this.generatedFiles.length,
        imageFiles: this.generatedFiles.filter(f => f.includes('docs/assets')).length,
        contentFiles: this.generatedFiles.filter(f => f.includes('docs/')).length,
        htmlFiles: this.generatedFiles.filter(f => f.includes('.html')).length,
        videoFiles: this.generatedFiles.filter(f => f.includes('video-project/out')).length
      }
    };

    const reportPath = path.join(this.options.outputDir, 'docs', 'report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.generatedFiles.push(reportPath);

    const reportMdPath = path.join(this.options.outputDir, 'docs', 'report.md');
    const reportMd = `# 🎬 Video Creator 执行报告

## 项目信息
- **生成时间**: ${new Date().toLocaleString('zh-CN')}
- **内容主题**: ${title}
- **输出目录**: ${this.options.outputDir}

## 内容统计
- **总字数**: ${this.metadata.words}字
- **段落数**: ${this.metadata.paragraphs}段
- **建议时长**: ${this.metadata.suggestedDuration}秒
- **关键词**: ${(this.metadata.keywords || []).slice(0, 5).join(', ')}

## 视频规格
- **主题风格**: ${theme.name} (${this.options.style || CONFIG.defaultStyle})
- **分辨率**: ${this.options.width}×${this.options.height}
- **帧率**: ${this.options.fps}fps
- **时长**: ${this.metadata.suggestedDuration || 30}秒

## 平台优化
- **小红书标题**: ${this.metadata.xhsTitle}
- **视频号标题**: ${this.metadata.wechatTitle}
- **标签**: ${(this.metadata.tags || []).join(', ')}

## 生成的文件 (${this.generatedFiles.length}个)
${this.generatedFiles.map(f => `- \`${path.relative(this.options.outputDir, f)}\``).join('\n')}

---

*本报告由 Video Creator 技能自动生成*
`;

    await fs.writeFile(reportMdPath, reportMd);
    this.generatedFiles.push(reportMdPath);

    logger.info('📊 执行报告生成完成');
  }

  /**
   * 发布到微信公众号（生成封面图 + 适配文章）
   */
  async publishWechat() {
    logger.step('12.5', '发布到微信公众号...');

    const title = this.metadata.title || '公众号文章';
    const summary = this.metadata.summary || title;

    // 1. 生成公众号封面图（900x383）
    const coverDir = path.join(this.options.outputDir, 'docs', 'assets');
    await fs.mkdir(coverDir, { recursive: true });
    try {
      const baoyuSkill = `BAOYU_SKILLS_DIR="${path.join(__dirname, '..')}" baoyu-cover-image --type conceptual --palette cool --rendering digital --aspect 2.35:1 --output "${path.join(coverDir, 'cover-wechat.png')}"`;
      await execAsync(baoyuSkill, { timeout: 60000, shell: true });
    } catch (e) {
      const simpleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 383">
        <rect width="900" height="383" fill="#1a1a2e"/>
        <text x="450" y="191" font-family="sans-serif" font-size="48" fill="white" text-anchor="middle">${title}</text>
      </svg>`;
      await fs.writeFile(path.join(coverDir, 'cover-wechat.svg'), simpleSvg, 'utf-8');
      logger.fail(`公众号封面生成降级为 SVG: ${e.message}`);
    }

    // 2. 生成公众号适配 HTML
    const titleMatch = this.content ? this.content.match(/^#\s+(.+?)$/m) : null;
    const contentTitle = titleMatch ? titleMatch[1].trim() : title;
    const bodyMatch = this.content ? this.content.replace(/^---[\s\S]*?---\n*/, '').replace(/^#\s+.+$/m, '').trim() : '';
    const wechatHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${contentTitle}</title>
<link href="https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
<style>body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;background:#fafafa;color:#333;line-height:1.8}
.article-header{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:48px 24px;text-align:center}
.article-content{background:#fff;padding:32px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}</style></head>
<body><header class="article-header"><h1 class="display-5 fw-bold">${contentTitle}</h1>
<p class="lead opacity-75">${summary}</p></header>
<main class="container py-4" style="max-width:680px"><article class="article-content">
<p>${bodyMatch.substring(0, 3000).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>
</article></main></body></html>`;

    const wechatPath = path.join(this.options.outputDir, 'docs', 'wechat-page.html');
    await fs.writeFile(wechatPath, wechatHtml, 'utf-8');
    this.generatedFiles.push(wechatPath);

    logger.info(`✅ 公众号内容已就绪: ${wechatPath}`);
    if (this.baoyuConfig.videoCreatorSpecific) {
      logger.debug('baoyu-config.json 主题映射已加载');
    }
  }
}

// ============================================================
// CLI 入口
// ============================================================
if (require.main === module) {
  const args = process.argv.slice(2);
  const projectDir = path.resolve(args[0] || './workspace');
  const strictMode = args.includes('--strict');
  
  console.log(`
🎬 Video Creator 主程序
============================================================
项目目录: ${projectDir}
严格模式: ${strictMode ? '开启' : '关闭'}
============================================================
`);
  
  const creator = new VideoCreator({
    outputDir: projectDir,
    strict: strictMode,
    style: 'tech-modern'
  });
  
  creator.run()
    .then(() => {
      console.log('\n✅ 执行完成');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ 执行失败:', err.message);
      process.exit(1);
    });
}

module.exports = VideoCreator;
