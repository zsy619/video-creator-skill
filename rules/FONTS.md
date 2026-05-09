# 大字体居中设计规范

> 所属模块：video-creator / SKILL.md → 视觉设计
> **最后更新**：2026-04-27（新增 PIL 封面字体规范）

## ⚠️ 重要：所有视频内容必须使用大字体并严格居中显示。

---

## 🎨 PIL 封面字体规范（2026-04-27 新增）

> ⚠️ 封面生成首选 **baoyu-imagine（AI 生成）**，PIL 仅在 API 不可用时使用。
> ⚠️ **字体路径必须是 `/System/Library/Fonts/STHeiti Medium.ttc`**，不得使用 `LiHei Pro Medium.ttc`！

### PIL 封面字体速查表

> ⚠️ **字体大小根据画布宽度比例计算，而非固定值**，确保各尺寸封面字体协调。

| 封面类型 | 画布尺寸 | 标题字号 | 副标题字号 | 计算公式 |
|---------|---------|-----------|-----------|---------|
| 竖屏 | 1080×1920 | **~108px** | ~48px | 宽度×10% / 宽度×4.5% |
| 公众号 | 900×383 | **~90px** | ~40px | 宽度×10% / 宽度×4.5% |
| 小红书 | 1440×2560 | **~144px** | ~64px | 宽度×10% / 宽度×4.5% |

> ✅ **经验值**：主标题约为画布宽度的10%，副标题约为4.5%，这样比例最协调。

### PIL 自校验机制

> ✅ **推荐方案**：根据宽度比例计算字体大小，代码更简洁。

```python
from PIL import Image, ImageDraw, ImageFont
FONT_PATH = '/System/Library/Fonts/STHeiti Medium.ttc'

def create_cover(width, height, output_path, title_text, sub_text):
    """根据宽度比例计算字体大小"""
    img = Image.new('RGB', (width, height), '#0D0221')
    draw = ImageDraw.Draw(img)
    
    # 字体大小 = 宽度 × 比例
    title_size = int(width * 0.1)   # 主标题约为宽度的10%
    sub_size = int(width * 0.045)    # 副标题约为宽度的4.5%
    
    title_font = ImageFont.truetype(FONT_PATH, title_size)
    sub_font = ImageFont.truetype(FONT_PATH, sub_size)
    
    # 主标题（居中）
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_height = title_bbox[3] - title_bbox[1]
    title_x = (width - title_width) // 2
    title_y = height // 2 - title_height - int(sub_size * 0.8)
    draw.text((title_x, title_y), title_text, font=title_font, fill='white')
    
    # 副标题（居中）
    sub_bbox = draw.textbbox((0, 0), sub_text, font=sub_font)
    sub_width = sub_bbox[2] - sub_bbox[0]
    sub_x = (width - sub_width) // 2
    sub_y = height // 2 + int(title_size * 0.1)
    draw.text((sub_x, sub_y), sub_text, font=sub_font, fill='#00FFFF')
    
    img.save(output_path)

# 使用
create_cover(1080, 1920, 'cover.png', 'GOAL-DRIVEN', '目标驱动的多智能体协作系统')
create_cover(900, 383, 'cover-wechat.png', 'GOAL-DRIVEN', '目标驱动的多智能体协作系统')
create_cover(1440, 2560, 'cover-xhs.png', 'GOAL-DRIVEN', '目标驱动的多智能体协作系统')
```

### 字体突出设计（多层发光效果）

> ⚠️ **核心原则**：字体不被背景掩盖！

| 设计 | 效果 |
|------|------|
| 旧（亮网格+单层发光） | 字体被背景掩盖 |
| 新（暗网格+多层发光） | 字体清晰醒目 |

**完整代码模板**：
```python
from PIL import Image, ImageDraw, ImageFont
import os
FONT_PATH = '/System/Library/Fonts/STHeiti Medium.ttc'

def create_prominent_cover(output_path, size, title_size, sub_size, tag_size, url_size, title_y_ratio=0.18):
    w, h = size
    img = Image.new('RGB', size, color='#0D0221')
    draw = ImageDraw.Draw(img)
    
    # 1. 暗色背景网格（不抢字体风头）
    for i in range(0, h, max(20, h//30)):
        draw.line([(0, i), (w, i)], fill='#150828', width=1)
    for i in range(0, w, max(20, w//30)):
        draw.line([(i, 0), (i, h)], fill='#150828', width=1)
    
    # 2. 四角背景光晕（中心保持暗色）
    for cx, cy, r, c in [
        (int(w*0.1), int(h*0.1), int(min(w,h)*0.35), '#00FFFF'),
        (int(w*0.9), int(h*0.1), int(min(w,h)*0.25), '#FF00FF'),
        (int(w*0.1), int(h*0.9), int(min(w,h)*0.25), '#9D00FF'),
        (int(w*0.9), int(h*0.9), int(min(w,h)*0.2), '#00FFFF'),
    ]:
        for a in range(3, 0, -1):
            color = tuple(int(c[i:i+2], 16) for i in (1, 3, 5))
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=tuple(int(x*0.3) for x in color))
    
    # 3. 字体加载
    font_title = ImageFont.truetype(FONT_PATH, title_size)
    font_subtitle = ImageFont.truetype(FONT_PATH, sub_size)
    font_tag = ImageFont.truetype(FONT_PATH, tag_size)
    font_url = ImageFont.truetype(FONT_PATH, url_size)
    
    # 4. 自校验
    bbox = draw.textbbox((0, 0), 'Title', font=font_title, anchor='mm')
    title_height = bbox[3] - bbox[1]
    ratio = title_height / h * 100
    assert ratio >= 10, f"Too small: {ratio:.1f}%"
    
    # 5. 多层发光标题（字体突出核心）
    title_y = int(h * title_y_ratio)
    for glow_size, glow_color in [
        (int(title_size*0.08), '#004444'),
        (int(title_size*0.05), '#006666'),
        (int(title_size*0.03), '#008888'),
        (int(title_size*0.015), '#00CCCC'),
    ]:
        for dx, dy in [(0, -glow_size), (0, glow_size), (-glow_size, 0), (glow_size, 0)]:
            draw.text((w//2 + dx, title_y + dy), 'Title', fill=glow_color, font=font_title, anchor='mm')
    draw.text((w//2, title_y), 'Title', fill='#FFFFFF', font=font_title, anchor='mm')
    
    # 6. 副标题/标签/URL...
    img.save(output_path, 'PNG')

# 使用
create_prominent_cover('cover.png', (1080,1920), 280, 80, 48, 32, 0.18)
create_prominent_cover('cover-wechat.png', (900,383), 160, 48, 36, 24, 0.32)
create_prominent_cover('cover-xhs.png', (1440,2560), 360, 100, 64, 44, 0.16)
```

