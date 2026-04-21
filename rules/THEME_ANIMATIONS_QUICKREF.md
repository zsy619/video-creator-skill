# 主题动画快速参考

> 用于快速查询主题动画参数和使用方式
> 版本：1.2.0 | 更新：2026-04-21

---

## 快速使用（3秒上手）

```tsx
import { getTheme, getThemeAnimation } from '../scripts/themes';
import { useThemeAnimation } from '../scripts/useThemeAnimation';

// 方式1：使用 Hook（推荐）
const Scene: React.FC<{ theme: string }> = ({ theme }) => {
  const { opacity, scale, translateY, glow, hasSpecialEffect } = useThemeAnimation(theme);
  return <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>...</AbsoluteFill>;
};

// 方式2：直接获取配置
const themeConfig = getTheme('cyberpunk');
const themeAnim = getThemeAnimation('cyberpunk');
```

---

## 30 主题动画参数速查

| 主题ID | damping | stiffness | fade | glow | 特殊效果 |
|--------|---------|-----------|------|------|----------|
| tech-modern | 12 | 180 | 12 | 0.6 | - |
| cyberpunk | 8 | 220 | 10 | 0.9 | glitch, neon-flicker |
| neon-future | 10 | 200 | 12 | 0.85 | pulse, neon-glow |
| minimal-tech | 30 | 80 | 18 | 0.1 | - |
| particle-tech | 14 | 160 | 14 | 0.5 | particle-flow, data-stream |
| gradient-wave | 10 | 200 | 15 | 0.5 | gradient-shift, wave-motion |
| glass-morphism | 18 | 140 | 20 | 0.3 | glass-blur, light-refraction |
| holographic | 10 | 190 | 12 | 0.8 | hologram-shift, rainbow-glint |
| data-stream | 12 | 170 | 10 | 0.7 | matrix-rain, data-pulse |
| quantum-tech | 6 | 250 | 8 | 0.85 | quantum-glitch, entanglement |
| vibrant-gradient | 10 | 200 | 15 | 0.6 | bounce, color-shift |
| aurora-gradient | 20 | 120 | 20 | 0.4 | aurora-flow, light-wave |
| forest-nature | 25 | 100 | 25 | 0.2 | leaf-float, gentle-breeze |
| deep-ocean | 22 | 110 | 22 | 0.35 | bubble-rise, depth-shadow |
| arctic-ice | 24 | 105 | 24 | 0.4 | crystal-shine, frost-spread |
| dark-minimal | 30 | 80 | 18 | 0.1 | - |
| neon-city | 9 | 210 | 11 | 0.85 | neon-pulse, city-glow |
| fintech | 26 | 95 | 20 | 0.25 | growth-line, stable-pulse |
| pure-medical | 28 | 90 | 22 | 0.2 | soft-glow, calm-pulse |
| autumn-vintage | 22 | 115 | 20 | 0.3 | warm-shimmer, leaf-drift |
| game-elite | 8 | 220 | 10 | 0.85 | glitch, energy-pulse |
| education-blue | 25 | 90 | 20 | 0.2 | - |
| food-warm | 15 | 150 | 16 | 0.45 | steam-rise |
| travel-adventure | 14 | 160 | 15 | 0.4 | compass-spin |
| music-beat | 10 | 200 | 12 | 0.75 | beat-pulse, equalizer |
| news-official | 28 | 85 | 18 | 0.15 | - |
| pet-cute | 12 | 180 | 14 | 0.5 | bounce, heart-float |
| auto-tech | 16 | 150 | 14 | 0.5 | speed-line |
| startup-energy | 12 | 180 | 14 | 0.55 | rocket-launch |
| luxury-elegant | 28 | 85 | 22 | 0.3 | shimmer |

---

## 动画风格分类

### 🔴 科技类（快速、锐利）
- **tech-modern**: damping 12, stiffness 180
- **cyberpunk**: damping 8, stiffness 220（最快）
- **neon-future**: damping 10, stiffness 200
- **minimal-tech**: damping 30, stiffness 80（最慢）
- **particle-tech**: damping 14, stiffness 160

### 🟡 创意类（弹性、有趣）
- **gradient-wave**: damping 10, scale 0.75-1（最大缩放）
- **glass-morphism**: damping 18, 柔和玻璃效果
- **holographic**: damping 10, 彩虹光效
- **data-stream**: damping 12, 矩阵效果
- **quantum-tech**: damping 6, stiffness 250（极快+闪烁）

