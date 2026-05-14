---
name: video-creator-remotion
description: Video Creator 技能的 Remotion 视频组件规范，包含竖屏视频、居中布局、动画、过渡和性能优化最佳实践。
parent: SKILL.md
related_skills:
  - remotion-best-practices
  - VOICE.md
  - THEMES.md
  - FONTS.md
  - THEME_ANIMATIONS.md
version: 2.7.0
last_updated: 2026-05-12
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
> 
> **竖屏视频字体规范（1080×1920）**：
> - 封面/核心场景主标题：**120-180px**（推荐160px）
> - 副标题/特征标题：**44-72px**（推荐48-56px）
> - 正文/描述内容：**40-56px**（推荐44-48px）
> - 命令行/代码：**22-28px**
> - **字幕必须72px**（ASS Fontsize=72，约40px视觉），底部居中，黄色，PingFang SC字体
> 
> 详见 [FONTS.md](FONTS.md) - 大字体居中设计规范。

- 要求使用大字体，严格居中显示，避免文字超出屏幕边界。
- 合并音频后，要求视频与音频同步，避免有延迟或提前播放。
- 严格遵循官方项目结构：Remotion 项目必须包含入口文件 src/index.ts（调用 registerRoot 注册根组件）和根文件 src/Root.tsx（定义 <Composition> 视频配置）。默认帧率应为 60fps，默认分辨率为 **1080×1920**（竖屏），默认合成 ID 为 "VerticalVideo"。组件需模块化拆分，将视频元素抽象为独立、可复用的 React 组件。
- 帧驱动动画系统：所有动画必须通过 useCurrentFrame() 钩子获取当前帧号，结合 interpolate() 实现线性插值或 spring() 实现自然弹簧动画。禁止使用 CSS transitions 或独立于帧号的 CSS 动画，否则在多线程渲染时会导致画面闪烁。
- 媒体同步与资源管理：音频同步问题通常分为三类——偏移（固定延迟）、漂移（逐渐失步）和修剪不匹配（音视频起点不一致）。使用 <Sequence> 组件的 from 属性延迟音视频、用 trimBefore/trimAfter 修剪内容。加载字体、音频数据等异步资源时**推荐使用** delayRender()/continueRender() 模式阻塞渲染直至资源就绪。大型媒体数据（如完整音频波形）不得作为 props 传递，应改用 calculateMetadata 提前获取。
- TypeScript + Zod 类型安全：所有组件 props 必须定义 TypeScript 类型，并使用 Zod schema 进行运行时校验。在 <Composition> 中通过 schema 属性附加 schema，Remotion 会自动进行 props 验证并支持 Studio 可视化编辑。
- 渲染性能优化：通过 npx remotion benchmark 命令测试不同 --concurrency 值找到最佳并发数——并发过高或过低都会降低渲染效率。使用新 <Video> 标签替代旧的 <Html5Video> 或 <OffthreadVideo> 以获得最优性能。使用 useMemo() 和 useCallback() 缓存昂贵计算，用 --log=verbose 定位最慢帧，避免在云无 GPU 实例上大量使用 GPU 加速 CSS 属性（如 filter: blur()）。
- **主题动画适配**：每个主题有独特的「动画性格」——科技类快速锐利、自然类柔和平滑、创意类弹性有趣。使用 `useThemeAnimation()` Hook 自动应用主题适配的动画参数（spring damping/stiffness、fade duration、glow intensity 等）。详见 [THEME_ANIMATIONS.md](THEME_ANIMATIONS.md)。

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

## ⚠️ 关键修复（v2.6.0 必须遵循）

### 1. AbsoluteFill 尺寸失效问题

> **问题**：`AbsoluteFill style={{ width: 1080, height: 1920 }}` 在新版 Remotion 中无法正确约束尺寸，渲染出的帧可能变成 1195×1920（或其他错误尺寸），导致 libx264 编码失败（`width not divisible by 2`）。

> **原因**：Remotion 的 AbsoluteFill 在某些版本下不继承外层容器的 CSS 尺寸。

> **解决方案**：在主组件中用普通 `<div>` 替代 `AbsoluteFill`，显式指定宽高：

```tsx
// ❌ 错误：AbsoluteFill 可能无法正确约束尺寸
<AbsoluteFill style={{ width: 1080, height: 1920, backgroundColor: '#0F172A' }}>

// ✅ 正确：使用普通 div + explicit 宽高
<div style={{ width: 1080, height: 1920, position: 'relative', backgroundColor: '#0F172A', overflow: 'hidden' }}>
```

