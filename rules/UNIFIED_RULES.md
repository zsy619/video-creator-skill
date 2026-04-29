# 视频创作统一规则（铁律）

> **优先级：最高**
> **适用范围**：所有 video-creator 技能生成的视频项目
> **默认风格**：赛博朋克（Cyberpunk）
> **最后更新**：2026-04-26

---

## ⚠️ 问题根源分析

### 常见问题与教训

| # | 问题 | 原因 | 教训 |
|---|------|------|------|
| 1 | 字幕太小 | 10px/18px 不适合竖屏 | **竖屏字幕必须 ≥72px** |
| 2 | 封面字体小 | PIL 字体渲染有大小限制 | **封面必须用 baoyu-imagine AI 生成，PIL 仅兜底** |
| 3 | 黑屏 | 场景总帧数 < 视频总帧数 | **所有场景帧数之和必须 = 视频总帧数** |
| 4 | 元素不居中 | CSS 硬编码 top 值 | **使用 Flexbox 居中，禁止硬编码偏移** |
| 5 | 中间文件残留 | 未清理 | **只保留 final-with-subs.mp4** |
| 6 | 重复渲染 | 每次小修改都重新渲染 | **批量修改到位再渲染** |

---

## 📋 铁律清单

### 1. 字幕规格（强制）

```
Fontsize: 72px     ← 竖屏(1080x1920)必须≥72px
Font: PingFang SC
Color: &H00FFFF (黄色)
Alignment: 2 (底部居中)
MarginL: 30px      ← 左边距30px
MarginR: 30px      ← 右边距30px
MarginV: 30px       ← 距底边30px
Outline: 1px
WrapStyle: 0        ← 多行支持（必须设置）
换行符: \N          ← ASS格式必须用\N，不是\n
每行字数: ≤25字符   ← 60-72px字体下25字符约900px，1080px内安全
PlayResX: 1080
PlayResY: 1920
```

⚠️ **铁律警告**：
- 换行符必须用 `\N`（ASS格式），不是 `\n`
- 每行最多25字符，避免超出1080px画面
- MarginV/MarginL/MarginR 全部30px（不是50px）
- WrapStyle=0 必须设置，否则多行不生效

### 2. 视频帧数计算（强制）

```
总时长 = 音频时长（秒）
总帧数 = ceil(音频时长 × 60)
所有场景帧数之和必须 = 总帧数，禁止少一帧！
```

**示例**：
- 音频时长 58.944秒 → 总帧数 = ceil(58.944 × 60) = 3540帧
- 场景分布：cover(180) + apps(720) + frameworks(900) + CTA(900) + continue(840) = 3540 ✅

### 3. 居中布局规范（强制）

```tsx
// ✅ 正确：Flexbox 绝对居中
<div style={{
  position: "absolute",
  top: 0, left: 0, right: 0, bottom: 0,
  display: "flex",
  justifyContent: "center",  // 水平居中
  alignItems: "center",       // 垂直居中
}}>

// ❌ 错误：硬编码 top 值
<div style={{ position: "absolute", top: 80 }}>
```

### 4. 场景帧数计算模板

```typescript
const FPS = 60;
const AUDIO_DURATION = 58.944; // 秒
const TOTAL_FRAMES = Math.ceil(AUDIO_DURATION * FPS);

// 场景定义（帧数必须加起来 = TOTAL_FRAMES）
const SCENES = [
  { name: "cover", from: 0, duration: Math.ceil(3 * FPS) },        // 0-180
  { name: "apps", from: 180, duration: Math.ceil(12 * FPS) },     // 180-900
  { name: "frameworks", from: 900, duration: Math.ceil(15 * FPS) }, // 900-1800
  { name: "cta", from: 1800, duration: Math.ceil(15 * FPS) },      // 1800-2700
  { name: "continue", from: 2700, duration: TOTAL_FRAMES - 2700 },  // 2700-3540
];
```

### 5. 封面图规格

| 类型 | 尺寸 | 用途 |
|------|------|------|
| 竖屏封面 | 1080×1920 | 视频封面、抖音/视频号 |
| 微信公众号封面 | 900×383 | 公众号文章封面（必须单独生成！） |
| 小红书封面 | 1440×2560 | 小红书 |

