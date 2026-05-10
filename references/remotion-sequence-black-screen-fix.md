# Remotion Sequence 黑屏 + React #130 修复笔记

> 来源：aitoearn-video 项目调试，2026-05-10
> 关联：video-creator / rules/TROUBLESHOOTING.md

---

## 核心问题：Sequence 内场景动画不推进 → 黑屏

### 症状
- 视频渲染成功，但场景全部黑屏或内容不显示
- React #130 "component returned undefined" 错误

### 根因分析

**旧模式（有问题）**：
```tsx
// 主组件获取全局 frame，通过 props 传给场景
export const Video: React.FC = () => {
  const frame = useCurrentFrame(); // 全局帧：0, 1, 2, 3...
  return (
    <Sequence from={0} durationInFrames={180}>
      <Scene1 frame={frame} /> {/* ❌ 传入后变成静态值，永远是 0 */}
    </Sequence>
    <Sequence from={180} durationInFrames={360}>
      <Scene2 frame={frame} /> {/* ❌ 永远是 180 */}
    </Sequence>
  );
};

const Scene1: React.FC<{ frame: number }> = ({ frame }) => {
  // frame = 0（固定），opacity = interpolate(0, [0,30], [0,1]) = 0 → 完全透明
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  return <div style={{ opacity }}>内容</div>; // 永远看不见
};
```

**为什么传 props 会导致帧号固定？**
- `frame` 作为 prop 传入后，在 `interpolate(frame, ...)` 中使用的是传入时的值
- 但实际上，由于 React 的渲染机制，props 每次渲染时是同一个值（静态）
- `interpolate(0, [0, 30], [0,1])` 永远返回 0（起点值）

### 正确模式（✅ 已验证）

**核心原则**：每个场景组件**内部调用 `useCurrentFrame()`**，不接收 frame prop。Remotion 的 Sequence 会自动补偿帧偏移。

```tsx
// ✅ src/Root.tsx — 定义 Composition
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Video"
      component={Video}
      durationInFrames={3540}
      fps={60}
      width={1080}
      height={1920}
    />
  );
};

// ✅ src/index.ts — 注册根组件
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';
registerRoot(RemotionRoot);

// ✅ src/Video.tsx — 只组合 Sequence，不传 frame
export const Video: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={180}>
        <CoverScene />      {/* ✅ 内部调用 useCurrentFrame() */}
      </Sequence>
      <Sequence from={180} durationInFrames={360}>
        <PainScene />       {/* ✅ 内部调用 useCurrentFrame() */}
      </Sequence>
      <Sequence from={540} durationInFrames={480}>
        <MonetizeScene />
      </Sequence>
      {/* ... */}
    </AbsoluteFill>
  );
};

// ✅ 场景组件：内部调用 useCurrentFrame()
const CoverScene: React.FC = () => {
  const frame = useCurrentFrame(); // ✅ Sequence 自动补偿 = 0-179
  const opacity = interpolate(frame, [0, 15], [0, 1]); // ✅ 正常渐入
  const scale = spring({ frame, fps: 60, config: { damping: 15 } }); // ✅ 正常缩放
  return (
    <AbsoluteFill style={{ backgroundColor: '#0D0D1A' }}>
      <div style={{ opacity, transform: `scale(${scale})` }}>内容</div>
    </AbsoluteFill>
  );
};
```

---

## React #130 错误修复

### 症状
```
Minified React error #130; ... component returned undefined
```

### 原因
`return null` 在某些组件位置会触发 React #130。

### 修复方法
将 `return null` 改为返回 opacity=0 的元素：

```tsx
// ❌ 问题代码
const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const current = findSubtitle(frame);
  if (!current) return null; // ← 触发 React #130
  return <div>{current.text}</div>;
};

// ✅ 修复：始终返回元素
const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const fps = 60;

  const currentSub = SUBTITLES.find(
    (sub) => frame >= sub.start * fps && frame < sub.end * fps
  );

  const opacity = currentSub
    ? Math.min(
        interpolate(frame, [currentSub.start * fps, currentSub.start * fps + 10], [0, 1]),
        interpolate(frame, [currentSub.end * fps - 15, currentSub.end * fps], [1, 0])
      )
    : 0;

  return (
    <div style={{ position: 'absolute', bottom: 180, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity }}>
      <div style={{ backgroundColor: 'rgba(0,0,0,0.8)', padding: '15px 40px', borderRadius: 8 }}>
        <span style={{ fontFamily: 'PingFang SC', fontSize: 36, color: '#FFFFFF' }}>
          {currentSub ? currentSub.text : ''}
        </span>
      </div>
    </div>
  );
};
```

---

## 黑屏排查清单

1. ✅ 场景组件是否**内部调用** `useCurrentFrame()`（不通过 props 接收 frame）
2. ✅ Sequence 的 `durationInFrames` 是否足够覆盖场景动画
3. ✅ 首帧 opacity 是否为 0（渐入动画可能导致帧 0 完全透明）
4. ✅ 场景根部是否有不透明背景层 `style={{ backgroundColor: '#0D0D1A' }}`
5. ✅ 是否有 `return null` 触发 React #130

---

## 字幕组件共享模式

每个场景都需要字幕叠加，最佳实践是**每个场景内部嵌入字幕组件**（而非共享一个全局字幕组件）：

```tsx
const CoverScene: React.FC = () => {
  const frame = useCurrentFrame();
  // ...动画逻辑...

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* 场景内容 */}
      <div>内容...</div>
      {/* 字幕（场景内部） */}
      <Subtitles />
    </AbsoluteFill>
  );
};
```

这样可以避免全局字幕组件因 frame 时区不同步导致字幕与场景错位。

---

## 封面标题字体自动缩放

封面主标题经常超出画面宽度，需在 PIL 生成时自动检测并缩放：

```python
def create_cover(output_path, size, title_size):
    w, h = size
    img = Image.new('RGB', size, color='#0D0D1A')
    draw = ImageDraw.Draw(img)
    font_title = ImageFont.truetype(FONT_PATH, title_size)

    title_text = 'AI创作者赚钱神器'
    title_bbox = draw.textbbox((0, 0), title_text, font=font_title)
    title_width = title_bbox[2] - title_bbox[0]

    # 如果标题超出90%宽度，自动缩小
    max_width = int(w * 0.90)
    if title_width > max_width:
        scale = max_width / title_width
        new_size = int(title_size * scale * 0.9)
        font_title = ImageFont.truetype(FONT_PATH, new_size)
        print(f"  标题过宽({title_width}px>{max_width}px)，缩放至 {new_size}px")

    # ... 继续绘制 ...
```

**安全字号表（竖屏 1080×1920）**：
| 位置 | 原始尝试 | 安全字号 |
|------|---------|---------|
| 主标题（四字+特效） | 180px | ≤140px |
| 副标题 | 52px | ≤48px |
| 平台标签 | 30px | ≤28px |
