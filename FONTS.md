# 大字体居中设计规范

> 所属模块：video-creator / SKILL.md → 视觉设计

## ⚠️ 重要：所有视频内容必须使用大字体并严格居中显示。

## 字体大小规范

| 场景类型 | 主标题字体 | 副标题字体 | 说明字体 |
|----------|-----------|-----------|----------|
| 封面/核心场景 | **120-180px** | **48-72px** | **32-40px** |
| 内容场景 | **64-96px** | **40-56px** | **28-36px** |
| 数据展示 | **72-120px** | **36-48px** | **24-32px** |
| CTA/结尾 | **64-96px** | **40-56px** | **32-40px** |


## 视频字体规范
| 元素 |   最终字体大小 |  
| --------   | ---------- |  
| 主标题 |   **120px** |
| 副标题 |   **44px** |
| 内容 |   **40px** |
| 命令行 |   **22px** |
| 字幕 |   **10px** |

字幕要求在视频底部，距离底部边距30px，可以多行，务必居中显示。

#### 居中设计规范

所有视频内容必须严格居中：

```
┌─────────────────────────┐
│                         │
│    ┌───────────────┐    │
│    │               │    │
│    │   居中内容    │    │
│    │  (大字体)     │    │
│    │               │    │
│    └───────────────┘    │
│                         │
└─────────────────────────┘
```

## 大字体场景模板

```tsx
// 大字体居中场景模板
const LargeCenteredScene: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: '120px', // 大内边距确保内容不贴边
        ...style
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '100%' }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

// 使用示例 - 封面
const CoverScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = spring({ frame, fps: FPS, config: { damping: 12 } });
  const scale = interpolate(frame, [0, 30], [0.8, 1], { extrapolateRight: 'clamp' });

  return (
    <LargeCenteredScene>
      <div style={{ opacity, transform: `scale(${scale})` }}>
        <div style={{
          fontSize: '180px',
          fontWeight: 'bold',
          color: COLORS.textPrimary,
          marginBottom: '40px',
          lineHeight: 1,
          letterSpacing: '-4px'
        }}>
          140万亿
        </div>
        <div style={{
          fontSize: '64px',
          color: COLORS.accent,
          marginBottom: '40px',
          fontWeight: 'bold'
        }}>
          日均 Token 调用量
        </div>
      </div>
    </LargeCenteredScene>
  );
};
```

## 设计原则

1. **内容集中**：所有文字内容集中在屏幕中央区域，避免贴边
2. **视觉层次**：通过字体大小对比（2-3倍差距）建立清晰的视觉层次
3. **充足留白**：上下左右至少保留 10-15% 的留白空间
4. **简洁有力**：每屏只展示 1-3 个核心信息点
5. **动画入场**：使用 spring/scale 动画增强大字体入场的视觉冲击力
6. **页面布局**：使用大字体，严格居中显示，避免文字超出屏幕边界