---

## 字体大小规范

| 场景类型 | 主标题字体 | 副标题字体 | 说明字体 |
|----------|-----------|-----------|---------|
| 封面/核心场景 | **130px** | **52px** | **12px** |
| 内容场景 | **64-96px** | **40-56px** | **28-36px** |
| 数据展示 | **72-120px** | **36-12px** | **24-32px** |
| CTA/结尾 | **64-96px** | **40-56px** | **32-40px** |


## 视频字体规范（竖屏 1080×1920）
| 元素 |   字体大小 |  说明 |
| --------   | ---------- |  ------- |
| 主标题 |   **130px** | 大字体封面场景（12字符英文内不换行） |
| 副标题 |   **52px** | 配合主标题的说明文字 |
| 内容 |   **40-12px** | 正文内容 |
| 命令行 |   **22-28px** | 代码/命令展示 |
| **字幕** | **72px** | ASS字幕，底部居中，黄色（&H00FFFF），PingFang SC，MarginV=50 |

> ⚠️ **字幕字体说明**（见 rules/SUBTITLES.md）：
> - **ASS字幕必须使用 72px**（Fontsize=72，PlayResY=1920时，约40px视觉，已验证）
> - 这是相对于 PlayResY(1920) 的标准化像素值
> - **统一标准**：Fontsize=72, Alignment=2, MarginL=30, MarginR=30, MarginV=50, PlayResX=1080, PlayResY=1920
> - 多行用 `\N` 分隔（WrapStyle=0）

## 字幕系统规范（必须严格遵守）

### 字幕规格要求

| 属性 | 规范值 | 说明 |
|------|--------|------|
| **字体大小** | **72px** | ASS字幕标准化像素值（Fontsize=72，PlayResY=1920时，约40px视觉，已验证） |
| **字体颜色** | **醒目的黄色** | `&H00FFFF` (ARGB格式，纯黄色) |
| **字体** | **PingFang SC** | macOS系统中文字体，确保跨平台兼容 |
| **位置** | **底部居中** | `Alignment=2` (底部居中) |
| **距底边距离** | **50px** | `MarginV=50` |
| **描边** | **1px黑色** | `Outline=1, OutlineColour=&H00000000` |
| **换行支持** | **支持多行，左右边距30px** | `WrapStyle=0` |

### ASS字幕格式模板

```ass
[Script Info]
Title: Video Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,PingFang SC,72,&H00FFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,30,30,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:05.00,Default,,30,30,50,,字幕内容（可换行）
```

### 关键参数说明

| 参数 | 值 | 说明 |
|------|-----|------|
| `Fontsize` | `72` | ASS字幕标准化像素值（PlayResY=1920时，约40px视觉，已验证） |
| `PrimaryColour` | `&H00FFFF` | 醒目的黄色（ARGB格式） |
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
| 字体太小看不清 | 确认Fontsize=72（竖屏视频标准尺寸），可适当调整但不要低于36px |
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
// | 主标题 |   130px | 封面核心场景（安全值，12字符内不换行） |
// | 副标题 |   52px | 特征/功能描述 |
// | 内容 |   40-12px | 正文内容 |
// | 命令行 |   22-28px | 代码/命令展示 |
// | 字幕 |   10px | ASS字幕规范，底部居中 |

// 使用示例 - 封面（130px大字）
const CoverScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = spring({ frame, fps: FPS, config: { damping: 12 } });
  const scale = interpolate(frame, [0, 30], [0.8, 1], { extrapolateRight: 'clamp' });

  return (
    <LargeCenteredScene>
      <div style={{ opacity, transform: `scale(${scale})` }}>
        <div style={{
          fontSize: 130,  // 封面用130px大标题（安全不换行）
          fontWeight: 'bold',
          color: COLORS.textPrimary,
          marginBottom: '32px',
          lineHeight: 1,
          letterSpacing: '-2px'
        }}>
          GOAL-DRIVEN
        </div>
        <div style={{
          fontSize: 52,  // 副标题52px
          color: COLORS.accent,
          marginBottom: '40px',
          fontWeight: 'bold'
        }}>
          目标驱动的多智能体协作系统
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
