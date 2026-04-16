#!/usr/bin/env node

/**
 * Video Creator 自我监督系统 - 完整版
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
      logLevel: 'info', // debug, info, warn, error
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
      stepHistory: [],
      processName: ''
    };
    
    this.qualityMetrics = {
      contentQuality: 0,
      visualQuality: 0,
      technicalQuality: 0,
      overallQuality: 0
    };
    
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
  }

  /**
   * 开始监督
   */
  async startSupervision(processName) {
    this.log('info', `🔍 开始监督流程: ${processName}`);
    this.stats.startTime = Date.now();
    this.stats.totalSteps = 0;
    this.stats.processName = processName;
    
    return {
      success: true,
      message: `监督系统已启动: ${processName}`,
      startTime: this.stats.startTime
    };
  }

  /**
   * 结束监督
   */
  async endSupervision() {
    this.stats.endTime = Date.now();
    const duration = this.stats.endTime - this.stats.startTime;
    
    // 计算总体质量
    this.qualityMetrics.overallQuality = (
      this.qualityMetrics.contentQuality * 0.4 +
      this.qualityMetrics.visualQuality * 0.3 +
      this.qualityMetrics.technicalQuality * 0.3
    );
    
    const successRate = this.stats.totalSteps > 0 
      ? (this.stats.successfulSteps / this.stats.totalSteps) * 100 
      : 0;
    
    this.log('info', `\n📊 监督流程结束: ${this.stats.processName}`);
    this.log('info', `⏱️  总耗时: ${duration}ms (${(duration/1000).toFixed(2)}秒)`);
    this.log('info', `📈 步骤统计: ${this.stats.successfulSteps}/${this.stats.totalSteps} 成功 (${successRate.toFixed(1)}%)`);
    this.log('info', `🔄 重试次数: ${this.stats.retriedSteps}`);
    this.log('info', `🔧 修复次数: ${this.stats.fixedSteps}`);
    this.log('info', `🆘 备用方案: ${this.stats.fallbackUsed}`);
    this.log('info', `🎯 总体质量: ${(this.qualityMetrics.overallQuality * 100).toFixed(1)}%`);
    
    if (this.errors.length > 0) {
      this.log('warn', `⚠️  错误数量: ${this.errors.length}`);
    }
    
    if (this.warnings.length > 0) {
      this.log('warn', `⚠️  警告数量: ${this.warnings.length}`);
    }
    
    return {
      success: successRate >= 80, // 80%成功率视为成功
      stats: this.stats,
      qualityMetrics: this.qualityMetrics,
      errors: this.errors,
      warnings: this.warnings,
      suggestions: this.suggestions,
      duration
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
      qualityWeight: options.qualityWeight || 1.0,
      ...options
    };
    
    this.stats.totalSteps++;
    const stepId = this.stats.totalSteps;
    const stepStartTime = Date.now();
    
    this.log('info', `\n📋 步骤 ${stepId}: ${stepName}`);
    this.log('debug', `  配置: ${JSON.stringify(stepOptions, null, 2)}`);
    
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
      qualityScore: 0,
      duration: 0
    };
    
    let result = null;
    let success = false;
    let lastError = null;
    
    // 尝试执行步骤（带重试）
    for (let attempt = 1; attempt <= stepOptions.maxRetries + 1; attempt++) {
      try {
        this.log('info', `  尝试 ${attempt}/${stepOptions.maxRetries + 1}...`);
        
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
          stepRecord.warnings = validation.warnings || [];
          stepRecord.suggestions = validation.suggestions || [];
        }
        
        success = true;
        stepRecord.retries = attempt - 1;
        break;
        
      } catch (error) {
        lastError = error;
        stepRecord.errors.push({
          attempt,
          error: error.message,
          timestamp: Date.now(),
          stack: error.stack
        });
        
        this.log('error', `  ❌ 尝试 ${attempt} 失败: ${error.message}`);
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt <= stepOptions.maxRetries) {
          const delay = this.options.retryDelay * attempt; // 指数退避
          this.log('info', `  ⏳ 等待 ${delay}ms 后重试...`);
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
        timestamp: Date.now(),
        attempts: stepRecord.retries + 1
      });
      
      this.log('error', `❌ 步骤 ${stepId} 失败: ${stepName}`);
      this.log('error', `   错误: ${lastError.message}`);
      this.log('debug', `   堆栈: ${lastError.stack}`);
      
      // 如果是关键步骤，尝试修复或使用备用方案
      if (stepOptions.critical) {
        this.log('info', `🔄 关键步骤失败，尝试修复...`);
        
        // 尝试自动修复
        if (this.options.enableAutoFix && stepOptions.fallbackFunction) {
          try {
            this.log('info', `  尝试备用方案...`);
            result = await stepOptions.fallbackFunction();
            stepRecord.status = 'fixed';
            stepRecord.fixedWith = 'fallback';
            this.stats.fixedSteps++;
            this.stats.fallbackUsed++;
            success = true;
            this.log('success', `  ✅ 备用方案成功`);
          } catch (fallbackError) {
            this.log('error', `  ❌ 备用方案也失败: ${fallbackError.message}`);
            stepRecord.status = 'critical_failure';
          }
        }
      }
      
      // 如果仍然失败且是关键步骤，抛出错误
      if (!success && stepOptions.critical) {
        const criticalError = new Error(`关键步骤失败且无法修复: ${stepName} - ${lastError.message}`);
        criticalError.stepRecord = stepRecord;
        throw criticalError;
      }
    } else {
      // 步骤成功
      stepRecord.status = success ? 'success' : 'fixed';
      stepRecord.endTime = Date.now();
      stepRecord.result = result;
      this.stats.successfulSteps++;
      
      stepRecord.duration = stepRecord.endTime - stepRecord.startTime;
      const statusEmoji = stepRecord.status === 'fixed' ? '🔧' : '✅';
      
      this.log('success', `${statusEmoji} 步骤 ${stepId} ${stepRecord.status === 'fixed' ? '修复' : '成功'}: ${stepName} (${stepRecord.duration}ms)`);
      
      if (stepRecord.retries > 0) {
        this.log('info', `  重试次数: ${stepRecord.retries}`);
      }
      
      if (stepRecord.qualityScore > 0) {
        this.log('info', `  质量评分: ${stepRecord.qualityScore.toFixed(2)}`);
      }
      
      if (stepRecord.warnings.length > 0) {
        stepRecord.warnings.forEach(warning => {
          this.warnings.push(`${stepName}: ${warning}`);
          this.log('warn', `  ⚠️  ${warning}`);
        });
      }
      
      if (stepRecord.suggestions.length > 0) {
        stepRecord.suggestions.forEach(suggestion => {
          this.suggestions.push(`${stepName}: ${suggestion}`);
          this.log('info', `  💡 ${suggestion}`);
        });
      }
    }
    
    // 记录步骤历史
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
      batchName: options.batchName || '批量步骤',
      ...options
    };
    
    this.log('info', `\n📦 开始批量监督: ${batchOptions.batchName} (${steps.length} 个步骤)`);
    this.log('info', `  模式: ${batchOptions.parallel ? '并行' : '串行'}`);
    
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
          this.log('error', `❌ 步骤 ${steps[index].name} 执行失败: ${result.reason.message}`);
          results.push({
            success: false,
            error: result.reason,
            stepRecord: {
              name: steps[index].name,
              status: 'failed',
              errors: [result.reason.message]
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
          this.log('error', `🚨 关键步骤失败，停止批量执行`);
          break;
        }
      }
    }
    
    // 统计批量结果
    const batchSuccess = results.filter(r => r.success).length;
    const batchTotal = results.length;
    const batchSuccessRate = batchTotal > 0 ? (batchSuccess / batchTotal) * 100 : 0;
    
    this.log('info', `\n📊 批量监督完成: ${batchOptions.batchName}`);
    this.log('info', `  成功率: ${batchSuccess}/${batchTotal} (${batchSuccessRate.toFixed(1)}%)`);
    
    return {
      results,
      stats: {
        total: batchTotal,
        success: batchSuccess,
        successRate: batchSuccessRate,
        failed: batchTotal - batchSuccess
      }
    };
  }

  /**
   * 验证内容质量
   */
  async validateContentQuality(content, metadata = {}) {
    this.log('info', `📊 验证内容质量...`);
    
    const metrics = {
      lengthScore: 0,
      structureScore: 0,
      readabilityScore: 0,
      keywordScore: 0,
      relevanceScore: 0,
      overallScore: 0
    };
    
    const warnings = [];
    const suggestions = [];
    
    try {
      // 1. 长度验证
      const contentLength = content.length;
      if (contentLength < 100) {
        metrics.lengthScore = 0.3;
        warnings.push('内容过短，建议至少100字');
        suggestions.push('添加更多细节和描述');
      } else if (contentLength < 500) {
        metrics.lengthScore = 0.6;
        warnings.push('内容较短，建议扩充到500字以上');
        suggestions.push('补充案例、数据或背景信息');
      } else if (contentLength < 2000) {
        metrics.lengthScore = 0.9;
      } else {
        metrics.lengthScore = 1.0;
      }
      
      // 2. 结构验证
      const hasTitle = content.match(/^#\s+.+$/m);
      const hasParagraphs = content.split('\n\n').length > 3;
      const hasLists = content.match(/^[-*]\s+.+$/gm);
      const hasCode = content.match(/```[\s\S]*?```/g);
      
      metrics.structureScore = (
        (hasTitle ? 0.2 : 0) +
        (hasParagraphs ? 0.3 : 0) +
        (hasLists ? 0.2 : 0) +
        (hasCode ? 0.3 : 0)
      );
      
      if (!hasTitle) {
        warnings.push('缺少标题（# 标题）');
        suggestions.push('添加明确的标题');
      }
      if (!hasParagraphs) {
        warnings.push('段落结构不明显');
        suggestions.push('使用空行分隔段落');
      }
      if (!hasLists && !hasCode) {
        warnings.push('缺少结构化内容');
        suggestions.push('添加列表或代码示例');
      }
      
      // 3. 可读性验证
      const sentences = content.split(/[。.!?]/).filter(s => s.trim().length > 0);
      const avgSentenceLength = sentences.length > 0 
        ? sentences.reduce((sum, sentence) => sum + sentence.trim().length, 0) / sentences.length
        : 0;
      
      if (avgSentenceLength > 50) {
        metrics.readabilityScore = 0.6;
        warnings.push('句子偏长，建议拆分');
        suggestions.push('将长句子拆分为多个短句');
      } else if (avgSentenceLength > 30) {
        metrics.readabilityScore = 0.8;
      } else if (avgSentenceLength > 0) {
        metrics.readabilityScore = 1.0;
      } else {
        metrics.readabilityScore = 0.5;
        warnings.push('可读性分析失败');
      }
      
      // 4. 关键词验证
      const keywordCount = metadata.keywords ? metadata.keywords.length : 0;
      metrics.keywordScore = Math.min(keywordCount / 5, 1.0);
      
      if (keywordCount < 3) {
        warnings.push('关键词较少，建议添加更多关键词');
        suggestions.push('从内容中提取3-5个核心关键词');
      }
      
      // 5. 相关性验证
      const title = metadata.title || '';
      const contentLower = content.toLowerCase();
      const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      let relevantWords = 0;
      
      titleWords.forEach(word => {
        if (contentLower.includes(word)) {
          relevantWords++;
        }
      });
      
      metrics.relevanceScore = titleWords.length > 0 
        ? relevantWords / titleWords.length 
        : 0.5;
      
      if (metrics.relevanceScore < 0.5) {
        warnings.push('内容与标题相关性较低');
        suggestions.push('确保内容围绕标题展开');
      }
      
      // 6. 计算总体分数
      metrics.overallScore = (
        metrics.lengthScore * 0.15 +
        metrics.structureScore * 0.25 +
        metrics.readabilityScore * 0.25 +
        metrics.keywordScore * 0.15 +
        metrics.relevanceScore * 0.20
      );
      
      this.qualityMetrics.contentQuality = metrics.overallScore;
      
      this.log('info', `  ✅ 内容质量验证完成`);
      this.log('debug', `    长度评分: ${metrics.lengthScore.toFixed(2)} (${contentLength}字)`);
      this.log('debug', `    结构评分: ${metrics.st