**封面生成方式（按优先级）**：
1. **baoyu-imagine（AI 生成）** ← 首选，字体大、效果好
2. **PIL（兜底）** ← 仅在 AI 不可用时使用，必须遵循字体规范

#### 5.1 PIL 封面字体规范（2026-04-27 更新）

> ⚠️ **字体路径必须是 `/System/Library/Fonts/STHeiti Medium.ttc`**，不得使用 `LiHei Pro Medium.ttc`（会导致字体无法加载）。

**PIL 封面字体速查表**：

| 封面类型 | 画布尺寸 | 标题字号 | 副标题字号 | 标签字号 | URL字号 | 标题高度占比 |
|---------|---------|---------|-----------|---------|---------|-------------|
| 竖屏 | 1080×1920 | **260-300px** | 80px | 48px | 32px | ≥10% |
| 公众号 | 900×383 | **140-180px** | 48px | 36px | 24px | ≥15% |
| 小红书 | 1440×2560 | **360-400px** | 100px | 64px | 44px | ≥10% |

**推荐字号（实测验证）**：

| 封面 | 标题 | 副标题 | 标签 | URL |
|------|------|--------|------|-----|
| 竖屏 (1080×1920) | 280px | 80px | 48px | 32px |
| 公众号 (900×383) | 160px | 48px | 36px | 24px |
| 小红书 (1440×2560) | 360px | 100px | 64px | 44px |

**PIL 封面完整代码（字体突出设计）**：
```python
from PIL import Image, ImageDraw, ImageFont
import os
FONT_PATH = '/System/Library/Fonts/STHeiti Medium.ttc'

def create_prominent_cover(output_path, size, title_size, subtitle_size, tag_size, url_size, title_y_ratio=0.18):
    w, h = size
    img = Image.new('RGB', size, color='#0D0221')
    draw = ImageDraw.Draw(img)
    
    # 暗色背景网格（不抢字体风头）
    for i in range(0, h, max(20, h//30)):
        draw.line([(0, i), (w, i)], fill='#150828', width=1)
    for i in range(0, w, max(20, w//30)):
        draw.line([(i, 0), (i, h)], fill='#150828', width=1)
    
    # 四角光晕（中心保持暗色）
    for cx, cy, r, c in [
        (int(w*0.1), int(h*0.1), int(min(w,h)*0.35), '#00FFFF'),
        (int(w*0.9), int(h*0.1), int(min(w,h)*0.25), '#FF00FF'),
        (int(w*0.1), int(h*0.9), int(min(w,h)*0.25), '#9D00FF'),
        (int(w*0.9), int(h*0.9), int(min(w,h)*0.2), '#00FFFF'),
    ]:
        for alpha in range(3, 0, -1):
            color = tuple(int(c[i:i+2], 16) for i in (1, 3, 5))
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=tuple(int(x*0.3) for x in color))
    
    # 字体加载
    font_title = ImageFont.truetype(FONT_PATH, title_size)
    font_subtitle = ImageFont.truetype(FONT_PATH, subtitle_size)
    font_tag = ImageFont.truetype(FONT_PATH, tag_size)
    font_url = ImageFont.truetype(FONT_PATH, url_size)
    
    # 自校验
    bbox = draw.textbbox((0, 0), 'Title', font=font_title, anchor='mm')
    title_height = bbox[3] - bbox[1]
    ratio = title_height / h * 100
    print(f"Title: {title_height}px ({ratio:.1f}%)")
    assert ratio >= 10, f"Too small: {ratio:.1f}%"
    
    # 多层发光标题（字体突出）
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
    
    # 副标题/标签/URL...
    img.save(output_path, 'PNG')
    print(f"{output_path}: {os.path.getsize(output_path)/1024:.1f}KB")

# 使用
create_prominent_cover('cover.png', (1080,1920), 280, 80, 48, 32, 0.18)
create_prominent_cover('cover-wechat.png', (900,383), 160, 48, 36, 24, 0.32)
create_prominent_cover('cover-xhs.png', (1440,2560), 360, 100, 64, 44, 0.16)
```