### 🟢 自然类（柔和、平滑）
- **forest-nature**: damping 25, 森林绿
- **deep-ocean**: damping 22, 深海青
- **aurora-gradient**: damping 20, 极光流动
- **arctic-ice**: damping 24, 冰晶闪光

### 🔵 专业类（克制、稳重）
- **dark-minimal**: damping 30, 极简
- **neon-city**: damping 9, 霓虹
- **fintech**: damping 26, 稳定增长
- **pure-medical**: damping 28, 柔和纯净
- **autumn-vintage**: damping 22, 暖色复古

### 🟠 活力类（弹跳、动感）
- **vibrant-gradient**: damping 10, 活力橙

---

## 特殊效果列表

| 效果名称 | 主题 | 实现方式 |
|----------|------|----------|
| glitch | cyberpunk | 随机位移 + RGB分离 |
| neon-flicker | cyberpunk, neon-city | 亮度闪烁 |
| pulse | neon-future | 呼吸式缩放 |
| particle-flow | particle-tech | 方向性粒子移动 |
| gradient-shift | gradient-wave, aurora-gradient | 渐变色位置动画 |
| wave-motion | gradient-wave | 正弦波形位移 |
| glass-blur | glass-morphism | 背景模糊 + 高光 |
| hologram-shift | holographic | 彩虹色偏移 |
| matrix-rain | data-stream | 字符下落效果 |
| quantum-glitch | quantum-tech | 快速闪烁 + 扭曲 |
| aurora-flow | aurora-gradient | 极光波动效果 |
| leaf-float | forest-nature | 飘落动画 |
| bubble-rise | deep-ocean | 气泡上升效果 |
| crystal-shine | arctic-ice | 闪光效果 |
| neon-pulse | neon-city | 霓虹呼吸灯 |
| growth-line | fintech | 增长线动画 |
| soft-glow | pure-medical | 柔和光晕 |
| warm-shimmer | autumn-vintage | 暖色微光 |
| energy-pulse | game-elite | 能量脉冲 |
| steam-rise | food-warm | 蒸汽上升 |
| compass-spin | travel-adventure | 指南针旋转 |
| beat-pulse | music-beat | 节拍脉冲 |
| equalizer | music-beat | 均衡器动画 |
| heart-float | pet-cute | 爱心漂浮 |
| speed-line | auto-tech | 速度线 |
| rocket-launch | startup-energy | 火箭发射 |
| shimmer | luxury-elegant | 闪光 |

---

## API 参考

### themes.js 导出

```javascript
// 获取主题配置
getTheme(themeId)           // → { name, primaryColor, backgroundColor, ... }

// 获取动画配置
getThemeAnimation(themeId)   // → { spring, fade, slide, scale, glow, particle, special }

// 获取光晕配置
getGlowConfig(themeId)       // → { intensity, color }

// 检查特殊效果
hasSpecialEffect(themeId, effect)  // → boolean

// 获取粒子速度
getParticleSpeed(themeId)    // → number
```

### useThemeAnimation.ts 导出

```typescript
// 主题动画 Hook
useThemeAnimation(themeId, options?)
  // → { opacity, scale, translateY, springConfig, glow, hasSpecialEffect, fadeDuration, slideDuration, scaleRange, particleSpeed }

// 脉冲动画
useThemePulse(themeId, options?)
  // → number (0-1)

// 光晕动画
useThemeGlow(themeId, baseIntensity?)
  // → { opacity, scale, color, blur }

// 快捷 Hooks
useEntranceAnimation(themeId)  // useThemeAnimation(themeId, { entranceOnly: true })
useLoopAnimation(themeId)       // useThemePulse(themeId)
useGlowAnimation(themeId)      // useThemeGlow(themeId)

// 纯函数版本
getThemeAnimConfig(themeId)    // 同 getThemeAnimation
themeHasSpecialEffect(themeId, effect)  // 同 hasSpecialEffect
```

---

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.1.0 | 2026-04-21 | 合并 themeAnimations.js 到 themes.js |
| 1.0.0 | 2026-04-21 | 初始版本，定义20主题动画参数 |
| 1.2.0 | 2026-04-21 | 新增10个主题，共30个主题 |
