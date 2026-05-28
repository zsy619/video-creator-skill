# generate_cover.py attrs 标签增强（2026-05-27）

## 背景
osiris 项目封面需要渲染 4 项技术属性标签（WebGL渲染引擎 / 15层数据可视化 / 60fps流畅体验 / MIT开源协议），而原版 `generate_cover.py` 仅渲染 title + subtitle。

## 增强方案

在 `draw_title_subtitle()` 之后新增 `draw_attrs_section()`：

```python
def draw_attrs_section(draw, attrs, img_width, img_height, bg_color_rgb):
    """底部 attrs 标签区域：两行四列排列 + 霓虹描边"""
    if not attrs:
        return

    # 画布底部 78% 以上开始渲染
    attr_top = int(img_height * 0.78)
    line_h = 36
    badge_radius = 6
    padding = 8
    cols = 4

    # 每行 badge 宽度（画布宽 1080，左右各 60px 边距，4 列）
    avail_w = img_width - 120
    badge_w = (avail_w - padding * (cols - 1)) // cols

    for row in range(2):
        for col in range(cols):
            idx = row * cols + col
            if idx >= len(attrs):
                return
            text = attrs[idx]
            l = 60 + col * (badge_w + padding)
            t = attr_top + row * (line_h + 12)
            r = l + badge_w
            b = t + line_h

            # 圆角矩形背景（深色半透明）
            bg_alpha = 90
            bg_fill = (*bg_color_rgb, bg_alpha)
            draw.rounded_rectangle([l, t, r, b], radius=badge_radius, fill=bg_fill)

            # 霓虹描边
            neon_colors = [(0, 200, 255), (255, 80, 120), (80, 255, 160), (255, 200, 0)]
            nc = neon_colors[idx % len(neon_colors)]
            draw.rounded_rectangle([l, t, r, b], radius=badge_radius, outline=nc, width=2)

            # 文字居中（白色，小字体）
            font_use = font_small
            bbox = draw.textbbox((0, 0), text, font=font_use)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            tx = l + (badge_w - tw) // 2
            ty = t + (line_h - th) // 2 - 2
            draw.text((tx, ty), text, font=font_small, fill=(255, 255, 255))
```

## 调用位置

在 `draw_title_subtitle()` 之后调用：
```python
# 标题 + 副标题
draw_title_subtitle(...)

# attrs 标签（新增）
if attrs:
    draw_attrs_section(draw, attrs, img_width, img_height, bg_color_rgb)
```

## attrs 数据来源

`video-config.json` 的 `cover.attrs` 数组，示例：
```json
"cover": {
  "title": "Osiris",
  "subtitle": "全球摄像头开放平台",
  "attrs": [
    "WebGL渲染引擎",
    "15层数据可视化",
    "60fps流畅体验",
    "MIT开源协议"
  ]
}
```

## 亮度要求

渲染后必须验证：
```bash
python3 -c "
from PIL import Image; import numpy as np
img = Image.open('cover.png'); arr = np.array(img)
# 标题区域（顶部 15%）
title = arr[int(arr.shape[0]*0.08):int(arr.shape[0]*0.15)].mean()
# 标签区域（底部 78% 以下）
tags = arr[int(arr.shape[0]*0.78):].mean()
print(f'标题亮度:{title:.1f} 标签亮度:{tags:.1f}')
assert title >= 25, f'标题过暗: {title}'
assert tags >= 10, f'标签过暗: {tags}'
"
```

## 同步到 docs/assets/

封面图需同步复制到两处：
```bash
cp cover.png cover-wechat.png cover-xhs.png docs/assets/
```

## 原版 vs 增强版对比

| 特性 | 原版 | 增强版 |
|------|------|--------|
| 标题 | ✅ | ✅ |
| 副标题 | ✅ | ✅ |
| attrs 标签 | ❌ | ✅ 两行四列 |
| 霓虹描边 | ❌ | ✅ 4 色循环 |
| 亮度验证 | 仅标题 | 标题 + 标签 |