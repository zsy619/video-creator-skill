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
Fontsize: 72px     ← 竖屏(1080x1920)必须≥72px（约40px视觉，已验证）
Font: PingFang SC
Color: &H00FFFF (黄色)
Alignment: 2 (底部居中)
MarginL: 30px      ← 左边距30px
MarginR: 30px      ← 右边距30px
MarginV: 50px      ← 距底边50px（增加避免贴边）
Outline: 2px       ← 2px黑色描边（1px太细）
Shadow: 0          ← 无阴影（霓虹风格用发光效果更好）
WrapStyle: 0        ← 多行支持（必须设置）
换行符: \N          ← ASS格式必须用\N，不是\\n

每行字数: ≤25字符   ← 72px字体下25字符约900px，1080px内安全
PlayResX: 1080
PlayResY: 1920
```
⚠️ **铁律警告**：
- 换行符必须用 `\N`（ASS格式），不是 `\n`
- 每行最多25字符，避免超出1080px画面
- **MarginV=50px**（距底边），MarginL/MarginR=30px（不是全部30px）
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

### 2.5 atempo 反模式门禁（强制，2026-05-10 新增）

**问题根因**：先生成超长配音 → atempo 加速 → 裁剪 → 基于错误时长生成字幕 → 音画不同步

**正确做法**：基于配音文本 + 目标时长，直接生成正确长度的音频，不依赖 atempo 加速。

**强制门禁**：音频时长偏差 > 5% → 退出码=1，禁止继续

```bash
# audio/neural_1_2x.m4a 时长偏差检查（嵌入 video-quality-gate.js 节点 A）
TARGET_DURATION=60   # 从 video-config.json 或 duration.txt 读取
ACTUAL=$(ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=nokey=1 audio/neural_1_2x.m4a)
DIFF=$(python3 -c "print(abs($ACTUAL - $TARGET_DURATION) / $TARGET_DURATION * 100)")
if [ "$(python3 -c "exit(0 if $DIFF <= 5 else 1)")" -eq 0 ]; then
  echo "✅ 音频时长偏差 ${DIFF}%（≤5%）"
else
  echo "❌ 音频时长偏差 ${DIFF}%（>5%），可能存在 atempo+裁剪反模式"
  exit 1
fi
```

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

#### 5.1 三种画布类型

| 类型 | 尺寸 | 用途 |
|------|------|------|
| 竖屏封面 | 1080×1920 | 视频封面、抖音/视频号 |
| 微信公众号封面 | 900×383 | 公众号文章封面（必须单独生成！） |
| 小红书封面 | 1440×2560 | 小红书 |

#### 5.2 封面生成优先级

1. **baoyu-imagine（AI 生成）** ← 首选，字体大、效果好，AI 自动处理长标题
2. **PIL（兜底）** ← 仅在 AI 不可用时使用，必须使用 `smart_resize_text()` 自动缩放

#### 5.3 字号规范（安全字号上限）

> ⚠️ **字号是上限，不是固定值**。所有文字必须经过 `smart_resize_text()` 检测，超出画布 90% 宽度时自动缩小。

| 封面类型 | 画布尺寸 | 主标题安全上限 | 副标题安全上限 | 标签 | URL |
|---------|---------|--------------|--------------|------|-----|
| 竖屏 | 1080×1920 | **130px** | 60px | 42px | 24px |
| 公众号 | 900×383 | **100px** | 48px | 36px | 20px |
| 小红书 | 1440×2560 | **180px** | 80px | 56px | 32px |

**说明**：130px 的意思是"不超过 130px"，实际使用 `smart_resize_text()` 从此值开始向下缩放。

#### 5.4 `smart_resize_text()` — 标题自动缩放函数

> **核心铁律**：PIL 封面生成时，所有文字（主标题/副标题/标签/URL）必须经过此函数检测。
> 禁止直接用固定字号渲染而不检测宽度。

```python
from PIL import Image, ImageDraw, ImageFont

FONT_PATH = '/System/Library/Fonts/STHeiti Medium.ttc'

def measure_text(draw, text, font):
    """测量文字渲染后的 (width, height)"""
    bbox = draw.textbbox((0, 0), text, font=font, anchor='mm')
    return bbox[2] - bbox[0], bbox[3] - bbox[1]

