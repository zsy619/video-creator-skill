/**
 * 内容处理器
 * 处理三种内容来源：链接、主题、内容
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class ContentProcessor {
  constructor(options = {}) {
    this.options = {
      maxContentLength: 10000,
      minContentLength: 100,
      ...options
    };
  }

  /**
   * 处理内容
   */
  async process(input, options = {}) {
    const { type, value } = this.detectInputType(input);
    
    console.log(`📥 检测到输入类型: ${type}`);
    
    let result;
    switch (type) {
      case 'url':
        result = await this.processUrl(value, options);
        break;
      case 'topic':
        result = await this.processTopic(value);
        break;
      case 'content':
        result = await this.processRawContent(value);
        break;
      default:
        throw new Error(`不支持的内容类型: ${type}`);
    }
    
    // 支持两种返回格式：string 或 { content, images }
    const content = typeof result === 'string' ? result : result.content;
    const downloadedImages = typeof result === 'string' ? [] : (result.images || []);
    
    // 验证内容长度
    const validatedContent = this.validateContent(content);
    
    // 分析内容
    const metadata = await this.analyzeContent(validatedContent);
    
    return { 
      content: validatedContent, 
      metadata, 
      type,
      downloadedImages
    };
  }

  /**
   * 检测输入类型
   */
  detectInputType(input) {
    // 检查是否是URL
    if (this.isUrl(input)) {
      return { type: 'url', value: input };
    }
    
    // 检查是否是主题（短文本）
    if (input.length <= 100 && !input.includes('\n')) {
      return { type: 'topic', value: input };
    }
    
    // 默认视为内容
    return { type: 'content', value: input };
  }

  /**
   * 检查是否是URL
   */
  isUrl(str) {
    try {
      const url = new URL(str);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  /**
   * 处理URL
   */
  async processUrl(url, options = {}) {
    console.log(`🔗 处理URL: ${url}`);
    
    const outputDir = options.outputDir || 'docs/assets/imgs';
    
    try {
      // 尝试使用 baoyu-url-to-markdown 技能（带图片下载）
      const result = await this.callBaoyuSkill('url-to-markdown', { 
        url, 
        downloadMedia: true,
        mediaDir: outputDir
      });
      
      if (result && result.content) {
        // 下载的图片路径
        const downloadedImages = result.downloads?.images || [];
        if (downloadedImages.length > 0) {
          console.log(`📷 已下载 ${downloadedImages.length} 张图片到 ${outputDir}/`);
        }
        return {
          content: result.content,
          images: downloadedImages
        };
      }
      
      // 如果技能调用失败，使用web_fetch
      const { web_fetch } = require('./tool-proxy');
      const response = await web_fetch({ url });
      
      if (response && response.content) {
        return {
          content: this.htmlToMarkdown(response.content),
          images: []
        };
      }
      
      throw new Error('无法获取URL内容');
      
    } catch (error) {
      console.warn(`❌ URL处理失败: ${error.message}`);
      
      // 返回模拟数据
      return {
        content: this.generateMockContent(`网页内容: ${url}`),
        images: []
      };
    }
  }

  /**
   * 处理主题
   */
  async processTopic(topic) {
    console.log(`🔍 搜索主题: ${topic}`);
    
    try {
      // 使用web_search搜索
      const { web_search } = require('./tool-proxy');
      const results = await web_search({ query: topic, count: 5 });
      
      if (results && results.length > 0) {
        // 组合搜索结果
        let content = `# ${topic}\n\n`;
        
        results.forEach((result, index) => {
          content += `## ${result.title}\n`;
          content += `${result.snippet}\n\n`;
          
          // 只取前3个结果
          if (index < 2) {
            content += `来源: ${result.url}\n\n`;
          }
        });
        
        content += `\n---\n*以上内容基于对"${topic}"的搜索结果整理*`;
        
        return content;
      }
      
      throw new Error('搜索无结果');
      
    } catch (error) {
      console.warn(`❌ 主题搜索失败: ${error.message}`);
      
      // 返回模拟数据
      return this.generateMockContent(topic);
    }
  }

  /**
   * 处理原始内容
   */
  async processRawContent(content) {
    console.log(`📝 处理原始内容，长度: ${content.length} 字符`);
    
    // 如果内容太短，尝试补充
    if (content.length < this.options.minContentLength) {
      console.log('📝 内容较短，尝试补充...');
      content = await this.enrichContent(content);
    }
    
    return content;
  }

  /**
   * 验证内容
   */
  validateContent(content) {
    // 检查长度
    if (content.length < this.options.minContentLength) {
      throw new Error(`内容太短，至少需要 ${this.options.minContentLength} 字符`);
    }
    
    if (content.length > this.options.maxContentLength) {
      console.log(`⚠️  内容过长，截取前 ${this.options.maxContentLength} 字符`);
      content = content.substring(0, this.options.maxContentLength) + '\n\n...（内容已截断）';
    }
    
    // 确保有标题
    if (!content.startsWith('# ')) {
      content = '# 未命名内容\n\n' + content;
    }
    
    return content;
  }

  /**
   * 分析内容
   */
  async analyzeContent(content) {
    console.log('📊 分析内容...');
    
    const analysis = {
      // 基础统计
      length: content.length,
      words: this.countWords(content),
      paragraphs: this.countParagraphs(content),
      lines: this.countLines(content),
      
      // 提取信息
      title: this.extractTitle(content),
      summary: this.extractSummary(content),
      keywords: this.extractKeywords(content),
      
      // 计算建议
      suggestedDuration: this.calculateDuration(content),
      imageCount: this.calculateImageCount(content),
      
      // 时间戳
      analyzedAt: new Date().toISOString()
    };
    
    // 生成平台特定标题
    analysis.xhsTitle = this.generateXhsTitle(analysis.title);
    analysis.wechatTitle = this.generateWechatTitle(analysis.title);
    
    // 生成标签
    analysis.tags = this.generateTags(analysis.keywords);
    
    console.log(`📈 分析完成: ${analysis.words}字，${analysis.paragraphs}段`);
    
    return analysis;
  }

  /**
   * 统计字数
   */
  countWords(text) {
    // 中文字数 + 英文单词数
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/\b[a-zA-Z]+\b/g) || []).length;
    return chineseChars + englishWords;
  }

  /**
   * 统计段落
   */
  countParagraphs(text) {
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  }

  /**
   * 统计行数
   */
  countLines(text) {
    return text.split('\n').length;
  }

  /**
   * 提取标题
   */
  extractTitle(text) {
    const match = text.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : '未命名内容';
  }

  /**
   * 提取摘要
   */
  extractSummary(text, maxLength = 200) {
    // 移除标题和代码块
    let cleanText = text
      .replace(/^#.*$/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    
    // 取前maxLength字
    if (cleanText.length > maxLength) {
      cleanText = cleanText.substring(0, maxLength) + '...';
    }
    
    return cleanText;
  }

  /**
   * 提取关键词
   */
  extractKeywords(text, count = 10) {
    // 移除常见词和标点
    const stopWords = ['的', '了', '在', '是', '和', '与', '或', '等', '这', '那', '有', '我', '你', '他'];
    const words = text.toLowerCase()
      .match(/[\u4e00-\u9fa5a-z]{2,}/g) || [];
    
    // 统计词频
    const freq = {};
    words.forEach(word => {
      if (!stopWords.includes(word) && word.length > 1) {
        freq[word] = (freq[word] || 0) + 1;
      }
    });
    
    // 排序并取前count个
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([word]) => word);
  }

  /**
   * 计算建议时长
   */
  calculateDuration(text) {
    const words = this.countWords(text);
    // 每50字约1秒，最少10秒，最多120秒
    return Math.max(10, Math.min(120, Math.ceil(words / 50)));
  }

  /**
   * 计算图片数量
   */
  calculateImageCount(text) {
    const words = this.countWords(text);
    // 每100字配1张图，最少1张，最多10张
    return Math.max(1, Math.min(10, Math.floor(words / 100)));
  }

  /**
   * 生成小红书标题
   */
  generateXhsTitle(originalTitle) {
    const prefixes = ['🔥', '💡', '🎯', '🚀', '🌟', '📈', '🤖', '💻', '⚡', '🎨'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    // 小红书标题通常较短
    const maxLength = 20;
    let title = originalTitle;
    
    if (title.length > maxLength) {
      title = title.substring(0, maxLength - 3) + '...';
    }
    
    return `${prefix} ${title}`;
  }

  /**
   * 生成视频号标题
   */
  generateWechatTitle(originalTitle) {
    const prefixes = ['【科技】', '【前沿】', '【干货】', '【必看】', '【最新】'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    // 视频号标题可以稍长
    const maxLength = 30;
    let title = originalTitle;
    
    if (title.length > maxLength) {
      title = title.substring(0, maxLength - 3) + '...';
    }
    
    return `${prefix}${title}`;
  }

  /**
   * 生成标签
   */
  generateTags(keywords) {
    const baseTags = ['科技', '人工智能', '创新', '未来', '数字', '智能', '数据', '互联网'];
    
    // 合并并去重
    const allTags = [...new Set([...baseTags, ...keywords.slice(0, 5)])];
    
    // 确保至少有5个标签
    while (allTags.length < 5) {
      allTags.push(`标签${allTags.length + 1}`);
    }
    
    // 限制最多10个标签
    return allTags.slice(0, 10);
  }

  /**
   * 丰富内容
   */
  async enrichContent(content) {
    // 提取关键词
    const keywords = this.extractKeywords(content, 3);
    
    if (keywords.length > 0) {
      try {
        // 搜索相关补充内容
        const { web_search } = require('./tool-proxy');
        const results = await web_search({ 
          query: keywords.join(' '), 
          count: 2 
        });
        
        if (results && results.length > 0) {
          let enriched = content + '\n\n## 补充信息\n\n';
          
          results.forEach((result, index) => {
            enriched += `**${result.title}**\n`;
            enriched += `${result.snippet}\n\n`;
          });
          
          return enriched;
        }
      } catch (error) {
        console.warn('❌ 内容补充失败:', error.message);
      }
    }
    
    // 如果补充失败，返回原内容
    return content;
  }

  /**
   * 调用宝玉技能
   */
  async callBaoyuSkill(skillName, params) {
    // 这里应该调用实际的宝玉技能
    // 暂时返回null
    return null;
  }

  /**
   * HTML转Markdown
   */
  htmlToMarkdown(html) {
    // 简单的HTML转Markdown
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * 生成模拟内容
   */
  generateMockContent(topic) {
    return `# ${topic}

## 概述
${topic}是当前科技领域的重要发展方向，它正在深刻改变我们的生活和工作方式。

## 核心特点
1. **创新性** - 采用最新技术架构
2. **高效性** - 大幅提升工作效率
3. **智能化** - 集成人工智能能力
4. **可扩展** - 支持灵活定制和扩展

## 应用场景
- 企业数字化转型
- 个人效率工具
- 教育学习平台
- 娱乐创意领域

## 未来展望
随着技术的不断进步，${topic}将在更多领域发挥重要作用，推动社会向更加智能、高效的方向发展。

## 总结
${topic}代表了科技发展的前沿方向，掌握相关技能将有助于在数字时代保持竞争力。`;
  }
}

module.exports = ContentProcessor;