> **注意**：子场景组件（CoverScene、PainScene 等）仍然可以使用 `AbsoluteFill`，因为它们在 Sequence 内以 full-screen 模式运行。

### 2. tsconfig.json 必须存在

Remotion 项目根目录必须包含 `tsconfig.json`，否则编译直接失败：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "out"]
}
```

### 3. remotion.config.ts 的 import 路径已变更

Remotion 4+ 中 `remotion.config.ts` 的 import 路径变更，容易报错：

```ts
// ❌ 旧路径（Remotion 3）：
import { Config } from '@remotion/cli/config';

// ✅ 如非必要可不创建 remotion.config.ts
// ✅ 如需配置，仅使用无害选项（如 setVideoImageFormat）
```

### 4. 场景居中布局规范

所有场景的内容必须**上下左右全部居中**，使用以下模式：

```tsx
<div style={{
  position: 'absolute', inset: 0,     // 覆盖整个画面
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',          // 垂直居中
  alignItems: 'center',              // 水平居中
  padding: '0 60px',                  // 左右对称 padding
}}>
  {/* 文字内容加 textAlign: center */}
  <div style={{ textAlign: 'center', fontSize: 42 }}>标题</div>
  {/* 网格/列表加 maxWidth 控制宽度 */}
  <div style={{ width: '100%', maxWidth: 880 }}>...</div>
</div>
```

> **⚠️ 禁止**：使用 `padding: '80px 50px 40px'`（上下不对称）或 `alignItems: 'flex-start'`（内容偏左）。

---

## 居中场景模板

### 基础居中场景组件

> **⚠️ 重要**: CSS `transition` 和 Tailwind 动画类名**禁止使用**，动画必须基于 `useCurrentFrame()` 驱动。
>
> **⚠️ **【强制】Sequence 内使用帧参数传递模式**：`useCurrentFrame()` 只能在 Remotion Root 注册的组件内调用，在 Sequence 子组件内调用会报错 "can only be called inside a component registered as a Composition"。必须采用「传递帧参数」模式——在顶层调用 `useCurrentFrame()`，通过 props 将 frame 传递给子组件。
>
> ```tsx
> // ❌ 错误：在 Sequence 子组件内调用 useCurrentFrame
> const Scene: React.FC = ({ frame }: { frame: number }) => {
>   // 注意：这里不调用 useCurrentFrame()
>   const opacity = interpolate(frame, [0, 30], [0, 1]);
>   return <div style={{ opacity }}>...</div>;
> };
>
> // ✅ 正确：在顶层调用 useCurrentFrame()，通过 props 传递
> export const VerticalVideo: React.FC = () => {
>   const frame = useCurrentFrame(); // ✅ 在顶层调用
>   return (
>     <AbsoluteFill>
>       <Sequence from={0} durationInFrames={300}>
>         <Scene frame={frame} /> {/* ✅ 通过 props 传递 */}
>       </Sequence>
>     </AbsoluteFill>
>   );
> };
> ```

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

### 主题动画 Hook（推荐）

> **💡 推荐**：使用 `useThemeAnimation()` Hook 自动应用主题适配的动画参数。

```tsx
import { useThemeAnimation } from '../scripts/useThemeAnimation';

// 主题适配的动画（自动使用 THEMES.md 中定义的主题动画参数）
const ThemeAnimatedScene: React.FC<{ theme: string }> = ({ theme }) => {
  // ✅ 使用主题动画 Hook
  const { opacity, scale, translateY, glow, hasSpecialEffect } = useThemeAnimation(theme);
  
  // 检查特殊效果
  if (hasSpecialEffect('neon-flicker')) {
    // 实现霓虹闪烁效果
  }
  
  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        boxShadow: glow.intensity > 0.5 ? `0 0 60px ${glow.color}` : 'none',
      }}
    >
      {/* 场景内容 */}
    </AbsoluteFill>
  );
};
```

#### useThemeAnimation 返回值

| 属性 | 类型 | 说明 |
|------|------|------|
| `opacity` | number | 透明度动画值 0-1 |
| `scale` | number | 缩放动画值 |
| `translateY` | number | Y轴位移动画值 |
| `springConfig` | object | 弹簧动画配置 { damping, stiffness, mass } |
| `glow` | object | 光晕配置 { intensity, color } |
| `fadeDuration` | number | 淡入动画帧数 |
| `slideDuration` | number | 滑入动画帧数 |
| `hasSpecialEffect(effect)` | function | 检查是否有指定特殊效果 |

#### 其他主题动画 Hook

```tsx
// 脉冲动画（用于循环效果）
const pulse = useThemePulse(themeId);

