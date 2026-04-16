/**
 * 视频创作质量检查器
 * 全面检查视频项目的质量，包括字体、音频、字幕等
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class QualityChecker {
  constructor(options = {}) {
    this.options = {
      projectDir: '.',
      checkFonts: true,
      checkAudio: true,
      checkSubtitles: true,
      checkVideo: true,
      checkStructure: true,
      fixIssues: false, // 是否自动修复问题
      verbose: false,
      ...options
    };

    this.issues = [];
    this.fixedIssues = [];
  }

  /**
   * 运行全面质量检查
   */
  async runFullCheck() {
    console.log('🔍 开始视频项目质量检查...');
    
    try {
      // 1. 检查项目结构
      if (this.options.checkStructure) {
        await this.checkProjectStructure();
      }

      // 2. 检查字体兼容性
      if (this.options.checkFonts) {
        await this.checkFontCompatibility();
      }

      // 3. 检查音频质量
      if (this.options.checkAudio) {
        await this.checkAudioQuality();
      }

      // 4. 检查字幕文件
      if (this.options.checkSubtitles) {
        await this.checkSubtitles();
      }

      // 5. 检查视频文件
      if (this.options.checkVideo) {
        await this.checkVideoFiles();
      }

      // 生成报告
      const report = this.generateReport();
      
      // 如果需要，自动修复问题
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
   * 检查项目结构
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
   * 检查字体兼容性
   */
  async checkFontCompatibility() {
    console.log('🔤 检查字体兼容性...');
    
    // 查找所有ASS文件
    const assFiles = await this.findFiles('.ass');
    
    for (const file of assFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // 检查不兼容字体
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
        
        // 检查字体大小（建议10-14px）
        const fontSizeMatch = content.match(/Fontsize,(\d+)/);
        if (fontSizeMatch) {
          const fontSize = parseInt(fontSizeMatch[1]);
          if (fontSize < 10 || fontSize > 20) {
            this.issues.push({
              type: 'FONT_SIZE',
              severity: 'WARNING',
              message: `字体大小 ${fontSize}px 可能不合适`,
              solution: '建议使用10-14px字体',
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
   * 检查音频质量
   */
  async checkAudioQuality() {
    console.log('🎵 检查音频质量...');
    
    const audioFiles = await this.findFiles('.m4a', '.mp3', '.aac', '.wav');
    
    for (const file of audioFiles) {
      try {
        // 检查文件大小
        const stats = await fs.stat(file);
        if (stats.size < 1024) { // 小于1KB
          this.issues.push({
            type: 'AUDIO_SIZE',
            severity: 'ERROR',
            message: '音频文件过小，可能为空',
            solution: '重新生成音频',
            path: file
          });
        }
        
        // 使用ffprobe检查音频信息
        try {
          const { stdout } = await execAsync(
            `ffprobe -v error -show_entries format=duration,bit_rate -of json "${file}"`
          );
          
          const info = JSON.parse(stdout);
          const duration = parseFloat(info.format.duration);
          const bitrate = parseInt(info.format.bit_rate);
          
          // 检查时长
          if (duration < 10) {
            this.issues.push({
              type: 'AUDIO_DURATION',
              severity: 'WARNING',
              message: `音频时长过短: ${duration.toFixed(1)}秒`,
              solution: '建议音频时长30-60秒',
              path: file
            });
          }
          
          // 检查码率
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
    
    // 检查是否使用macOS say（不推荐）
    const txtFiles = await this.findFiles('.txt');
    for (const file of txtFiles) {
      if (file.includes('narration')) {
        try {
          const content = await fs.readFile(file, 'utf8');
          // 简单检查：如果文件很小且包含say命令特征
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
          // 忽略读取错误
        }
      }
    }
  }

  /**
   * 检查字幕文件
   */
  async checkSubtitles() {
    console.log('📝 检查字幕文件...');
    
    const SubtitleGenerator = require('./subtitle-generator');
    const subtitleChecker = new SubtitleGenerator();
    
    const assFiles = await this.findFiles('.ass');
    const srtFiles = await this.findFiles('.srt');
    
    // 检查ASS文件
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
    
    // 检查SRT文件（建议转换为ASS）
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
    
    // 检查字幕与音频同步
    await this.checkSubtitleSync();
  }

  /**
   * 检查字幕与音频同步
   */
  async checkSubtitleSync() {
    const audioFiles = await this.findFiles('.m4a', '.mp3');
    const assFiles = await this.findFiles('.ass');
    
    if (audioFiles.length > 0 && assFiles.length > 0) {
      // 简单检查：如果有音频和字幕，检查时长匹配
      try {
        const audioFile = audioFiles[0];
        const assFile = assFiles[0];
        
        // 获取音频时长
        const { stdout: audioInfo } = await execAsync(
          `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile}"`
        );
        const audioDuration = parseFloat(audioInfo.trim());
        
        // 获取字幕最后时间
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
            
            const diff = Math.abs(audioDuration - subtitleDuration);
            if (diff > 2) { // 允许2秒误差
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
        // 忽略同步检查错误
      }
    }
  }

  /**
   * 检查视频文件
   */
  async checkVideoFiles() {
    console.log('🎬 检查视频文件...');
    
    const videoFiles = await this.findFiles('.mp4', '.mov', '.avi');
    
    for (const file of videoFiles) {
      try {
        // 使用ffprobe检查视频信息
        const { stdout } = await execAsync(
          `ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate -show_entries format=duration,bit_rate -of json "${file}"`
        );
        
        const info = JSON.parse(stdout);
        
        // 检查分辨率
        const videoStream = info.streams.find(s => s.codec_type === 'video');
        if (videoStream) {
          const width = parseInt(videoStream.width);
          const height = parseInt(videoStream.height);
          
          if (width !== 1080 || height !== 1920) {
            this.issues.push({
              type: 'VIDEO_RESOLUTION',
              severity: 'ERROR',
              message: `视频分辨率不正确: ${width}x${height}`,
              solution: '应为1080x1920（竖屏）',
              path: file
            });
          }
          
          // 检查帧率
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
        
        // 检查时长
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
        
        // 检查文件大小
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
   * 自动修复问题
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
              await subtitleGenerator.fixFontCompatibility(issue.path);
              this.fixedIssues.push(issue);
              console.log(`✅ 修复字体: ${issue.path}`);
              break;
              
            case 'adjustFontSize':
              // 实现字体大小调整
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
   * 调整字体大小
   */
  async adjustFontSize(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    
    // 查找并调整字体大小到推荐值（12px）
    const adjustedContent = content.replace(
      /Fontsize,(\d+)/g,
      (match, size) => {
        const currentSize = parseInt(size);
        if (currentSize < 10 || currentSize > 20) {
          return 'Fontsize,12'; // 调整为推荐大小
        }
        return match;
      }
    );
    
    await fs.writeFile(filePath, adjustedContent, 'utf8');
  }

  /**
   * 转换SRT到ASS
   */
  async convertSrtToAss(srtPath) {
    const SubtitleGenerator = require('./subtitle-generator');
    const subtitleGenerator = new SubtitleGenerator();
    
    const srtContent = await fs.readFile(srtPath, 'utf8');
    const subtitles = this.parseSrt(srtContent);
    
    const assPath = srtPath.replace('.srt', '.ass');
    await subtitleGenerator.generateASS(subtitles, assPath);
    
    // 备份原文件
    await fs.rename(srtPath, `${srtPath}.backup`);
  }

  /**
   * 解析SRT文件
   */
  parseSrt(content) {
    const subtitles = [];
    const blocks = content.split('\n\n').filter(block => block.trim());
    
    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length >= 3) {
        const timeLine = lines[1];
        const match = timeLine.match(/(\d{2}:\d{2}:\d{2},\d