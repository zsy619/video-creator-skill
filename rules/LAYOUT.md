---
name: video-creator-layout
description: Video Creator 技能的居中布局规范，确保所有视频场景的每个元素都完美居中。
parent: SKILL.md
related_skills:
  - REMOTION.md
  - THEMES.md
  - THEME_ANIMATIONS.md
version: 1.0.0
last_updated: 2026-04-27
---

# 🎯 视频居中布局规范 (Centered Layout Spec)

> **所属模块**: video-creator / SKILL.md → 视觉布局
> **版本**: v1.0.0
> **强制级别**: ⭐⭐⭐（最高优先级）

---

## 核心原则

**每个场景的每个元素，都必须上下左右居中。**

竖屏视频（1080×1920）没有足够空间容错，居中是唯一正确的选择。

---

## 1. 根组件结构

```tsx
// ✅ 正确：主组件用 div + explicit 宽高
export const VerticalVideo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{
      width: 1080,
      height: 1920,
      position: 'relative',
      backgroundColor: '#0F172A',
      overflow: 'hidden',
    }}>
      <Sequence from={0} durationInFrames={240}>
        <CoverScene frame={frame} />
      </Sequence>
      {/* ... */}
      {/* ⚠️ headless 环境：音频通过 ffmpeg 外部注入，Remotion 不内嵌音频 */}
      {/* <Audio src={staticFile('audio/neural_1_2x.m4a')} /> */}
    </div>
  );
};

// ❌ 错误：AbsoluteFill 可能无法正确约束尺寸
// （在某些 Remotion 版本中会导致帧尺寸变成 1195×1920）
<AbsoluteFill style={{ width: 1080, height: 1920 }}>
```

---

## 2. 场景内容居中（核心模式）

```tsx
// ✅ 所有场景的统一居中结构
const SceneComponent: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0F172A' }}>
      {/* 背景装饰层（可选） */}
      <GlowOrb x={540} y={300} r={400} color="#2563EB40" blur={80} op={0.5} />
      <GridBg />
      <TopBar />
      <BottomBar />

      {/* ✅ 内容层：inset:0 + flex 居中 */}
      <div style={{
        position: 'absolute',
        inset: 0,                    // = top:0, right:0, bottom:0, left:0
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',     // 垂直居中
        alignItems: 'center',         // 水平居中
        padding: '0 60px',            // ✅ 左右对称！禁止 '80px 50px 40px'
      }}>
        {/* 标题 */}
        <div style={{
          fontSize: 44,
          fontWeight: 800,
          color: '#2563EB',
          fontFamily: 'PingFang SC, sans-serif',
          textAlign: 'center',         // ✅ 文字水平居中
          textShadow: '0 0 30px #2563EB88',
        }}>
          RIA-TV++ 六阶段流水线
        </div>

        {/* 列表/网格：加 maxWidth 控制宽度 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          width: '100%',
          maxWidth: 800,               // ✅ 限制最大宽度，超宽内容居中
        }}>
          {/* 每项内容水平居中 */}
          {steps.map((step, i) => (
            <div style={{
              display: 'flex',
              alignItems: 'center',    // ✅ 列表项垂直居中
              gap: 16,
              textAlign: 'center',      // ✅ 文字水平居中
            }}>
              <div>{step.num}</div>
              <div style={{ flex: 1 }}>{step.title}</div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

---

## 3. 禁止的写法

| 错误写法 | 问题 | 正确写法 |
|---------|------|---------|
| `padding: '80px 50px 40px'` | 上下不对称，内容偏上 | `padding: '0 60px'` |
| `alignItems: 'flex-start'` | 内容偏左 | `alignItems: 'center'` |
| `position: 'absolute', top: 100` | 内容偏上 | `inset: 0` + `justifyContent: 'center'` |
| `textAlign: 'left'` | 文字偏左 | `textAlign: 'center'` |
| `left: 0, right: 0` + 无居中 | 横向不居中 | `display: flex` + `alignItems: center` |
| `AbsoluteFill style={{ width: 1080 }}` | Remotion 尺寸失效 | `<div style={{ width: 1080 }}>` |

---

## 4. 共享居中装饰组件

```tsx
// 顶部渐变条
const TopBar = () => (
  <div style={{
    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
    background: 'linear-gradient(90deg, #7C3AED, #2563EB, #06B6D4)',
    boxShadow: '0 0 16px #2563EB88',
  }} />
);