def smart_resize_text(text, font_path, start_size, canvas_width, max_ratio=0.90, min_size=24):
    """
    自动缩小字号直到文字宽度 < canvas_width * max_ratio。

    参数:
        text: 要渲染的文字
        font_path: 字体文件路径
        start_size: 起始字号（安全上限）
        canvas_width: 画布宽度（像素）
        max_ratio: 最大宽度占比（默认 90%）
        min_size: 最小字号（低于此值报错，不继续缩）

    返回: (font对象, 最终宽度, 最终高度)

    示例:
        font, w, h = smart_resize_text("很长的主标题", FONT_PATH, 130, 1080)
        draw.text((540, 300), "很长的主标题", fill='white', font=font, anchor='mm')
    """
    size = start_size
    dummy_img = Image.new('RGB', (1, 1))
    dummy_draw = ImageDraw.Draw(dummy_img)

    while size >= min_size:
        font = ImageFont.truetype(font_path, size)
        w, h = measure_text(dummy_draw, text, font)
        if w <= 0:
            break
        if w <= canvas_width * max_ratio:
            return font, w, h
        size -= 4  # 每次缩小 4px

    # 达到最小字号仍超出，报错（不能静默截断）
    font = ImageFont.truetype(font_path, min_size)
    w, h = measure_text(dummy_draw, text, font)
    raise ValueError(
        f"标题宽度({w}px)即使缩到最小字号({min_size}px)仍超过画布90%({canvas_width * max_ratio:.0f}px)，"
        f"请缩短标题文字或修改 canvas_width"
    )
```

**调用模式**：

```python
# 主标题（从 130px 开始向下缩放，最小 24px）
font_title, title_w, title_h = smart_resize_text(
    "AI工作流自动化实战指南",
    FONT_PATH, 130, 1080
)

# 副标题（从 60px 开始）
font_sub, sub_w, sub_h = smart_resize_text(
    "多平台同步管理",
    FONT_PATH, 60, 1080
)
```

#### 5.5 PIL 封面完整代码（使用 smart_resize_text）

```python
from PIL import Image, ImageDraw, ImageFont
import os

FONT_PATH = '/System/Library/Fonts/STHeiti Medium.ttc'

# ========== 字号安全上限（不能超过这些值）==========
TITLE_SIZES = {
    'vertical': 130,    # 竖屏 1080x1920
    'wechat':  100,     # 公众号 900x383
    'xhs':     180,     # 小红书 1440x2560
}
SUBTITLE_SIZES = {
    'vertical': 60,
    'wechat':  48,
    'xhs':     80,
}
TAG_SIZES = {
    'vertical': 42,
    'wechat':  36,
    'xhs':     56,
}
URL_SIZES = {
    'vertical': 24,
    'wechat':  20,
    'xhs':     32,
}
CANVAS_SIZES = {
    'vertical': (1080, 1920),
    'wechat':  (900, 383),
    'xhs':     (1440, 2560),
}

def smart_resize_text(text, font_path, start_size, canvas_width, max_ratio=0.90, min_size=24):
    size = start_size
    dummy_img = Image.new('RGB', (1, 1))
    dummy_draw = ImageDraw.Draw(dummy_img)
    while size >= min_size:
        font = ImageFont.truetype(font_path, size)
        bbox = dummy_draw.textbbox((0, 0), text, font=font, anchor='mm')
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        if w <= 0: break
        if w <= canvas_width * max_ratio:
            return font, w, h
        size -= 4
    font = ImageFont.truetype(font_path, min_size)
    bbox = dummy_draw.textbbox((0, 0), text, font=font, anchor='mm')
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    raise ValueError(f"标题宽度({w}px)即使缩到最小({min_size}px)仍超画布90%，请缩短标题")

