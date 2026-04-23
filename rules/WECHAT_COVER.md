# 公众号封面图生成规范

> 所属模块：video-creator / SKILL.md → Step 6.2 封面图生成

## 何时使用

当用户要求以下操作时触发：
- "生成公众号封面图"
- "wechat-cover"
- "微信封面"
- 视频创作后自动生成多平台封面

## 封面图规格

| 平台 | 分辨率 | 比例 | 说明 |
|------|--------|------|------|
| 视频号 | 1080×1920 | 9:16 | 默认 |
| 公众号 | 900×383 | ≈2.35:1 | 使用 16:9 或 21:9 |
| 小红书 | 1440×2560 | 9:16 | 需更高分辨率 |

## 生成工具

### 方式一：baoyu-imagine（推荐）

```bash
# 使用 baoyu-imagine (Seedream)
image_generate \
  --aspectRatio 16:9 \
  --prompt "公众号封面图，横向比例。标题：xxx。风格：科技现代风，深色背景。"
```

### 方式二：PIL 代码生成（兜底）

```python
from PIL import Image, ImageDraw, ImageFont

img = Image.new('RGB', (900, 383), color='#1E3A5F')
draw = ImageDraw.Draw(img)

# 使用 Hiragino Sans GB（中文渲染最佳）
font = ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc', 80)

draw.text((450, 191), '标题', fill='white', font=font, anchor='mm')
img.save('cover-wechat.png')
```

## 封面图输出流程

### Step 1: 分析内容
从 article.md 或 video-script.md 提取：
- 核心主题（1-3个词）
- 目标受众
- 情感调性（专业/轻松/严肃/活泼）

### Step 2: 设计提示词
```
公众号封面图，[比例]。主标题：[主题]（大字体，白色）。副标题：[副主题]（[主题色]）。风格：[风格描述]。要求：简洁科技感，信息层次分明，视觉冲击力强。
```

### Step 3: 生成封面图
调用 baoyu-imagine 生成封面图

### Step 4: 保存到项目
将封面图保存为：
- `docs/assets/cover.png` (视频号 1080×1920)
- `docs/assets/cover-wechat.png` (公众号 900×383)
- `docs/assets/cover-xhs.png` (小红书 1440×2560)

## 质量检查

生成后检查：
- [ ] 分辨率正确（1080×1920 / 900×383 / 1440×2560）
- [ ] 文字清晰可读
- [ ] 色彩协调，品牌感
- [ ] 信息层次分明
- [ ] 符合平台风格

## 常见问题

### Q: 16:9 比例不支持？
A: 使用 16:9 或 21:9，然后在 PIL 中裁剪为正确比例

### Q: baoyu-imagine 不可用？
A: 降级到 PIL 代码生成

### Q: 字体渲染模糊？
A: 使用 Hiragino Sans GB 字体，设置字体大小为分辨率的 8-10%

## 集成到 video-creator 工作流

在 Step 6（生成视觉）中新增：

```
### Step 6.1: 生成视频封面
- 分辨率: 1080×1920 (9:16)
- 工具: baoyu-imagine 或 PIL

### Step 6.2: 生成公众号封面图（新增）
- 分辨率: 900×383 (≈2.35:1)
- 工具: baoyu-imagine
- 保存: docs/assets/cover-wechat.png

### Step 6.3: 生成小红书封面图
- 分辨率: 1440×2560 (9:16)
- 工具: baoyu-imagine
- 保存: docs/assets/cover-xhs.png
```
