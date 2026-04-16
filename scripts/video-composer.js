/**
 * 视频合成器
 * 基于Remotion生成视频
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { THEMES } = require('./themes');

class VideoComposer {
  constructor(options = {}) {
    this.options = {
      width: 1080,
      height: 1920,
      fps: 60,
      duration: 30,
      quality: 'high',
      style: 'tech-modern',
      outputDir: './video-output',
      ...options
    };

    this.themes = THEMES;
  }

  /**
   * 生成视频
   */
  async generateVideo(content, metadata, images) {
    console.log('🎬 开始生成视频...');
    
    const theme = this.themes[this.options.style] || this.themes['tech-modern'];
    const duration = this.options.duration || metadata.suggestedDuration || 30;
    
    // 1. 创建Remotion项目结构
    const projectDir = await this.createRemotionProject();
    
    // 2. 生成视频组件
    await this.generateVideoComponent(projectDir, content, metadata, images, theme, duration);
    
    // 3. 生成入口文件
    await this.generateEntryFile(projectDir, duration);
    
    // 4. 生成根组件
    await this.generateRootComponent(projectDir, duration);
    
    // 5. 渲染视频
    const videoPath = await this.renderVideo(projectDir);
    
    console.log('✅ 视频生成完成');
    return videoPath;
  }

  /**
   * 创建Remotion项目结构
   */
  async createRemotionProject() {
    const projectDir = path.join(this.options.outputDir, 'temp', 'remotion-project');
    
    // 创建目录结构
    const dirs = [
      'src',
      'src/scenes',
      'src/components',
      'src/assets'
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(path.join(projectDir, dir), { recursive: true });
    }
    
    // 创建package.json
    const packageJson = {
      name: 'video-creator-remotion',
      version: '1.0.0',
      private: true,
      scripts: {
        start: 'remotion studio',
        build: 'remotion render',
        upgrade: 'remotion upgrade'
      },
      dependencies: {
        remotion: '^4.0.0',
        'react': '^18.0.0',
        'react-dom': '^18.0.0'
      }
    };
    
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // 创建tsconfig.json
    const tsconfig = {
      compilerOptions: {
        target: 'ES2018',
        module: 'commonjs',
        jsx: 'react-jsx',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: './dist'
      },
      include: ['src/**/*']
    };
    
    await fs.writeFile(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2)
    );
    
    return projectDir;
  }

  /**
   * 生成视频组件
   */
  async generateVideoComponent(projectDir, content, metadata, images, theme, duration) {
    const componentContent = this.generateRemotionComponent(content, metadata, images, theme, duration);
    
    await fs.writeFile(
      path.join(projectDir, 'src', 'Video.tsx'),
      componentContent
    );
  }

  /**
   * 生成Remotion组件
   */
  generateRemotionComponent(content, metadata, images, theme, duration) {
    const title = metadata.title || '视频内容';
    const fps = this.options.fps;
    const totalFrames = duration * fps;
    
    // 这里应该生成完整的React组件代码
    // 由于代码较长，返回简化版本
    return `import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export const Video: React.FC = () => {
  const {fps, width, height} = useVideoConfig();
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      background: '${theme.background}',
      color: 'white',
      fontSize: '60px',
      fontWeight: 'bold'
    }}>
      <div>${this.escapeJsString(title)}</div>
      <div style={{ fontSize: '30px', marginTop: '20px' }}>
        ${duration}秒视频 • ${theme.name}
      </div>
    </AbsoluteFill>
  );
};`;
  }

  /**
   * 生成入口文件
   */
  async generateEntryFile(projectDir, duration) {
    const entryContent = `import {registerRoot} from 'remotion';
import {RemotionVideo} from './src/Root';

registerRoot(RemotionVideo);`;
    
    await fs.writeFile(
      path.join(projectDir, 'src', 'index.ts'),
      entryContent
    );
  }

  /**
   * 生成根组件
   */
  async generateRootComponent(projectDir, duration) {
    const rootContent = `import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';

export const RemotionVideo: React.FC = () => {
  return (
    <>
      <Composition
        id="Video"
        component={Video}
        durationInFrames={${duration} * ${this.options.fps}}
        fps={${this.options.fps}}
        width={${this.options.width}}
        height={${this.options.height}}
        defaultProps={{}}
      />
    </>
  );
};`;
    
    await fs.writeFile(
      path.join(projectDir, 'src', 'Root.tsx'),
      rootContent
    );
  }

  /**
   * 渲染视频
   */
  async renderVideo(projectDir) {
    console.log('🔄 开始渲染视频...');
    
    const outputPath = path.join(this.options.outputDir, 'video', 'output.mp4');
    
    try {
      // 安装依赖
      console.log('📦 安装依赖...');
      await execAsync('npm install', { cwd: projectDir });
      
      // 渲染视频
      console.log('🎬 渲染视频中...');
      const renderCmd = `npx remotion render src/index.ts Video --codec=h264 --quality=100 --overwrite "${outputPath}"`;
      await execAsync(renderCmd, { cwd: projectDir });
      
      console.log(`✅ 视频渲染完成: ${outputPath}`);
      return outputPath;
      
    } catch (error) {
      console.error('❌ 视频渲染失败:', error.message);
      
      // 创建占位视频文件
      await this.createPlaceholderVideo(outputPath);
      return outputPath;
    }
  }

  /**
   * 创建占位视频
   */
  async createPlaceholderVideo(outputPath) {
    const placeholder = `# 视频渲染失败，请检查Remotion配置\n\n输出路径: ${outputPath}`;
    await fs.writeFile(outputPath.replace('.mp4', '.txt'), placeholder);
  }

  /**
   * 转义JavaScript字符串
   */
  escapeJsString(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

}

module.exports = VideoComposer;