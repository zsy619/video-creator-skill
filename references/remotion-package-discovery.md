# Remotion 包名验证（2026-05-10）

> **结论**：Remotion 4.x 的正确包名是 `remotion`（非 `@remotion/core`）。

## npm 验证

```bash
# ❌ @remotion/core — HTTP 404，不存在
npm view @remotion/core versions  # Error: not found

# ✅ remotion — 存在，stable 版本丰富
# Total: 1196, Stable: 684
# Last 5: 4.0.455, 4.0.456, 4.0.457, 4.0.458, 4.0.459
```

## exports 验证（remotion 4.0.459，47个）

```
AbsoluteFill, AnimatedImage, Artifact, Audio, Composition, Config, 
Easing, Experimental, Folder, FolderContext, Freeze, Html5Audio, 
Html5Video, HtmlInCanvas, IFrame, Img, Internals, Loop, 
MediaPlaybackError, OffthreadVideo, Sequence, Series, Still, 
VERSION, Video, cancelRender, continueRender, delayRender, 
getInputProps, getRemotionEnvironment, getStaticFiles, 
interpolate, interpolateColors, isHtmlInCanvasSupported, 
measureSpring, prefetch, random, registerRoot, spring, 
staticFile, useBufferState, useCurrentFrame, useCurrentScale, 
useDelayRender, useRemotionEnvironment, useVideoConfig, 
watchStaticFile
```

**关键发现**：`Text` — ❌ 不存在（Remotion 4.x 已移除）

## React Error #130 根因

```tsx
// ❌ 错误：Text 不在 exports 中 → React.createElement(undefined) → Error #130
<Text style={{...}}>Hello</Text>

// ✅ 正确：用 div + inline style
<div style={{ fontFamily: 'PingFang SC', fontSize: 72 }}>Hello</div>
```

## package.json 正确写法

```json
{
  "name": "my-remotion-project",
  "dependencies": {
    "remotion": "4.0.459",
    "@remotion/cli": "4.0.459",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

## 渲染命令

```bash
cd video-project
npx remotion render VerticalVideo --output out/video.mp4 --fps 60 --height 1920 --width 1080
```

## 音频混流

```bash
# Step 1: 提取纯视频轨道
ffmpeg -y -i remotion_raw.mp4 -map 0:v -c:v copy video_only.mp4

# Step 2: 混流外部音频
ffmpeg -y -i video_only.mp4 -i neural_1_2x.m4a -map 0:v -map 1:a -c:v copy -c:a copy final.mp4

# Step 3: 烧录字幕（filter_complex 显式语法）
ffmpeg -y -i final.mp4 -i neural_1_2x.m4a \
  -filter_complex "[0:v]ass=audio/subtitles.ass[v]" \
  -map "[v]" -map 1:a \
  -c:v libx264 -crf 18 -preset fast \
  -c:a aac -b:a 256k \
  -r 60 -s 1080x1920 \
  final.mp4
```

## 验证清单（新项目必查）

- [ ] package.json 中只有 `remotion`（非 `@remotion/core`）
- [ ] Video.tsx 中没有 `<Text>` 标签
- [ ] 所有 import 均来自 47 个已知 exports
- [ ] Fontsize=72, Outline=2, MarginV=50
