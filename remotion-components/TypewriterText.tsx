/**
 * 打字机效果组件
 *
 * 参考远程 remotion 技能的最佳实践实现
 * - 使用 spring 动画实现平滑的动画效果
 * - 支持暂停后继续打印
 * - 支持自定义光标样式和闪烁频率
 */

import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface TypewriterTextProps {
  text: string;
  pauseAfter?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  backgroundColor?: string;
  charFrames?: number;
  cursorSymbol?: string;
  cursorBlinkFrames?: number;
  pauseSeconds?: number;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  pauseAfter,
  fontSize = 72,
  fontWeight = 700,
  color = '#000000',
  backgroundColor = '#ffffff',
  charFrames = 2,
  cursorSymbol = '\u258C',
  cursorBlinkFrames = 16,
  pauseSeconds = 1,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const pauseFrames = Math.round(fps * pauseSeconds);

  const typedText = getTypedText({
    frame,
    fullText: text,
    pauseAfter: pauseAfter || '',
    charFrames,
    pauseFrames,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          color,
          fontSize,
          fontWeight,
          fontFamily: 'sans-serif',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span>{typedText}</span>
        <Cursor frame={frame} blinkFrames={cursorBlinkFrames} symbol={cursorSymbol} />
      </div>
    </AbsoluteFill>
  );
};

const Cursor: React.FC<{
  frame: number;
  blinkFrames: number;
  symbol?: string;
}> = ({frame, blinkFrames, symbol = '\u258C'}) => {
  const opacity = interpolate(
    frame % blinkFrames,
    [0, blinkFrames / 2, blinkFrames],
    [1, 0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  return (
    <span style={{opacity, marginLeft: 2}}>{symbol}</span>
  );
};

function getTypedText({
  frame,
  fullText,
  pauseAfter,
  charFrames,
  pauseFrames,
}: {
  frame: number;
  fullText: string;
  pauseAfter: string;
  charFrames: number;
  pauseFrames: number;
}): string {
  const pauseIndex = pauseAfter ? fullText.indexOf(pauseAfter) : -1;
  const preLen = pauseIndex >= 0 ? pauseIndex + pauseAfter.length : fullText.length;

  let typedChars = 0;

  if (frame < preLen * charFrames) {
    typedChars = Math.floor(frame / charFrames);
  } else if (frame < preLen * charFrames + pauseFrames) {
    typedChars = preLen;
  } else {
    const postPhase = frame - preLen * charFrames - pauseFrames;
    typedChars = Math.min(fullText.length, preLen + Math.floor(postPhase / charFrames));
  }

  return fullText.slice(0, typedChars);
}

export default TypewriterText;
