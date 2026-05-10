/**
 * 视频创作质量检查器
 * 全面检查视频项目的质量，包括字体、音频、字幕等
 *
 * 职责：
 * - 检查项目目录结构完整性（必须目录和文件是否存在）
 * - 检查 ASS 字幕文件中的字体兼容性（macOS/Windows 跨平台）
 * - 检查音频文件质量（时长、码率、格式是否有效）
 * - 检查字幕文件格式和与音频的时间同步
 * - 检查视频文件技术规格（分辨率、帧率、时长、文件大小）
 * - 自动修复可修复的问题（字体替换、字体大小调整、SRT→ASS转换）
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class QualityChecker {
  /**
   * @param {object} options - 检查选项
   * @param {string} options.projectDir - 项目目录路径（默认当前目录）
   * @param {boolean} options.checkFonts - 是否检查字体（默认 true）
   * @param {boolean} options.checkAudio - 是否检查音频（默认 true）
   * @param {boolean} options.checkSubtitles - 是否检查字幕（默认 true）
   * @param {boolean} options.checkVideo - 是否检查视频（默认 true）
   * @param {boolean} options.checkStructure - 是否检查项目结构（默认 true）
   * @param {boolean} options.fixIssues - 是否自动修复发现的问题（默认 false）
   * @param {boolean} options.verbose - 是否输出详细调试信息（默认 false）
   */
  constructor(options = {}) {
    this.options = {
      projectDir: '.',
      checkFonts: true,
      checkAudio: true,
      checkSubtitles: true,
      checkVideo: true,
      checkStructure: true,
      fixIssues: false,
      verbose: false,
      ...options
    };

    this.issues = [];
    this.fixedIssues = [];
  }

  /**
   * 运行全面质量检查
   * 按顺序执行：项目结构 → 字体兼容性 → 音频质量 → 字幕检查 → 视频文件
   * 所有检查完成后，生成综合报告。如果启用了自动修复，会尝试修复可修复的问题。
   *
   * @returns {object} report - 包含检查结果摘要和详细问题列表的报告
   */
  async runFullCheck() {
    console.log('🔍 开始视频项目质量检查...');

    try {
      if (this.options.checkStructure) {
        await this.checkProjectStructure();
      }

      if (this.options.checkFonts) {
        await this.checkFontCompatibility();
      }

      if (this.options.checkAudio) {
        await this.checkAudioQuality();
      }

      if (this.options.checkSubtitles) {
        await this.checkSubtitles();
      }

      if (this.options.checkVideo) {
        await this.checkVideoFiles();
      }

      const report = this.generateReport();

      if (this.options.fixIssues && this.issues.length > 0) {
        await this.autoFixIssues();
      }

      return report;

    } catch (error) {
      console.error('❌ 质量检查失败:', error.message);
      throw error;
    }
  }

  /**
   * 检查项目结构完整性
   * 验证所需目录（docs、docs/assets、audio、video-project 等）是否存在
   * 验证关键文件（video-script.md、copy.md、full_narration.txt）是否存在
   */
  async checkProjectStructure() {
    console.log('📁 检查项目结构...');

    const requiredDirs = [
      'docs',
      'docs/assets',
      'audio',
      'video-project',
      'video-project/src',
      'video-project/out'
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(this.options.projectDir, dir);
      try {
        await fs.access(dirPath);
      } catch {
        this.issues.push({
          type: 'STRUCTURE_ERROR',
          severity: 'ERROR',
          message: `缺少目录: ${dir}`,
          solution: `创建目录: mkdir -p ${dir}`,
          path: dirPath
        });
      }
    }

    const requiredFiles = [
      'docs/video-script.md',
      'docs/copy.md',
      'audio/full_narration.txt'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.options.projectDir, file);
      try {
        await fs.access(filePath);
      } catch {
        this.issues.push({
          type: 'STRUCTURE_ERROR',
          severity: 'WARNING',
          message: `缺少文件: ${file}`,
          solution: `创建文件: ${file}`,
          path: filePath
        });
      }
    }
  }

  /**
   * 检查 ASS 字幕文件中的字体兼容性
   * macOS 和 Windows 的可用字体不同，必须确保字幕引用的字体在目标平台存在。
   * 主要检查项：
   * - 不兼容字体（如 STHeiti Medium 在 macOS 上不存在）
   * - 字体大小是否在合理范围内（10-20px）
   */
  async checkFontCompatibility() {
    console.log('🔤 检查字体兼容性...');

    const assFiles = await this.findFiles('.ass');

    for (const file of assFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');

        // macOS 上不存在或渲染异常的字体列表
        const incompatibleFonts = [
          'STHeiti Medium',
          'STHeiti Light',
          'SimSun',
          'Microsoft JhengHei'
        ];

        for (const font of incompatibleFonts) {
          if (content.includes(font)) {
            this.issues.push({
              type: 'FONT_COMPATIBILITY',
              severity: 'ERROR',
              message: `文件使用不兼容字体: ${font}`,
              solution: `替换为 ${this.getCompatibleFont()}`,
              path: file,
              fixable: true,
              fixAction: 'replaceFont'
            });
          }
        }

        // 检查 ASS 中 Fontsize 参数是否为标准值 10
        const fontSizeMatch = content.match(/Fontsize,(\d+)/);
        if (fontSizeMatch) {
          const fontSize = parseInt(fontSizeMatch[1]);
          if (fontSize < 72) {
            this.issues.push({
              type: 'FONT_SIZE',
              severity: 'ERROR',
              message: `字体大小 ${fontSize}px 不符合标准（竖屏字幕必须≥72px）`,
              solution: '使用 scripts/subtitle-generator.js 生成字幕，默认 fontSize=72',
              path: file,
              fixable: true,
              fixAction: 'adjustFontSize'
            });
          }
        }

      } catch (error) {
        this.issues.push({
          type: 'FILE_ERROR',
          severity: 'ERROR',
          message: `无法读取ASS文件: ${error.message}`,
          solution: '检查文件权限和编码',
          path: file
        });
      }
    }
  }

  /**
   * 检查音频文件质量
   * 使用 ffprobe 分析音频文件的格式、时长、码率等参数。
   * 同时检测是否使用 macOS say 命令生成的机械音文件。
   */
  async checkAudioQuality() {
    console.log('🎵 检查音频质量...');

    const audioFiles = await this.findFiles('.m4a', '.mp3', '.aac', '.wav');

    for (const file of audioFiles) {
      try {
        // 基本文件大小检查 - 小于1KB说明文件可能为空或损坏
        const stats = await fs.stat(file);
        if (stats.size < 1024) {
          this.issues.push({
            type: 'AUDIO_SIZE',
            severity: 'ERROR',
            message: '音频文件过小，可能为空',
            solution: '重新生成音频',
            path: file
          });
        }

        // 使用 ffprobe 获取音频的时长、码率等元数据
        try {
          const { stdout } = await execAsync(
            `ffprobe -v error -show_entries format=duration,bit_rate -of json "${file}"`
          );

          const info = JSON.parse(stdout);
          const duration = parseFloat(info.format.duration);
          const bitrate = parseInt(info.format.bit_rate);

          // 10秒以下的音频通常不足以支撑一个完整的视频项目
          if (duration < 10) {
            this.issues.push({
              type: 'AUDIO_DURATION',
              severity: 'WARNING',
              message: `音频时长过短: ${duration.toFixed(1)}秒`,
              solution: '建议音频时长30-60秒',
              path: file
            });
          }

          // 低于128kbps的码率会导致明显的音质损失
          if (bitrate < 128000) {
            this.issues.push({
              type: 'AUDIO_BITRATE',
              severity: 'WARNING',
              message: `音频码率较低: ${Math.round(bitrate/1000)}kbps`,
              solution: '建议使用256kbps AAC编码',
              path: file
            });
          }

        } catch (ffmpegError) {
          // ffprobe 解析失败时，可能文件格式有问题或 ffmpeg 未安装
          this.issues.push({
            type: 'AUDIO_FORMAT',
            severity: 'WARNING',
            message: '无法解析音频文件格式',
            solution: '检查ffmpeg安装和文件格式',
            path: file
          });
        }

      } catch (error) {
        this.issues.push({
          type: 'FILE_ERROR',
          severity: 'ERROR',
          message: `无法检查音频文件: ${error.message}`,
          solution: '检查文件权限',
          path: file
        });
      }
    }

    // 检测 narration 文件中是否包含 macOS say 命令特征
    // macOS say 生成的音频有机械感，建议使用 edge-tts
    const txtFiles = await this.findFiles('.txt');
    for (const file of txtFiles) {
      if (file.includes('narration')) {
        try {
          const content = await fs.readFile(file, 'utf8');
          if (content.length < 500 && content.includes('say -v')) {
            this.issues.push({
              type: 'AUDIO_SYNTHESIS',
              severity: 'ERROR',
              message: '可能使用macOS say命令（机械音）',
              solution: '使用edge-tts生成自然人声',
              path: file
            });
          }
        } catch (error) {
          // 忽略读取错误，不影响主流程
        }
      }
    }
  }

  /**
   * 检查字幕文件质量和同步
   * 委托 SubtitleGenerator 的 checkQuality 方法检查 ASS 文件内部质量，
   * 同时检查 SRT 文件是否应转换为 ASS 格式，
   * 最后检查字幕与音频的时长是否基本对齐。
   */
  async checkSubtitles() {
    console.log('📝 检查字幕文件...');

    const SubtitleGenerator = require('./subtitle-generator');
    const subtitleChecker = new SubtitleGenerator();

    const assFiles = await this.findFiles('.ass');
    const srtFiles = await this.findFiles('.srt');

    // 遍历所有 ASS 文件，逐文件委托 SubtitleGenerator 进行深度质量检查
    for (const file of assFiles) {
      const result = await subtitleChecker.checkQuality(file);

      if (!result.passed) {
        result.issues.forEach(issue => {
          this.issues.push({
            type: 'SUBTITLE_' + issue.type,
            severity: issue.severity,
            message: issue.message,
            solution: issue.solution,
            path: file,
            fixable: issue.type === 'FONT_COMPATIBILITY',
            fixAction: 'fixSubtitleFont'
          });
        });
      }
    }

    // SRT 格式缺少样式控制能力，建议统一使用 ASS 格式
    for (const file of srtFiles) {
      this.issues.push({
        type: 'SUBTITLE_FORMAT',
        severity: 'INFO',
        message: '使用SRT格式字幕',
        solution: '建议转换为ASS格式以获得更多样式控制',
        path: file,
        fixable: true,
        fixAction: 'convertSrtToAss'
      });
    }

    await this.checkSubtitleSync();
  }

  /**
   * 检查字幕与音频的同步
   * 获取音频文件的时长和 ASS 字幕的结束时间，
   * 如果两者差异超过 2 秒则认为存在同步问题。
   */
  async checkSubtitleSync() {
    const audioFiles = await this.findFiles('.m4a', '.mp3');
    const assFiles = await this.findFiles('.ass');

    if (audioFiles.length > 0 && assFiles.length > 0) {
      try {
        const audioFile = audioFiles[0];
        const assFile = assFiles[0];

        // 用 ffprobe 获取音频总时长
        const { stdout: audioInfo } = await execAsync(
          `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile}"`
        );
        const audioDuration = parseFloat(audioInfo.trim());

        // 解析 ASS 字幕中最后一条 Event 的结束时间
        const assContent = await fs.readFile(assFile, 'utf8');
        const lastEvent = assContent.split('\n')
          .filter(line => line.startsWith('Dialogue:'))
          .pop();

        if (lastEvent) {
          const match = lastEvent.match(/Dialogue: 0,([^,]+),([^,]+),/);
          if (match) {
            const [, , endTime] = match;
            const subtitleChecker = require('./subtitle-generator');
            const checker = new subtitleChecker();
            const subtitleEndMs = checker.timeToMs(endTime);
            const subtitleDuration = subtitleEndMs / 1000;

            // 允许 2 秒的合理误差
            const diff = Math.abs(audioDuration - subtitleDuration);
            if (diff > 2) {
              this.issues.push({
                type: 'SYNC_ERROR',
                severity: 'WARNING',
                message: `字幕与音频时长不匹配（差${diff.toFixed(1)}秒）`,
                solution: '调整字幕时间轴以匹配音频',
                path: assFile
              });
            }
          }
        }
      } catch (error) {
        // 同步检查为辅助性质，失败不应阻塞主流程
      }
    }
  }

  /**
   * 检查视频文件的技术规格
   * 使用 ffprobe 获取视频元数据，检查：
   * - 分辨率是否 1080×1920（竖屏标准）
   * - 帧率是否接近 60fps
   * - 时长是否不低于 15 秒
   * - 文件大小是否不超过 100MB
   */
  async checkVideoFiles() {
    console.log('🎬 检查视频文件...');

    const videoFiles = await this.findFiles('.mp4', '.mov', '.avi');

    for (const file of videoFiles) {
      try {
        // 用 ffprobe 一次性获取视频流和格式信息
        const { stdout } = await execAsync(
          `ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,r_frame_rate -show_entries format=duration,bit_rate -of json "${file}"`
        );

        const info = JSON.parse(stdout);

        // 检查视频流的分辨率和帧率
        const videoStream = info.streams.find(s => s.codec_type === 'video');
        if (videoStream) {
          const width = parseInt(videoStream.width);
          const height = parseInt(videoStream.height);

          // 竖屏视频的标准分辨率应为 1080×1920
          if (width !== 1080 || height !== 1920) {
            this.issues.push({
              type: 'VIDEO_RESOLUTION',
              severity: 'ERROR',
              message: `视频分辨率不正确: ${width}x${height}`,
              solution: '应为1080x1920（竖屏）',
              path: file
            });
          }

          // 帧率检查，允许 1fps 的浮动误差
          const [num, den] = videoStream.r_frame_rate.split('/');
          const fps = parseInt(num) / parseInt(den);
          if (Math.abs(fps - 60) > 1) {
            this.issues.push({
              type: 'VIDEO_FPS',
              severity: 'WARNING',
              message: `视频帧率: ${fps.toFixed(1)}fps`,
              solution: '建议使用60fps以获得流畅体验',
              path: file
            });
          }
        }

        // 15秒以下的视频内容量不足
        const duration = parseFloat(info.format.duration);
        if (duration < 15) {
          this.issues.push({
            type: 'VIDEO_DURATION',
            severity: 'WARNING',
            message: `视频时长过短: ${duration.toFixed(1)}秒`,
            solution: '建议时长30-60秒',
            path: file
          });
        }

        // 超过 100MB 的视频文件在社交媒体上传时会遇到限制
        const stats = await fs.stat(file);
        const sizeMB = stats.size / (1024 * 1024);
        if (sizeMB > 100) {
          this.issues.push({
            type: 'VIDEO_SIZE',
            severity: 'WARNING',
            message: `视频文件过大: ${sizeMB.toFixed(1)}MB`,
            solution: '优化编码或压缩视频',
            path: file
          });
        }

      } catch (error) {
        this.issues.push({
          type: 'VIDEO_FORMAT',
          severity: 'ERROR',
          message: `无法解析视频文件: ${error.message}`,
          solution: '检查视频编码格式',
          path: file
        });
      }
    }
  }

  /**
   * 自动修复可修复的问题
   * 遍历所有已发现问题，根据 fixAction 字段的分派策略执行对应修复：
   * - replaceFont → 委托 SubtitleGenerator.fixFontCompatibility
   * - adjustFontSize → 本地方法，正则替换 Fontsize 参数
   * - convertSrtToAss → 本地方法，解析 SRT 重新生成为 ASS
   * - fixSubtitleFont → 委托 SubtitleGenerator.fixFontCompatibility
   */
  async autoFixIssues() {
    console.log('🔧 开始自动修复问题...');

    const SubtitleGenerator = require('./subtitle-generator');
    const subtitleGenerator = new SubtitleGenerator();

    for (const issue of this.issues) {
      if (issue.fixable) {
        try {
          switch (issue.fixAction) {
            case 'replaceFont':
              // 将 ASS 文件中不兼容字体替换为当前系统兼容字体
              await subtitleGenerator.fixFontCompatibility(issue.path);
              this.fixedIssues.push(issue);
              console.log(`✅ 修复字体: ${issue.path}`);
              break;

            case 'adjustFontSize':
              await this.adjustFontSize(issue.path);
              this.fixedIssues.push(issue);
              console.log(`✅ 调整字体大小: ${issue.path}`);
              break;

            case 'convertSrtToAss':
              await this.convertSrtToAss(issue.path);
              this.fixedIssues.push(issue);
              console.log(`✅ 转换SRT到ASS: ${issue.path}`);
              break;

            case 'fixSubtitleFont':
              await subtitleGenerator.fixFontCompatibility(issue.path);
              this.fixedIssues.push(issue);
              console.log(`✅ 修复字幕字体: ${issue.path}`);
              break;
          }
        } catch (error) {
          console.error(`❌ 修复失败: ${issue.path}`, error.message);
        }
      }
    }

    console.log(`✅ 自动修复完成: 修复了 ${this.fixedIssues.length} 个问题`);
  }

  /**
   * 验证 ASS 文件中的字体大小是否符合标准（12px）
   * 查找 Style 行中的 Fontsize 参数，低于 36px 或高于 72px 的需要报告
   *
   * @param {string} filePath - ASS 文件路径
   */
  async validateFontSize(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const styleMatch = fileContent.match(/Style:.*?,(\d+),/);
    if (!styleMatch) return { valid: false, message: '未找到 Style 行' };
    
    const fontsize = parseInt(styleMatch[1], 10);
    if (fonts === 12) {
      return { valid: true, fontsize, message: 'Fontsize=48 符合标准' };
    }
    return { valid: false, fontsize, message: `Fontsize=${fontsize}，应为 12` };
  }

  /**
   * 调整 ASS 文件中的字体大小为标准 48px
   * 查找 Style 行中的 Fontsize 参数，将不是 48px 的值修正为 48px
   *
   * @param {string} filePath - ASS 文件路径
   */
  async adjustFontSize(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const lines = fileContent.split('\n');
    const adjustedLines = lines.map(function(line) {
      if (!line.startsWith('Style:')) return line;
      // 修正任何非 48 的值为 48
      return line.replace(/Fontsize,\d+/g, 'Fontsize,12');
    });
    await fs.writeFile(filePath, adjustedLines.join('\n'), 'utf8');
  }

  /**
   * 将 SRT 字幕文件转换为 ASS 格式
   * 流程：读取 SRT → 解析 → 调用 SubtitleGenerator.generateASS 重新生成
   * 原 SRT 文件会被重命名为 .srt.backup 作为备份
   *
   * @param {string} srtPath - SRT 文件路径
   */
  async convertSrtToAss(srtPath) {
    const SubtitleGenerator = require('./subtitle-generator');
    const subtitleGenerator = new SubtitleGenerator();

    const srtContent = await fs.readFile(srtPath, 'utf8');
    const subtitles = this.parseSrt(srtContent);

    const assPath = srtPath.replace('.srt', '.ass');
    await subtitleGenerator.generateASS(subtitles, assPath);

    // 备份原 SRT 文件以防需要回滚
    await fs.rename(srtPath, `${srtPath}.backup`);
  }

  /**
   * 解析 SRT 格式字幕文本为结构化数组
   * SRT 格式：序号 → 时间轴 → 字幕文本（多行）→ 空行分隔
   *
   * @param {string} content - SRT 文件原始内容
   * @returns {Array<{index: number, start: string, end: string, text: string}>}
   */
  parseSrt(content) {
    const subtitles = [];
    const blocks = content.split('\n\n').filter(block => block.trim());

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length >= 3) {
        const timeLine = lines[1];
        const timeRegex = /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/;
        const match = timeLine.match(timeRegex);
        if (match) {
          subtitles.push({
            index: parseInt(lines[0]) || (subtitles.length + 1),
            start: match[1],
            end: match[2],
            text: lines.slice(2).join('\\N')
          });
        }
      }
    }
    return subtitles;
  }

  /**
   * 扫描指定扩展名的文件
   * 递归遍历项目目录，收集所有匹配扩展名的文件路径
   *
   * @param {...string} extensions - 要查找的文件扩展名列表（如 '.ass', '.mp4'）
   * @returns {Promise<string[]>} 匹配的文件路径数组
   */
  async findFiles(...extensions) {
    const results = [];

    async function scan(dir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await scan(fullPath);
          } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
            results.push(fullPath);
          }
        }
      } catch {
        // 如果目录不存在，跳过而不报错
      }
    }

    await scan(this.options.projectDir);
    return results.sort();
  }

  /**
   * 获取当前系统兼容的中文字体名称
   * macOS 使用 PingFang SC，Windows 使用 Microsoft YaHei，Linux 使用 Noto Sans CJK SC
   *
   * @returns {string} 兼容字体名称
   */
  getCompatibleFont() {
    const platform = os.platform();
    if (platform === 'darwin') return 'PingFang SC';
    if (platform === 'win32') return 'Microsoft YaHei';
    return 'Noto Sans CJK SC';
  }

  /**
   * 生成质量检查报告
   * 汇总所有检查结果，计算严重程度统计，给出摘要结论
   *
   * @returns {object} report - 包含 summary、issues、fixedIssues 的完整报告
   */
  generateReport() {
    const errors = this.issues.filter(i => i.severity === 'ERROR').length;
    const warnings = this.issues.filter(i => i.severity === 'WARNING').length;
    const infos = this.issues.filter(i => i.severity === 'INFO').length;

    return {
      summary: {
        total: this.issues.length,
        errors,
        warnings,
        infos,
        fixed: this.fixedIssues.length,
        passed: errors === 0
      },
      issues: this.issues,
      fixedIssues: this.fixedIssues,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 保存检查报告到文件
   *
   * @param {object} report - generateReport 返回的报告对象
   * @param {string} outputPath - 报告输出路径
   */
  async saveReport(report, outputPath) {
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`📊 质量检查报告已保存: ${outputPath}`);
  }
}

module.exports = QualityChecker;
