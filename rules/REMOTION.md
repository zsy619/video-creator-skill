---
name: video-creator-remotion
description: Video Creator 技能的 Remotion 视频组件规范，包含竖屏视频、居中布局、动画、过渡和性能优化最佳实践。
parent: SKILL.md
related_skills:
  - remotion-best-practices
  - VOICE.md
  - THEMES.md
  - FONTS.md
version: 2.4.0
last_updated: 2026-04-05
---

# Remotion 视频组件规范 (Remotion Video Component Spec)

> **所属模块**: video-creator / SKILL.md → 视频渲染
> **版本**: v2.4.0
> **依赖技能**: [remotion-best-practices](../remotion-best-practices)
> **相关模块**: [VOICE.md](VOICE.md) · [THEMES.md](THEMES.md) · [FONTS.md](FONTS.md)

本文档定义了使用 Remotion 创建社交媒体竖屏视频的组件规范和最佳实践。

---

## 📋 目录

- [整体原则](#整体原则)
- [竖屏配置](#竖屏配置)
- [居中场景模板](#居中场景模板)
- [动画系统](#动画系统)
- [场景时序控制](#场景时序控制)
- [过渡效果](#过渡效果)
- [资源加载](#资源加载)
- [音频组件](#音频组件)
- [性能优化](#性能优化)
- [常见问题](#常见问题)

---

## 整体原则

> ⚠️ **【强制要求】所有视频必须使用大字体！**
> - 主标题：**120-180px**（封面场景可用更大）
> - 副标题：**48-72px**
> - 正文：**40-56px**
> - 详见 [FONTS.md](FONTS.md) - 大字体居中设计规范。

- 要求使用大字体，严格居中显示，避免文字超出屏幕边界。
- 合并音频后，要求视频与音频同步，避免有延迟或提前播放。
- 严格遵循官方项目结构：Remotion 项目必须包含入口文件 src/index.ts（调用 registerRoot 注册根组件）和根文件 src/Root.tsx（定义 <Composition> 视频配置）。默认帧率应为 60fps，默认分辨率为 1920×1080，默认合成 ID 为 "MyComp"。组件需模块化拆分，将视频元素抽象为独立、可复用的 React 组件。
- 帧驱动动画系统：所有动画必须通过 useCurrentFrame() 钩子获取当前帧号，结合 interpolate() 实现线性插值或 spring() 实现自然弹簧动画。禁止使用 CSS transitions 或独立于帧号的 CSS 动画，否则在多线程渲染时会导致画面闪烁。
- 媒体同步与资源管理：音频同步问题通常分为三类——偏移（固定延迟）、漂移（逐渐失步）和修剪不匹配（音视频起点不一致）。使用 <Sequence> 组件的 from 属性延迟音视频、用 trimBefore/trimAfter 修剪内容。加载字体、音频数据等异步资源时必须使用 delayRender()/continueRender() 模式阻塞渲染直至资源就绪。大型媒体数据（如完整音频波形）不得作为 props 传递，应改用 calculateMetadata 提前获取。
- TypeScript + Zod 类型安全：所有组件 props 必须定义 TypeScript 类型，并使用 Zod schema 进行运行时校验。在 <Composition> 中通过 schema 属性附加 schema，Remotion 会自动进行 props 验证并支持 Studio 可视化编辑。
- 渲染性能优化：通过 npx remotion benchmark 命令测试不同 --concurrency 值找到最佳并发数——并发过高或过低都会降低渲染效率。使用新 <Video> 标签替代旧的 <Html5Video> 或 <OffthreadVideo> 以获得最优性能。使用 useMemo() 和 useCallback() 缓存昂贵计算，用 --log=verbose 定位最慢帧，避免在云无 GPU 实例上大量使用 GPU 加速 CSS 属性（如 filter: blur()）。

## 竖屏配置

### Composition 定义

```tsx
// src/Root.tsx
import { Composition, Folder } from 'remotion';
import { VerticalVideo } from './VerticalVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="社交媒体视频">
      <Composition
        id="VerticalVideo"
        component={VerticalVideo}
        durationInFrames={3600} // 60秒 @ 60fps
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{
          theme: 'tech-modern',
        }}
      />
    </Folder>
  );
};
```

### 平台规格速查

| 平台 | 分辨率 | 帧率 | 码率建议 |
|------|--------|------|----------|
| 小红书 | 1080×1920 | 60fps | 10-15 Mbps |
| 视频号 | 1080×1920 | 30/60fps | 8-12 Mbps |
| 抖音 | 1080×1920 | 60fps | 10-15 Mbps |
| YouTube Shorts | 1080×1920 | 30/60fps | 8-12 Mbps |

---

## 居中场景模板

### 基础居中场景组件

> **⚠️ 重要**: CSS `transition` 和 Tailwind 动画类名**禁止使用**，动画必须基于 `useCurrentFrame()` 驱动。

```tsx
// src/components/CenteredScene.tsx
import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  interpolate,
  useVideoConfig,
} from 'remotion';

// 帧率常量
const FPS = 60;

/**
 * 居中场景组件
 * 适用于：标题展示、要点呈现、结尾 CTA
 */
export const CenteredScene: React.FC<{
  text: string;
  fontSize?: number;
  color?: string;
}> = ({ text, fontSize = 120, color = '#F8FAFC' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 弹簧动画驱动的透明度和缩放
  const opacity = spring({ frame, fps, config: { damping: 15 } });
  const scale = interpolate(frame, [0, 30], [0.8, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          textAlign: 'center',
          color,
          fontSize,
          fontWeight: 'bold',
          fontFamily: 'Noto Sans SC, sans-serif',
          padding: '0 80px',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
```

### 全屏背景 + 居中内容

```tsx
// src/components/FullBackgroundScene.tsx
import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from 'remotion';
import { staticFile } from 'remotion';

export const FullBackgroundScene: React.FC<{
  backgroundImage: string;
  overlayText: string;
}> = ({ backgroundImage, overlayText }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* 全屏背景图 */}
      <Img
        src={staticFile(backgroundImage)}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      {/* 半透明遮罩 */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      />
      {/* 居中文字 */}
      <div
        style={{
          position: 'relative',
          opacity,
          color: '#FFFFFF',
          fontSize: 80,
          textAlign: 'center',
          fontWeight: 'bold',
          fontFamily: 'Noto Sans SC, sans-serif',
        }}
      >
        {overlayText}
      </div>
    </AbsoluteFill>
  );
};
```

---

## 动画系统

> **📖 参考**: [remotion-best-practices/animations.md](../remotion-best-practices/rules/animations.md)

### 核心原则

1. **所有动画必须使用 `useCurrentFrame()` 驱动**
2. **使用秒数 × fps 转换为帧数**
3. **禁止使用 CSS transition 和 Tailwind 动画类**

### 弹簧动画 (Spring Animation)

弹簧动画提供自然的运动效果，无抖动配置适合平滑过渡：

```tsx
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

// 常用弹簧配置
const PRESETS = {
  smooth: { damping: 200 },      // 平滑，无弹跳（内容揭示）
  snappy: { damping: 20, stiffness: 200 }, // 敏捷，最小弹跳（UI元素）
  bouncy: { damping: 8 },        // 弹性入场（活泼动画）
  heavy: { damping: 15, stiffness: 80, mass: 2 }, // 沉重，慢速，小弹跳
};

// 示例：带延迟的入场动画
export const AnimatedTitle: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ENTRANCE_DELAY = 20; // 20帧延迟

  const entrance = spring({
    frame: frame - ENTRANCE_DELAY,
    fps,
    config: { damping: 200 },
  });

  const translateY = interpolate(entrance, [0, 1], [50, 0]);

  return (
    <div style={{ transform: `translateY(${translateY}px)` }}>
      {text}
    </div>
  );
};
```

### 插值动画 (Interpolate)

```tsx
import { interpolate, Easing, useCurrentFrame } from 'remotion';

// 基础用法
const opacity = interpolate(frame, [0, 100], [0, 1]);

// 带边界限制
const scale = interpolate(frame, [0, 30], [0.8, 1], {
  extrapolateRight: 'clamp',
  extrapolateLeft: 'clamp',
});

// 带缓动函数
const slideX = interpolate(frame, [0, 60], [-100, 0], {
  easing: Easing.out(Easing.quad),
  extrapolateRight: 'clamp',
});

// 自定义贝塞尔曲线
const bounce = interpolate(frame, [0, 40], [0, 1], {
  easing: Easing.bezier(0.8, 0.22, 0.96, 0.65),
  extrapolateRight: 'clamp',
});
```

### 组合动画：入场 + 内容 + 出场

```tsx
import { spring, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const CombinedAnimation: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 入场动画
  const inAnimation = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // 出场动画
  const outAnimation = spring({
    frame,
    fps,
    durationInFrames: 1 * fps,
    delay: durationInFrames - 1 * fps,
  });

  // 组合效果
  const opacity = inAnimation - outAnimation;
  const scale = interpolate(inAnimation, [0, 1], [0.9, 1]);

  return (
    <div style={{ opacity, transform: `scale(${scale})` }}>
      {children}
    </div>
  );
};
```

---

## 场景时序控制

> **📖 参考**: [remotion-best-practices/sequencing.md](../remotion-best-practices/rules/sequencing.md)

### 场景可见性控制

> **⚠️ 关键**: 每个场景必须控制可见区间，避免多场景同时渲染导致性能问题。

```tsx
// src/VerticalVideo.tsx
import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Img,
  staticFile,
  spring,
} from 'remotion';
import { ASSETS } from './assets';

const FPS = 60;

// 场景定义：每帧 @ 60fps
const SCENES = [
  { id: 'cover', start: 0, end: 180 },        // 0-3秒
  { id: 'intro', start: 180, end: 480 },     // 3-8秒
  { id: 'content-1', start: 480, end: 960 }, // 8-16秒
  { id: 'content-2', start: 960, end: 1440 }, // 16-24秒
  { id: 'outro', start: 1440, end: 1800 },   // 24-30秒
];

// 淡入辅助函数
const useFadeIn = (frame: number, startFrame: number, duration: number = 15) => {
  return interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateRight: 'clamp',
  });
};

// 通用场景组件
const Scene: React.FC<{
  config: typeof SCENES[number];
  children: React.ReactNode;
}> = ({ config, children }) => {
  const frame = useCurrentFrame();
  const { start, end } = config;

  // 可见性判断
  const isVisible = frame >= start && frame < end;
  if (!isVisible) return null;

  // 淡入效果
  const opacity = useFadeIn(frame, start);

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};

// 主视频组件
export const VerticalVideo: React.FC<{
  title: string;
  content: ContentItem[];
}> = ({ title, content }) => {
  return (
    <AbsoluteFill
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: '#0F172A',
      }}
    >
      {/* 封面场景 */}
      <Scene config={SCENES[0]}>
        <CoverScene title={title} />
      </Scene>

      {/* 引言场景 */}
      <Scene config={SCENES[1]}>
        <IntroScene />
      </Scene>

      {/* 内容场景 */}
      {content.map((item, index) => (
        <Scene key={item.id} config={SCENES[2 + index]}>
          <ContentScene item={item} />
        </Scene>
      ))}

      {/* 结尾场景 */}
      <Scene config={SCENES[SCENES.length - 1]}>
        <OutroScene />
      </Scene>
    </AbsoluteFill>
  );
};
```

### Sequence 组件用法

```tsx
import { Sequence, Series, AbsoluteFill } from 'remotion';

const { fps } = useVideoConfig();

// 基础用法：延迟入场
<Sequence from={1 * fps} durationInFrames={2 * fps} premountFor={1 * fps}>
  <Title />
</Sequence>

// 使用 Series：顺序播放不重叠
<Series>
  <Series.Sequence durationInFrames={45}>
    <Intro />
  </Series.Sequence>
  <Series.Sequence durationInFrames={60}>
    <MainContent />
  </Series.Sequence>
  <Series.Sequence durationInFrames={30}>
    <Outro />
  </Series.Sequence>
</Series>

// 重叠效果：使用负 offset
<Series>
  <Series.Sequence durationInFrames={60}>
    <SceneA />
  </Series.Sequence>
  <Series.Sequence offset={-15} durationInFrames={60}>
    <SceneB />
  </Series.Sequence>
</Series>
```

### 嵌套 Sequence

```tsx
<Sequence from={0} durationInFrames={120}>
  <Background />
  <Sequence from={15} durationInFrames={90} layout="none">
    <Title />
  </Sequence>
  <Sequence from={45} durationInFrames={60} layout="none">
    <Subtitle />
  </Sequence>
</Sequence>
```

---

## 过渡效果

> **📖 参考**: [remotion-best-practices/transitions.md](../remotion-best-practices/rules/transitions.md)
> **⚠️ 依赖**: 需要安装 `@remotion/transitions`

### 安装依赖

```bash
npx remotion add @remotion/transitions
```

### TransitionSeries 基础用法

```tsx
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from '@remotion/transitions';
import { fade, slide } from '@remotion/transitions/fade';

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneA />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: 15 })}
  />
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneB />
  </TransitionSeries.Sequence>
</TransitionSeries>;
```

### 过渡类型

| 过渡类型 | 导入方式 | 说明 |
|----------|----------|------|
| `fade()` | `@remotion/transitions/fade` | 淡入淡出 |
| `slide()` | `@remotion/transitions/slide` | 滑动 |
| `wipe()` | `@remotion/transitions/wipe` | 擦除 |
| `flip()` | `@remotion/transitions/flip` | 翻转 |
| `clockWipe()` | `@remotion/transitions/clock-wipe` | 时钟擦除 |

### 方向配置 (Slide)

```tsx
import { slide } from '@remotion/transitions/slide';

<TransitionSeries.Transition
  presentation={slide({ direction: 'from-left' })}
  timing={linearTiming({ durationInFrames: 20 })}
/>

// 可选方向: 'from-left' | 'from-right' | 'from-top' | 'from-bottom'
```

### 时序控制

```tsx
import { linearTiming, springTiming } from '@remotion/transitions';

// 线性时序：匀速
linearTiming({ durationInFrames: 20 })

// 弹簧时序：有机运动
springTiming({ config: { damping: 200 }, durationInFrames: 25 })
```

### 叠加效果 (Overlay)

> **💡 提示**: Overlay 不影响总时长，适合光效、水印等叠加效果

```tsx
import { TransitionSeries } from '@remotion/transitions';
import { LightLeak } from '@remotion/light-leaks';

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneA />
  </TransitionSeries.Sequence>
  <TransitionSeries.Overlay durationInFrames={30}>
    <LightLeak />
  </TransitionSeries.Overlay>
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneB />
  </TransitionSeries.Sequence>
</TransitionSeries>;
```

### 过渡时长计算

> **⚠️ 重要**: 过渡会重叠相邻场景，总时长**小于**所有序列时长之和。

```tsx
// 示例计算
const scene1Duration = 60;
const scene2Duration = 60;
const transitionDuration = 15;

// 总时长 = 60 + 60 - 15 = 105 帧
// 公式: scene1 + scene2 - transition = total
```

---

## 资源加载

> **📖 参考**: [remotion-best-practices/assets.md](../remotion-best-practices/rules/assets.md)

### 公共资源目录

```
video-project/
├── public/           # 静态资源目录
│   ├── images/       # 图片资源
│   │   ├── cover.webp
│   │   └── illustrations/
│   ├── audio/        # 音频资源
│   │   └── voiceover.m4a
│   └── fonts/        # 字体资源
│       └── NotoSansSC.woff2
└── src/
    ├── components/
    └── Root.tsx
```

### 静态文件引用

> **⚠️ 重要**: 必须使用 `staticFile()` 引用 public 目录中的文件

```tsx
import { Img, Audio, staticFile } from 'remotion';
import { Video } from '@remotion/media';

// 图片
<Img src={staticFile('images/cover.webp')} />

// 视频
<Video src={staticFile('videos/clip.mp4')} />

// 音频
<Audio src={staticFile('audio/voiceover.m4a')} />
```

### 远程资源

```tsx
// 远程资源可直接使用
<Img src="https://example.com/image.png" />
<Video src="https://remotion.media/video.mp4" />
```

### 字体加载

```tsx
import { staticFile } from 'remotion';

// 异步加载字体
const loadFont = async () => {
  const font = new FontFace(
    'Noto Sans SC',
    `url(${staticFile('fonts/NotoSansSC.woff2')})`
  );
  await font.load();
  document.fonts.add(font);
};

// 在组件中调用
useEffect(() => {
  loadFont();
}, []);
```

---

## 音频组件

> **📖 参考**: [VOICE.md](VOICE.md) - Azure Neural TTS 音频合成详细指南
> **⚠️ 注意**: 如果Azure Neural TTS 音频合成出现异常，请使用 Voicebox 服务生成对应的音频。
> **⚠️ 注意**: 如果使用 Voicebox 服务，则设置为全局，避免每次都下载与设置环境变量。

### 音频组件规范

> **⚠️ 关键规则**: 整个视频**只使用 1 个 `<Audio>` 组件**，从头播到尾，避免音频重叠。

```tsx
// ✅ 正确：1个Audio从头到尾
<Audio src={staticFile('audio/neural_processed.m4a')} />

// ❌ 错误：多个Audio同时播放导致重叠
<Audio src={A} startFrom={0} />
<Audio src={B} startFrom={621} />
<Audio src={C} startFrom={1268} />
```

### 音量控制

```tsx
import { interpolate, useCurrentFrame, Audio } from 'remotion';

// 静态音量
<Audio src={staticFile('audio.mp3')} volume={0.8} />

// 动态音量（淡入效果）
<Audio
  src={staticFile('audio.mp3')}
  volume={(f) => interpolate(f, [0, 60], [0, 1], { extrapolateRight: 'clamp' })}
/>

// 动态音量（渐变效果）
<Audio
  src={staticFile('audio.mp3')}
  volume={(f) => interpolate(f, [0, 100, 3500, 3600], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })}
/>
```

### 播放速度控制

```tsx
// 正常速度
<Video src={staticFile('video.mp4')} playbackRate={1} />

// 2倍速
<Video src={staticFile('video.mp4')} playbackRate={2} />

// 0.5倍速（慢动作）
<Video src={staticFile('video.mp4')} playbackRate={0.5} />
```

---

## 性能优化

### 渲染性能最佳实践

1. **Premounting 预加载**
   > 始终为 Sequence 添加 `premountFor` 以预加载组件

   ```tsx
   <Sequence premountFor={1 * fps}>
     <Title />
   </Sequence>
   ```

2. **可见性控制**
   > 不可见场景返回 null，避免不必要的渲染

   ```tsx
   const Scene: React.FC = () => {
     const frame = useCurrentFrame();
     if (frame < start || frame >= end) return null;
     // 渲染内容...
   };
   ```

3. **图片优化**
   - 使用 WebP 格式
   - 压缩到合理尺寸（不超过 2MB）
   - 考虑使用 `@remotion/media` 的 OffthreadVideo

4. **渲染配置优化**

   ```bash
   # 设置合理的并发数（根据CPU核心数）
   npx remotion render VerticalVideo \
     --concurrency=4 \
     --crf=18 \
     --profile

   # 低质量预览，高质量最终输出
   npx remotion render VerticalVideo --quality=0  # 快速预览
   npx remotion render VerticalVideo --quality=1  # 最终输出
   ```

5. **帧率选择**
   - 预览：15-30fps
   - 最终输出：60fps

### 批量渲染

```tsx
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia } from '@remotion/renderer';

const bundleLocation = await bundle({
  entryPoint: './src/index.ts',
});

const data = [
  { title: '视频1', id: 'video-1' },
  { title: '视频2', id: 'video-2' },
];

for (const entry of data) {
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'VerticalVideo',
    inputProps: entry,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: `out/${entry.id}.mp4`,
    inputProps: entry,
  });
}
```

---

## 常见问题

### Q: 为什么动画不生效？

**A**: 确保使用 `useCurrentFrame()` 驱动动画，禁止使用 CSS transition 或 Tailwind 动画类。

### Q: 如何让文字完美居中？

**A**: 使用 Flexbox 布局：

```tsx
<AbsoluteFill
  style={{
    display: 'flex',
    justifyContent: 'center', // 水平居中
    alignItems: 'center',     // 垂直居中
  }}
>
  <YourContent />
</AbsoluteFill>
```

### Q: 视频渲染太慢怎么办？

**A**: 1. 使用低质量预览 (`--quality=0`)  
   2. 减少并发数 (`--concurrency=2`)  
   3. 检查是否有未优化的图片/视频资源  
   4. 考虑使用 OffthreadVideo

### Q: 如何获取音频时长？

**A**: 参考 [VOICE.md](VOICE.md) 中的 `getAudioDuration()` 使用方式。

### Q: 过渡效果影响总时长？

**A**: 是的。Transition 会重叠相邻场景，总时长 = 各场景时长之和 - 过渡时长。Overlay 不影响总时长。

---

## 📝 完整示例：竖屏视频组件

```tsx
// src/VerticalVideo.tsx
import React, { useEffect } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  Audio,
  staticFile,
} from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';

// 常量定义
const FPS = 60;
const DURATION = 30; // 秒
const TOTAL_FRAMES = DURATION * FPS;

// 场景配置
const SCENES = [
  { id: 'cover', start: 0, end: 180, duration: 3 },
  { id: 'intro', start: 180, end: 660, duration: 8 },
  { id: 'content', start: 660, end: 1500, duration: 14 },
  { id: 'outro', start: 1500, end: 1800, duration: 5 },
];

// 加载字体
const loadFonts = async () => {
  const font = new FontFace(
    'Noto Sans SC',
    `url(${staticFile('fonts/NotoSansSC.woff2')})`
  );
  await font.load();
  document.fonts.add(font);
};

// 封面场景
const CoverScene: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start, end } = SCENES[0];

  const opacity = interpolate(
    frame,
    [start, start + 15],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  const scale = spring({ frame: frame - start, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          textAlign: 'center',
        }}
      >
        <Img
          src={staticFile('images/cover.webp')}
          style={{ width: 1080, height: 1920, objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#FFFFFF',
            fontSize: 120,
            fontWeight: 'bold',
            fontFamily: 'Noto Sans SC',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {title}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 内容场景
const ContentScene: React.FC<{ content: string; image?: string }> = ({
  content,
  image,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start } = SCENES[2];

  const slideIn = spring({ frame: frame - start, fps, config: { damping: 200 } });
  const translateY = interpolate(slideIn, [0, 1], [100, 0]);

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        padding: '0 60px',
      }}
    >
      {image && (
        <Img
          src={staticFile(image)}
          style={{
            width: 800,
            height: 600,
            objectFit: 'cover',
            marginBottom: 60,
            transform: `translateY(${translateY}px)`,
          }}
        />
      )}
      <div
        style={{
          color: '#F8FAFC',
          fontSize: 72,
          textAlign: 'center',
          fontFamily: 'Noto Sans SC',
          lineHeight: 1.4,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {content}
      </div>
    </AbsoluteFill>
  );
};

// 结尾场景
const OutroScene: React.FC<{ cta: string }> = ({ cta }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { start } = SCENES[3];

  const pulse = spring({
    frame: frame - start,
    fps,
    config: { damping: 10 },
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
      }}
    >
      <div
        style={{
          color: '#22D3EE',
          fontSize: 100,
          fontWeight: 'bold',
          fontFamily: 'Noto Sans SC',
          transform: `scale(${pulse})`,
        }}
      >
        {cta}
      </div>
    </AbsoluteFill>
  );
};

// 主组件
export const VerticalVideo: React.FC<{
  title: string;
  content: string;
  cta: string;
  audioSrc?: string;
}> = ({ title, content, cta, audioSrc }) => {
  useEffect(() => {
    loadFonts();
  }, []);

  return (
    <AbsoluteFill style={{ width: 1080, height: 1920, backgroundColor: '#0F172A' }}>
      {/* 使用 TransitionSeries 实现平滑过渡 */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={180}>
          <CoverScene title={title} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={840}>
          <ContentScene content={content} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={300}>
          <OutroScene cta={cta} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* 单一音频从头到尾 */}
      {audioSrc && <Audio src={staticFile(audioSrc)} />}
    </AbsoluteFill>
  );
};
```

---

**相关模块**:
- [SKILL.md](SKILL.md) - 技能主文档
- [VOICE.md](VOICE.md) - 音频合成详细指南
- [THEMES.md](THEMES.md) - 主题系统
- [FONTS.md](FONTS.md) - 字体规范
- [QUALITY.md](QUALITY.md) - 质量检查