// 底部渐变条
const BottomBar = () => (
  <div style={{
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
    background: 'linear-gradient(90deg, #2563EB, #06B6D4, #7C3AED)',
    boxShadow: '0 0 12px #2563EB66',
  }} />
);

// 场景标签（居中于顶部）
const SceneBadge: React.FC<{ label: string; color: string; frame: number; start: number }> =
  ({ label, color, frame, start }) => {
    const op = interpolate(frame, [start, start + 20], [0, 1], { extrapolateRight: 'clamp' });
    return (
      <div style={{
        position: 'absolute', top: 28, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', // ✅ 水平居中
        opacity: op,
      }}>
        <div style={{
          padding: '4px 22px', borderRadius: 20,
          backgroundColor: color + '22', border: `1px solid ${color}60`,
          fontSize: 17, color, fontFamily: 'PingFang SC, sans-serif',
          fontWeight: 600, letterSpacing: 3,
          boxShadow: `0 0 12px ${color}33`,
        }}>
          {label}
        </div>
      </div>
    );
  };
```

---

## 5. 典型场景布局模式

### 5.1 标题 + 内容列表（流水线场景）

```
┌─────────────────────────────┐
│         [TopBar]            │
├─────────────────────────────┤
│                             │
│      [SceneBadge]           │ ← justifyContent: center
│                             │
│   RIA-TV++ 六阶段流水线     │ ← textAlign: center
│                             │
│   ┌─────────────────────┐   │
│   │ ① 整书理解          │   │ ← maxWidth: 800, 居中
│   ├─────────────────────┤   │
│   │ ② 并行提取          │   │
│   ├─────────────────────┤   │
│   │ ③ 三重验证筛选      │   │
│   └─────────────────────┘   │
│                             │
├─────────────────────────────┤
│        [BottomBar]          │
└─────────────────────────────┘
```

### 5.2 网格卡片（Skill 场景）

```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',   // ✅ 两列等宽
  gap: 14,
  width: '100%',
  maxWidth: 880,                    // ✅ 限制最大宽度
}}>
  {skills.map(skill => (
    <div style={{
      display: 'flex',              // ✅ 卡片内容居中
      flexDirection: 'column',
      alignItems: 'center',         // ✅ 水平居中
      textAlign: 'center',          // ✅ 文字居中
      borderRadius: 14,
      padding: '18px 20px',
    }}>
      <span style={{ fontSize: 30 }}>{skill.icon}</span>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{skill.name}</div>
    </div>
  ))}
</div>
```

### 5.3 三列卡片（生态场景）

```tsx
<div style={{
  display: 'flex',
  gap: 24,
  justifyContent: 'center',        // ✅ 三列横向居中
}}>
  {items.map(item => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',         // ✅ 每列内容居中
      minWidth: 150,
    }}>
      <div style={{ fontSize: 56 }}>{item.icon}</div>
      <div style={{ textAlign: 'center' }}>{item.name}</div>
    </div>
  ))}
</div>
```

---

## 6. 布局自检清单

完成每个场景后，检查：

- [ ] 背景是否从画面顶部到底部覆盖完整？
- [ ] 内容容器是否使用 `inset: 0` 覆盖整个场景？
- [ ] 容器是否使用 `display: flex` + `justifyContent: center` + `alignItems: center`？
- [ ] 文字元素是否有 `textAlign: center`？
- [ ] 网格/列表是否有 `maxWidth` 控制宽度？
- [ ] padding 是否左右对称（`padding: '0 Xpx'` 而非 `'Tpx Rpx Bpx Lpx'`）？
- [ ] 容器是否加了 `overflow: hidden` 防止装饰元素溢出？
- [ ] Remotion 渲染后 ffprobe 验证尺寸是否为 1080×1920？

---

**相关模块**:
- [SKILL.md](SKILL.md) - 技能主文档
- [REMOTION.md](REMOTION.md) - Remotion 组件规范
- [THEMES.md](THEMES.md) - 主题系统
- [THEME_ANIMATIONS.md](THEME_ANIMATIONS.md) - 主题动画
