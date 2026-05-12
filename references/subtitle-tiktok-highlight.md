# 字幕逐字高亮特效与 TikTokCaptionOverlay 完整方案

> **最后更新**：2026-05-12
> **适用范围**：所有使用 Remotion Native 渲染字幕的项目
> **配套文档**：`ass-subtitle-gen.md`（split bug 修复）、`REMOTION_NATIVE.md`（渲染架构）

---

## ⚠️ 致命警告：`createTikTokStyleCaptions` 不适用于 ASS 转换的 captions.json

`@remotion/captions` 的 `createTikTokStyleCaptions` API **要求 word-level timing**（每个词/字有独立的 `fromMs/toMs`）：

```ts
// ✅ createTikTokStyleCaptions 期望的格式（word-level）
{
  "text": "今天介绍免费AI路由工具",
  "startMs": 0,
  "endMs": 4500,
  "words": [
    { "text": "今天", "fromMs": 0, "toMs": 500 },
    { "text": "介绍", "fromMs": 500, "toMs": 1000 },
    { "text": "免费AI", "fromMs": 1000, "toMs": 2000 },
    { "text": "路由工具", "fromMs": 2000, "toMs": 4500 }
  ]
}
```

**但 ASS 字幕只能生成 sentence-level timing**（每条字幕是一整句话，没有词边界）：

```json
// ❌ ASS 生成的 captions.json（sentence-level，createTikTokStyleCaptions 无法处理）
[
  { "text": "今天介绍免费AI路由工具9Router", "startMs": 0, "endMs": 2960 }
]
```

**后果**：所有 `words[].toMs` 塌陷为 `Infinity`，字幕不显示。

**结论**：Remotion Native 渲染路径下，**必须使用自定义 CaptionOverlay**（基于 `interpolate`），不能依赖 `createTikTokStyleCaptions`。

---

## 正确方案：TikTokCaptionOverlay（基于 interpolate）

用 `interpolate` 按字符数均分每句话的时长，模拟逐字高亮效果。

### 完整实现

```tsx
// src/components/TikTokCaptionOverlay.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  AbsoluteFill,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type { Caption } from "@remotion/captions";

const HIGHLIGHT = "#39E508";   // 荧光绿高亮色
const ACTIVE   = "#FFFFFF";     // 未读字白色
const INACTIVE  = "rgba(255,255,255,0.45)"; // 已读字半透明白
const FONT_SIZE = 64;
const LINE_HEIGHT = 1.5;

// 按 Unicode 类别分割中英混合文本为可独立高亮的 token
function tokenize(text: string): string[] {
  const regex = /[\u4e00-\u9fff]+|[\u3000-\u303f\uff00-\uffef]+|[a-zA-Z0-9]+|[\u0020-\u007f]+/g;
  const tokens: string[] = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    const t = m[0];
    if (t.trim()) tokens.push(t);
  }
  return tokens.length ? tokens : text.split('');
}

const TikTokCaptionLine: React.FC<{
  text: string;
  durationInFrames: number;
  fps: number;
}> = ({ text, durationInFrames, fps }) => {
  const frame = useCurrentFrame();
  const tokens = useMemo(() => tokenize(text), [text]);
  const msPerToken = (durationInFrames / tokens.length / fps) * 1000;
  const localMs = frame * (1000 / fps);

  // 入场动画：scale 0.85→1 + opacity 0→1
  const entry = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: 'clamp' });
  const entryScale = interpolate(entry, [0, 1], [0.85, 1]);
  const entryOpacity = entry;

  // 退场动画：最后 20 帧淡出
  const exitFadeStart = Math.max(0, durationInFrames - 20);
  const exitOpacity = interpolate(frame, [exitFadeStart, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });

  return (
    <div style={{
      position: "absolute", bottom: 56, left: 0, right: 0,
      display: "flex", justifyContent: "center",
      opacity: entryOpacity * exitOpacity,
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
          fontSize: FONT_SIZE, fontWeight: "bold",
          whiteSpace: "pre-wrap", textAlign: "center",
          fontFamily: "STHeiti Medium, PingFang SC, sans-serif",
          lineHeight: LINE_HEIGHT,
        }}>
          {tokens.map((token, i) => {
            const tokenStartMs = i * msPerToken;
            const tokenEndMs   = (i + 1) * msPerToken;
            const isPast   = localMs > tokenEndMs;
            const isActive = localMs >= tokenStartMs && !isPast;
            return (
              <span key={i} style={{
                color:     isPast ? INACTIVE : isActive ? HIGHLIGHT : ACTIVE,
                display:   "inline-block",
                transform: `scale(${isActive ? 1.08 : 1})`,
                transition: "color 0.08s ease",
              }}>{token}</span>
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
      .then(d => setCaptions(d))
      .catch(() => setCaptions([]));
  }, [captionsFile]);

  if (!captions.length || !fps) return null;

  return (
    <AbsoluteFill>
      {captions.map((cap, i) => {
        const next  = captions[i + 1] ?? null;
        const start = Math.floor((cap.startMs / 1000) * fps);
        const end   = next ? Math.floor((next.startMs / 1000) * fps)
                           : Math.floor((cap.endMs   / 1000) * fps);
        const dur   = end - start;
        if (dur <= 0) return null;
        return (
          <Sequence key={i} from={start} durationInFrames={dur}>
            <TikTokCaptionLine
              text={cap.text}
              durationInFrames={dur}
              fps={fps}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

### 特效参数说明

| 特效 | 参数 | 值 |
|------|------|-----|
| 高亮色 | `HIGHLIGHT` | `#39E508` 荧光绿 |
| 入场时长 | `[0, 15]` 帧 | 0.25秒（fps=60） |
| 入场 scale | `[0.85, 1]` | 轻微弹入 |
| 退场淡出 | 最后 20 帧 | 0.33秒淡出 |
| 背景胶囊 | `rgba(0,0,0,0.55)` | 55%透明黑底 |
| 底部边距 | `bottom: 56` | 距底部 56px |
| 字体 | `STHeiti Medium` | ffmpeg 可用中文字体 |

---

## ASS → captions.json 转换（sentence-level，直接用）

```python
import json, re, sys

def ass_to_captions(ass_path):
    captions = []
    for line in open(ass_path, encoding="utf-8"):
        if not line.startswith("Dialogue:"): continue
        parts = line[9:].split(",", 9)
        if len(parts) < 10: continue
        start, end = parts[1].strip(), parts[2].strip()
        text = parts[9].strip().replace(r"\N", " ").replace(r"\n", " ")
        h, m, cs = start.split(":")
        start_ms = int(h)*3600000 + int(m)*60000 + int(float(cs))*1000
        h, m, cs = end.split(":")
        end_ms   = int(h)*3600000 + int(m)*60000 + int(float(cs))*1000
        captions.append({"startMs": start_ms, "endMs": end_ms, "text": text})
    return captions

caps = ass_to_captions(sys.argv[1])
with open(sys.argv[2], "w") as f:
    json.dump(caps, f, ensure_ascii=False, indent=2)
print(f"{len(caps)} captions -> {sys.argv[2]}")
```

用法：
```bash
python3 ass_to_captions.py audio/subtitles.ass video-project/public/audio/captions.json
```