// 光晕动画
const glow = useThemeGlow(themeId);
// 返回 { opacity, scale, color, blur }

// 快捷方式
const { opacity, scale } = useEntranceAnimation(themeId);
const pulse = useLoopAnimation(themeId);
const glow = useGlowAnimation(themeId);
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

// 主视频组件 - 【推荐】帧参数传递模式
// @remotion 【强制】useCurrentFrame() 只能在 Remotion Root 注册的组件内调用
// 在 Sequence 子组件内调用会报错："can only be called inside a component registered as a Composition"
// 解决方案：在顶层调用 useCurrentFrame()，通过 props 将 frame 传递给子组件

export const VerticalVideo: React.FC<{
  title: string;
  content: ContentItem[];
}> = ({ title, content }) => {
  // ✅ 在顶层调用 useCurrentFrame()
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: '#0F172A',
      }}
    >
      {/* 封面场景 */}
      <Scene config={SCENES[0]} frame={frame}>
        <CoverScene title={title} />
      </Scene>

      {/* 引言场景 */}
      <Scene config={SCENES[1]} frame={frame}>
        <IntroScene />
      </Scene>

      {/* 内容场景 */}
      {content.map((item, index) => (
        <Scene key={item.id} config={SCENES[2 + index]} frame={frame}>
          <ContentScene item={item} />
        </Scene>
      ))}

      {/* 结尾场景 */}
      <Scene config={SCENES[SCENES.length - 1]} frame={frame}>
        <OutroScene />
      </Scene>
    </AbsoluteFill>
  );
};

