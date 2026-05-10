# 封面图 smart_resize_text() 自动缩放函数

> **日期**：2026-05-10
> **来源**：封面图生成反复修订根因分析 + 修复执行

## 背景

封面图的主标题字号在技能文档中存在三套互相冲突的规范：
- UNIFIED_RULES.md：竖屏 280px（极端，会溢出）
- cover-generate-2026-05-10.md：竖屏 130px（但有另一说 360px）
- FONTS.md：说法模糊

**核心问题**：没有"标题过长自动缩放"机制——直接用固定字号渲染，中文长标题必然溢出画布。

## 实测数据（STHeiti Medium.ttc）

| 指定字号 | 实际渲染高度 | 渲染宽度（12字中文） | 画布宽度 | 是否溢出 |
|---------|------------|-------------------|---------|---------|
| 130px | 81px | 943px | 1080px (90%=972px) | 溢出 |
| 60px | 37px | 437px | 1080px | 安全 |
| 36px | 22px | 262px | 1080px | 安全 |

> **关键发现**：STHeiti @ 130px 的渲染效率约 62%（81/130），比英文字体低很多。

## smart_resize_text() 函数

```python
from PIL import Image, ImageDraw, ImageFont

FONT_PATH = '/System/Library/Fonts/STHeiti Medium.ttc'

def measure_text(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font, anchor='mm')
    return bbox[2] - bbox[0], bbox[3] - bbox[1]

def smart_resize_text(text, font_path, start_size, canvas_width, max_ratio=0.90, min_size=24):
    """
    自动缩小字号直到文字宽度 < canvas_width * max_ratio。
    
    参数:
        text:          要渲染的文字
        font_path:     字体文件路径
        start_size:    起始字号（安全上限）
        canvas_width:  画布宽度（像素）
        max_ratio:     最大宽度占比（默认 90%）
        min_size:      最小字号（低于此值报错，不继续缩）
    
    返回: (font对象, 最终宽度, 最终高度)
    抛出: ValueError — 达到最小字号仍超出
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

    font = ImageFont.truetype(font_path, min_size)
    w, h = measure_text(dummy_draw, text, font)
    raise ValueError(
        f"标题宽度({w}px)即使缩到最小字号({min_size}px)"
        f"仍超过画布90%({canvas_width * max_ratio:.0f}px)，"
        f"请缩短标题文字。"
    )
```

## 三种画布的字号安全上限

| 画布类型 | 尺寸 | 主标题安全上限 | 副标题安全上限 | min_size |
|---------|------|-------------|-------------|---------|
| 竖屏 | 1080x1920 | 130px | 60px | 24px |
| 公众号 | 900x383 | 100px | 48px | 24px |
| 小红书 | 1440x2560 | 180px | 80px | 24px |

## 质量门禁节点 E（video-quality-gate.js）

覆盖三种封面的检查：

| 检查项 | 标准 | 失败处理 |
|--------|------|---------|
| 文件存在 | cover.png / cover-wechat.png / cover-xhs.png | 报错 |
| 尺寸正确 | ffprobe 读取，确认 wxh | 报错 |
| 文件大小 | > 20KB | 报错 |

运行方式：
```bash
node ~/.hermes/skills/video-creator/scripts/video-quality-gate.js <project-dir> cover
```

## AI 生成（baoyu-imagine）的标题策略

当使用 baoyu-imagine AI 生成封面时，必须在 prompt 中包含标题处理指令：

```
【标题文字处理规则 — 必须遵守】
1. 标题必须完整显示，不得截断或省略任何字
2. 如标题超过 8 个字：自动缩小字体但必须保持清晰可读（不得小于 48px）
3. 如标题超过 14 个字：可拆分为两行展示（主标题 + 副标题结构）
4. 字体颜色：白色（#FFFFFF），外发光青色（#00FFFF）效果
5. 标题位置：画面垂直方向约 18-25% 高度处居中
```

## 相关文件

- `scripts/generate_cover.py` — 完整 PIL 兜底脚本（已集成 smart_resize_text）
- `rules/UNIFIED_RULES.md` Section 5 — 封面图规格（最终权威）
- `rules/WORKFLOW.md` Step 0.3 — 封面生成工作流（含 0.3a-e 详细步骤）
