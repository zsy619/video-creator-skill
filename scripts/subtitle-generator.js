/**
 * 字幕生成器
 * 智能生成ASS字幕文件，支持字体兼容性修复
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class SubtitleGenerator {
  constructor(options = {}) {
    this.options = {
      font: 'PingFang SC', // ✅ 默认使用macOS兼容字体
      fontSize: 10,
      color: '&H0000FFFF', // 黄色
      outlineColor: '&H00000000', // 黑色描边
      backgroundColor: '&H00000000', // 透明背景
      alignment: 2, // 底部居中
      marginL: 50,
      marginR: 50,
      marginV: 30, // 距底边30px
      outline: 1, // 1px描边
      shadow: 0,
      bold: 0,
      italic: 0,
      underline: 0,
      strikeOut: 0,
      scaleX: 100,
      scaleY: 100,
      spacing: 0,
      angle: 0,
      borderStyle: 1,
      encoding: 1,
      ...options
    };

    // 智能字体选择
    this.options.font = this.getCompatibleFont();
  }

  /**
   * 获取平台兼容字体
   */
  getCompatibleFont() {
    const platform = os.platform();
    
    const fontMap = {
      'darwin': 'PingFang SC',      // ✅ macOS简体中文
      'win32': 'Microsoft YaHei',   // ✅ Windows简体中文
      'linux': 'WenQuanYi Micro Hei' // ✅ Linux中文字体
    };

    return fontMap[platform] || 'Arial';
  }

  /**
   * 生成ASS字幕文件
   * @param {Array} subtitles - 字幕数组 [{start, end, text}]
   * @param {string} outputPath - 输出路径
   * @param {Object} options - 覆盖默认选项
   */
  async generateASS(subtitles, outputPath, options = {}) {
    const config = { ...this.options, ...options };
    
    // 验证字幕数据
    this.validateSubtitles(subtitles);
    
    // 生成ASS内容
    const assContent = this.buildASSContent(subtitles, config);
    
    // 写入文件
    await fs.writeFile(outputPath, assContent, 'utf8');
    
    console.log(`✅ 字幕文件已生成: ${outputPath}`);
    console.log(`   字体: ${config.font}, 大小: ${config.fontSize}px, 颜色: 黄色`);
    
    return outputPath;
  }

  /**
   * 验证字幕数据
   */
  validateSubtitles(subtitles) {
    if (!Array.isArray(subtitles) || subtitles.length === 0) {
      throw new Error('字幕数据必须是非空数组');
    }

    for (let i = 0; i < subtitles.length; i++) {
      const sub = subtitles[i];
      
      if (!sub.text || typeof sub.text !== 'string') {
        throw new Error(`第${i + 1}条字幕缺少text字段或类型错误`);
      }
      
      if (!sub.start || !sub.end) {
        throw new Error(`第${i + 1}条字幕缺少start或end时间字段`);
      }
      
      // 验证时间格式
      if (!this.isValidTime(sub.start) || !this.isValidTime(sub.end)) {
        throw new Error(`第${i + 1}条字幕时间格式错误，应为"HH:MM:SS.mmm"格式`);
      }
      
      // 验证时间顺序
      if (this.timeToMs(sub.start) >= this.timeToMs(sub.end)) {
        throw new Error(`第${i + 1}条字幕: start时间(${sub.start})必须小于end时间(${sub.end})`);
      }
      
      // 验证重叠（可选，但建议）
      if (i > 0) {
        const prevEnd = this.timeToMs(subtitles[i - 1].end);
        const currStart = this.timeToMs(sub.start);
        if (currStart < prevEnd) {
          console.warn(`⚠️  警告: 第${i}和${i + 1}条字幕时间重叠`);
        }
      }
    }
  }

  /**
   * 构建ASS文件内容
   */
  buildASSContent(subtitles, config) {
    const lines = [];
    
    // Script Info
    lines.push('[Script Info]');
    lines.push('Title: Video Creator Subtitles');
    lines.push('ScriptType: v4.00+');
    lines.push('WrapStyle: 0');
    lines.push('ScaledBorderAndShadow: yes');
    lines.push('');
    
    // Styles
    lines.push('[V4+ Styles]');
    lines.push('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding');
    
    const styleLine = [
      'Default',
      config.font,
      config.fontSize,
      config.color,
      '&H000000FF', // SecondaryColour (通常为白色)
      config.outlineColor,
      config.backgroundColor,
      config.bold,
      config.italic,
      config.underline,
      config.strikeOut,
      config.scaleX,
      config.scaleY,
      config.spacing,
      config.angle,
      config.borderStyle,
      config.outline,
      config.shadow,
      config.alignment,
      config.marginL,
      config.marginR,
      config.marginV,
      config.encoding
    ].join(',');
    
    lines.push(`Style: ${styleLine}`);
    lines.push('');
    
    // Events
    lines.push('[Events]');
    lines.push('Format: Layer, Start, End, Style, Text');
    
    // 添加字幕事件
    subtitles.forEach((sub, index) => {
      const line = `Dialogue: 0,${sub.start},${sub.end},Default,${sub.text}`;
      lines.push(line);
    });
    
    return lines.join('\n');
  }

  /**
   * 从文本生成字幕（智能分段）
   * @param {string} text - 完整文本
   * @param {number} totalDuration - 总时长（秒）
   * @param {Object} options - 分段选项
   */
  async generateFromText(text, totalDuration, options = {}) {
    const {
      maxCharsPerLine = 15,
      minDuration = 2,
      maxDuration = 4
    } = options;
    
    // 智能分段
    const segments = this.segmentText(text, maxCharsPerLine);
    
    // 计算每段时长
    const subtitles = this.calculateTimings(segments, totalDuration, {
      minDuration,
      maxDuration
    });
    
    return subtitles;
  }

  /**
   * 智能文本分段
   */
  segmentText(text, maxCharsPerLine) {
    const segments = [];
    const sentences = text.split(/[。！？.!?]/).filter(s => s.trim());
    
    for (const sentence of sentences) {
      const words = sentence.trim();
      if (words.length <= maxCharsPerLine) {
        segments.push(words);
      } else {
        // 长句子按逗号或语义分段
        const parts = words.split(/[,，]/).filter(p => p.trim());
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.length <= maxCharsPerLine) {
            segments.push(trimmed);
          } else {
            // 超长部分按字符数硬分割
            for (let i = 0; i < trimmed.length; i += maxCharsPerLine) {
              segments.push(trimmed.substring(i, i + maxCharsPerLine));
            }
          }
        }
      }
    }
    
    return segments.filter(s => s.length > 0);
  }

  /**
   * 计算时间轴
   */
  calculateTimings(segments, totalDuration, options) {
    const { minDuration = 2, maxDuration = 4 } = options;
    const subtitles = [];
    
    // 计算总"时间单位"
    let totalUnits = 0;
    const unitsPerSegment = segments.map(segment => {
      // 根据长度和复杂度计算时间单位
      const lengthFactor = Math.min(segment.length / 10, 2); // 每10字增加1倍
      const complexityFactor = /[，,；;]/.test(segment) ? 1.2 : 1;
      const units = Math.max(minDuration, Math.min(maxDuration, lengthFactor * complexityFactor));
      totalUnits += units;
      return units;
    });
    
    // 缩放以匹配总时长
    const scaleFactor = totalDuration / totalUnits;
    let currentTime = 0;
    
    for (let i = 0; i < segments.length; i++) {
      const duration = unitsPerSegment[i] * scaleFactor;
      const start = this.msToTime(currentTime * 1000);
      const end = this.msToTime((currentTime + duration) * 1000);
      
      subtitles.push({
        start,
        end,
        text: segments[i]
      });
      
      currentTime += duration;
    }
    
    return subtitles;
  }

  /**
   * 修复现有ASS文件的字体问题
   * @param {string} assPath - ASS文件路径
   */
  async fixFontCompatibility(assPath) {
    try {
      const content = await fs.readFile(assPath, 'utf8');
      
      // 查找并替换不兼容字体
      const incompatibleFonts = [
        'STHeiti Medium',
        'STHeiti Light',
        'SimSun',
        'Microsoft JhengHei'
      ];
      
      let fixedContent = content;
      let fixed = false;
      
      for (const font of incompatibleFonts) {
        if (content.includes(font)) {
          fixedContent = fixedContent.replace(
            new RegExp(font, 'g'),
            this.getCompatibleFont()
          );
          fixed = true;
          console.log(`🔄 替换不兼容字体: ${font} → ${this.getCompatibleFont()}`);
        }
      }
      
      if (fixed) {
        // 备份原文件
        const backupPath = `${assPath}.backup`;
        await fs.copyFile(assPath, backupPath);
        
        // 写入修复后的文件
        await fs.writeFile(assPath, fixedContent, 'utf8');
        console.log(`✅ 字体兼容性修复完成: ${assPath}`);
        console.log(`   备份文件: ${backupPath}`);
      } else {
        console.log(`✅ 字体检查通过: ${assPath} 使用兼容字体`);
      }
      
      return fixed;
      
    } catch (error) {
      console.error(`❌ 修复字体兼容性失败: ${assPath}`, error.message);
      throw error;
    }
  }

  /**
   * 检查ASS文件质量
   * @param {string} assPath - ASS文件路径
   */
  async checkQuality(assPath) {
    const issues = [];
    
    try {
      const content = await fs.readFile(assPath, 'utf8');
      
      // 1. 检查字体兼容性
      const incompatibleFonts = ['STHeiti Medium', 'STHeiti Light', 'SimSun'];
      for (const font of incompatibleFonts) {
        if (content.includes(font)) {
          issues.push({
            type: 'FONT_COMPATIBILITY',
            severity: 'ERROR',
            message: `使用不兼容字体: ${font}`,
            solution: `替换为 ${this.getCompatibleFont()}`
          });
        }
      }
      
      // 2. 检查ASS格式
      if (!content.includes('[Script Info]')) {
        issues.push({
          type: 'FORMAT_ERROR',
          severity: 'ERROR',
          message: '缺少 [Script Info] 部分',
          solution: '添加完整的ASS文件头'
        });
      }
      
      if (!content.includes('[V4+ Styles]')) {
        issues.push({
          type: 'FORMAT_ERROR',
          severity: 'ERROR',
          message: '缺少 [V4+ Styles] 部分',
          solution: '添加样式定义'
        });
      }
      
      if (!content.includes('[Events]')) {
        issues.push({
          type: 'FORMAT_ERROR',
          severity: 'ERROR',
          message: '缺少 [Events] 部分',
          solution: '添加字幕事件'
        });
      }
      
      // 3. 检查字幕内容
      const eventLines = content.split('\n').filter(line => line.startsWith('Dialogue:'));
      if (eventLines.length === 0) {
        issues.push({
          type: 'CONTENT_ERROR',
          severity: 'WARNING',
          message: '没有字幕内容',
          solution: '添加字幕文本'
        });
      }
      
      // 4. 检查时间格式
      for (const line of eventLines) {
        const match = line.match(/Dialogue: 0,([^,]+),([^,]+),/);
        if (match) {
          const [, start, end] = match;
          if (!this.isValidTime(start) || !this.isValidTime(end)) {
            issues.push({
              type: 'TIME_FORMAT_ERROR',
              severity: 'ERROR',
              message: `时间格式错误: ${start} - ${end}`,
              solution: '使用 HH:MM:SS.mmm 格式'
            });
          }
        }
      }
      
      return {
        path: assPath,
        issues,
        passed: issues.length === 0,
        summary: issues.length === 0 ? '✅ 质量检查通过' : `⚠️  发现 ${issues.length} 个问题`
      };
      
    } catch (error) {
      return {
        path: assPath,
        issues: [{
          type: 'FILE_ERROR',
          severity: 'ERROR',
          message: `无法读取文件: ${error.message}`,
          solution: '检查文件路径和权限'
        }],
        passed: false,
        summary: '❌ 文件读取失败'
      };
    }
  }

  /**
   * 时间验证辅助函数
   */
  isValidTime(timeStr) {
    return /^\d{1,2}:\d{2}:\d{2}\.\d{2,3}$/.test(timeStr);
  }

  timeToMs(timeStr) {
    const [h, m, s] = timeStr.split(':');
    const [sec, ms] = s.split('.');
    return (parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(sec)) * 1000 + parseInt(ms);
  }

  msToTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
}

module.exports = SubtitleGenerator;