// 通用场景组件 - 【推荐】接收 frame 作为 props
const Scene: React.FC<{
  config: typeof SCENES[number];
  frame: number; // ✅ 通过 props 接收 frame
  children: React.ReactNode;
}> = ({ config, frame, children }) => {
  const { start, end } = config;

  // 可见性判断（使用传入的 frame）
  const isVisible = frame >= start && frame < end;
  if (!isVisible) return null;

  // 淡入效果（使用传入的 frame）
  const opacity = interpolate(frame, [start, start + 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
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

// ⚠️ premountFor: Remotion 4.x 兼容性需验证（建议通过 benchmark 测试确认）
<Sequence premountFor={1 * fps}>
  <Title />
</Sequence>

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

### 推荐：原生 Sequence + opacity 动画（无需额外依赖）

> **💡 推荐**：使用原生 `Sequence` 组件 + `interpolate` 透明度动画实现过渡效果，**无需安装额外包**。

```tsx
import { Sequence, AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

// ✅ 推荐：使用 opacity 动画实现淡入淡出
// 在场景 A 中添加淡出效果，在场景 B 中添加淡入效果

// 场景 A（带淡出）
const SceneA: React.FC<{ frame: number; startFrame: number }> = ({ frame, startFrame }) => {
  const opacity = interpolate(frame, [startFrame + 30, startFrame + 45], [1, 0], {
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ opacity }}>
      {/* 场景 A 内容 */}
    </AbsoluteFill>
  );
};

// 场景 B（带淡入）
const SceneB: React.FC<{ frame: number; startFrame: number }> = ({ frame, startFrame }) => {
  const opacity = interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ opacity }}>
      {/* 场景 B 内容 */}
    </AbsoluteFill>
  );
};

// 主视频中使用
<Sequence from={0} durationInFrames={60}>
  <SceneA frame={frame} startFrame={0} />
</Sequence>
<Sequence from={60} durationInFrames={60}>
  <SceneB frame={frame} startFrame={60} />
</Sequence>
```

### 可选：`@remotion/transitions` 额外包（需要安装）

> **⚠️ 注意**：如需更复杂的过渡效果，可安装 `@remotion/transitions` 包。基础过渡推荐使用上面的原生方法。

```bash
npx remotion add @remotion/transitions
```

#### 安装后的 TransitionSeries 用法

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

### 过渡类型（仅在使用 `@remotion/transitions` 时）

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

## 字体加载（新 API）

> **📖 参考**: [@remotion/fonts](https://remotion.dev/docs/fonts) - 官方字体加载 API

Remotion 提供官方 `@remotion/fonts` 包，推荐使用此方式加载字体：

```bash
npm install @remotion/fonts
```

```tsx
import { loadFont, FontInter } from '@remotion/fonts';

// 在 calculateMetadata 中加载
const { props } = await calculateMetadata({
  // ...
});

// 或在组件中通过 useEffect 调用
useEffect(() => {
  const loadFonts = async () => {
    await loadFont(FontInter);
  };
  loadFonts();
}, []);
```

**⚠️ 兼容性说明**：如果 `@remotion/fonts` 不可用，可回退到 `FontFace` API：

```tsx
// 回退方案（不推荐，仅在 @remotion/fonts 不可用时使用）
const loadFontFallback = async (fontName: string, fontUrl: string) => {
  try {
    const font = new FontFace(fontName, `url(${fontUrl})`);
    await font.load();
    document.fonts.add(font);
  } catch (e) {
    console.warn(`字体 ${fontName} 加载失败:`, e);
  }
};
```

**推荐字体**（macOS 系统字体，无需额外加载）：
- `PingFang SC` - macOS 默认中文字体
- `STHeiti Medium` - ❌ 不存在，**禁止使用**
- `Helvetica Neue` - 西文字体

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
> **⚠️ 音频禁用（旧方案，已废弃）**：
> M-series headless 环境 Remotion 渲染无音频 → 已废弃（2026-05-12）
> **当前方案**：Remotion `<Audio>` 组件内嵌 MP4，音频直接输出到最终 MP4（无需 ffmpeg 混流）。**请使用 `create-remotion-project.js` 生成项目，不要手动引用 Audio 组件。**

```tsx
import { Img, staticFile } from 'remotion';

// 图片
<Img src={staticFile('images/cover.webp')} />

// 视频
<Video src={staticFile('videos/clip.mp4')} />
```

> **Studio 预览例外**: Remotion Studio 环境与 headless 环境行为一致（Audio 组件内嵌音频），无需额外混流。

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

> **⚠️ 【重要】headless 环境音频处理已更新（2026-05-12）**：
> **当前方案**：Remotion `<Audio>` 组件直接内嵌音频到 MP4，无需 ffmpeg 外部注入。
> 组件由 `create-remotion-project.js` 自动生成，**请勿手动编辑 Audio 引用**。
>
> M-series Mac 等 headless 环境下，Remotion 渲染无音频（Audio 组件不工作）。音频通过 **ffmpeg 外部注入**（见 `scripts/launch.sh` 的 `cmd_all()` 函数）。
>
> Remotion Studio 预览环境可临时使用 `<Audio>`，但渲染前必须移除。

```tsx
// ✅ 正确：headless 环境不使用 Audio 组件
// ✅ 正确：Remotion Native — 音频通过 <Audio> 直接内嵌，字幕通过 CaptionOverlay 同期烧录
// <Audio src={staticFile('audio/neural_1_2x.m4a')} />
// <CaptionOverlay captionsFile="audio/captions.json" />
```

### 音量控制

> **Remotion Native**（2026-05-13 起）：音频通过 `<Audio>` 组件直接内嵌，字幕通过 `CaptionOverlay` 同期烧录。

```tsx
// ✅ 正确：Remotion Native — 音频通过 <Audio> 直接内嵌，字幕通过 CaptionOverlay 同期烧录
// import { Audio, staticFile } from 'remotion';
// <Audio src={staticFile('audio.mp3')} volume={0.8} />
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
   // ✅ 正确：使用传入的 frame 参数
   const Scene: React.FC<{ frame: number }> = ({ frame }) => {
     if (frame < start || frame >= end) return null;
     // 渲染内容...
   };
   ```

3. **图片优化**
   - 使用 WebP 格式（比 PNG/JPG 小 30-50%）
   - 单张图片不超过 500KB
   - 尺寸控制在 1080x1920 以内
   - 使用 `Video` 组件替代旧 `<Html5Video>` / `<OffthreadVideo>` 标签

4. **渲染配置优化**

   ```bash
   # 高配机器（8+ 核）：--concurrency=8
   npx remotion render VerticalVideo out/video.mp4 \
     --concurrency=8 \
     --crf=18 \
     --log=error

   # 低配机器：--concurrency=4
   npx remotion render VerticalVideo out/video.mp4 \
     --concurrency=4 \
     --crf=23

   # 快速预览：--quality=0
   npx remotion render VerticalVideo out/preview.mp4 \
     --concurrency=8 \
     --quality=0

   # 增量渲染（调试用）：--frames=0-300
   npx remotion render VerticalVideo out/debug.mp4 \
     --frames=0-300
   ```

5. **帧率选择**
   - 预览：15-30fps（`--fps=30`）
   - 最终输出：60fps（`--fps=60`）

6. **GPU 加速属性（慎用）**
   > 以下 CSS 属性会触发 GPU 加速，在无 GPU 云实例上会导致性能下降：
   - `filter: blur()` / `drop-shadow()`
   - `transform: perspective()`
   - `backdrop-filter`

7. **性能分析**
   ```bash
   # 测试最佳并发数
   npx remotion benchmark

   # 定位最慢帧
   npx remotion render VerticalVideo out/video.mp4 --log=verbose
   ```

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
   2. 减少并发数 (`--concurrency=4`)  
   3. 检查是否有未优化的图片/视频资源（单张应 < 500KB）
   4. 避免使用 GPU 加速 CSS 属性（`filter: blur()` 等）
   5. 使用 `npx remotion benchmark` 找到最佳并发数

### Q: 如何获取音频时长？

**A**: 使用 `calculateMetadata` 从 `remotion` 包导入，`@remotion/media-utils` 仅用于 `getVideoDuration` / `getVideoDimensions`：

```tsx
// ✅ 正确：calculateMetadata 是 Composition 的 prop，类型从 remotion 导入
import { CalculateMetadataFunction } from 'remotion';

// calculateMetadata 作为 <Composition> 的 prop 使用
// 注意：@remotion/media-utils 用于 getVideoDuration / getAudioDuration / getVideoDimensions
const calculateMetadata: CalculateMetadataFunction<Props> = async ({ props }) => {
  // ✅ 正确：@remotion/media-utils 提供 getVideoDuration / getVideoDimensions
  // ❌ 错误：calculateMetadata 不从 @remotion/media-utils 导入（不存在！）
  const { getVideoDuration } = await import('@remotion/media-utils');
  const durationInSeconds = await getVideoDuration(props.videoSrc);
  return {
    durationInFrames: Math.ceil(durationInSeconds * 60),
  };
};

### Q: `useCurrentFrame()` 在 Sequence 内调用报错？

**A**: 这是**强制要求**的错误。Remotion 规定 `useCurrentFrame()` 只能在 Root 注册的组件内调用。

**解决方案**：采用「传递帧参数」模式——在顶层调用 `useCurrentFrame()`，通过 props 将 frame 传递给子组件：

```tsx
// ✅ 正确：在顶层调用
const VerticalVideo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Sequence from={0} durationInFrames={300}>
      <Scene frame={frame} /> {/* 通过 props 传递 */}
    </Sequence>
  );
};

// ❌ 错误：在 Sequence 子组件内调用
const Scene: React.FC = () => {
  const frame = useCurrentFrame(); // 会报错！
  return <div>{frame}</div>;
};
```

### Q: 过渡效果影响总时长？

**A**: 是的。Transition 会重叠相邻场景，总时长 = 各场景时长之和 - 过渡时长。Overlay 不影响总时长。推荐使用原生 `Sequence` + `interpolate` opacity 动画替代 `@remotion/transitions` 包。

### Q: 字体加载失败怎么办？

**A**: 1. 优先使用 macOS 系统字体（`PingFang SC`），无需加载
   2. 如需加载，使用 `@remotion/fonts` 的 `loadFont()` API
   3. 禁止使用不存在的字体（如 `STHeiti Medium`）

### Q: 如何使用 Zod 进行类型验证？

**A**: 使用 `zod` 定义 props schema，提供编译时类型检查和运行时验证：

```tsx
import { z } from 'zod';
import { Composition } from 'remotion';

// ✅ 定义 props schema
const schema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  scenes: z.array(z.object({
    id: z.string(),
    icon: z.string(),
    text: z.string(),
    durationInFrames: z.number(),
  })),
});

