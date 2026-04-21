# 主题动画预设 (Theme Animation Presets)

> 所属模块：video-creator / SKILL.md → 视觉设计
> 版本：1.0.0
> 最后更新：2026-04-21

---

## 概述

每个主题除了颜色和字体外，还有独特的「动画性格」：
- **科技类主题**：快速、锐利、有力量感
- **自然类主题**：柔和、平滑、放松感
- **创意类主题**：弹性、有趣、打破常规
- **专业类主题**：克制、干净、稳重

本配置文件定义每个主题的动画参数，用于在 Remotion 组件中实现主题适配的动画效果。

---

## 动画参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `spring.damping` | number | 弹簧阻尼（越小越弹跳，越大越平滑） |
| `spring.stiffness` | number | 弹簧刚度（越大越快） |
| `spring.mass` | number | 弹簧质量（越大越重） |
| `fade.duration` | number | 淡入淡出帧数 @ 60fps |
| `slide.duration` | number | 滑入动画帧数 |
| `scale.from` | number | 初始缩放值 |
| `scale.to` | number | 最终缩放值 |
| `glow.intensity` | number | 光晕强度 0-1 |
| `glow.color` | string | 光晕颜色（使用主题主色） |
| `particle.speed` | number | 粒子速度 0-1 |
| `particle.count` | number | 粒子数量倍率 |
| `special` | string[] | 特殊效果列表 |

---

## 科技类主题动画

### 1. tech-modern（科技现代风）
```yaml
spring:
  damping: 12
  stiffness: 180
  mass: 1
fade:
  duration: 12
slide:
  duration: 20
scale:
  from: 0.85
  to: 1
glow:
  intensity: 0.6
  color: "#2563EB"
particle:
  speed: 0.8
  count: 1
special: []
```

### 2. cyberpunk（赛博朋克风）
```yaml
spring:
  damping: 8
  stiffness: 220
  mass: 0.8
fade:
  duration: 10
slide:
  duration: 15
scale:
  from: 0.8
  to: 1
glow:
  intensity: 0.9
  color: "#00FFFF"
particle:
  speed: 1.2
  count: 1.3
special:
  - glitch
  - neon-flicker
```

### 3. neon-future（霓虹未来风）
```yaml
spring:
  damping: 10
  stiffness: 200
  mass: 0.9
fade:
  duration: 12
slide:
  duration: 18
scale:
  from: 0.82
  to: 1
glow:
  intensity: 0.85
  color: "#00FF88"
particle:
  speed: 1.0
  count: 1.2
special:
  - pulse
  - neon-glow
```

### 4. minimal-tech（极简科技风）
```yaml
spring:
  damping: 30
  stiffness: 80
  mass: 1.2
fade:
  duration: 18
slide:
  duration: 25
scale:
  from: 0.92
  to: 1
glow:
  intensity: 0.1
  color: "#F8FAFC"
particle:
  speed: 0.4
  count: 0.5
special: []
```

### 5. particle-tech（粒子科技风）
```yaml
spring:
  damping: 14
  stiffness: 160
  mass: 1
fade:
  duration: 14
slide:
  duration: 22
scale:
  from: 0.88
  to: 1
glow:
  intensity: 0.5
  color: "#00FFCC"
particle:
  speed: 1.0
  count: 1.5
special:
  - particle-flow
  - data-stream
```

---

## 创意设计类主题动画

### 6. gradient-wave（渐变波纹风）
```yaml
spring:
  damping: 10
  stiffness: 200
  mass: 0.85
fade:
  duration: 15
slide:
  duration: 20
scale:
  from: 0.75
  to: 1
glow:
  intensity: 0.5
  color: "#8B5CF6"
particle:
  speed: 0.9
  count: 1
special:
  - gradient-shift
  - wave-motion
```

### 7. glass-morphism（玻璃拟态风）
```yaml
spring:
  damping: 18
  stiffness: 140
  mass: 1
fade:
  duration: 20
slide:
  duration: 28
scale:
  from: 0.9
  to: 1
glow:
  intensity: 0.3
  color: "rgba(255,255,255,0.5)"
particle:
  speed: 0.5
  count: 0.7
special:
  - glass-blur
  - light-refraction
```

