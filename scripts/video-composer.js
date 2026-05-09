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
    const hasImages = images && images.length > 0;
    const coverImage = images && images.length > 0 ? images[0] : null;

    // 生成场景帧边界（基于时长分配）
    const sceneCount = Math.min(hasImages ? images.length : 3, 6);
    const framesPerScene = Math.floor(totalFrames / sceneCount);

    let sceneImports = '';
    let sceneComponents = '';
    for (let i = 0; i < sceneCount; i++) {
      const imgVar = `img${i}`;
      const sceneName = `Scene${i}`;
      const startFrame = i * framesPerScene;
      const endFrame = (i + 1) * framesPerScene;

      sceneImports += `import ${imgVar} from '../assets/scene-${i}.png';\n`;
      sceneComponents += `
const ${sceneName}: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [${startFrame}, ${startFrame + 15}, ${endFrame - 15}, ${endFrame}],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  if (frame < ${startFrame} || frame >= ${endFrame}) return null;

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img src={${imgVar}} style={imgStyle} />
      <FadeInText
        text="场景文字"
        fontSize={64}
        style={{ position: 'absolute', bottom: 200, textAlign: 'center', width: '100%' }}
      />
    </AbsoluteFill>
  );
};\n`;
    }

    return `import React from 'react';
import { AbsoluteFill, Img, Audio, interpolate, spring, useCurrentFrame, useVideoConfig, Sequence } from 'remotion';
import { TypewriterText, FadeInText, StaggeredFadeIn, ParticleBackground, WordHighlight } from '../remotion-components';
${sceneImports}

const imgStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

${sceneComponents}

export const Video: React.FC = () => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  // 封面入场动画
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });

  return (
    <AbsoluteFill style={{ background: '${theme.background || '#0F172A'}' }}>
      {/* 粒子背景 */}
      <ParticleBackground
        particleCount={${theme.particles || 50}}
        color="${theme.primary || '#3B82F6'}"
        speedMultiplier={0.5}
      />

      {/* 封面场景：前3秒 */}
      <Sequence from={0} durationInFrames={${fps * 3}}>
        <AbsoluteFill style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          opacity: titleOpacity,
          transform: \`scale(\${titleScale})\`,
          padding: '120px',
        }}>
          <TypewriterText
            text="${this.escapeJsString(title)}"
            fontSize={100}
            color="#FFFFFF"
            fontWeight="bold"
            speed={2}
          />
          <div style={{ fontSize: 48, color: '${theme.accent || '#22D3EE'}', marginTop: 40 }}>
            ${duration}秒 · ${theme.name || ''}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 内容场景序列 */}
      <Scene0 />
      <Scene1 />
      <Scene2 />

      {/* 结尾 CTA：最后3秒 */}
      <Sequence from={${totalFrames - fps * 3}} durationInFrames={${fps * 3}}>
        <AbsoluteFill style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}>
          <FadeInText
            text="👍 点赞 · 🔔 关注"
            fontSize={72}
            color="${theme.primary || '#3B82F6'}"
          />
        </AbsoluteFill>
      </Sequence>

      {/* 音频 */}
      <Audio src={require('../audio/processed/narration.m4a')} />
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
    
    const outputPath = path.join(this.options.outputDir, 'video-project', 'out', 'final-video.mp4');
    
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