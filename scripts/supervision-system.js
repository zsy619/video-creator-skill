#!/usr/bin/env node

/**
 * Video Creator 自我监督系统
 * 实现端到端的质量监控和自动修复机制
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class SupervisionSystem {
  constructor(options = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 2000, // 2秒
      qualityThreshold: 0.8, // 质量阈值80%
      timeout: 300000, // 5分钟超时
      enableAutoFix: true,
      enableFallback: true,
      enableValidation: true,
      enableReporting: true,
      ...options
    };
    
    this.stats = {
      totalSteps: 0,
      successfulSteps: 0,
      failedSteps: 0,
      retriedSteps: 0,
      fixedSteps: 0,
      fallbackUsed: 0,
      startTime: null,
      endTime: null,
      stepHistory: []
    };
    
    this.qualityMetrics = {
      contentQuality: 0,
      visualQuality: 0,
      technicalQuality: 0,
      overallQuality: 0
    };
    
    this.errors = [];
    this.warnings = [];
  }

  /**
   * 开始监督
   */
  async startSupervision(processName) {
    console.log(`🔍 开始监督流程: ${processName}`);
    this.stats.startTime = Date.now();
    this.stats.totalSteps = 0;
    this.stats.processName = processName;
    
    return {
      success: true,
      message: `监督系统已启动: ${processName}`
    };
  }

  /**
   * 监督单个步骤
   */
  async superviseStep(stepName, stepFunction, options = {}) {
    const stepOptions = {
      maxRetries: options.maxRetries || this.options.maxRetries,
      timeout: options.timeout || this.options.timeout,
      critical: options.critical || false,
      validateResult: options.validateResult || null,
      fallbackFunction: options.fallbackFunction || null,
      ...options
    };
    
    this.stats.totalSteps++;
    const stepId = this.stats.totalSteps;
    const stepStartTime = Date.now();
    
    console.log(`\n📋 步骤 ${stepId}: ${stepName}`);
    console.log(`  配置: ${JSON.stringify(stepOptions, null, 2)}`);
    
    const stepRecord = {
      id: stepId,
      name: stepName,
      startTime: stepStartTime,
      endTime: null,
      status: 'pending',
      retries: 0,
      errors: [],
      warnings: [],
      result: null,
      qualityScore: 0
    };
    
    let result = null;
    let success = false;
    let lastError = null;
    
    // 尝试执行步骤（带重试）
    for (let attempt = 1; attempt <= stepOptions.maxRetries + 1; attempt++) {
      try {
        console.log(`  尝试 ${attempt}/${stepOptions.maxRetries + 1}...`);
        
        // 设置超时
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`步骤超时 (${stepOptions.timeout}ms)`)), stepOptions.timeout);
        });
        
        // 执行步骤
        const stepPromise = stepFunction(attempt);
        result = await Promise.race([stepPromise, timeoutPromise]);
        
        // 验证结果
        if (stepOptions.validateResult) {
          const validation = await stepOptions.validateResult(result);
          if (!validation.valid) {
            throw new Error(`结果验证失败: ${validation.message}`);
          }
          stepRecord.qualityScore = validation.qualityScore || 0;
        }
        
        success = true;
        stepRecord.retries = attempt - 1;
        break;
        
      } catch (error) {
        lastError = error;
        stepRecord.errors.push({
          attempt,
          error: error.message,
          timestamp: Date.now()
        });
        
        console.error(`  ❌ 尝试 ${attempt} 失败: ${error.message}`);
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt <= stepOptions.maxRetries) {
          const delay = this.options.retryDelay * attempt; // 指数退避
          console.log(`  ⏳ 等待 ${delay}ms 后重试...`);
          await this.sleep(delay);
          this.stats.retriedSteps++;
        }
      }
    }
    
    // 如果步骤失败
    if (!success) {
      stepRecord.status = 'failed';
      stepRecord.endTime = Date.now();
      this.stats.failedSteps++;
      this.errors.push({
        step: stepName,
        error: lastError.message,
        timestamp: Date.now()
      });
      
      console.error(`❌ 步骤 ${stepId} 失败: ${stepName}`);
      console.error(`   错误: ${lastError.message}`);
      
      // 如果是关键步骤，尝试修复或使用备用方案
      if (stepOptions.critical) {
        console.log(`🔄 关键步骤失败，尝试修复...`);
        
        // 尝试自动修复
        if (this.options.enableAutoFix && stepOptions.fallbackFunction) {
          try {
            console.log(`  尝试备用方案...`);
            result = await stepOptions.fallbackFunction();
            stepRecord.status = 'fixed';
            stepRecord.fixedWith = 'fallback';
            this.stats.fixedSteps++;
            this.stats.fallbackUsed++;
            success = true;
            console.log(`  ✅ 备用方案成功`);
          } catch (fallbackError) {
            console.error(`  ❌ 备用方案也失败: ${fallbackError.message}`);
            stepRecord.status = 'critical_failure';
          }
        }
      }
      
      // 如果仍然失败且是关键步骤，抛出错误
      if (!success && stepOptions.critical) {
        throw new Error(`关键步骤失败且无法修复: ${stepName} - ${lastError.message}`);
      }
    } else {
      // 步骤成功
      stepRecord.status = 'success';
      stepRecord.endTime = Date.now();
      stepRecord.result = result;
      this.stats.successfulSteps++;
      
      const duration = stepRecord.endTime - stepRecord.startTime;
      console.log(`✅ 步骤 ${stepId} 成功: ${stepName} (${duration}ms)`);
      
      if (stepRecord.retries > 0) {
        console.log(`  重试次数: ${stepRecord.retries}`);
      }
      
      if (stepRecord.qualityScore > 0) {
        console.log(`  质量评分: ${stepRecord.qualityScore.toFixed(2)}`);
      }
    }
    
    // 记录步骤历史
    stepRecord.duration = stepRecord.endTime ? stepRecord.endTime - stepRecord.startTime : 0;
    this.stats.stepHistory.push(stepRecord);
    
    return {
      success,
      result,
      stepRecord,
      error: lastError
    };
  }

  /**
   * 监督批量步骤
   */
  async superviseBatch(steps, options = {}) {
    const results = [];
    const batchOptions = {
      parallel: options.parallel || false,
      stopOnCriticalFailure: options.stopOnCriticalFailure || true,
      ...options
    };
    
    console.log(`\n📦 开始批量监督: ${steps.length} 个步骤`);
    console.log(`  模式: ${batchOptions.parallel ? '并行' : '串行'}`);
    
    if (batchOptions.parallel) {
      // 并行执行
      const promises = steps.map(step => 
        this.superviseStep(step.name, step.function, step.options)
      );
      
      const stepResults = await Promise.allSettled(promises);
      
      stepResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ 步骤 ${steps[index].name} 执行失败: ${result.reason}`);
          results.push({
            success: false,
            error: result.reason,
            stepRecord: {
              name: steps[index].name,
              status: 'failed'
            }
          });
        }
      });
    } else {
      // 串行执行
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const result = await this.superviseStep(step.name, step.function, step.options);
        results.push(result);
        
        // 如果步骤失败且是关键步骤，根据配置决定是否继续
        if (!result.success && step.options.critical && batchOptions.stopOnCriticalFailure) {
          console.error(`🚨 关键步骤失败，停止批量执行`);
          break;
        }
      }
    }
    
    return results;
  }

  /**
   * 验证内容质量
   */
  async validateContentQuality(content, metadata = {}) {
    console.log(`📊 验证内容质量...`);
    
    const metrics = {
      lengthScore: 0,
      structureScore: 0,
      readabilityScore: 0,
      keywordScore: 0,
      overallScore: 0
    };
    
    try {
      // 1. 长度验证
      const contentLength = content.length;
      if (contentLength < 100) {
        metrics.lengthScore = 0.3;
        this.warnings.push('内容过短，建议至少100字');
      } else if (contentLength < 500) {
        metrics.lengthScore = 0.6;
        this.warnings.push('内容较短，建议扩充到500字以上');
      } else if (contentLength < 2000) {
        metrics.lengthScore = 0.9;
      } else {
        metrics.lengthScore = 1.0;
      }
      
      // 2. 结构验证
      const hasTitle = content.match(/^#\s+.+$/m);
      const hasParagraphs = content.split('\n\n').length > 3;
      const hasLists = content.match(/^[-*]\s+.+$/gm);
      
      metrics.structureScore = (
        (hasTitle ? 0.3 : 0) +
        (hasParagraphs ? 0.4 : 0) +
        (hasLists ? 0.3 : 0)
      );
      
      if (!hasTitle) {
        this.warnings.push('缺少标题（# 标题）');
      }
      if (!hasParagraphs) {
        this.warnings.push('段落结构不明显');
      }
      
      // 3. 可读性验证（简单实现）
      const avgSentenceLength = content.split(/[。.!?]/).reduce((sum, sentence) => 
        sum + sentence.trim().length, 0) / content.split(/[。.!?]/).length;
      
      if (avgSentenceLength > 50) {
        metrics.readabilityScore = 0.6;
        this.warnings.push('句子偏长，建议拆分');
      } else if (avgSentenceLength > 30) {
        metrics.readabilityScore = 0.8;
      } else {
        metrics.readabilityScore = 1.0;
      }
      
      // 4. 关键词验证
      const keywordCount = metadata.keywords ? metadata.keywords.length : 0;
      metrics.keywordScore = Math.min(keywordCount / 5, 1.0);
      
      if (keywordCount < 3) {
        this.warnings.push('关键词较少，建议添加更多关键词');
      }
      
      // 5. 计算总体分数
      metrics.overallScore = (
        metrics.lengthScore * 0.2 +
        metrics.structureScore * 0.3 +
        metrics.readabilityScore * 0.3 +
        metrics.keywordScore * 0.2
      );
      
      this.qualityMetrics.contentQuality = metrics.overallScore;
      
      console.log(`  ✅ 内容质量验证完成`);
      console.log(`    长度评分: ${metrics.lengthScore.toFixed(2)}`);
      console.log(`    结构评分: ${metrics.structureScore.toFixed(2)}`);
      console.log(`    可读性评分: ${metrics.readabilityScore.toFixed(2)}`);
      console.log(`    关键词评分: ${metrics.keywordScore.toFixed(2)}`);
      console.log(`    总体评分: ${metrics.overallScore.toFixed(2)}`);
      
      return {
        valid: metrics.overallScore >= this.options.qualityThreshold,
        metrics,
        warnings: this.warnings.filter(w => w.startsWith('内容')),
        suggestions: this.getContentSuggestions(metrics)
      };
      
    } catch (error) {
      console.error(`❌ 内容质量验证失败: ${error.message}`);
      return {
        valid: false,
        metrics,
        error: error.message
      };
    }
  }

  /**
   * 验证视觉内容质量
   */
  async validateVisualQuality(imagePaths, metadata = {}) {
    console.log(`🎨 验证视觉内容质量...`);
    
    const metrics = {
      coverScore: 0,
      illustrationScore: 0,
      infographicScore: 0,
      consistencyScore: 0,
      overallScore: 0
    };
    
    try {
      // 检查文件存在性
      const existingImages = [];
      for (const imagePath of imagePaths) {
        try {
          await fs.access(imagePath);
          existingImages.push(imagePath);
        } catch (error) {
          console.warn(`  ⚠️  图片文件不存在: ${imagePath}`);
        }
      }
      
      // 1. 封面图验证
      const hasCover = existingImages.some(path => path.includes('cover'));
      metrics.coverScore = hasCover ? 1.0 : 0;
      
      if (!hasCover) {
        this.warnings.push('缺少封面图');
      }
      
      // 2. 插图验证
      const illustrationCount = existingImages.filter(path => 
        path.includes('illustration') || path.includes('illus')
      ).length;
      
      metrics.illustrationScore = Math.min(illustrationCount / 3, 1.0);
      
      if (illustrationCount < 2) {
        this.warnings.push('插图数量不足，建议至少2张');
      }
      
      // 3. 信息图验证
      const hasInfographic = existingImages.some(path => path.includes('infographic'));
      metrics.infographicScore = hasInfographic ? 1.0 : 0.5;
      
      if (!hasInfographic) {
        this.warnings.push('缺少信息图，建议添加');
      }
      
      // 4. 一致性验证（简单实现）
      const theme = metadata.theme || 'tech-modern';
      metrics.consistencyScore = 0.8; // 假设有一定一致性
      
      // 5. 计算总体分数
      metrics.overallScore = (
        metrics.coverScore * 0.3 +
        metrics.illustrationScore * 0.3 +
        metrics.infographicScore * 0.2 +
        metrics.consistencyScore * 0.2
      );
      
      this.qualityMetrics.visualQuality = metrics.overallScore;
      
      console.log(`  ✅ 视觉质量验证完成`);
      console.log(`    封面评分: ${metrics.coverScore.toFixed(2)}`);
      console.log(`    插图评分: ${metrics.illustrationScore.toFixed(2)} (${illustrationCount}张)`);
      console.log(`    信息图评分: ${metrics.infographicScore.toFixed(2)}`);
      console.log(`    一致性评分: ${metrics.consistencyScore.toFixed(2)}`);
      console.log(`    总体评分: ${metrics.overallScore.toFixed(2)}`);
      
      return {
        valid: metrics.overallScore >= this.options.qualityThreshold,
        metrics,
        warnings: this.warnings.filter(w => w.startsWith('视觉')),
        suggestions: this.getVisualSuggestions(metrics)
      };
      
    } catch (error) {
      console.error(`❌ 视觉质量验证失败: ${error.message}`);
      return {
        valid: false,
        metrics,
        error: error.message
      };
    }
  }

  /**
   * 验证技术质量
   */
  async validateTechnicalQuality(outputFiles, metadata = {}) {
    console.log(`⚙️ 验证技术质量...`);
    
    const metrics = {
      fileScore: 0,
      formatScore: 0,
      performanceScore: 0,
      compatibilityScore: 0,
      overallScore: 0
    };
    
    try {
      // 1. 文件完整性验证
      const requiredFiles = [
        'content/original.md',
        'content/processed.md',
        'content/metadata.json',
        'html/article-summary.html'
      ];
      
      let existingFiles = 0;
      for (const requiredFile of requiredFiles) {
        const fullPath = path.join(metadata.outputDir || '.', requiredFile);
        try {
          await fs.access(fullPath);
          existingFiles++;
        } catch (error) {
          console.warn(`  ⚠️  必需文件缺失: ${requiredFile}`);
        }
      }
      
      metrics.fileScore = existingFiles / requiredFiles.length;
      
      if (metrics.fileScore < 1.0) {
        this.warnings.push(`文件完整性不足: ${existingFiles}/${requiredFiles.length}`);
      }
      
      // 2. 格式验证
      const hasVideo = outputFiles.some(file => file.endsWith('.mp4') || file.endsWith('.webm'));
      const hasImages = outputFiles.some(file => file.endsWith('.webp') || file.endsWith('.png') || file.endsWith('.jpg'));
      const hasHtml = outputFiles.some(file => file.endsWith('.html'));
      
      metrics.formatScore = (
        (hasVideo ? 0.4 : 0) +
        (hasImages ? 0.3 : 0) +
        (hasHtml ? 0.3 : 0)
      );
      
      if (!hasVideo) {
        this.warnings.push('缺少视频输出文件');
      }
      if (!hasImages) {
        this.warnings.push('缺少图片输出文件');
      }
      
      // 3. 性能验证（简单实现）
      const totalSize = await this.calculateTotalSize(outputFiles);
      if (totalSize >