### 8. holographic（全息投影风）
```yaml
spring:
  damping: 10
  stiffness: 190
  mass: 0.8
fade:
  duration: 12
slide:
  duration: 18
scale:
  from: 0.8
  to: 1
glow:
  intensity: 0.8
  color: "#00FFCC"
particle:
  speed: 1.1
  count: 1.2
special:
  - hologram-shift
  - rainbow-glint
```

### 9. data-stream（数据流风）
```yaml
spring:
  damping: 12
  stiffness: 170
  mass: 0.9
fade:
  duration: 10
slide:
  duration: 16
scale:
  from: 0.85
  to: 1
glow:
  intensity: 0.7
  color: "#00FF00"
particle:
  speed: 1.3
  count: 1.4
special:
  - matrix-rain
  - data-pulse
```

### 10. quantum-tech（量子科技风）
```yaml
spring:
  damping: 6
  stiffness: 250
  mass: 0.7
fade:
  duration: 8
slide:
  duration: 14
scale:
  from: 0.75
  to: 1
glow:
  intensity: 0.85
  color: "#FF00CC"
particle:
  speed: 1.4
  count: 1.5
special:
  - quantum-glitch
  - entanglement
```

---

## 生活方式类主题动画

### 11. vibrant-gradient（活力渐变风）
```yaml
spring:
  damping: 10
  stiffness: 200
  mass: 0.85
fade:
  duration: 15
slide:
  duration: 22
scale:
  from: 0.78
  to: 1
glow:
  intensity: 0.6
  color: "#F97316"
particle:
  speed: 1.0
  count: 1.1
special:
  - bounce
  - color-shift
```

### 12. aurora-gradient（极光渐变风）
```yaml
spring:
  damping: 20
  stiffness: 120
  mass: 1
fade:
  duration: 20
slide:
  duration: 30
scale:
  from: 0.88
  to: 1
glow:
  intensity: 0.4
  color: "#06B6D4"
particle:
  speed: 0.6
  count: 0.9
special:
  - aurora-flow
  - light-wave
```

---

## 自然类主题动画

### 13. forest-nature（森林自然风）
```yaml
spring:
  damping: 25
  stiffness: 100
  mass: 1.1
fade:
  duration: 25
slide:
  duration: 35
scale:
  from: 0.9
  to: 1
glow:
  intensity: 0.2
  color: "#059669"
particle:
  speed: 0.4
  count: 0.8
special:
  - leaf-float
  - gentle-breeze
```

### 14. deep-ocean（深海科技风）
```yaml
spring:
  damping: 22
  stiffness: 110
  mass: 1.1
fade:
  duration: 22
slide:
  duration: 32
scale:
  from: 0.9
  to: 1
glow:
  intensity: 0.35
  color: "#0891B2"
particle:
  speed: 0.5
  count: 0.9
special:
  - bubble-rise
  - depth-shadow
```

### 15. arctic-ice（极地冰晶风）
```yaml
spring:
  damping: 24
  stiffness: 105
  mass: 1
fade:
  duration: 24
slide:
  duration: 34
scale:
  from: 0.9
  to: 1
glow:
  intensity: 0.4
  color: "#38BDF8"
particle:
  speed: 0.45
  count: 0.85
special:
  - crystal-shine
  - frost-spread
```

---

## 专业类主题动画

### 16. dark-minimal（暗夜极简风）
```yaml
spring:
  damping: 30
  stiffness: 80
  mass: 1.2
fade:
  duration: 18
slide:
  duration: 26
scale:
  from: 0.92
  to: 1
glow:
  intensity: 0.1
  color: "#F8FAFC"
particle:
  speed: 0.3
  count: 0.4
special: []
```

### 17. neon-city（霓虹都市风）
```yaml
spring:
  damping: 9
  stiffness: 210
  mass: 0.85
fade:
  duration: 11
slide:
  duration: 17
scale:
  from: 0.82
  to: 1
glow:
  intensity: 0.85
  color: "#F43F5E"
particle:
  speed: 1.1
  count: 1.25
special:
  - neon-pulse
  - city-glow
```

### 18. fintech（金融科技风）
```yaml
spring:
  damping: 26
  stiffness: 95
  mass: 1.1
fade:
  duration: 20
slide:
  duration: 28
scale:
  from: 0.91
  to: 1
glow:
  intensity: 0.25
  color: "#059669"
particle:
  speed: 0.5
  count: 0.7
special:
  - growth-line
  - stable-pulse
```

