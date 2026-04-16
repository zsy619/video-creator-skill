/**
 * 单词高亮动画组件
 *
 * 基于远程 remotion 技能的最佳实践实现
 * - 使用 spring 动画实现单词高亮扫过效果
 * - 支持自定义高亮颜色
 * - 支持延迟和动画时长控制
 */

import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface WordHighlightProps {
  text: string;
  highlightWord: string;
  fontSize?: number;
  fontWeight?: number;
  textColor?: string;
  highlightColor?: string;
  backgroundColor?: string;
  highlightStartFrame?: number;
  highlightWipeDuration?: number;
}

export const WordHighlight: React.FC<WordHighlightProps> = ({
  text,
  highlightWord,
  fontSize = 72,
  fontWeight = 700,
  textColor = '#000000',
  highlightColor = '#A7C7E7',
  backgroundColor = '#ffffff',
  highlightStartFrame = 30,
  highlightWipeDuration = 18,
}) => {
  const highlightIndex = text.indexOf(highlightWord);
  const hasHighlight = highlightIndex >= 0;

  const preText = hasHighlight ? text.slice(0, highlightIndex) : text;
  const postText = hasHighlight ? text.slice(highlightIndex + highlightWord.length) : '';

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          color: textColor,
          fontSize,
          fontWeight,
          position: 'relative',
        }}
      >
        {hasHighlight ? (
          <>
            <span>{preText}</span>
            <Highlight
              word={highlightWord}
              color={highlightColor}
              delay={highlightStartFrame}
              durationInFrames={highlightWipeDuration}
            />
            <span>{postText}</span>
          </>
        ) : (
          <span>{text}</span>
        )}
      </div>
    </AbsoluteFill>
  );
};

const Highlight: React.FC<{
  word: string;
  color: string;
  delay: number;
  durationInFrames: number;
}> = ({word, color, delay, durationInFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const highlightProgress = spring({
    fps,
    frame,
    config: {damping: 200},
    delay,
    durationInFrames,
  });

  const scaleX = Math.max(0, Math.min(1, highlightProgress));

  return (
    <span style={{position: 'relative', display: 'inline-block'}}>
      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: '1.05em',
          transform: `translateY(-50%) scaleX(${scaleX})`,
          transformOrigin: 'left center',
          backgroundColor: color,
          borderRadius: '0.18em',
          zIndex: 0,
        }}
      />
      <span style={{position: 'relative', zIndex: 1}}>{word}</span>
    </span>
  );
};

export default WordHighlight;