**自校验机制**：生成后必须验证标题高度占比 ≥10%（竖屏/小红书）或 ≥15%（公众号）。

**macOS 可用字体**：`/System/Library/Fonts/STHeiti Medium.ttc` ✅

> ⚠️ PIL 封面必须自校验：1. 字体路径正确 2. 标题高度≥10% 3. 文件大小>30KB

### 6. 赛博朋克风格规范（默认风格）

```typescript
const CYBER = {
  bg: "#0D0D1A",           // 深空黑背景
  neonCyan: "#00FFFF",      // 霓虹青色
  neonMagenta: "#FF00FF",   // 霓虹品红
  neonPurple: "#9D00FF",    // 霓虹紫色
  darkPurple: "#1A0033",    // 深紫色
  gridLine: "#1A1A3A",      // 网格线
  text: "#FFFFFF",           // 白色文字
  muted: "#8888AA",          // 灰色文字
};
```

**视觉元素**：
- 背景网格：`backgroundImage: linear-gradient(gridLine, transparent)`
- 霓虹发光：`textShadow: 0 0 20px neonCyan`
- 渐变光效：`linear-gradient(180deg, neonCyan 20%, transparent)`
- 边框光条：`boxShadow: 0 0 20px neonColor`

### 7. 文件清理规则

渲染完成后**立即删除所有中间文件**：

```
video_raw.mp4
video_audio.mp4
video_cyber.mp4
video_v2.mp4
video_static.mp4
video_noaudio.mp4
video_with_audio.mp4
```

只保留：
```
final-with-subs.mp4  ← 最终视频（字幕已烧录）
```

### 8. 渲染流程

```
Step 1: 渲染无音频视频 → video_raw.mp4
Step 2: 合并音频 → video_audio.mp4
Step 3: 烧录字幕(72px) → final-with-subs.mp4
Step 4: 删除所有中间文件
```

**注意**：Remotion 组件中**不要**集成字幕，字幕通过 ffmpeg 烧录。

---

## 🔢 参数速查表

| 参数 | 值 | 说明 |
|------|------|------|
| 分辨率 | 1080×1920 | 竖屏9:16 |
| 帧率 | 60fps | 固定 |
| 字幕大小 | 72px | ≥36px，推荐72px |
| 字幕颜色 | #00FFFF | 黄色 |
| 字幕距底边 | 30px | MarginV=30，左右边距也是30px |
| 音频码率 | 128kbps | AAC |
| 视频码率 | CRF 22 | H.264 |

---

## 🚫 禁止事项

1. **禁止**字幕 < 72px
2. **禁止**场景帧数之和 < 总帧数（会导致黑屏）
3. **禁止**使用 `top: xxx px` 硬编码布局
4. **禁止**保留中间文件
5. **禁止**封面使用 PIL 作为首选（必须用 baoyu-imagine）
6. **禁止**在 Remotion 中集成字幕（用 ffmpeg 烧录）

---

## ✅ 质量检查清单

渲染完成后**必须验证**：
- [ ] 视频总时长 = 音频时长（允许 ±0.5秒误差）
- [ ] 字幕清晰可读（≥72px）
- [ ] 无黑屏（最后帧 = 延续场景）
- [ ] 只有 final-with-subs.mp4 一个视频文件
- [ ] 封面图存在且尺寸正确（1080×1920）
- [ ] 封面由 AI 生成（非 PIL 兜底）

---

## 📝 经验总结

### 为什么封面必须用 AI 生成？

PIL 字体渲染存在限制：
- 字体实际渲染大小可能小于指定字号
- 字体间距和行高计算不准确
- 生成的封面字体偏小，不够醒目

baoyu-imagine（Seedream）生成效果：
- 字体大小由 AI 自动优化
- 视觉效果更专业
- 霓虹发光效果更自然

### 为什么字幕要在 ffmpeg 烧录？

Remotion 字幕集成问题：
- 字幕样式控制不精确
- 渲染速度慢
- 与音频同步复杂

ffmpeg 烧录优势：
- 字幕样式精确控制（72px、PingFang SC）
- 渲染速度快
- 字幕与音频完美同步
