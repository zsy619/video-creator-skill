# PIL 封面字体模板 Bug 修复记录

> **日期**：2026-05-09
> **问题**：FONTS.md 模板示例使用错误的大字号（竖屏280px而非108px），导致封面标题严重超出画布
> **影响**：所有使用该模板生成封面的项目都会出现标题被截断的问题

## 根本原因

FONTS.md 中存在自我矛盾：
1. 速查表明确规定：竖屏封面标题 **108px**（宽度×10%）
2. 示例模板却使用 `create_prominent_cover(..., 280, 80, ...)` — **280px 标题**

同时自校验逻辑错误：
- 原代码：`assert ratio >= 10` 检查的是 **高度/画布高度** 的百分比
- 问题：英文字符宽度远大于高度，标题宽度才是真正的溢出风险

## 修复内容

### 1. 模板示例数值（必须严格遵循速查表）

```python
# 错误（会导致标题超出画布）：
create_prominent_cover('cover.png', (1080,1920), 280, 80, 48, 32, 0.18)

# 正确：
create_prominent_cover('cover.png', (1080,1920), 108, 48, 32, 24, 0.18)
create_prominent_cover('cover-wechat.png', (900,383), 90, 40, 28, 20, 0.32)
create_prominent_cover('cover-xhs.png', (1440,2560), 144, 64, 48, 32, 0.16)
```

### 2. 自校验必须检查宽度

```python
# 错误（检查高度无助于防止水平溢出）：
bbox = draw.textbbox((0, 0), 'Title', font=font_title, anchor='mm')
title_height = bbox[3] - bbox[1]
ratio = title_height / h * 100
assert ratio >= 10, f"Too small: {ratio:.1f}%"

# 正确（检查宽度是否超出画布）：
bbox = draw.textbbox((0, 0), 'Title', font=font_title, anchor='mm')
title_width = bbox[2] - bbox[0]
assert title_width < w * 0.95, f"主标题超出画布: {title_width}px > {w * 0.95}px"
```

## 验证结果

修复后所有封面标题宽度控制在画布的 93-94%，安全不溢出：

| 封面 | 标题字号 | 实测宽度 | 宽度占比 |
|------|----------|----------|----------|
| 竖屏 1080×1920 | 108px | 1017px | 94.2% |
| 公众号 900×383 | 90px | 845px | 93.9% |
| 小红书 1440×2560 | 144px | 1353px | 94.0% |

## 教训

1. **文档与代码必须同步**：FONTS.md 的快速查询表和代码模板示例自相矛盾，是典型的"文档过时"问题
2. **自校验要测正确的东西**：溢出风险在宽度，不在高度；对英文标题尤其如此
3. **模板示例必须能直接运行**：错误的示例值比没有示例更有害，因为它会被直接拷贝使用
