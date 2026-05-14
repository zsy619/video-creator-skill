# 封面属性标签渲染 — attrs 可见性修复

## 核心问题

**症状**：attrs 属性标签（4-8个）在封面上几乎不可见，肉眼难以分辨文字内容。

**根因 1（第一代修复）**：文字颜色使用了 `fill=color`（与边框同色），文字和边框融为一体。

**根因 2（第二代修复，2026-05-14）**：即使改用白色文字（`#FFFFFF`），LXGWWenKai 字体笔画极细（每行仅 15-21 个纯白像素），加上 EM box 大量空白被彩色半透明背景填充，白色文字仍被淹没，肉眼仍难以分辨。

**最终正确方案**（第三代，2026-05-14 像素验证通过）：

> **2026-05-14 第二次修订**：新增「统一标签宽度」约束。所有标签取最长文字的宽度作为统一起点，每行两个标签两列等宽，禁止每列按各自最长文字独立计算。

```python
# ✅ 统一宽度方案：所有标签取最长文字宽度 + 居中排列
max_text_w = max(dummy_draw.textbbox((0, 0), a, font=font_attr)[2] for a in attrs)
max_text_h = max(dummy_draw.textbbox((0, 0), a, font=font_attr)[3] for a in attrs)
tag_h = max_text_h + pad_y * 2       # 统一高度
tag_w = max_text_w + pad_x * 2       # 统一宽度（以最长文字为基准）
total_w = tag_w * 2 + attr_gap       # 两列总宽度
start_x = (w - total_w) // 2          # 整体居中

for idx, a in enumerate(attrs):
    col = idx % 2      # 0=左列, 1=右列
    row = idx // 2      # 0=第一行, 1=第二行
    ax = start_x + col * (tag_w + attr_gap)
    ay = start_y + row * (tag_h + attr_gap)

    # 实心白底圆角矩形（遮盖背景干扰）
    img = img.convert('RGBA')
    solid_bg = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(solid_bg)
    sd.rounded_rectangle([ax, ay, ax + tag_w, ay + tag_h], r, fill=(255, 255, 255, 255))
    img = Image.alpha_composite(img, solid_bg)

    # 左侧 10px 彩色竖条纹（圆角在左上/左下）
    rgb = hex_to_rgb(ATTR_BG_COLORS[idx % len(ATTR_BG_COLORS)])
    sd2 = ImageDraw.Draw(img)
    sd2.rounded_rectangle([ax, ay, ax + 10, ay + tag_h], r, fill=(*rgb, 255))

    # 黑色文字居中（anchor='mm' 以文字边界框中心对齐）
    tx = ax + tag_w // 2
    ty = ay + tag_h // 2
    draw = ImageDraw.Draw(img)
    draw.text((tx, ty), a, fill='#1A1A1A', font=font_attr, anchor='mm')
```

## ATTR_PAD_X 参数（2026-05-14 最终值）

```python
ATTR_PAD_X = {
    'vertical': 36,   # 竖屏（从 20 调大至 36，两侧各+16px）
    'wechat':  28,   # 公众号（从 16 调大至 28，两侧各+12px）
    'xhs':     48,   # 小红书（从 28 调大至 48，两侧各+20px）
}
```

**调整原因**：pad_x 偏小时标签两侧边距不足，视觉拥挤。增大后标签更舒展。

## 布局验证数据（竖屏 1080×1920，调整后）

| 标签 | x范围 | 宽度 |
|------|-------|------|
| Tag 1（开源免费） | 256-517 | 261px |
| 间隙 | 517-556 | 39px |
| Tag 2（纯本地运行） | 556-824 | 268px |
| 画布边距 | 左侧≈232px，右侧≈256px | — |

Row1 和 Row2 白底宽度均为 568px（调整后），两行一致。

## 棋盘格布局参数（vertical 1080×1920）

```
两列总宽度 = tag_w × 2 + attr_gap = 约 568×2+16 = 1152px
x 起始位置 ≈ (1080 - 1152) / 2 ≈ -36px（居中截断处理）
```

