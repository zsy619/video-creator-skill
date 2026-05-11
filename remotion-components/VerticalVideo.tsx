/**
 * 竖屏视频主模板
 * 整合所有动画组件的完整竖屏视频模板
 *
 * 使用方法：
 * 1. 复制此模板到 Remotion 项目中
 * 2. 修改 themeConfig 中的主题配置
 * 3. 修改 scenes 中的场景内容
 * 4. 运行 npx remotion preview 预览
 */

import { loadFont } from '@remotion/google-fonts/Inter';
import React from 'react';
import {
    AbsoluteFill,
    Audio,
    Img,
    interpolate,
    Sequence,
    spring,
    useCurrentFrame,
    useVideoConfig
} from 'remotion';
import { BarChart } from './BarChart';
import { FadeInText } from './FadeInText';
import { ParticleBackground } from './ParticleBackground';
import { WordHighlight } from './WordHighlight';

const {fontFamily} = loadFont();

export interface ThemeConfig {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

export interface SceneData {
  type: 'cover' | 'text' | 'chart' | 'list' | 'quote';
  duration?: number;
  [key: string]: unknown;
}

export interface VerticalVideoProps {
  theme?: ThemeConfig;
  scenes?: SceneData[];
  audioUrl?: string;
  backgroundImage?: string;
}

const DEFAULT_THEME: ThemeConfig = {
  name: 'tech-modern',
  primaryColor: '#00ffcc',
  secondaryColor: '#0099ff',
  accentColor: '#cc00ff',
  backgroundColor: '#0F172A',
  textColor: '#F8FAFC',
};

const VerticalVideo: React.FC<VerticalVideoProps> = ({
  theme = DEFAULT_THEME,
  scenes = [],
  audioUrl,
  backgroundImage,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.backgroundColor,
        fontFamily,
      }}
    >
      {/* 粒子背景 */}
      <ParticleBackground
        particleCount={80}
        primaryColor={theme.primaryColor}
        secondaryColor={theme.secondaryColor}
        speed={0.5}
      />

      {/* 背景图片（可选） */}
      {backgroundImage && (
        <Img
          src={backgroundImage}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.3,
          }}
        />
      )}

      {/* 主内容区域 */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 60,
        }}
      >
        {/* 场景内容将通过 Sequence 组件动态渲染 */}
        <SceneContent scenes={scenes} theme={theme} />
      </AbsoluteFill>

      {/* 底部进度条 */}
      <ProgressBar theme={theme} />

      {/* ⚠️ headless 环境：音频通过 ffmpeg 外部注入，禁止 Remotion Audio 组件 */}
      {/* {audioUrl && <Audio src={audioUrl} />} ← 禁止！ */}
    </AbsoluteFill>
  );
};

const SceneContent: React.FC<{
  scenes: SceneData[];
  theme: ThemeConfig;
}> = ({scenes, theme}) => {
  const {fps} = useVideoConfig();
  let currentFrame = 0;

  return (
    <>
      {scenes.map((scene, index) => {
        const duration = (scene.duration || 5) * fps;
        const startFrame = currentFrame;
        currentFrame += duration;

        return (
          <Sequence
            key={index}
            from={startFrame}
            durationInFrames={duration}
          >
            <SceneRenderer scene={scene} theme={theme} />
          </Sequence>
        );
      })}
    </>
  );
};

const SceneRenderer: React.FC<{
  scene: SceneData;
  theme: ThemeConfig;
}> = ({scene, theme}) => {
  switch (scene.type) {
    case 'cover':
      return (
        <CoverScene
          title={scene.title as string}
          subtitle={scene.subtitle as string}
          theme={theme}
        />
      );
    case 'text':
      return (
        <TextScene
          content={scene.content as string}
          highlight={scene.highlight as string}
          theme={theme}
        />
      );
    case 'chart':
      return (
        <ChartScene
          data={scene.data as {label: string; value: number}[]}
          title={scene.title as string}
          theme={theme}
        />
      );
    case 'list':
      return (
        <ListScene
          items={scene.items as string[]}
          theme={theme}
        />
      );
    case 'quote':
      return (
        <QuoteScene
          quote={scene.quote as string}
          author={scene.author as string}
          theme={theme}
        />
      );
    default:
      return null;
  }
};

const CoverScene: React.FC<{
  title: string;
  subtitle?: string;
  theme: ThemeConfig;
}> = ({title, subtitle, theme}) => {
  const frame = useCurrentFrame();
  const {fps, height} = useVideoConfig();

  const titleProgress = spring({
    frame,
    fps,
    config: {damping: 15, stiffness: 100},
  });

  const subtitleProgress = spring({
    frame: frame - 10,
    fps,
    config: {damping: 15, stiffness: 100},
  });

  const scale = interpolate(titleProgress, [0, 1], [0.8, 1]);
  const opacity = interpolate(titleProgress, [0, 0.3], [0, 1]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        width: '100%',
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: theme.textColor,
          textShadow: `0 0 40px ${theme.primaryColor}`,
          transform: `scale(${scale})`,
          opacity,
          maxWidth: '90%',
          wordBreak: 'break-word',
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 32,
            color: theme.primaryColor,
            marginTop: 30,
            opacity: subtitleProgress,
            maxWidth: '80%',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

const TextScene: React.FC<{
  content: string;
  highlight?: string;
  theme: ThemeConfig;
}> = ({content, highlight, theme}) => {
  if (highlight) {
    return (
      <WordHighlight
        text={content}
        highlightWord={highlight}
        color={theme.primaryColor}
        backgroundColor={theme.accentColor}
      />
    );
  }

  return (
    <FadeInText
      text={content}
      fontSize={48}
      color={theme.textColor}
    />
  );
};

const ChartScene: React.FC<{
  data: {label: string; value: number}[];
  title?: string;
  theme: ThemeConfig;
}> = ({data, title, theme}) => {
  return (
    <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      {title && (
        <div style={{fontSize: 36, fontWeight: 600, color: theme.textColor, marginBottom: 40}}>
          {title}
        </div>
      )}
      <BarChart
        data={data}
        barColor={theme.primaryColor}
        labelColor={theme.textColor}
        backgroundColor="transparent"
        width={800}
        height={400}
      />
    </div>
  );
};

const ListScene: React.FC<{
  items: string[];
  theme: ThemeConfig;
}> = ({items, theme}) => {
  return (
    <div style={{width: '100%', display: 'flex', flexDirection: 'column', gap: 30}}>
      {items.map((item, index) => (
        <FadeInText
          key={index}
          text={`${index + 1}. ${item}`}
          fontSize={42}
          color={theme.textColor}
          delay={index * 5}
        />
      ))}
    </div>
  );
};

const QuoteScene: React.FC<{
  quote: string;
  author?: string;
  theme: ThemeConfig;
}> = ({quote, author, theme}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 40px',
      }}
    >
      <div
        style={{
          fontSize: 36,
          fontStyle: 'italic',
          color: theme.textColor,
          lineHeight: 1.6,
          position: 'relative',
        }}
      >
        <span style={{fontSize: 72, color: theme.primaryColor, position: 'absolute', top: -20, left: -30}}>"</span>
        {quote}
      </div>
      {author && (
        <div style={{fontSize: 24, color: theme.secondaryColor, marginTop: 30}}>
          — {author}
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{theme: ThemeConfig}> = ({theme}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const progress = frame / durationInFrames;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress * 100}%`,
          backgroundColor: theme.primaryColor,
          transition: 'none',
        }}
      />
    </div>
  );
};

export default VerticalVideo;
