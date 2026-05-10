/**
 * 字幕生成器
 * 智能生成ASS字幕文件，支持字体兼容性修复
 *
 * 规范（统一遵循 rules/SUBTITLES.md + UNIFIED_RULES.md）：
 * - Fontsize: 72（PlayResY=1920时，约40px视觉，竖屏标准）
 * - Font: PingFang SC (macOS) / Microsoft YaHei (Windows)
 * - PrimaryColour: &H00FFFF（黄色）
 * - Alignment: 2（底部居中）
 * - MarginL/MarginR: 30/30，MarginV: 50
 * - Outline: 2（2px黑色描边，1px太细）
 * - 语义换行：\N 分隔多行，每行≤25字符
 * - Dialogue: 10字段格式（Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text）
 * - 时间戳：2位厘秒（CC），如 0:00:04.50
 *
 * ⚠️ 字幕生成两种方案：
 * 方案A（推荐）：基于配音文本生成
 *   const gen = new SubtitleGenerator();
 *   const subs = await gen.generateFromText(narrationText, totalDuration);
 *   await gen.generateASS(subs, 'audio/subtitles.ass');
 *
 * 方案B：edge-tts SRT → ASS 转换（Whisper 不可用时）
 *   edge-tts --voice zh-CN-YunjianNeural --text "..." --subtitles out.srt
 *   node scripts/srt-to-ass.js out.srt audio/subtitles.ass
 *
 * ⚠️ Whisper 依赖已移除（openai-whisper 不稳定）
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class SubtitleGenerator {
  constructor(options = {}) {
    this.options = {
      font: 'PingFang SC',
      fontSize: 72,    // 竖屏1080×1920标准值（PlayResY=1920时约40px视觉）
      color: '&H00FFFF', // 亮黄色
      outlineColor: '&H00000000', // 黑色描边
      backgroundColor: '&H00000000', // 透明背景
      alignment: 2, // 底部居中
      marginL: 30,  // 左边距30px
      marginR: 30,  // 右边距30px
      marginV: 50,  // 距底边50px（增加避免贴边）
      outline: 2,   // 2px描边（1px太细）
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
    this.options.font = this.getCompatibleFont();
  }

  /** 获取平台兼容字体 */
  getCompatibleFont() {
    const platform = os.platform();
    const fontMap = {
      'darwin': 'PingFang SC',
      'win32': 'Microsoft YaHei',
      'linux': 'WenQuanYi Micro Hei'
    };
    return fontMap[platform] || 'Arial';
  }

  /**
   * 生成ASS字幕文件
   */
  async generateASS(subtitles, outputPath, options = {}) {
    const config = { ...this.options, ...options };
    this.validateSubtitles(subtitles);
    const assContent = this.buildASSContent(subtitles, config);
    await fs.writeFile(outputPath, assContent, 'utf8');
    console.log(`✅ 字幕文件已生成: ${outputPath}`);
    console.log(`   字体: ${config.font}, 大小: ${config.fontSize}px`);
    return outputPath;
  }

  /** 验证字幕数据 */
  validateSubtitles(subtitles) {
    if (!Array.isArray(subtitles) || subtitles.length === 0) {
      throw new Error('字幕数据必须是非空数组');
    }
    for (let i = 0; i < subtitles.length; i++) {
      const sub = subtitles[i];
      if (!sub.text || typeof sub.text !== 'string') {
        throw new Error(`第${i + 1}条字幕缺少text字段`);
      }
      if (!sub.start || !sub.end) {
        throw new Error(`第${i + 1}条字幕缺少start或end时间字段`);
      }
      if (!this.isValidTime(sub.start) || !this.isValidTime(sub.end)) {
        throw new Error(`第${i + 1}条字幕时间格式错误`);
      }
      if (this.timeToMs(sub.start) >= this.timeToMs(sub.end)) {
        throw new Error(`第${i + 1}条字幕: start必须小于end`);
      }
      if (i > 0) {
        const prevEnd = this.timeToMs(subtitles[i - 1].end);
        const currStart = this.timeToMs(sub.start);
        if (currStart < prevEnd) {
          console.warn(`⚠️  第${i}和${i + 1}条字幕时间重叠`);
        }
      }
    }
  }

  /**
   * 构建ASS文件内容
   * PlayResX/PlayResY: 1080x1920（竖屏坐标基准）
   */
  buildASSContent(subtitles, config) {
    const lines = [];
    lines.push('[Script Info]');
    lines.push('Title: Video Creator Subtitles');
    lines.push('ScriptType: v4.00+');
    lines.push('WrapStyle: 0');
    lines.push('ScaledBorderAndShadow: yes');
    lines.push('PlayResX: 1080');
    lines.push('PlayResY: 1920');
    lines.push('');

    lines.push('[V4+ Styles]');
    lines.push('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding');

    const styleLine = [
      'Default', config.font, config.fontSize,
      config.color, '&H000000FF', config.outlineColor, config.backgroundColor,
      config.bold, config.italic, config.underline, config.strikeOut,
      config.scaleX, config.scaleY, config.spacing, config.angle,
      config.borderStyle, config.outline, config.shadow,
      config.alignment, config.marginL, config.marginR, config.marginV, config.encoding
    ].join(',');

    lines.push(`Style: ${styleLine}`);
    lines.push('');

    lines.push('[Events]');
    // ⚠️ 必须10字段：Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
    lines.push('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text');

    subtitles.forEach((sub) => {
      // Name=空, MarginL=0, MarginR=0, MarginV=50, Effect=空 → 共10字段
      const text = sub.text.replace(/\r\n/g, '\n').replace(/\n/g, '\\N');
      lines.push(`Dialogue: 0,${sub.start},${sub.end},Default,,0,0,50,,${text}`);
    });

    return lines.join('\n');
  }

  /**
   * 从文本生成字幕（中文语义分段）
   * - 按句号/问号/感叹号切分为"字幕块"
   * - 每块内按逗号/分号/冒号切分为"行"，\N 连接
   * - 每行不超过 maxCharsPerLine 字符
   * - 最后一行不足一半则合并到上一行（避免孤行）
   */
  async generateFromText(text, totalDuration, options = {}) {
    // 72px字体在1080px宽度下单行最多25字符（已验证）
    const { maxCharsPerLine = 25, minDuration = 2, maxDuration = 6 } = options;

    // Step 1: 按结束标点拆分为语义段落
    const paragraphs = text
      .split(/[。！？.!?\n]+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    // Step 2: 段落内按逗号拆分为行，组装含 \N 的字幕条目
    const entries = [];
    for (const para of paragraphs) {
      const parts = para.split(/[，、；,;]+/).map(p => p.trim()).filter(p => p.length > 0);

      // 将 parts 组装为多行（\N 分隔），每行不超过 maxCharsPerLine
      const lines = [];
      for (const part of parts) {
        if (part.length <= maxCharsPerLine) {
          lines.push(part);
        } else {
          // 超长部分按字符数硬分割
          for (let i = 0; i < part.length; i += maxCharsPerLine) {
            lines.push(part.substring(i, i + maxCharsPerLine));
          }
        }
      }

      // 合并：如果最后一行太短(<一半)，追加到上一行
      if (lines.length >= 2 && lines[lines.length - 1].length < maxCharsPerLine / 2) {
        lines[lines.length - 2] = lines[lines.length - 2] + lines[lines.length - 1];
        lines.pop();
      }

      entries.push(lines.join('\\N'));
    }

    // Step 3: 计算时间轴
    return this.calculateTimings(entries, totalDuration, { minDuration, maxDuration });
  }

  /**
   * 计算时间轴
   * 每段时长按字数比例分配
   */
  calculateTimings(entries, totalDuration, options) {
    const { minDuration = 2, maxDuration = 6 } = options;
    const subtitles = [];

    // 计算每段权重（字数 + 换行数）
    let totalWeight = 0;
    const weights = entries.map(entry => {
      const textPart = entry.replace(/\\N/g, '');
      const lineCount = (entry.match(/\\N/g) || []).length + 1;
      const weight = Math.max(textPart.length, lineCount * 3);
      totalWeight += weight;
      return weight;
    });

    let currentTime = 0;
    for (let i = 0; i < entries.length; i++) {
      const rawDuration = (weights[i] / totalWeight) * totalDuration;
      const duration = Math.max(minDuration, Math.min(maxDuration, rawDuration));
      const start = this.msToTime(currentTime * 1000);
      const end = this.msToTime((currentTime + duration) * 1000);
      subtitles.push({ start, end, text: entries[i] });
      currentTime += duration;
    }

    // 缩放最后一帧到总时长
    if (currentTime < totalDuration) {
      const last = subtitles[subtitles.length - 1];
      last.end = this.msToTime(totalDuration * 1000);
    }

    return subtitles;
  }

  /** 修复现有ASS文件的字体问题 */
  async fixFontCompatibility(assPath) {
    try {
      const content = await fs.readFile(assPath, 'utf8');
      const incompatibleFonts = ['STHeiti Medium', 'STHeiti Light', 'SimSun', 'Microsoft JhengHei'];
      let fixedContent = content;
      let fixed = false;
      for (const font of incompatibleFonts) {
        if (content.includes(font)) {
          fixedContent = fixedContent.replace(new RegExp(font, 'g'), this.getCompatibleFont());
          fixed = true;
        }
      }
      if (fixed) {
        const backupPath = `${assPath}.backup`;
        await fs.copyFile(assPath, backupPath);
        await fs.writeFile(assPath, fixedContent, 'utf8');
        console.log(`✅ 字体兼容性修复完成: ${assPath}`);
      } else {
        console.log(`✅ 字体检查通过: ${assPath}`);
      }
      return fixed;
    } catch (error) {
      console.error(`❌ 修复字体兼容性失败: ${assPath}`, error.message);
      throw error;
    }
  }

  /** 检查ASS文件质量 */
  async checkQuality(assPath) {
    const issues = [];
    try {
      const content = await fs.readFile(assPath, 'utf8');
      const incompatibleFonts = ['STHeiti Medium', 'STHeiti Light', 'SimSun'];
      for (const font of incompatibleFonts) {
        if (content.includes(font)) {
          issues.push({ type: 'FONT_COMPATIBILITY', severity: 'ERROR', message: `使用不兼容字体: ${font}`, solution: `替换为 ${this.getCompatibleFont()}` });
        }
      }
      if (!content.includes('[Script Info]')) issues.push({ type: 'FORMAT_ERROR', severity: 'ERROR', message: '缺少 [Script Info]', solution: '添加ASS文件头' });
      if (!content.includes('[V4+ Styles]')) issues.push({ type: 'FORMAT_ERROR', severity: 'ERROR', message: '缺少 [V4+ Styles]', solution: '添加样式定义' });
      if (!content.includes('[Events]')) issues.push({ type: 'FORMAT_ERROR', severity: 'ERROR', message: '缺少 [Events]', solution: '添加字幕事件' });
      const eventLines = content.split('\n').filter(line => line.startsWith('Dialogue:'));
      if (eventLines.length === 0) issues.push({ type: 'CONTENT_ERROR', severity: 'WARNING', message: '没有字幕内容', solution: '添加字幕文本' });
      for (const line of eventLines) {
        const match = line.match(/Dialogue: 0,([^,]+),([^,]+),/);
        if (match) {
          const [, start, end] = match;
          if (!this.isValidTime(start) || !this.isValidTime(end)) {
            issues.push({ type: 'TIME_FORMAT_ERROR', severity: 'ERROR', message: `时间格式错误: ${start} - ${end}`, solution: '使用 HH:MM:SS.mmm 格式' });
          }
        }
      }
      return { path: assPath, issues, passed: issues.length === 0, summary: issues.length === 0 ? '✅ 通过' : `⚠️  ${issues.length} 个问题` };
    } catch (error) {
      return { path: assPath, issues: [{ type: 'FILE_ERROR', severity: 'ERROR', message: `无法读取: ${error.message}`, solution: '检查路径' }], passed: false, summary: '❌ 读取失败' };
    }
  }

  isValidTime(timeStr) {
    // ASS格式: H:MM:SS.CC（CC=2位厘秒，不是3位毫秒）
    return /^\d{1,2}:\d{2}:\d{2}\.\d{2}$/.test(timeStr);
  }

  timeToMs(timeStr) {
    // 解析 ASS H:MM:SS.CC 格式（CC=2位厘秒）
    const [h, m, s] = timeStr.split(':');
    const [sec, cs] = s.split('.');
    // 将厘秒转为毫秒：CC/100*1000 = CC*10
    return (parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(sec)) * 1000 + parseInt(cs) * 10;
  }

  /**
   * 将毫秒转换为 ASS 时间格式 H:MM:SS.CC（2位厘秒，不是3位毫秒）
   * ⚠️ ASS 格式使用 centiseconds (CC) = 2位小数，不是3位
   */
  msToTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10); // 转厘秒，2位
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }
}

module.exports = SubtitleGenerator;
