# 封面图生成规范

> 所属模块：video-creator / SKILL.md → Step 6 封面图生成

## 封面图生成规则

> ⚠️ **重要**：封面图是强制必选项，生成后才能进入音频和渲染步骤。

### 封面图类型

| 平台 | 分辨率 | 比例 | 文件名 | 输出路径 |
|------|--------|------|--------|----------|
| 视频号 | 1080×1920 | 9:16 | `cover.png` | `docs/assets/` |
| 公众号 | 900×383 | ≈2.35:1 | `cover-wechat.png` | `docs/assets/` |
| 小红书 | 1440×2560 | 9:16 | `cover-xhs.png` | `docs/assets/` |

---

## PIL 生成规则（推荐）

### 主题配置

```python
# tech-modern 主题配色
THEME = {
    'backgroundColor': '#0F172A',  # 深蓝黑
    'primaryColor': '#2563EB',      # 蓝色
    'secondaryColor': '#7C3AED',    # 紫色
    'accentColor': '#10B981',       # 绿色
    'textColor': '#F8FAFC',         # 白色
}
```

### 完整生成脚本

```python
from PIL import Image, ImageDraw, ImageFont
import os
import random

PROJECT = '/path/to/project'

THEME = {
    'backgroundColor': '#0F172A',
    'primaryColor': '#2563EB',
    'textColor': '#F8FAFC',
}

def hex_to_rgb(hex_color):
    h = hex_color.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def draw_gradient_background(draw, width, height, color1, color2):
    c1 = hex_to_rgb(color1)
    c2 = hex_to_rgb(color2)
    for y in range(height):
        ratio = y / height
        r = int(c1[0] + (c2[0] - c1[0]) * ratio)
        g = int(c1[1] + (c2[1] - c1[1]) * ratio)
        b = int(c1[2] + (c2[2] - c1[2]) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

def load_chinese_font(font_size):
    font_paths = [
        '/System/Library/Fonts/Hiragino Sans GB.ttc',
        '/System/Library/Fonts/PingFang.ttc',
        '/Library/Fonts/Arial Unicode.ttf',
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, font_size)
            except:
                continue
    return ImageFont.load_default()

def create_cover(width, height, title, subtitle, output_path):
    img = Image.new('RGB', (width, height), color=THEME['backgroundColor'])
    draw = ImageDraw.Draw(img)
    
    # 渐变背景
    draw_gradient_background(draw, width, height, '#0F172A', '#1E293B')
    
    # 粒子装饰（固定种子保证可复现）
    random.seed(42)
    for _ in range(50):
        x = random.randint(0, width)
        y = random.randint(0, height)
        size = random.randint(1, 3)
        color = (random.randint(30, 60), random.randint(80, 150), random.randint(200, 255))
        draw.ellipse([x, y, x+size, y+size], fill=color)
    
    # 字体大小（根据宽度计算）
    title_font_size = max(int(width * 0.067), 60)
    sub_font_size = max(int(width * 0.041), 36)
    title_font = load_chinese_font(title_font_size)
    sub_font = load_chinese_font(sub_font_size)
    
    # 主标题（换行处理）
    lines = title.split('\n')
    current_y = (height - (len(lines) * title_font_size)) // 2 - 50
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        text_width = bbox[2] - bbox[0]
        x = (width - text_width) // 2
        draw.text((x, current_y), line, fill=THEME['textColor'], font=title_font)
        current_y += title_font_size + 10
    
    # 副标题
    sub_bbox = draw.textbbox((0, 0), subtitle, font=sub_font)
    sub_width = sub_bbox[2] - sub_bbox[0']
    draw.text(((width - sub_width) // 2, current_y + 40), subtitle, fill=THEME['primaryColor'], font=sub_font)
    
    # 装饰线
    line_y = height - 150
    draw.rectangle([(width // 4, line_y), (3 * width // 4, line_y + 3)], fill=THEME['primaryColor'])
    
    img.save(output_path, 'PNG', quality=95)
    print(f"✅ {os.path.basename(output_path)}: {width}x{height}")

# 使用示例
title = "让你的 AI 成为\n知识管家"
subtitle = "Obsidian LLM Wiki"

create_cover(1080, 1920, title, subtitle, f'{PROJECT}/docs/assets/cover.png')
create_cover(900, 383, title, subtitle, f'{PROJECT}/docs/assets/cover-wechat.png')
create_cover(1440, 2560, title, subtitle, f'{PROJECT}/docs/assets/cover-xhs.png')
```

---

## 封面图校验清单

生成后必须校验以下项目：

| 检查项 | 标准 | 方法 |
|--------|------|------|
| 尺寸 | 1080×1920 / 900×383 / 1440×2560 | PIL Image.size |
| 比例 | 0.562:1 / 2.350:1 / 0.562:1 | w / h |
| 字体 | Hiragino Sans GB 无乱码 | 系统字体验证 |
| 格式 | PNG | PIL Image.format |
| 文件大小 | > 20KB | os.path.getsize |

### 校验脚本

```python
from PIL import Image
import os

def verify_cover(path, expected_w, expected_h, platform):
    img = Image.open(path)
    w, h = img.size
    size_mb = os.path.getsize(path) / 1024 / 1024
    
    print(f"\n【{platform}】{os.path.basename(path)}")
    print(f"  尺寸: {w}x{h} {'✅' if w == expected_w and h == expected_h else '❌'}")
    print(f"  大小: {size_mb:.2f} MB")
    print(f"  格式: {img.format}")
    return w == expected_w and h == expected_h

# 校验
verify_cover('docs/assets/cover.png', 1080, 1920, '视频号')
verify_cover('docs/assets/cover-wechat.png', 900, 383, '公众号')
verify_cover('docs/assets/cover-xhs.png', 1440, 2560, '小红书')
```

---

## 主题配色参考

| 主题 ID | 名称 | backgroundColor | primaryColor | textColor |
|---------|------|-----------------|--------------|-----------|
| tech-modern | 科技现代风 | #0F172A | #2563EB | #F8FAFC |
| particle-tech | 粒子科技风 | #0A0E27 | #00D4FF | #FFFFFF |
| cyber-punk | 赛博朋克风 | #0D0221 | #FF00FF | #00FFFF |
| nature | 自然清新风 | #F0FDF4 | #10B981 | #166534 |
| warm | 温暖治愈风 | #FFFBEB | #F59E0B | #78350F |

---

## 常见问题

### Q: 字体乱码
A: 必须使用 `Hiragino Sans GB.ttc`（macOS 中文显示最佳）

### Q: AI 生成封面字体乱码
A: 降级使用 PIL 直接生成，避免 AI 生成中文字体

### Q: 比例不对
A: 先按 16:9 生成，然后 PIL 裁剪为目标比例

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `docs/assets/cover.png` | 视频号封面 |
| `docs/assets/cover-wechat.png` | 公众号封面 |
| `docs/assets/cover-xhs.png` | 小红书封面 |
