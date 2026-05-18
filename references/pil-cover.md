# PIL 封面生成参考

当 Seedream / DashScope 等 AI 图像 API 全部不可用时，用 Pillow 本地渲染封面图。

## 核心教训

**alpha_composite 要求两张图模式完全一致且尺寸相同。**
RGB 图无法 alpha_composite 到 RGBA 图——报错 `image has wrong mode`。正确做法：两张图都用 RGBA 模式，或者对 RGB 图单独处理透明度。

## 成功方案（tech-blue 主题，1080×1920）

```python
from PIL import Image, ImageDraw, ImageFont
import math

w, h = 1080, 1920
img = Image.new('RGBA', (w, h), (13, 2, 33, 255))  # 深紫 #0D0221

# 四角光晕（RGBA 模式确保 alpha_composite 可用）
for i, (r, g, b) in enumerate([(0, 255, 255), (255, 0, 255), (255, 0, 255), (0, 255, 255)]):
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    for rad in range(320, 0, -16):
        alpha = int(8 * (1 - rad / 320))
        draw.ellipse([w/2-rad, h/2-rad, w/2+rad, h/2+rad], fill=(r, g, b, alpha))
    img = Image.alpha_composite(img, glow)

# 网格
grid = Image.new('RGBA', (w, h), (0, 0, 0, 0))
draw = ImageDraw.Draw(grid)
for x in range(0, w, 80):
    draw.line([(x, 0), (x, h)], fill=(0, 255, 255, 20), width=1)
for y in range(0, h, 80):
    draw.line([(0, y), (w, y)], fill=(0, 255, 255, 20), width=1)
img = Image.alpha_composite(img, grid)

img.save('cover.png')
```

## 触发条件

- Seedream 返回 403 `AccountOverdueError`
- DashScope 报 `DASHSCOPE_API_KEY` 未配置
- 任何 AI 图像 API 不可用时，自动降级 PIL

## 相关文件

- `/Users/zhushuyan/.baoyu-skills/ui-tars-desktop/pil-cover-template.md` — 原始模板（2026-05-08）