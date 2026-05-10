# Remotion Sequence 黑屏修复

> **类型**: 故障排除
> **版本**: v2.0.0
> **更新**: 2026-05-10
> **相关**: remotion.md · unified-rules.md

---

## ⚠️ 核心铁律（必须遵守，违反必黑屏）

> **在 Sequence 内部，禁止使用全局帧值（FRAMES.scene.start + X）。必须使用局部帧（从0开始）。**

---

## 问题描述

Remotion `<Sequence>` 组件内部使用 `useCurrentFrame()` 时，帧数从 0 开始（局部帧），而非全局帧。这导致使用全局帧值编写的动画无法正常触发，出现黑屏。

## 根因分析

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

---

## ✅ 正确方案：局部帧模式（强制）

### 步骤1：FRAMES定义场景的【局部帧范围】

```tsx
// 每个场景的局部帧范围（从0开始）
const SCENE_FRAMES = {
  cover:    { start: 0,   duration: 176  },  // 0-175
  pain:     { start: 0,   duration: 352  },  // 0-351（注意不是176！）
  monetize: { start: 0,   duration: 470  },  // 0-469
  // ...
};
```

### 步骤2：Sequence传入from参数

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
      // ...
    </AbsoluteFill>
  );
};
```

### 步骤3：场景组件使用局部帧（从0开始）

```tsx
const PainScene: React.FC = () => {
  const frame = useCurrentFrame(); // 0-351（不是176-527！）

  // ✅ 正确：使用局部帧
  const fadeIn = interpolate(frame, [0, 40], [0, 1]);
  const slideIn = interpolate(frame, [50, 120], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* 动画基于局部帧，正常触发 */}
      <div style={{ opacity: fadeIn }}>内容</div>
    </AbsoluteFill>
  );
};
```

---

## ❌ 错误示例（必黑屏）

```tsx
// 错误1：Sequence内使用全局帧
<Sequence from={176} durationInFrames={352}>
  <PainScene />
</Sequence>

// PainScene中：
const { start } = FRAMES.pain; // start = 176
const fadeIn = interpolate(frame, [start, start + 40], ...); // interpolate(0-351, [176, 216])
// ❌ frame永远到不了176！

// 错误2：混用局部帧和全局帧
const fadeIn = interpolate(frame, [FRAMES.pain.start, FRAMES.pain.start + 40], ...);
// ❌ 同上，frame是局部帧(0-351)，FRAMES.pain.start=176，永远不触发
```

---

## 帧数计算验证

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

---

## 验证方法

渲染后检查：
```bash
# 检查场景帧数
ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of default=noprint_wrappers=1 video.mp4

# 播放检查黑屏
mpv video.mp4 --start=2 --end=5  # 检查pain场景(176帧=2.9秒)
```

黑屏 = Sequence帧计算错误。动画不触发 = 局部帧vs全局帧混淆。

---

## 关键教训

> `useCurrentFrame()` 在 Sequence 内部返回**局部帧（0-N）**，在 Sequence 外部返回**全局帧**。
>
> **铁律**：
> 1. Sequence 的 `from` + `durationInFrames` 决定全局位置
> 2. 场景组件内部必须使用**局部帧（从0开始）**
> 3. FRAMES只用于定义Sequence的from/duration，不用于组件内部动画计算
