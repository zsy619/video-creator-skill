/**
 * 淡入文字动画组件
 *
 * 新增组件 - 基于 Remotion 最佳实践
 * - 使用 spring 动画实现平滑淡入效果
 * - 支持延迟和动画时长控制
 * - 支持多种对齐方式
 */

import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface FadeInTextProps {
  text: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  backgroundColor?: string;
  delay?: number;
  durationInFrames?: number;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  maxWidth?: number;
}

export const FadeInText: React.FC<FadeInTextProps> = ({
  text,
  fontSize = 48,
  fontWeight = 400,
  color = '#ffffff',
  backgroundColor = 'transparent',
  delay = 0,
  durationInFrames = 20,
  align = 'center',
  lineHeight = 1.4,
  maxWidth,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const progress = spring({
    fps,
    frame,
    config: {damping: 20, stiffness: 100},
    delay,
    durationInFrames,
  });

  const opacity = progress;
  const translateY = (1 - progress) * 30;

  const alignItems = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        alignItems,
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          color,
          fontSize,
          fontWeight,
          fontFamily: 'sans-serif',
          lineHeight,
          textAlign: align,
          maxWidth: maxWidth || '90%',
          opacity,
          transform: `translateY(${translateY}px)`,
          wordBreak: 'break-word',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/**
 * 多行文本依次淡入动画
 */
export interface StaggeredFadeInProps {
  lines: string[];
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  backgroundColor?: string;
  staggerDelay?: number;
  lineHeight?: number;
}

export const StaggeredFadeIn: React.FC<StaggeredFadeInProps> = ({
  lines,
  fontSize = 48,
  fontWeight = 400,
  color = '#ffffff',
  backgroundColor = 'transparent',
  staggerDelay = 10,
  lineHeight = 1.4,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {lines.map((line, index) => {
          const lineDelay = index * staggerDelay;
          const progress = Math.max(0, Math.min(1, (frame - lineDelay) / 15));
          const opacity = progress;
          const translateY = (1 - progress) * 20;

          return (
            <div
              key={index}
              style={{
                color,
                fontSize,
                fontWeight,
                fontFamily: 'sans-serif',
                lineHeight,
                opacity,
                transform: `translateY(${translateY}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export default FadeInText;
