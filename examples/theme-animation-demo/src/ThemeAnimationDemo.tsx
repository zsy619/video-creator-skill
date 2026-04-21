/**
 * 主题动画演示组件
 * 
 * 展示不同主题的动画差异
 */

import React, { useState } from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from 'remotion';
import { getTheme, getThemeAnimation, getGlowConfig } from '../../scripts/themes';

// 演示主题列表
const DEMO_THEMES = [
  'tech-modern',
  'cyberpunk',
  'neon-future',
  'minimal-tech',
  'forest-nature',
  'vibrant-gradient',
];

// 主组件
export const ThemeAnimationDemo: React.FC<{ theme?: string }> = ({ theme = 'tech-modern' }) => {
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);
  const currentTheme = DEMO_THEMES[currentThemeIndex % DEMO_THEMES.length];
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* 5秒切换一个主题 */}
      <Sequence from={0} durationInFrames={300} onLoop={() => {
        setCurrentThemeIndex(prev => prev + 1);
      }}>
        <ThemeShowcase theme={currentTheme} />
      </Sequence>
    </AbsoluteFill>
  );
};

// 单个主题展示
const ThemeShowcase: React.FC<{ theme: string }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const themeAnim = getThemeAnimation(theme);
  const glowConfig = getGlowConfig(theme);
  const themeConfig = getTheme(theme);
  
  // 使用主题动画参数
  const { damping, stiffness, mass } = themeAnim.spring;
  const { from: scaleFrom, to: scaleTo } = themeAnim.scale;
  
  // 入场动画
  const entranceSpring = spring({
    frame,
    fps,
    config: { damping, stiffness, mass },
  });
  
  // 透明度
  const opacity = interpolate(
    frame,
    [0, themeAnim.fade.duration],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // 缩放
  const scale = interpolate(
    entranceSpring.value,
    [0, 1],
    [scaleFrom, scaleTo],
    { extrapolateRight: 'clamp' }
  );
  
  // Y轴位移
  const translateY = interpolate(
    entranceSpring.value,
    [0, 1],
    [80, 0],
    { extrapolateRight: 'clamp' }
  );
  
  // 脉冲动画（用于光晕效果）
  const pulse = interpolate(
    frame % 60,
    [0, 30, 60],
    [0, 1, 0],
    { extrapolateRight: 'clamp' }
  );
  
  // 特殊效果：霓虹闪烁
  const hasNeonFlicker = themeAnim.special.includes('neon-flicker');
  const flickerIntensity = hasNeonFlicker
    ? interpolate(frame % 8, [0, 4, 8], [1, 0.7, 1], { extrapolateRight: 'clamp' })
    : 1;
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: themeConfig.backgroundColor,
        opacity: opacity * flickerIntensity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
      }}
    >
      {/* 主题名称 */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 'bold',
          color: themeConfig.primaryColor,
          marginBottom: 20,
          textAlign: 'center',
        }}
      >
        {theme}
      </div>
      
      {/* 动画参数显示 */}
      <div
        style={{
          fontSize: 28,
          color: '#FFFFFF',
          opacity: 0.8,
          marginBottom: 40,
          textAlign: 'center',
          fontFamily: 'monospace',
        }}
      >
        <div>damping: {damping}</div>
        <div>stiffness: {stiffness}</div>
        <div>fade: {themeAnim.fade.duration} frames</div>
      </div>
      
      {/* 主题色块 */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 20,
            backgroundColor: themeConfig.primaryColor,
            boxShadow: glowConfig.intensity > 0.5
              ? `0 0 ${30 + pulse * 20}px ${glowConfig.color}`
              : 'none',
          }}
        />
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 20,
            backgroundColor: themeConfig.secondaryColor,
            boxShadow: glowConfig.intensity > 0.5
              ? `0 0 ${30 + pulse * 20}px ${glowConfig.color}`
              : 'none',
          }}
        />
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 20,
            backgroundColor: themeConfig.accentColor,
            boxShadow: glowConfig.intensity > 0.5
              ? `0 0 ${30 + pulse * 20}px ${glowConfig.color}`
              : 'none',
          }}
        />
      </div>
      
      {/* 光晕效果指示 */}
      {glowConfig.intensity > 0.5 && (
        <div
          style={{
            fontSize: 24,
            color: glowConfig.color,
            textShadow: `0 0 20px ${glowConfig.color}`,
          }}
        >
          ✨ GLOW EFFECT: {Math.round(glowConfig.intensity * 100)}%
        </div>
      )}
      
      {/* 特殊效果指示 */}
      {themeAnim.special.length > 0 && (
        <div
          style={{
            fontSize: 20,
            color: '#FFFFFF',
            opacity: 0.6,
            marginTop: 20,
          }}
        >
          Effects: {themeAnim.special.join(', ')}
        </div>
      )}
    </AbsoluteFill>
  );
};