// 推导 TypeScript 类型
type Props = z.infer<typeof schema>;

// ✅ 组件中使用类型
const VerticalVideo: React.FC<Props> = ({ title, subtitle, scenes }) => {
  // ...
};

// ✅ 在 Composition 中注册 schema
<Composition
  id="VerticalVideo"
  component={VerticalVideo}
  schema={schema}
  defaultProps={{
    title: '默认标题',
    subtitle: undefined,
    scenes: [],
  }}
/>
```

### Q: 如何处理图片/音频加载错误？

**A**: 使用 `onError` 回调和状态管理：

```tsx
import { useState } from 'react';

// 图片加载错误处理
const OptimizedImage: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div style={{ position: 'relative', ...style }}>
      {!loaded && !error && (
        <div style={{ 
          position: 'absolute', 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#1E293B' 
        }} />
      )}
      <Img
        src={src}
        style={{ 
          width: '100%', 
          height: '100%', 
          opacity: loaded ? 1 : 0,
          ...style 
        }}
        onLoad={() => setLoaded(true)}
        onError={() => {
          console.warn('图片加载失败:', src);
          setError(true);
        }}
      />
    </div>
  );
};

// 音频加载状态
const AudioWithState: React.FC<{ src: string }> = ({ src }) => {
  const [ready, setReady] = useState(false);

  return (
    <Audio
      src={src}
      onError={(e) => console.error('音频加载失败:', e)}
    />
  );
};
```

---

---

## 📝 完整示例：竖屏视频组件（v2.5.0 新版）

```tsx
// src/VerticalVideo.tsx
// ✅ 使用【帧参数传递模式】- 符合 v2.5.0 规范
import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  Audio,
  staticFile,
} from 'remotion';

