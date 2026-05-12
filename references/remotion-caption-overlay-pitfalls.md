# Remotion 字幕叠加层陷阱与解法

## 致命陷阱：`createTikTokStyleCaptions` 对句子级字幕静默失效

### 问题

`createTikTokStyleCaptions` 需要**词级时间戳**（每个词有独立的 `fromMs/toMs`），通常来自 Deepgram/WhisperX 等语音识别服务。

当字幕来自 TTS 文本分割（`edge-tts` → 固定时长均分），captions.json 每条只有：
```json
{"startMs": 0, "endMs": 2960, "text": "今天介绍免费AI路由工具9Router"}
```
没有词级 timing。

`createTikTokStyleCaptions` 对这种输入会**静默失效**：
- 返回的 pages 结构正常
- 但所有 token 的 `toMs = Infinity`
- 结果：**字幕完全不显示**，无任何报错

### 症状

- Remotion 渲染成功，无报错
- 视频播放时字幕完全不可见
- `createTikTokStyleCaptions` 输出看起来正常（有 pages 和 tokens）
- 逐字高亮完全不触发（因为所有 token 的 `toMs` 都是 `Infinity`）

### 根因

`createTikTokStyleCaptions` 的文档假设输入来自语音识别（词级 timestamps）。
当输入只有句子级 timing 时，它无法从中"猜出"词级分割，tokens 的时间信息全部塌陷。

---

## 解法一：直接渲染（无高亮）

对于纯显示型字幕（不需要逐字高亮），直接渲染每条字幕文本：

```tsx
import { useState, useEffect } from "react";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";

// ⚠️ 禁止使用 useDelayRender —— Remotion 4.x 返回的不是函数类型
//    会导致 "delayRender is not a function" 错误
export const CaptionOverlay: React.FC<{ captionsFile?: string }> = ({
  captionsFile = "audio/captions.json",
}) => {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const { fps } = useVideoConfig();

  useEffect(() => {
    fetch(staticFile(captionsFile))
      .then(r => r.json())
      .then(data => setCaptions(data))
      .catch(() => setCaptions([]));
  }, [captionsFile]);

  if (captions.length === 0 || !fps) return null;

  return (
    <AbsoluteFill>
      {captions.map((caption, index) => {
        const nextCaption = captions[index + 1] ?? null;
        const startFrame = Math.floor((caption.startMs / 1000) * fps);
        const endFrame = nextCaption
          ? Math.floor((nextCaption.startMs / 1000) * fps)
          : Math.floor((caption.endMs / 1000) * fps);
        const durationInFrames = endFrame - startFrame;
        if (durationInFrames <= 0) return null;

        return (
          <Sequence key={index} from={startFrame} durationInFrames={durationInFrames}>
            <CaptionLine text={caption.text} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const CaptionLine: React.FC<{ text: string }> = ({ text }) => (
  <div style={{
    position: "absolute", bottom: 56, left: 0, right: 0,
    display: "flex", justifyContent: "center", pointerEvents: "none",
  }}>
    <div style={{
      fontSize: 64, fontWeight: "bold", whiteSpace: "pre-wrap",
      color: "white",
      textShadow: "0 0 10px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.8)",
      textAlign: "center", padding: "0 40px",
      fontFamily: "STHeiti Medium, PingFang SC, sans-serif",
    }}>{text}</div>
  </div>
);
```

---

## 解法二：TikTok 风格逐字高亮（推荐）

基于 `interpolate` 模拟词级高亮——按字符数均分每句话的朗读时段：

```tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate,
} from "remotion";
import type { Caption } from "@remotion/captions";

const HIGHLIGHT_COLOR = "#39E508";  // 荧光绿高亮
const ACTIVE_COLOR = "#FFFFFF";
const INACTIVE_COLOR = "rgba(255,255,255,0.45)";
const FONT_SIZE = 64;

// 将中英混合文本拆分为 highlight token 单元
function tokenize(text: string): string[] {
  const regex = /[\u4e00-\u9fff]+|[\u3000-\u303f\uff00-\uffef]+|[a-zA-Z0-9]+|[\u0020-\u007f]+/g;
  const tokens: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[0].trim()) tokens.push(match[0]);
  }
  return tokens.length > 0 ? tokens : text.split("");
}

const TikTokCaptionLine: React.FC<{
  text: string;
  durationInFrames: number;
  fps: number;
}> = ({ text, durationInFrames, fps }) => {
  const frame = useCurrentFrame();
  const tokens = useMemo(() => tokenize(text), [text]);
  // 每个 token 的朗读时长（毫秒）
  const msPerToken = (durationInFrames / tokens.length / fps) * 1000;
  const currentMs = frame * (1000 / fps);

  // 入场动画：scale(0.85→1) + opacity(0→1)
  const entry = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp" });
  const entryScale = interpolate(entry, [0, 1], [0.85, 1]);
  const entryOpacity = interpolate(entry, [0, 1], [0, 1]);

  // 退场动画：最后20帧淡出
  const exitFadeStart = Math.max(0, durationInFrames - 20);
  const exitOpacity = interpolate(frame, [exitFadeStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
  });

  const opacity = entryOpacity * exitOpacity;

  return (
    <div style={{
      position: "absolute", bottom: 56, left: 0, right: 0,
      display: "flex", justifyContent: "center",
      opacity,
      transform: `scale(${entryScale})`,
      pointerEvents: "none",
    }}>
      <div style={{
        background: "rgba(0,0,0,0.55)",
        borderRadius: 12,
        padding: "12px 36px",
        maxWidth: "92%",
      }}>
        <div style={{
          fontSize: FONT_SIZE,
          fontWeight: "bold",
          whiteSpace: "pre-wrap",
          textAlign: "center",
          fontFamily: "STHeiti Medium, PingFang SC, sans-serif",
          lineHeight: 1.5,
          color: ACTIVE_COLOR,
        }}>
          {tokens.map((token, i) => {
            const tokenStartMs = i * msPerToken;
            const tokenEndMs = (i + 1) * msPerToken;
            const isActive = currentMs >= tokenStartMs && currentMs < tokenEndMs;
            const isPast = currentMs >= tokenEndMs;

            return (
              <span key={i} style={{
                color: isPast ? INACTIVE_COLOR : isActive ? HIGHLIGHT_COLOR : ACTIVE_COLOR,
                display: "inline-block",
                transform: `scale(${isActive ? interpolate(currentMs, [tokenStartMs, tokenEndMs], [1, 1.08]) : 1})`,
                transition: "color 0.08s ease",
              }}>
                {token}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const CaptionOverlay: React.FC<{ captionsFile?: string }> = ({
  captionsFile = "audio/captions.json",
}) => {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const { fps } = useVideoConfig();

  useEffect(() => {
    fetch(staticFile(captionsFile))
      .then(r => r.json())
      .then(data => setCaptions(data))
      .catch(() => setCaptions([]));
  }, [captionsFile]);

  if (captions.length === 0 || !fps) return null;

  return (
    <AbsoluteFill>
      {captions.map((caption, index) => {
        const nextCaption = captions[index + 1] ?? null;
        const startFrame = Math.floor((caption.startMs / 1000) * fps);
        const endFrame = nextCaption
          ? Math.floor((nextCaption.startMs / 1000) * fps)
          : Math.floor((caption.endMs / 1000) * fps);
        const durationInFrames = endFrame - startFrame;
        if (durationInFrames <= 0) return null;

        return (
          <Sequence key={index} from={startFrame} durationInFrames={durationInFrames}>
            <TikTokCaptionLine
              text={caption.text}
              durationInFrames={durationInFrames}
              fps={fps}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

**特效清单**：
- 逐字/词荧光绿高亮（`#39E508`）
- 当前字 scale(1→1.08) 弹出
- 朗读完成后变半透明白色
- 入场 scale(0.85→1) + opacity(0→1) 弹入
- 退场最后0.33秒淡出
- 半透明黑底胶囊 `rgba(0,0,0,0.55)` + 12px圆角

---

## `useDelayRender` 陷阱

Remotion 4.x 中 `useDelayRender()` 的返回值**不是函数类型**，会导致：

```
TypeError: delayRender is not a function
```

**禁止使用 `useDelayRender()`**，改用纯 `useState + useEffect`（如上所示）。