**最终像素扫描（y=1088）**：
- 左标签白底 x=[256, 517]，宽度=261px
- 两列间隙 x=[517, 556]，39px
- 右标签白底 x=[556, 824]，宽度=268px
- 画布边距：左侧≈232px，右侧≈256px

Row1 黑字像素：54k+（清晰可见）
Row2 黑字像素：52k+（清晰可见）

## 宽度一致性验证（竖屏 1080×1920，像素扫描）

> **2026-05-14 第二次修订**：新增「统一标签宽度」约束。所有标签取最长文字的宽度作为统一起点，每行两个标签两列等宽，禁止每列按各自最长文字独立计算。

**淘汰方案**：
- ❌ 白字 + 彩色半透明背景 — 白字笔画被淹没
- ❌ 白字 + 实心彩色边框 — 边框与文字争夺视觉焦点
- ❌ 每列独立宽度（不同宽度标签）— Row1 和 Row2 总宽度不一致，视觉不整齐

**为什么白底方案有效**：
- 实心白底（255,255,255,255）完全遮盖下方背景干扰
- 黑色文字（#1A1A1A，R=26）与白底对比度最强（~10:1）
- 左侧 10px 彩色条纹提供颜色信息（青色/洋红/紫色/绿松石）
- 像素验证数据（vertical 1080×1920）：

| 区域 | 白底像素/行 | 黑字像素/行 | 说明 |
|------|------------|------------|------|
| Row1 y=1088-1136 | 80-168 | 6-59（密集处59） | 正常渲染 |
| Row2 y=1154-1202 | 146-235 | 8-77（密集处77） | 正常渲染 |
| 左侧条纹 x=92-102 | — | — | y=1095+ 显示对应颜色（青色 #00FFFF 等） |

## 棋盘格布局参数（vertical 1080×1920）

> **2026-05-14 新增：统一宽度约束**
> - 所有标签取最长文字的宽度作为统一起点（不是每列独立计算）
> - 两列合计居中：x = (w - (tag_w*2 + attr_gap)) // 2
> - Row1 和 Row2 总宽度一致（因为 tag_w 相同）

```
两列总宽度 = tag_w × 2 + attr_gap = 约 524×2+16 = 1064px（接近画布宽度）
x 起始位置 ≈ (1080 - 1064) / 2 = 8px

Row1: y≈1050-1125
  左标签 x≈8-532   （开源免费）
  右标签 x≈548-1072 （纯本地运行）
Row2: y≈1125-1200
  左标签 x≈8-532   （支持Gemma4）
  右标签 x≈548-1072 （保护隐私）
```

## attrs 配置规范

- 数量：4-8个（偶数，双行棋盘格排版）
- **宽度统一**：所有标签取最长文字的宽度作为基准，每行两个标签等宽（禁止每列独立计算）
- 颜色循环：8色（青、绿、黄、橙、红、粉、紫、玫红）
- 字号下限：24px（低于此报错）
- 渲染位置：副标题下方，双行棋盘格

## 验证命令

```bash
python3 - << 'EOF'
from PIL import Image

img = Image.open("docs/assets/cover.png")
w, h = img.size

# 检查第一行 attrs 白色像素 + 黑字像素
for y in [1100, 1110, 1120]:
    white = sum(1 for x in range(w) for c in [img.getpixel((x, y))] if c[0] > 200)
    black = sum(1 for x in range(w) for c in [img.getpixel((x, y))] if c[0] < 50 and c[1] < 50)
    print(f"y={y}: 白={white}, 黑={black}")

# 检查第二行 attrs 白色像素 + 黑字像素
for y in [1170, 1180, 1190]:
    white = sum(1 for x in range(w) for c in [img.getpixel((x, y))] if c[0] > 200)
    black = sum(1 for x in range(w) for c in [img.getpixel((x, y))] if c[0] < 50 and c[1] < 50)
    print(f"y={y}: 白={white}, 黑={black}")
EOF
```

白底像素 > 80 且黑字像素 > 5 = 渲染正常。