// 常量定义
const FPS = 60;
const DURATION = 30; // 秒

// 场景配置
const SCENES = [
  { id: 'cover', start: 0, end: 180, duration: 3 },
  { id: 'content', start: 180, end: 1500, duration: 22 },
  { id: 'outro', start: 1500, end: 1800, duration: 5 },
];

// ✅ 子组件接收 frame 作为 props（不使用 useCurrentFrame）
// 封面场景
const CoverScene: React.FC<{ title: string; frame: number }> = ({ title, frame }) => {
  const { fps } = useVideoConfig();
  const { start } = SCENES[0];

  // 淡入 + 缩放入场
  const opacity = interpolate(frame, [start, start + 15], [0, 1], {
    extrapolateRight: 'clamp',
  });
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
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: 'center' }}>
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
            fontFamily: 'PingFang SC', // ✅ 使用系统字体
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
const ContentScene: React.FC<{ content: string; frame: number; image?: string }> = ({
  content,
  frame,
  image,
}) => {
  const { fps } = useVideoConfig();
  const { start } = SCENES[1];

  // 淡入 + 滑入
  const opacity = interpolate(frame, [start, start + 15], [0, 1], {
    extrapolateRight: 'clamp',
  });
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
          fontFamily: 'PingFang SC', // ✅ 使用系统字体
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
const OutroScene: React.FC<{ cta: string; frame: number }> = ({ cta, frame }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const { start } = SCENES[2];

  // 脉冲动画
  const pulse = spring({
    frame: frame - start,
    fps,
    config: { damping: 10 },
  });

  // 淡入
  const opacity = interpolate(frame, [start, start + 15], [0, 1], {
    extrapolateRight: 'clamp',
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
      <div style={{ opacity, color: '#22D3EE', fontSize: 100, fontWeight: 'bold', fontFamily: 'PingFang SC', transform: `scale(${pulse})` }}>
        {cta}
      </div>
    </AbsoluteFill>
  );
};

// ✅ 主组件 - 在顶层调用 useCurrentFrame()
export const VerticalVideo: React.FC<{
  title: string;
  content: string;
  cta: string;
  audioSrc?: string;
}> = ({ title, content, cta, audioSrc }) => {
  // ✅ 在顶层调用 useCurrentFrame()
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ width: 1080, height: 1920, backgroundColor: '#0F172A' }}>
      {/* ✅ 使用原生 Sequence + opacity 动画实现过渡（无需额外依赖） */}
      <Sequence from={0} durationInFrames={180}>
        <CoverScene title={title} frame={frame} /> {/* ✅ 传递 frame */}
      </Sequence>

      {/* 淡出动画在 CoverScene 内部实现 */}
      <Sequence from={165} durationInFrames={1335}>
        <ContentScene content={content} frame={frame} /> {/* ✅ 传递 frame */}
      </Sequence>

      {/* 淡出动画在 ContentScene 内部实现 */}
      <Sequence from={1485} durationInFrames={315}>
        <OutroScene cta={cta} frame={frame} /> {/* ✅ 传递 frame */}
      </Sequence>

      {/* ⚠️ headless 环境：音频通过 ffmpeg 外部注入，Remotion 不内嵌音频 */}
      {/* audioSrc prop 仅用于 Remotion Studio 预览环境 */}
      {/* {audioSrc && <Audio src={staticFile(audioSrc)} />} */}
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