### 19. pure-medical（纯净医疗风）
```yaml
spring:
  damping: 28
  stiffness: 90
  mass: 1.2
fade:
  duration: 22
slide:
  duration: 30
scale:
  from: 0.92
  to: 1
glow:
  intensity: 0.2
  color: "#0EA5E9"
particle:
  speed: 0.35
  count: 0.6
special:
  - soft-glow
  - calm-pulse
```

### 20. autumn-vintage（暖秋复古风）
```yaml
spring:
  damping: 22
  stiffness: 115
  mass: 1.1
fade:
  duration: 20
slide:
  duration: 30
scale:
  from: 0.88
  to: 1
glow:
  intensity: 0.3
  color: "#DC2626"
particle:
  speed: 0.5
  count: 0.75
special:
  - warm-shimmer
  - leaf-drift
```

### 21. game-elite（电竞游戏风）
```yaml
spring:
  damping: 8
  stiffness: 220
  mass: 0.8
fade:
  duration: 10
slide:
  duration: 15
scale:
  from: 0.8
  to: 1
glow:
  intensity: 0.85
  color: "#8B5CF6"
particle:
  speed: 1.3
  count: 1.4
special:
  - glitch
  - energy-pulse
```

### 22. education-blue（学术教育风）
```yaml
spring:
  damping: 25
  stiffness: 90
  mass: 1.1
fade:
  duration: 20
slide:
  duration: 30
scale:
  from: 0.92
  to: 1
glow:
  intensity: 0.2
  color: "#3B82F6"
particle:
  speed: 0.4
  count: 0.6
special: []
```

### 23. food-warm（美食温暖风）
```yaml
spring:
  damping: 15
  stiffness: 150
  mass: 1
fade:
  duration: 16
slide:
  duration: 24
scale:
  from: 0.88
  to: 1
glow:
  intensity: 0.45
  color: "#F97316"
particle:
  speed: 0.6
  count: 0.8
special:
  - steam-rise
```

### 24. travel-adventure（旅行冒险风）
```yaml
spring:
  damping: 14
  stiffness: 160
  mass: 1
fade:
  duration: 15
slide:
  duration: 22
scale:
  from: 0.85
  to: 1
glow:
  intensity: 0.4
  color: "#059669"
particle:
  speed: 0.8
  count: 1
special:
  - compass-spin
```

### 25. music-beat（音乐节拍风）
```yaml
spring:
  damping: 10
  stiffness: 200
  mass: 0.85
fade:
  duration: 12
slide:
  duration: 18
scale:
  from: 0.82
  to: 1
glow:
  intensity: 0.75
  color: "#EC4899"
particle:
  speed: 1.2
  count: 1.3
special:
  - beat-pulse
  - equalizer
```

### 26. news-official（新闻权威风）
```yaml
spring:
  damping: 28
  stiffness: 85
  mass: 1.2
fade:
  duration: 18
slide:
  duration: 25
scale:
  from: 0.92
  to: 1
glow:
  intensity: 0.15
  color: "#1E40AF"
particle:
  speed: 0.3
  count: 0.4
special: []
```

### 27. pet-cute（萌宠可爱风）
```yaml
spring:
  damping: 12
  stiffness: 180
  mass: 0.9
fade:
  duration: 14
slide:
  duration: 20
scale:
  from: 0.85
  to: 1
glow:
  intensity: 0.5
  color: "#F472B6"
particle:
  speed: 0.7
  count: 0.9
special:
  - bounce
  - heart-float
```

### 28. auto-tech（汽车科技风）
```yaml
spring:
  damping: 16
  stiffness: 150
  mass: 1
fade:
  duration: 14
slide:
  duration: 20
scale:
  from: 0.88
  to: 1
glow:
  intensity: 0.5
  color: "#3B82F6"
particle:
  speed: 0.8
  count: 1
special:
  - speed-line
```

### 29. startup-energy（创业活力风）
```yaml
spring:
  damping: 12
  stiffness: 180
  mass: 0.9
fade:
  duration: 14
slide:
  duration: 20
scale:
  from: 0.85
  to: 1
glow:
  intensity: 0.55
  color: "#10B981"
particle:
  speed: 0.9
  count: 1.1
special:
  - rocket-launch
```

