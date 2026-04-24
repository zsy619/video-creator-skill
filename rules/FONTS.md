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


## 视频字体规范（竖屏 1080×1920）
| 元素 |   字体大小 |  说明 |
| --------   | ---------- |  ------- |
| 主标题 |   **120-160px** | 封面/核心场景 |
| 副标题 |   **44-56px** | 特征/功能描述 |
| 内容 |   **40-48px** | 正文内容 |
| 命令行 |   **22-28px** | 代码/命令展示 |
| **字幕** | **10px** | ASS字幕，底部居中，黄色（&H00FFFF），PingFang SC，MarginV=30 |

> ⚠️ **字幕字体说明**：
> - **统一使用 10px**（竖屏视频最佳阅读尺寸，已在 SUBTITLES.md 中定义）
> - ASS 的 Fontsize 是相对于 PlayResY(1920) 的像素值
> - **统一标准**：Fontsize=10, Alignment=2, MarginL=30, MarginR=30, MarginV=30
> - 多行用 `\N` 分隔（WrapStyle=0）
> - 禁止使用其他字号

## 字幕系统规范（必须严格遵守）

### 字幕规格要求

| 属性 | 规范值 | 说明 |
|------|--------|------|
| **字体大小** | **18px** | 必须使用18px字体大小 |
| **字体颜色** | **醒目的黄色** | `&H0000FFFF` (ARGB格式，纯黄色) |
| **字体** | **PingFang SC** | macOS系统中文字体，确保跨平台兼容 |
| **位置** | **底部居中** | `Alignment=2` (底部居中) |
| **距底边距离** | **30px** | `MarginV=30` |
| **描边** | **1px黑色** | `Outline=1, OutlineColour=&H00000000` |
| **换行支持** | **支持多行，距离左右两边30px** | `WrapStyle=0` |

### ASS字幕格式模板

```ass
[Script Info]
Title: Video Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,PingFang SC,36,&H0000FFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,30,30,45,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:05.00,Default,,0,0,0,,字幕内容（可换行）
```

### 关键参数说明

| 参数 | 值 | 说明 |
|------|-----|------|
| `Fontsize` | `10` | 10px字体大小（竖屏视频最佳阅读尺寸） |
| `PrimaryColour` | `&H0000FFFF` | 醒目的黄色（ARGB格式） |
| `Fontname` | `PingFang SC` | macOS中文字体，避免STHeiti Medium等不兼容字体 |
| `Alignment` | `2` | 底部居中（其他值：1=左下，3=右下，5=正中，6=右中，8=中上） |
| `MarginV` | `30` | 距底边30px |
| `Outline` | `1` | 1px描边 |
| `OutlineColour` | `&H00000000` | 黑色描边 |

### 字幕内容要求

1. **内容一致性**：字幕内容必须与视频画面中的文字完全一致，不能有任何遗漏或错误
2. **清晰简洁**：字幕必须清晰、简洁，易于理解，每行控制在20字以内
3. **多行支持**：支持多行显示，长句子可换行
4. **时间同步**：字幕时间轴必须与语音和画面完美同步

### ffmpeg烧录字幕命令

```bash
# 烧录ASS字幕到视频
ffmpeg -i input.mp4 -vf "ass=subtitle.ass" -c:v libx264 -crf 18 -preset fast -c:a copy output_with_subtitle.mp4
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 字幕显示为黑块或方块 | 检查Fontname是否为系统可用字体，更换为PingFang SC |
| 字体太小看不清 | 确认Fontsize=18（竖屏视频建议10-18px），可适当调整但不要超过20px |
| 字幕位置不对 | 检查MarginV和Alignment参数 |
| 多行字幕重叠 | 调整WrapStyle或控制每行字数 |

### 字体兼容性说明

**必须避免的字体**：
- `STHeiti Medium` - macOS不存在此字体，会导致渲染失败
- `SimHei` - 可能不存在
- `Arial` - 中文字幕不适用

**推荐的字体**：
- `PingFang SC` - macOS默认中文字体，兼容性最佳
- `Microsoft YaHei` - Windows中文字体
- `Noto Sans SC` - 开源跨平台中文字体

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

## 大字体场景模板（竖屏视频版）

```tsx
// 大字体居中场景模板 - 竖屏视频专用
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
        padding: '120px 80px', // 大内边距确保内容不贴边
        ...style
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '100%' }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

// 竖屏视频字体规范（1080×1920）
// | 元素 |   字体大小 |  说明 |
// | --------   | ---------- |  ------- |
// | 主标题 |   120-180px | 封面核心场景用160-180px |
// | 副标题 |   44-56px | 特征/功能描述 |
// | 内容 |   40-48px | 正文内容 |
// | 命令行 |   22-28px | 代码/命令展示 |
// | 字幕 |   10px | ASS字幕规范，底部居中 |

// 使用示例 - 封面（160px大字）
const CoverScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = spring({ frame, fps: FPS, config: { damping: 12 } });
  const scale = interpolate(frame, [0, 30], [0.8, 1], { extrapolateRight: 'clamp' });

  return (
    <LargeCenteredScene>
      <div style={{ opacity, transform: `scale(${scale})` }}>
        <div style={{
          fontSize: '160px',  // 封面用160px大标题
          fontWeight: 'bold',
          color: COLORS.textPrimary,
          marginBottom: '40px',
          lineHeight: 1,
          letterSpacing: '-4px'
        }}>
          AI Reads Books
        </div>
        <div style={{
          fontSize: '56px',  // 副标题56px
          color: COLORS.accent,
          marginBottom: '40px',
          fontWeight: 'bold'
        }}>
          逐页分析PDF，自动提取知识精华
        </div>
      </div>
    </LargeCenteredScene>
  );
};

// 内容场景示例（88px主标题）
const FeatureScene: React.FC<{ title: string; description: string }> = ({ title, description }) => {
  const frame = useCurrentFrame();
  const opacity = spring({ frame, fps: FPS, config: { damping: 15 } });
  
  return (
    <LargeCenteredScene>
      <div style={{ opacity, textAlign: 'center' }}>
        <div style={{
          fontSize: '88px',  // 功能标题88px
          fontWeight: 'bold',
          color: COLORS.textPrimary,
          marginBottom: '30px'
        }}>
          {title}
        </div>
        <div style={{
          fontSize: '44px',  // 描述44px
          color: COLORS.textSecondary,
          lineHeight: 1.6
        }}>
          {description}
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
