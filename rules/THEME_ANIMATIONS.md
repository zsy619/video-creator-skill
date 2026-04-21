# 主题动画系统

> 为 video-creator 技能提供主题适配的动画效果

## 📁 文件结构

```
video-creator/
├── scripts/
│   ├── themes.js          # 统一配置（颜色 + 动画）
│   ├── themes.d.ts        # TypeScript 声明文件
│   └── useThemeAnimation.ts # React Hooks
├── rules/
│   ├── THEMES.md                      # 主题文档
│   ├── THEME_ANIMATIONS.md            # 动画参数详细文档
│   └── THEME_ANIMATIONS_QUICKREF.md   # 快速参考
└── examples/
    └── theme-animation-demo/          # 示例项目
```

## 🚀 快速开始

### 方式 1：使用 Hook（推荐）

```tsx
import { useThemeAnimation } from '../scripts/useThemeAnimation';

const Scene: React.FC<{ theme: string }> = ({ theme }) => {
  const { opacity, scale, translateY, glow } = useThemeAnimation(theme);
  
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

### 方式 2：直接获取配置

```tsx
import { getTheme, getThemeAnimation } from '../scripts/themes';

const Scene: React.FC<{ theme: string }> = ({ theme }) => {
  const themeConfig = getTheme(theme);
  const themeAnim = getThemeAnimation(theme);
  
  return (
    <AbsoluteFill style={{ backgroundColor: themeConfig.backgroundColor }}>
      <div style={{ color: themeConfig.primaryColor }}>
        {/* 使用主题色 */}
      </div>
    </AbsoluteFill>
  );
};
```

## 📦 30 个主题

| 类别 | 主题 | 动画风格 |
|------|------|----------|
| 科技类 | tech-modern, cyberpunk, neon-future, minimal-tech, particle-tech | 快速、锐利 |
| 创意类 | gradient-wave, glass-morphism, holographic, data-stream, quantum-tech | 弹性、有趣 |
| 自然类 | forest-nature, deep-ocean, aurora-gradient, arctic-ice | 柔和、平滑 |
| 活力类 | vibrant-gradient | 弹跳、动感 |
| 专业类 | dark-minimal, neon-city, fintech, pure-medical, autumn-vintage | 克制、稳重 |
| 新增电竞 | game-elite | 快速+能量 |
| 新增教育 | education-blue | 缓慢+稳定 |
| 新增美食 | food-warm | 柔和+食欲 |
| 新增旅行 | travel-adventure | 活力+探索 |
| 新增音乐 | music-beat | 节奏+律动 |
| 新增新闻 | news-official | 严肃+可信 |
| 新增萌宠 | pet-cute | 活泼+萌 |
| 新增汽车 | auto-tech | 高级+精致 |
| 新增创业 | startup-energy | 激情+创新 |
| 新增奢华 | luxury-elegant | 高贵+精致 |

## 🔧 API 参考

### themes.js

```javascript
getTheme(themeId)           // → 主题配置（颜色、字体等）
getThemeAnimation(themeId)   // → 动画配置（spring、fade、glow等）
getGlowConfig(themeId)      // → 光晕配置 { intensity, color }
hasSpecialEffect(themeId, effect)  // → boolean
getParticleSpeed(themeId)   // → number
```

### useThemeAnimation.ts

```typescript
useThemeAnimation(themeId, options?)  // → { opacity, scale, translateY, ... }
useThemePulse(themeId, options?)      // → number (脉冲 0-1)
useThemeGlow(themeId, baseIntensity?) // → { opacity, scale, color, blur }
useEntranceAnimation(themeId)         // 快捷 Hook
useLoopAnimation(themeId)             // 快捷 Hook
useGlowAnimation(themeId)             // 快捷 Hook
```

## 📖 文档

- [THEME_ANIMATIONS.md](THEME_ANIMATIONS.md) - 动画参数详细说明
- [THEME_ANIMATIONS_QUICKREF.md](THEME_ANIMATIONS_QUICKREF.md) - 快速参考
- [THEMES.md](THEMES.md) - 主题视觉配置

## 🔍 示例

运行示例项目：

```bash
cd examples/theme-animation-demo
npm install
npm start
```

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.2.0 | 2026-04-21 | 新增 10 个主题，共 30 个主题 |
| 1.1.0 | 2026-04-21 | 合并 themeAnimations.js 到 themes.js |
| 1.0.0 | 2026-04-21 | 初始版本，定义 20 主题动画参数 |
