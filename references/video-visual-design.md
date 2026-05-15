# 视频视觉设计与场景增强

> **最后更新**：2026-05-15
> **配套文档**：`remotion-rendering-issues.md`（渲染问题）、`scene-visual-upgrade-pattern.md`（seomachine 实战）

---

## 目录

1. [居中布局（强制要求）](#1-居中布局强制要求)
2. [通用增强模式](#2-通用增强模式)
3. [场景增强清单](#3-场景增强清单)
4. [6场景增强参考](#4-6场景增强参考)

---

## 1. 居中布局（强制要求）

> **⚠️ 核心教训（seomachine-video 2026-05-15）**：`paddingTop: "18%"` 等百分比偏移会导致内容偏靠上方，下方出现黑屏。**禁止使用 paddingTop/paddingBottom 固定偏移做垂直居中**。

### 正确模式

```tsx
// ✅ 正确：flexbox 居中，无 paddingTop
<AbsoluteFill>
  <div style={{
    position: "absolute",
    inset: 0,                    // 覆盖整个画面
    display: "flex",
    flexDirection: "column",
    alignItems: "center",         // 水平居中
    justifyContent: "center",     // 垂直居中（关键！）
  }}>
    {/* 内容 */}
  </div>
</AbsoluteFill>

// ❌ 错误：paddingTop 固定偏移，内容偏上，下方黑屏
<div style={{
  position: "absolute",
  top: 0, left: 0, right: 0,
  paddingTop: "18%",              // ← 内容只到垂直方向约18%位置
  alignItems: "center",
}}>
```

### 验证方法

渲染后用 `ffprobe` 检查每帧：内容不应只在画面上半部分。

---

## 2. 通用增强模式

每场景按需叠加以下视觉层，从背景到前景排序：

```
背景层（最底层）
  ├── 渐变光斑（radial-gradient，绝对定位）
  ├── 网格线（background-image: linear-gradient，60px刻度）
  └── 粒子光点（30-50个，随机位置，opacity动画）

内容层（中间层）
  ├── 入场动画（opacity 0→1 + translateY）
  ├── 霓虹边框（box-shadow多层：10px/20px/40px递进）
  ├── 顶部高光条（gradient，左→右）
  └── 脉冲光效（box-shadow intensity 随帧周期变化）

装饰层（最顶层）
  ├── 四角HUD装饰（可选）
  └── 扫描线（可选）
```

### 背景网格线

```tsx
const gridStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: [
    "linear-gradient(rgba(0,255,255,0.05) 1px, transparent 1px)",
    "linear-gradient(90deg, rgba(0,255,255,0.05) 1px, transparent 1px)",
  ],
  backgroundSize: "60px 60px",
};
```

### 霓虹发光边框

```tsx
const neonCard: React.CSSProperties = {
  border: "1px solid rgba(0,255,255,0.3)",
  borderRadius: 12,
  boxShadow: [
    "0 0 10px rgba(0,255,255,0.3)",
    "0 0 20px rgba(0,255,255,0.2)",
    "0 0 40px rgba(0,255,255,0.1)",
    "inset 0 0 20px rgba(0,255,255,0.05)",
  ].join(", "),
};
```

### 脉冲光效

```tsx
const pulseGlow = (frame: number, period: number = 60) => {
  const t = (frame % period) / period;
  const intensity = Math.sin(t * Math.PI * 2) * 0.5 + 0.5; // 0-1
  return `rgba(0,255,255,${0.1 + intensity * 0.2})`;
};
```

---

## 3. 场景增强清单

### Scene1_Cover（封面）

- 动态粒子背景（30-50个漂浮光点）
- 径向渐变遮罩（中心亮→边缘暗）
- 标题缩放入场（scale 0.6→1 + opacity）
- 扫描线从上到下循环
- **居中：使用 justifyContent: "center"（不是 paddingTop）**

### Scene2_Intro（痛点/问题）

- 痛点卡片加霓虹光晕（box-shadow多层递进）
- 左边缘渐变光条（4px，左→右）
- 左上/右下霓虹圆装饰（radial-gradient）
- 卡片入场：opacity + translateY + 延迟错开
- **居中：justifyContent: "center" + alignItems: "center"**

### Scene3_Feature1（命令卡片）

- 背景网格线（60px刻度，rgba弱化）
- 右侧大尺寸光斑（radial-gradient，400px）
- 命令行霓虹色文字（#00FFFF / #FF00FF / #FFFF00）
- 卡片box-shadow：3层递进发光（20px/40px）
- 顶部高光条（gradient，命令色）
- **居中：justifyContent: "center"**

### Scene4_Feature2（代理网格）

- 顶部脉冲光条（3px height，随帧opacity变化）
- 代理卡片box-shadow：根据代理颜色设置glow
- 背景光斑动画（radial-gradient，随帧移动）
- 3列网格布局（gap: 18px）
- **居中：justifyContent: "center"**

### Scene5_Feature3（数据源）

- 数据源圆形图标（150px，radial-gradient + border + ringPulse）
- 左侧连接线装饰（gradient，左→右消失）
- SEO评分框（霓虹边框 + inset shadow）
- 圆形图标内圈虚线（border: dashed）
- **居中：justifyContent: "center"**

### Scene6_Ending（结尾）

- Glitch标题效果（红/青叠层 + clipPath裁切）
- 终端窗口（macOS红绿灯按钮 + SF Mono字体）
- 打字机特效（逐字显示 + 光标闪烁）
- 粒子爆发背景（30个，随机颜色）
- 背景霓虹渐变（双radial-gradient）
- **居中：justifyContent: "center"**

---

## 4. 6场景增强参考

### 配色方案

```ts
const COLORS = {
  bg: '#0A0A14',        // 深色背景
  bg2: '#0D0D1A',
  text: '#FFFFFF',
  neonCyan: '#00FFFF',
  neonMagenta: '#FF00FF',
  neonPurple: '#9D00FF',
  neonGreen: '#00FF88',
  yellow: '#FFFF00',
  orange: '#FF6600',
  muted: '#556677',
  gridCyan: 'rgba(0,255,255,0.08)',
  gridMagenta: 'rgba(255,0,255,0.08)',
};
```

### Particles（粒子系统）

```tsx
const Particles: React.FC<{ count?: number; color: string; speed?: number }> = ({ count = 40, color, speed = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const seed = i + 1;
        const x = ((seed * 7.3) % 1) * 1080;
        const y = ((seed * 11.7 + frame * speed * 0.5) % 1) * 1920;
        const opacity = ((Math.sin(frame * 0.02 + seed) + 1) / 2) * 0.6 + 0.2;
        return (
          <div key={i} style={{
            position: "absolute",
            left: x, top: y,
            width: 3, height: 3,
            borderRadius: "50%",
            backgroundColor: color,
            opacity,
          }} />
        );
      })}
    </>
  );
};
```

### GlitchText（故障文字）

```tsx
const GlitchText: React.FC<{ children: string; style?: React.CSSProperties }> = ({ children, style }) => {
  const frame = useCurrentFrame();
  const glitch = Math.sin(frame * 0.3) > 0.8;
  return (
    <div style={{ position: "relative" }}>
      {glitch && (
        <>
          <span style={{ position: "absolute", left: 2, color: "#FF00FF", ...style }}>{children}</span>
          <span style={{ position: "absolute", left: -2, color: "#00FFFF", ...style }}>{children}</span>
        </>
      )}
      <span style={style}>{children}</span>
    </div>
  );
};
```

### TerminalText（终端打字机）

```tsx
const TerminalText: React.FC<{ children: string; color?: string }> = ({ children, color = '#00FF88' }) => {
  const frame = useCurrentFrame();
  const visibleChars = Math.min(children.length, Math.floor(frame / 3));
  const cursorBlink = Math.floor(frame / 15) % 2 === 0;
  return (
    <div style={{ fontFamily: "Menlo, monospace", color }}>
      <span>{children.substring(0, visibleChars)}</span>
      {cursorBlink && <span style={{ opacity: 1 }}>|</span>}
    </div>
  );
};
```

### HUDCorner（HUD角落装饰）

```tsx
const HUDCorner: React.FC<{ position: 'tl'|'tr'|'bl'|'br'; color: string }> = ({ position, color }) => {
  const size = 40;
  const thickness = 2;
  const styles: Record<string, React.CSSProperties> = {
    tl: { top: 20, left: 20, borderTop: `${thickness}px solid ${color}`, borderLeft: `${thickness}px solid ${color}` },
    tr: { top: 20, right: 20, borderTop: `${thickness}px solid ${color}`, borderRight: `${thickness}px solid ${color}` },
    bl: { bottom: 20, left: 20, borderBottom: `${thickness}px solid ${color}`, borderLeft: `${thickness}px solid ${color}` },
    br: { bottom: 20, right: 20, borderBottom: `${thickness}px solid ${color}`, borderRight: `${thickness}px solid ${color}` },
  };
  return <div style={{ position: "absolute", width: size, height: size, ...styles[position] }} />;
};
```

### 渲染命令

```bash
cd video-project
npx remotion render VerticalVideo out/final.mp4 --fps=60 --concurrency=4
```

### 渲染后验证

```bash
# 文件大小：增强后应比原来大（更多视觉元素）
ls -la out/final.mp4

# 时长不变（纯视觉增强，不改音频/字幕）
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 out/final.mp4

# ⚠️ 末段字幕 endMs 同步检查
VIDEO_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 out/final.mp4)
LAST_ENDMS=$(python3 -c "import json; c=json.load(open('audio/captions.json')); print(c[-1]['endMs'])")
EXPECTED=$(python3 -c "print(int(round($VIDEO_DUR * 1000)))")
if [ "$LAST_ENDMS" != "$EXPECTED" ]; then
  echo "❌ 末段字幕未同步: endMs=$LAST_ENDMS, 应为 $EXPECTED"
fi
```