def create_cover(title, subtitle, output_path, canvas_type='vertical'):
    """
    生成封面图。使用 smart_resize_text() 自动处理长标题。

    参数:
        title: 主标题（超过8字会自动缩放）
        subtitle: 副标题
        output_path: 输出文件路径
        canvas_type: 'vertical' | 'wechat' | 'xhs'
    """
    w, h = CANVAS_SIZES[canvas_type]
    img = Image.new('RGB', (w, h), '#0D0221')
    draw = ImageDraw.Draw(img)

    # 背景网格
    for i in range(0, h, max(20, h // 30)):
        draw.line([(0, i), (w, i)], fill='#150828', width=1)
    for i in range(0, w, max(20, w // 30)):
        draw.line([(i, 0), (i, h)], fill='#150828', width=1)

    # 四角光晕
    for cx_pct, cy_pct, r_pct, color in [
        (0.1, 0.1, 0.35, '#00FFFF'),
        (0.9, 0.1, 0.25, '#FF00FF'),
        (0.1, 0.9, 0.25, '#9D00FF'),
        (0.9, 0.9, 0.2,  '#00FFFF'),
    ]:
        cx, cy = int(w * cx_pct), int(h * cy_pct)
        r = int(min(w, h) * r_pct)
        rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=tuple(int(x * 0.3) for x in rgb))

    # ========== 文字渲染（全部使用 smart_resize_text）==========
    X = w // 2

    # ---- 文字尺寸计算 ----
    font_title, title_w, title_h = smart_resize_text(title, FONT_PATH, TITLE_SIZES[canvas_type], w)
    gap = 40
    if subtitle:
        font_sub, sub_w, sub_h = smart_resize_text(subtitle, FONT_PATH, SUBTITLE_SIZES[canvas_type], w)
    else:
        font_sub, sub_w, sub_h = None, 0, 0

    # ---- 整体垂直居中 ----
    # 大标题 + 副标题作为整体，在画布垂直方向居中
    total_height = title_h + gap + sub_h if subtitle else title_h
    start_y = (h - total_height) // 2
    title_y = start_y

    # ---- 主标题（多层霓虹发光）----
    for glow_size, glow_color in [
        (int(TITLE_SIZES[canvas_type] * 0.08), '#004444'),
        (int(TITLE_SIZES[canvas_type] * 0.05), '#006666'),
        (int(TITLE_SIZES[canvas_type] * 0.03), '#008888'),
        (int(TITLE_SIZES[canvas_type] * 0.015), '#00CCCC'),
    ]:
        for dx, dy in [(0, -glow_size), (0, glow_size), (-glow_size, 0), (glow_size, 0)]:
            draw.text((X + dx, title_y + dy), title, fill=glow_color, font=font_title, anchor='mm')
    draw.text((X, title_y), title, fill='#FFFFFF', font=font_title, anchor='mm')

    # ---- 副标题（垂直居中，跟在主标题下方）----
    if subtitle:
        sub_y = title_y + title_h + gap
        draw.text((X, sub_y), subtitle, fill='#00FFFF', font=font_sub, anchor='mm')

    # 3. 自校验：标题高度占比 ≥8%
    height_ratio = title_h / h * 100
    assert height_ratio >= 8, f"标题高度占比 {height_ratio:.1f}% < 8%，字号可能过小"
    assert title_w <= w * 0.90, f"标题宽度 {title_w}px > 画布90% {w * 0.9:.0f}px"

    img.save(output_path, 'PNG')
    size_kb = os.path.getsize(output_path) / 1024
    print(f"✅ {output_path} | {w}x{h} | 标题{height_ratio:.1f}%画布 | {size_kb:.0f}KB")

# 使用示例
if __name__ == '__main__':
    create_cover(
        "AI工作流自动化实战指南",
        "多平台同步管理",
        "docs/assets/cover.png",
        canvas_type='vertical'    # 竖屏 1080x1920
    )
    create_cover(
        "AI工作流自动化实战指南",
        "多平台同步管理",
        "docs/assets/cover-wechat.png",
        canvas_type='wechat'      # 公众号 900x383
    )
    create_cover(
        "AI工作流自动化实战指南",
        "多平台同步管理",
        "docs/assets/cover-xhs.png",
        canvas_type='xhs'         # 小红书 1440x2560
    )
```

#### 5.6 自校验机制（生成后必须验证）

| 检查项 | 标准 | 失败处理 |
|--------|------|---------|
| 主标题宽度 | ≤ 画布宽 × 90% | 报错（由 smart_resize_text 抛出） |
| 标题高度占比 | ≥ 8%（竖屏/小红书）/ ≥ 10%（公众号） | 报错 |
| 字体路径 | `/System/Library/Fonts/STHeiti Medium.ttc` 存在 | 报错 |
| 文件大小 | > 20KB | 重新生成 |
| 画布尺寸 | 与声明一致 | 报错 |

#### 5.7 AI 生成封面（baoyu-imagine）的标题策略

> baoyu-imagine AI 生成时，必须在 prompt 中明确告知 AI 如何处理长标题。

**AI Prompt 关键指令**：

```
【标题文字处理规则 — 必须遵守】
1. 标题必须完整显示，不得截断或省略任何字
2. 如标题超过 8 个字：自动缩小字体但必须保持清晰可读（不得小于 48px）
3. 如标题超过 14 个字：可拆分为两行展示（主标题 + 副标题结构）
4. 字体颜色：白色（#FFFFFF），外发光青色（#00FFFF）效果
5. 标题位置：画面垂直方向约 18-25% 高度处居中
```

**macOS 可用字体**：`/System/Library/Fonts/STHeiti Medium.ttc` ✅（仅 PIL 兜底使用）

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
| 字幕距底边 | 50px | MarginV=50px（距底边），MarginL/MarginR=30px |
| 音频码率 | 128kbps | AAC |
| 视频码率 | CRF 22 | H.264 |

---

## 🚫 禁止事项

1. **禁止**字幕 < 72px
2. **禁止**场景帧数之和 < 总帧数（会导致黑屏）
3. **禁止**使用 `top: xxx px` 硬编码布局
4. **禁止**Remotion Audio 组件（headless 环境不工作，音频通过 ffmpeg 外部注入）
5. **禁止**在 Remotion 内嵌音频轨道（Remotion 渲染输出无音频 → ffmpeg 混流）
6. **禁止**使用 `-c:a copy`（Remotion 内嵌音频轨道实际为静音 AAC）
7. **禁止**封面使用 PIL 作为首选（必须用 baoyu-imagine）
8. **禁止**在 Remotion 中集成字幕（用 ffmpeg 烧录）

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