### 30. luxury-elegant（奢华优雅风）
```yaml
spring:
  damping: 28
  stiffness: 85
  mass: 1.2
fade:
  duration: 22
slide:
  duration: 32
scale:
  from: 0.92
  to: 1
glow:
  intensity: 0.3
  color: "#D4AF37"
particle:
  speed: 0.3
  count: 0.5
special:
  - shimmer
```

---

## 在代码中使用

### 引入主题动画配置

> ⚠️ **已更新**：请使用 `scripts/themes.js` 中的 `getThemeAnimation()` 函数。

```tsx
// ✅ 正确：使用 getThemeAnimation 函数
import { getThemeAnimation } from '../scripts/themes';

// 获取主题动画配置
const themeAnim = getThemeAnimation('tech-modern');
```

### 在 VerticalVideo 中使用

```tsx
import { getThemeAnimation } from '../scripts/themes';

export const VerticalVideo: React.FC<{ theme: string }> = ({ theme }) => {
  const frame = useCurrentFrame();
  // ✅ 使用 getThemeAnimation 函数
  const themeAnim = getThemeAnimation(theme);
  
  // 使用主题动画参数
  const { damping, stiffness } = themeAnim.spring;
  
  // 主题适配的动画
  const scale = spring({ 
    frame, 
    fps, 
    config: { damping, stiffness } 
  });
  
  const opacity = interpolate(
    frame, 
    [0, themeAnim.fade.duration], 
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor: theme.backgroundColor }}>
      <Sequence from={0} durationInFrames={300}>
        <Scene 
          frame={frame} 
          themeAnim={themeAnim}
          scale={scale}
          opacity={opacity}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
```

### 场景组件接收动画参数

```tsx
// 引入 ThemeAnimation 类型（从 themes.d.ts）
interface SceneProps {
  text: string;
  frame: number;
  themeAnim: {
    spring: { damping: number; stiffness: number; mass: number };
    fade: { duration: number };
    scale: { from: number; to: number };
    glow: { intensity: number; color: string };
  };
  scale: number;
  opacity: number;
}

const Scene: React.FC<SceneProps> = ({ text, frame, themeAnim, scale, opacity }) => {
  const { glow } = themeAnim;
  
  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${scale})`,
        boxShadow: glow.intensity > 0.5 
          ? `0 0 60px ${glow.color}` 
          : 'none',
      }}
    >
      {/* 场景内容 */}
    </AbsoluteFill>
  );
};
```

---

## 特殊效果说明

| 效果名称 | 适用主题 | 实现方式 |
|----------|----------|----------|
| `glitch` | cyberpunk | 随机位移 + RGB分离 |
| `neon-flicker` | cyberpunk, neon-city | 亮度闪烁动画 |
| `pulse` | neon-future | 呼吸式缩放 |
| `particle-flow` | particle-tech | 方向性粒子移动 |
| `gradient-shift` | gradient-wave, aurora-gradient | 渐变色位置动画 |
| `wave-motion` | gradient-wave | 正弦波形位移 |
| `glass-blur` | glass-morphism | 背景模糊 + 高光 |
| `hologram-shift` | holographic | 彩虹色偏移 |
| `matrix-rain` | data-stream | 字符下落效果 |
| `quantum-glitch` | quantum-tech | 快速闪烁 + 扭曲 |
| `aurora-flow` | aurora-gradient | 极光波动效果 |
| `leaf-float` | forest-nature | 飘落动画 |
| `crystal-shine` | arctic-ice | 闪光效果 |
| `neon-pulse` | neon-city | 霓虹呼吸灯 |
| `energy-pulse` | game-elite | 能量脉冲 |
| `steam-rise` | food-warm | 蒸汽上升 |
| `compass-spin` | travel-adventure | 指南针旋转 |
| `beat-pulse` | music-beat | 节拍脉冲 |
| `equalizer` | music-beat | 均衡器动画 |
| `bounce` | pet-cute | 弹跳效果 |
| `heart-float` | pet-cute | 爱心漂浮 |
| `speed-line` | auto-tech | 速度线 |
| `rocket-launch` | startup-energy | 火箭发射 |
| `shimmer` | luxury-elegant | 闪光 |

---

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2026-04-21 | 初始版本，定义 20 个主题动画预设 |
| 1.1.0 | 2026-04-21 | 新增 10 个主题（game-elite, education-blue, food-warm, travel-adventure, music-beat, news-official, pet-cute, auto-tech, startup-energy, luxury-elegant），共 30 个主题 |
