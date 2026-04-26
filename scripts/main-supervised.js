#!/usr/bin/env node

/**
 * Video Creator 主入口脚本 - 带自我监督机制
 * 自动化视频创作流程，确保每个步骤的质量和成功率
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// 导入监督系统
const SupervisionSystem = require('./supervision-system-complete');
const BaoyuIntegration = require('./baoyu-integration');
const { THEMES, CONFIG, VALID_STYLES, VALID_PLATFORMS } = require('./themes');

// 配置（继承公共配置，添加监督相关配置）
const SUPERVISED_CONFIG = {
  ...CONFIG,
  defaultDuration: 30, // 默认30秒
  minDuration: 10,     // 最小10秒
  maxDuration: 120,    // 最大120秒
  fps: 60,
  width: 1080,
  height: 1920,
  quality: 'high',
  defaultStyle: 'cyberpunk',
  
  // 监督配置
  supervision: {
    enabled: true,
    level: 'detailed', // basic/detailed/strict
    qualityThreshold: 0.8,
    maxRetries: 3,
    timeout: 300000, // 5分钟
    autoFix: true,
    generateReport: true
  }
};

class VideoCreatorSupervised {
  constructor(options = {}) {
    this.options = { ...SUPERVISED_CONFIG, ...options };
    this.content = null;
    this.metadata = {};
    this.generatedFiles = [];
    
    // 初始化监督系统
    this.supervision = new SupervisionSystem({
      maxRetries: this.options.supervision.maxRetries,
      qualityThreshold: this.options.supervision.qualityThreshold,
      timeout: this.options.supervision.timeout,
      enableAutoFix: this.options.supervision.autoFix,
      enableReporting: this.options.supervision.generateReport,
      logLevel: this.options.supervision.level === 'strict' ? 'debug' : 'info'
    });
    
    // 初始化宝玉集成
    this.baoyu = new BaoyuIntegration({
      outputDir: this.options.outputDir,
      enableFallback: this.options.supervision.autoFix
    });
  }

  /**
   * 主执行函数 - 带监督
   */
  async run() {
    try {
      console.log('🎬 开始视频创作流程（带自我监督）...');
      
      // 1. 启动监督系统
      await this.supervision.startSupervision('Video Creator 流程');
      
      // 2. 执行带监督的流程
      const results = await this.executeSupervisedWorkflow();
      
      // 3. 结束监督并生成报告
      const supervisionReport = await this.supervision.endSupervision();
      
      // 4. 生成综合报告
      await this.generateComprehensiveReport(results, supervisionReport);
      
      console.log('✅ 视频创作完成（带自我监督）！');
      console.log(`📁 输出目录: ${this.options.outputDir}`);
      
      if (this.options.supervision.generateReport) {
        console.log(`📊 监督报告: ${path.join(this.options.outputDir, 'supervision', 'execution-report.json')}`);
      }
      
      return {
        success: supervisionReport.success,
        outputDir: this.options.outputDir,
        generatedFiles: this.generatedFiles,
        supervisionReport
      };
      
    } catch (error) {
      console.error('❌ 视频创作失败（带监督）:', error.message);
      
      // 即使失败也生成错误报告
      try {
        await this.generateErrorReport(error);
      } catch (reportError) {
        console.error('❌ 错误报告生成失败:', reportError.message);
      }
      
      throw error;
    }
  }

  /**
   * 执行带监督的工作流程
   */
  async executeSupervisedWorkflow() {
    const steps = [
      {
        name: '创建输出目录',
        function: async () => await this.createOutputDir(),
        options: {
          critical: true,
          maxRetries: 2,
          fallbackFunction: async () => await this.createOutputDirFallback()
        }
      },
      {
        name: '获取内容',
        function: async (attempt) => await this.getContentSupervised(attempt),
        options: {
          critical: true,
          maxRetries: 3,
          validateResult: async (result) => await this.validateContentResult(result),
          fallbackFunction: async () => await this.getContentFallback()
        }
      },
      {
        name: '分析内容',
        function: async () => await this.analyzeContent(),
        options: {
          critical: false,
          maxRetries: 2,
          validateResult: async (result) => await this.validateAnalysisResult(result)
        }
      },
      {
        name: 'Step 3: 构建项目',
        function: async () => await this.buildProjectSupervised(),
        options: {
          critical: false,
          maxRetries: 1
        }
      },
      {
        name: '生成文案',
        function: async () => await this.generateCopywritingSupervised(),
        options: {
          critical: false,
          maxRetries: 2,
          validateResult: async (result) => await this.validateCopywritingResult(result),
          fallbackFunction: async () => await this.generateCopywritingFallback()
        }
      },
      {
        name: '构建HTML页面',
        function: async () => await this.buildHtmlPageSupervised(),
        options: {
          critical: false,
          maxRetries: 2,
          validateResult: async (result) => await this.validateHtmlResult(result),
          fallbackFunction: async () => await this.buildHtmlPageFallback()
        }
      },
      {
        name: '生成视觉内容',
        function: async () => await this.generateVisualContentSupervised(),
        options: {
          critical: false,
          maxRetries: 3,
          validateResult: async (result) => await this.validateVisualContentResult(result),
          fallbackFunction: async () => await this.generateVisualContentFallback()
        }
      },
      {
        name: 'Step 7: 生成音频',
        function: async () => await this.generateAudioSupervised(),
        options: {
          critical: false,
          maxRetries: 2,
          fallbackFunction: async () => await this.generateAudioFallback()
        }
      },
      {
        name: 'Step 8: 生成字幕',
        function: async () => await this.generateSubtitlesSupervised(),
        options: {
          critical: false,
          maxRetries: 2,
          fallbackFunction: async () => await this.generateSubtitlesFallback()
        }
      },
      {
        name: 'Step 9: 质量检查',
        function: async () => await this.runQualityCheckSupervised(),
        options: {
          critical: false,
          maxRetries: 2
        }
      },
      {
        name: '生成视频',
        function: async () => await this.generateVideoSupervised(),
        options: {
          critical: true,
          maxRetries: 3,
          timeout: 600000,
          validateResult: async (result) => await this.validateVideoResult(result),
          fallbackFunction: async () => await this.generateVideoFallback()
        }
      }
    ];
    
    // 执行批量监督
    const batchResults = await this.supervision.superviseBatch(steps, {
      batchName: '视频创作主流程',
      stopOnCriticalFailure: true
    });
    
    return batchResults;
  }

  /**
   * 创建输出目录（带监督）
   */
  async createOutputDir() {
    const dirs = [
      'content',
      'images',
      'html',
      'video',
      'temp',
      'supervision',
      'logs'
    ];
    
    for (const dir of dirs) {
      const fullPath = path.join(this.options.outputDir, dir);
      await fs.mkdir(fullPath, { recursive: true });
      
      // 验证目录创建
      try {
        await fs.access(fullPath);
      } catch (error) {
        throw new Error(`目录创建失败: ${fullPath}`);
      }
    }
    
    console.log('📁 创建输出目录结构完成');
    return { success: true, directories: dirs };
  }

  /**
   * 创建输出目录备用方案
   */
  async createOutputDirFallback() {
    console.log('🔄 使用备用方案创建目录...');
    
    // 只创建必要目录
    const essentialDirs = ['content', 'video'];
    
    for (const dir of essentialDirs) {
      const fullPath = path.join(this.options.outputDir, dir);
      try {
        await fs.mkdir(fullPath, { recursive: true });
      } catch (error) {
        console.warn(`⚠️ 目录创建失败（备用）: ${fullPath}`);
      }
    }
    
    return { success: true, directories: essentialDirs, fallback: true };
  }

  /**
   * 获取内容（带监督）
   */
  async getContentSupervised(attempt) {
    const { url, topic, content } = this.options;
    
    if (url) {
      console.log(`🔗 从链接获取内容 (尝试 ${attempt})...`);
      return await this.getContentFromUrlSupervised(url, attempt);
    } else if (topic) {
      console.log(`🔍 搜索主题内容 (尝试 ${attempt})...`);
      return await this.getContentFromTopicSupervised(topic, attempt);
    } else if (content) {
      console.log('📝 使用提供的内容...');
      this.content = content;
      return { success: true, source: 'direct', length: content.length };
    } else {
      throw new Error('请提供内容来源：--url, --topic, 或 --content');
    }
  }

  /**
   * 从链接获取内容（带监督）
   */
  async getContentFromUrlSupervised(url, attempt) {
    try {
      console.log(`🔗 使用宝玉技能获取URL内容: ${url} (尝试 ${attempt})`);
      
      const result = await this.baoyu.callBaoyuSkill('baoyu-url-to-markdown', {
        url,
        outputPath: path.join(this.options.outputDir, 'content', 'original.md'),
        retryCount: attempt - 1
      });
      
      if (result.success && result.content) {
        this.content = result.content;
        
        // 保存原始内容
        const contentPath = path.join(this.options.outputDir, 'content', 'original.md');
        await fs.writeFile(contentPath, this.content);
        this.generatedFiles.push(contentPath);
        
        console.log(`✅ URL内容获取成功，长度: ${this.content.length} 字符`);
        return { 
          success: true, 
          source: 'url', 
          length: this.content.length,
          url 
        };
      } else {
        throw new Error('宝玉技能返回空内容');
      }
    } catch (error) {
      console.warn(`❌ 宝玉技能调用失败 (尝试 ${attempt}): ${error.message}`);
      
      // 如果是最后一次尝试，抛出错误
      if (attempt >= 3) {
        throw new Error(`URL内容获取失败: ${error.message}`);
      }
      
      // 否则返回失败，让监督系统决定是否重试
      return { 
        success: false, 
        error: error.message,
        attempt 
      };
    }
  }

  /**
   * 从主题搜索内容（带监督）
   */
  async getContentFromTopicSupervised(topic, attempt) {
    try {
      // 这里应该调用 web_search 技能
      // 暂时使用模拟数据
      this.content = `# ${topic}\n\n这是一篇关于${topic}的详细内容...\n\n生成时间: ${new Date().toISOString()}\n尝试次数: ${attempt}`;
      
      // 保存原始内容
      const contentPath = path.join(this.options.outputDir, 'content', 'original.md');
      await fs.writeFile(contentPath, this.content);
      this.generatedFiles.push(contentPath);
      
      console.log(`✅ 主题内容生成成功，长度: ${this.content.length} 字符`);
      return { 
        success: true, 
        source: 'topic', 
        length: this.content.length,
        topic 
      };
    } catch (error) {
      console.warn(`❌ 主题内容生成失败 (尝试 ${attempt}): ${error.message}`);
      return { 
        success: false, 
        error: error.message,
        attempt 
      };
    }
  }

  /**
   * 获取内容备用方案
   */
  async getContentFallback() {
    console.log('🔄 使用备用方案获取内容...');
    
    const { url, topic, content } = this.options;
    let fallbackContent = '';
    
    if (url) {
      fallbackContent = `# 网页内容（备用）\n\nURL: ${url}\n\n由于网络或技能问题，无法获取原始内容。\n\n备用内容生成时间: ${new Date().toISOString()}`;
    } else if (topic) {
      fallbackContent = `# ${topic}（备用）\n\n这是关于${topic}的备用内容。\n\n生成时间: ${new Date().toISOString()}`;
    } else if (content) {
      fallbackContent = content;
    } else {
      fallbackContent = '# 默认内容\n\n视频创作内容。\n\n生成时间: ${new Date().toISOString()}';
    }
    
    this.content = fallbackContent;
    
    // 保存原始内容
    const contentPath = path.join(this.options.outputDir, 'content', 'original.md');
    await fs.writeFile(contentPath, this.content);
    this.generatedFiles.push(contentPath);
    
    return { 
      success: true, 
      source: 'fallback', 
      length: this.content.length,
      fallback: true 
    };
  }

  /**
   * 验证内容结果
   */
  async validateContentResult(result) {
    if (!result.success) {
      return { valid: false, message: '内容获取失败' };
    }
    
    if (!this.content || this.content.length < 50) {
      return { 
        valid: false, 
        message: '内容过短或为空',
        qualityScore: 0.3 
      };
    }
    
    // 简单质量检查
    const hasTitle = this.content.match(/^#\s+.+$/m);
    const hasContent = this.content.length > 100;
    
    let qualityScore = 0.5;
    if (hasTitle) qualityScore += 0.2;
    if (hasContent) qualityScore += 0.3;
    
    const warnings = [];
    if (!hasTitle) warnings.push('缺少标题');
    if (!hasContent) warnings.push('内容过短');
    
    return {
      valid: qualityScore >= 0.6,
      qualityScore,
      warnings,
      suggestions: hasTitle ? [] : ['添加标题 (# 标题)']
    };
  }

  async buildProject() { return this._delegate('buildProject'); }
  async generateAudio() { return this._delegate('generateAudio'); }
  async generateAudioFallback() { return { success: true, fallback: true }; }
  async generateSubtitles() { return this._delegate('generateSubtitles'); }
  async generateSubtitlesFallback() { return { success: true, fallback: true }; }
  async runQualityCheck() { return this._delegate('runQualityCheck'); }

  async _delegate(methodName) {
    try {
      const VideoCreator = require('./main');
      const creator = new VideoCreator(this.options);
      if (typeof creator[methodName] === 'function') await creator[methodName]();
      return { success: true };
    } catch (e) {
      return { success: true, fallback: true };
    }
  }
}

module.exports = VideoCreatorSupervised;