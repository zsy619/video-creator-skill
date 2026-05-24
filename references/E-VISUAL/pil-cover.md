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

## video-config.json attrs 字段规范

**`attrs` 必须是数组，不是字符串。**

launch.sh 中使用以下逻辑读取：
```javascript
COVER_ATTRS=$(node -e "console.log((require('${config_file}').cover?.attrs || require('${config_file}').attrs || []).join(','))")
```

## inferredTheme 主题配色（30 套）

封面配色由 `inferredTheme` 字段控制，通过 launch.sh Step -1 自动读取。

> **完整 30 套配色方案**见 [E-VISUAL/theme-palette.md](../E-VISUAL/theme-palette.md)，以下为核心速查表：

|| inferredTheme | 配色主调 | 适用场景 |
||--------------|---------|---------|
|| `tech-modern` | 科技蓝+紫 | 科技产品、AI工具 |
|| `cyberpunk` | 深紫+霓虹 | 科技/开源/工具 |
|| `neon-future` | 绿+粉霓虹 | 创新、前沿 |
|| `minimal-tech` | 墨灰+纯白 | 高端品牌、金融 |
|| `particle-tech` | 青+金+紫 | 数据、科学 |
|| `gradient-wave` | 青绿+紫+粉 | 设计、创意 |
|| `glass-morphism` | 半透明白 | 时尚、品牌 |
|| `holographic` | 青+蓝+紫 | AR/VR、元宇宙 |
|| `data-stream` | 绿色矩阵 | 大数据、金融 |
|| `quantum-tech` | 粉+青+黄绿 | 量子、物理 |
|| `vibrant-gradient` | 橙+金+绿 | 生活方式、健身 |
|| `aurora-gradient` | 青+紫+粉 | 视觉艺术 |
|| `forest-nature` | 森林绿+金 | 环保、户外 |
|| `deep-ocean` | 深海青+靛蓝 | 海洋、环保 |
|| `arctic-ice` | 冰蓝+淡紫 | 冰雪、能源 |
|| `dark-minimal` | 墨灰+纯白 | 专业服务 |
|| `neon-city` | 玫红+紫+金 | 夜生活、音乐 |
|| `fintech` | 深绿+金 | 金融、投资 |
|| `pure-medical` | 天空蓝+青绿 | 医疗、生物 |
|| `autumn-vintage` | 枫红+橙黄 | 复古、艺术 |
|| `game-elite` | 紫色+玫红 | 游戏、电竞 |
|| `education-blue` | 深蓝+浅蓝 | 课程、教育 |
|| `food-warm` | 暖橙+金色 | 美食、探店 |
|| `travel-vibrant` | 天蓝+橙色 | 旅行、冒险 |
|| `music-beat` | 粉+金 | 音乐、音频 |
|| `news-official` | 深蓝主调 | 新闻、时事 |
|| `pet-cute` | 粉色系 | 宠物、萌宠 |
|| `auto-tech` | 青+绿+橙 | 汽车、科技 |
|| `startup-energy` | 深绿+金 | 创业、投资 |
|| `luxury-elegant` | 黑金配色 | 奢侈品、品牌 |

> 旧版别名：`health-fresh` → `particle-tech`，`education-calm` → `aurora-gradient`，`gaming-neon` → `game-elite`

### 手动覆盖

在 `video-config.json` 中手动指定主题：
```json
"inferredTheme": "food-warm"
```

如果 `attrs` 是字符串 `"开源免费"`，`.join(',')` 会报错：
```
TypeError: "开源免费".join is not a function
```

正确格式：
```json
"attrs": ["开源免费", "本地运行", "隐私保护"]
```

错误格式（会报错）：
```json
"attrs": "开源免费"   // ❌ 字符串，join() 不是函数
```

## 相关文件

- `/Users/zhushuyan/.baoyu-skills/ui-tars-desktop/pil-cover-template.md` — 原始模板（2026-05-08）