# 赛博朋克视频视觉组件库（2026-05-10 验证）

> AiToEarn 视频项目深度重构实践：每帧内容丰富化。

## 核心组件

### Particles（粒子系统）
动态漂浮粒子，30-70个，不同颜色和速度
```tsx
const Particles: React.FC<{ count?: number; color: string; speed?: number }> = ({ count = 40, color, speed = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const x = ((seed * 7.3) % 1) * 1080;
        const y = ((seed * 11.7 + frame * speed * 0.5) % 1) * 1920;
        // ... 动态位置、透明度
      })}
    </>
  );
};
```

### DataStream（数据流背景）
矩阵数字雨，cols=20列，随帧滚动
```tsx
const DataStream: React.FC = () => {
  const frame = useCurrentFrame();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  // 20列，每列显示随机字符，frame控制偏移
};
```

### CyberGrid（网格背景）
双层网格叠加，不同颜色和移动速度
```tsx
const CyberGrid: React.FC<{ color?: string; speed?: number }> = ({ color = 'rgba(0,255,255,0.08)', speed = 0.3 }) => {
  // backgroundSize: '60px 60px'
  // backgroundPosition随frame移动
};
```

### ScanLine（扫描线）
从上到下循环移动的光线
```tsx
const ScanLine: React.FC<{ start: number }> = ({ start }) => {
  const progress = (frame - start) % 180;
  const y = (progress / 180) * 1920;
  // linear-gradient 水平渐变
};
```

### HUDCorner（HUD角落装饰）
四角科技框，4种位置，指定颜色
```tsx
const HUDCorner: React.FC<{ position: 'tl'|'tr'|'bl'|'br'; color: string }> = ({ position, color }) => {
  // 40x40像素的L形边框
};
```

### PulseRing（脉冲光环）
扩散消失的圆环动画
```tsx
const PulseRing: React.FC<{ size: number; color: string; delay?: number; start: number }> = ({ size, color, delay = 0, start }) => {
  // size随frame扩大，opacity从0→0.8→0
};
```

### GlitchText（故障文字）
红/青偏移的故障效果
```tsx
const GlitchText: React.FC<{ children: string; style?: React.CSSProperties }> = ({ children, style }) => {
  const glitch = Math.sin(frame * 0.3) > 0.8;
  // 偏移层 + clipPath裁切
};
```

### TerminalText（终端打字机）
逐字显示 + 光标闪烁
```tsx
const TerminalText: React.FC<{ children: string; color?: string }> = ({ children, color = '#00FF88' }) => {
  const visibleChars = Math.min(children.length, Math.floor(frame / 3));
  const cursorBlink = Math.floor(frame / 15) % 2 === 0;
  // Menlo monospace字体
};
```

### NeonCard（霓虹卡片）
发光边框 + 缩放入场动画
```tsx
const NeonCard: React.FC<{ children: React.ReactNode; color: string; delay?: number; start: number }> = ({ children, color, delay = 0, start }) => {
  // opacity + scale动画
  // boxShadow发光 + backdropFilter blur
};
```

## 配色方案

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

## 场景组合模式

每个场景的绝对定位布局：
```tsx
<AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
  <CyberGrid color={COLORS.gridCyan} speed={0.2} />
  <CyberGrid color={COLORS.gridMagenta} speed={0.15} />
  <DataStream />
  <Particles count={50} color={COLORS.neonCyan} speed={0.8} />
  <ScanLine start={start} />
  <HUDCorner position="tl" color={COLORS.neonCyan} />
  {/* 内容层 */}
</AbsoluteFill>
```

## 性能考虑

- 粒子数量控制在30-70
- 使用CSS transform而非filter实现动画
- 避免在渲染时创建新对象
