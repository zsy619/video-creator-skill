# Remotion 渲染问题与 Sequence 帧问题

> **最后更新**：2026-05-15
> **配套文档**：`remotion-compilation-errors.md`（编译错误）、`remotion-project-creation.md`（项目创建）、`remotion-native-subtitles.md`（字幕机制）

---

## 1. Sequence 黑屏修复（核心铁律）

> **⚠️ 核心铁律（必须遵守，违反必黑屏）**：
> 在 Sequence 内部，禁止使用全局帧值（FRAMES.scene.start + X）。必须使用局部帧（从0开始）。

### 问题描述

Remotion `<Sequence>` 组件内部使用 `useCurrentFrame()` 时，帧数从 0 开始（局部帧），而非全局帧。这导致使用全局帧值编写的动画无法正常触发，出现黑屏。

### 根因分析

```tsx
const FRAMES = {
  pain: { start: 176, end: 528 },
};

<Sequence from={176} durationInFrames={352}>
  <PainScene />
</Sequence>
```

在 PainScene 组件内：
- `useCurrentFrame()` 返回 **0-351**（局部帧）
- 但代码中使用了 `FRAMES.pain.start + 50 = 226`
- `interpolate(0-351, [226, 266], [0, 1])` **永远不触发** → 黑屏

### ✅ 正确方案：局部帧模式（强制）

**步骤1**：FRAMES 定义场景的【局部帧范围】

```tsx
// 每个场景的局部帧范围（从0开始）
const SCENE_FRAMES = {
  cover:    { start: 0,   duration: 176  },  // 0-175
  pain:     { start: 0,   duration: 352  },  // 0-351（注意不是176！）
  monetize: { start: 0,   duration: 470  },  // 0-469
  // ...
};
```

**步骤2**：Sequence 传入 from 参数

```tsx
export const Video: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={176}>
        <CoverScene />
      </Sequence>
      <Sequence from={176} durationInFrames={352}>
        <PainScene />
      </Sequence>
      <Sequence from={528} durationInFrames={470}>
        <MonetizeScene />
      </Sequence>
    </AbsoluteFill>
  );
};
```

**步骤3**：场景组件使用局部帧（从0开始）

```tsx
const PainScene: React.FC = () => {
  const frame = useCurrentFrame(); // 0-351（不是176-527！）

  // ✅ 正确：使用局部帧
  const fadeIn = interpolate(frame, [0, 40], [0, 1]);
  const slideIn = interpolate(frame, [50, 120], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <div style={{ opacity: fadeIn }}>内容</div>
    </AbsoluteFill>
  );
};
```

### ❌ 错误示例（必黑屏）

```tsx
// 错误1：Sequence内使用全局帧
<Sequence from={176} durationInFrames={352}>
  <PainScene />
</Sequence>

// PainScene中：
const { start } = FRAMES.pain; // start = 176
const fadeIn = interpolate(frame, [start, start + 40], ...);
// ❌ frame永远到不了176！

// 错误2：混用局部帧和全局帧
const fadeIn = interpolate(frame, [FRAMES.pain.start, FRAMES.pain.start + 40], ...);
// ❌ 同上，frame是局部帧(0-351)，FRAMES.pain.start=176，永远不触发
```

### 帧数计算验证

```
总帧数 = 3465
场景分布：
  cover:    from=0,    duration=176   → 结束帧176
  pain:     from=176,  duration=352   → 结束帧528
  monetize: from=528,  duration=470   → 结束帧998
  publish:  from=998,  duration=588   → 结束帧1586
  engage:   from=1586, duration=587   → 结束帧2173
  create:   from=2173, duration=587   → 结束帧2760
  usage:    from=2760, duration=353   → 结束帧3113
  platforms:from=3113, duration=235   → 结束帧3348
  cta:      from=3348, duration=117   → 结束帧3465 ✅

验证：3465 - 3348 = 117 ✅
```

### 验证方法

```bash
# 检查场景帧数
ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of default=noprint_wrappers=1 video.mp4

# 播放检查黑屏
mpv video.mp4 --start=2 --end=5  # 检查pain场景(176帧=2.9秒)
```

### 关键教训

> `useCurrentFrame()` 在 Sequence 内部返回**局部帧（0-N）**，在 Sequence 外部返回**全局帧**。
>
> **铁律**：
> 1. Sequence 的 `from` + `durationInFrames` 决定全局位置
> 2. 场景组件内部必须使用**局部帧（从0开始）**
> 3. FRAMES 只用于定义 Sequence 的 from/duration，不用于组件内部动画计算

---

## 2. 非致命错误模式

### npx remotion still ProtocolError

**现象**：执行 `npx remotion still` 时，Chrome Headless Shell 下载完成后报错：
```
Was not able to close puppeteer page ProtocolError: Protocol error (Target.closeTarget): No target found for targetId
```
但帧文件仍然成功生成。

**根因**：Remotion 4.x 的 Puppeteer 清理逻辑在页面关闭时抛出非致命异常，不影响实际渲染结果。

**判断方法**：检查 out 目录是否有对应的帧文件或 MP4 输出：
```bash
ls out/*.png out/*.mp4 2>/dev/null
```

**结论**：如果文件成功生成，忽略 ProtocolError 即可。

### Background Render 进程存活但无输出

**现象**：`npx remotion render` 在后台运行时，进程持续存活（数百秒 uptime），但 out/ 目录的输出文件大小和时间戳不再变化。

**处理**：
1. 检查 out/ 是否有完整输出（用 ffprobe 验证 duration）
2. 如果视频时长符合预期，杀死后台进程并使用已有输出
3. 如果时长不符合预期，需要重新渲染

**验证命令**：
```bash
# 检查视频实际时长
ffprobe -v error -show_entries format=duration -of csv=p=0 out/final.mp4

# 检查文件大小是否还在变化
stat -f "%Sm %z" out/final.mp4
```

---

## 3. Remotion 包名验证

> **结论**：Remotion 4.x 的正确包名是 `remotion`（非 `@remotion/core`）。

```bash
# ❌ @remotion/core — HTTP 404，不存在
npm view @remotion/core versions  # Error: not found

# ✅ remotion — 存在，stable 版本丰富
# Total: 1196, Stable: 684
# Last 5: 4.0.455, 4.0.456, 4.0.457, 4.0.458, 4.0.459
```

### exports 验证（remotion 4.0.459，47个）

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

### React Error #130 根因

```tsx
// ❌ 错误：Text 不在 exports 中 → React.createElement(undefined) → Error #130
<Text style={{...}}>Hello</Text>

// ✅ 正确：用 div + inline style
<div style={{ fontFamily: 'PingFang SC', fontSize: 72 }}>Hello</div>
```

### 渲染命令

```bash
cd video-project
npx remotion render VerticalVideo --output out/video.mp4 --fps 60 --height 1920 --width 1080
```

### 音频混流

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

### 验证清单（新项目必查）

- [ ] package.json 中只有 `remotion`（非 `@remotion/core`）
- [ ] Video.tsx 中没有 `<Text>` 标签
- [ ] 所有 import 均来自 47 个已知 exports
- [ ] Fontsize=72, Outline=2, MarginV=50

---

## 4. 视频拼接后黑屏 / 封面场景首帧黑

**症状**：最终拼接视频前几秒画面全黑。

**根因**：封面场景组件（如 CoverScene）在帧 0-20 之间只有装饰线条的 opacity 动画渐变，无实质性视觉内容。

**修复**：在封面场景根部添加不透明背景层：
```tsx
<AbsoluteFill style={{ backgroundColor: '#F8FAFC' }} />
```
