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

- `/Users/zhushuyan/.baoyu-skills/ui-tars-desktop/pil-cover-template.md` — 原始模板（2026-05-08）# generate_cover.py 用法与常见问题（2026-05-27 修订）

## 路径问题

**`generate_cover.py` 不在 video-creator/scripts/ 内**，实际位于：
```
/Volumes/OpenClawDrive/.hermes/workspace/9router/docs/assets/generate_cover.py
```

直接在项目目录运行 `python3 generate_cover.py` 会报 `No such file`。
**正确调用方式**（在项目目录执行）：
```bash
cd /Volumes/OpenClawDrive/.hermes/workspace/osiris
python3 /Volumes/OpenClawDrive/.hermes/workspace/9router/docs/assets/generate_cover.py wechat
```

或通过 Python import（确保 PIL 可用）：
```bash
python3 - <<'EOF'
import sys
sys.path.insert(0, '/Volumes/OpenClawDrive/.hermes/workspace/9router/docs/assets')
from generate_cover import create_cover

base = '/Volumes/OpenClawDrive/.hermes/workspace/osiris'
create_cover("Osiris", "开源全球情报可视化平台", f"{base}/cover.png", 'vertical')
create_cover("Osiris", "开源全球情报可视化平台", f"{base}/cover-wechat.png", 'wechat')
create_cover("Osiris", "开源全球情报可视化平台", f"{base}/cover-xhs.png", 'xhs')
EOF
```

## 函数签名

```python
def create_cover(title, subtitle, output_path, canvas_type='vertical', attrs=None):
    # canvas_type: 'vertical'(1080×1920) | 'wechat'(900×383) | 'xhs'(1440×2560)
    # attrs: list of str, 每个 attrs 项渲染为封面底部一个独立标签（白底黑字+左侧彩色条纹）
    #         若不传或为空，使用硬编码默认标签
    #         attrs 会烧录进封面图底部属性标签带
```

**正确调用方式**（在项目目录执行）：
```bash
cd /Volumes/OpenClawDrive/.hermes/workspace/osiris
python3 /Volumes/OpenClawDrive/.hermes/workspace/9router/docs/assets/generate_cover.py wechat
```

**Python API（含 attrs）**：
```bash
python3 - <<'EOF'
import sys
sys.path.insert(0, '/Volumes/OpenClawDrive/.hermes/workspace/9router/docs/assets')
from generate_cover import create_cover

base = '/Volumes/OpenClawDrive/.hermes/workspace/osiris'
attrs = ["WebGL渲染引擎", "15层数据可视化", "60fps流畅体验", "MIT开源协议"]
create_cover("Osiris", "开源全球情报可视化平台", f"{base}/cover.png",      'vertical', attrs=attrs)
create_cover("Osiris", "开源全球情报可视化平台", f"{base}/cover-wechat.png", 'wechat', attrs=attrs)
create_cover("Osiris", "开源全球情报可视化平台", f"{base}/cover-xhs.png",   'xhs',   attrs=attrs)
EOF
```

**批量重生成含 attrs 的三封面图**（从 video-config.json 读取）：
```python
import subprocess, json, sys
sys.path.insert(0, '/Volumes/OpenClawDrive/.hermes/workspace/9router/docs/assets')
from generate_cover import create_cover

workspace = "/Volumes/OpenClawDrive/.hermes/workspace"
for proj in os.listdir(workspace):
    cfg_path = f"{workspace}/{proj}/video-config.json"
    if not os.path.exists(cfg_path): continue
    cfg = json.load(open(cfg_path))
    cover = cfg.get('cover', {})
    attrs = cover.get('attrs', [])
    if not attrs: continue
    base = f"{workspace}/{proj}"
    title    = cover.get('title', proj)
    subtitle = cover.get('subtitle', '')
    for canvas, path in [('vertical', f'{base}/docs/assets/cover.png'),
                          ('wechat',   f'{base}/docs/assets/cover-wechat.png'),
                          ('xhs',      f'{base}/docs/assets/cover-xhs.png')]:
        create_cover(title, subtitle, path, canvas, attrs=attrs)
```

## 封面 attrs 质量规范（2026-05-28 修订）

**真实 attrs 来源优先级**（用于从文本内容智能提取标签）：
1. `docs/narration.txt` — 音频旁白内容，最优先
2. `docs/copy.md` — 小红书文案含功能列表
3. `docs/wechat-copy.md` — 公众号文案含详细特性描述
4. `docs/video-script.md` — 视频脚本含场景描述
5. `docs/article.md` — 原始文章内容

**attrs 内容直接影响视频封面场景的标签展示效果**：
- ✅ `["WebGL渲染引擎", "15层数据可视化", "60fps流畅体验", "MIT开源协议"]` — 具体、有表现力
- ❌ `["WebGL渲染", "15个数据图层", "航空追踪", "海事监控"]` — 与 scenes.features 重复，表述平薄

**attrs 质量标准**：
- ✅ 具体功能描述（如 "WebGL渲染引擎"、"Claude Opus 4.7"、"批处理优化"）
- ❌ 通用词（如 "AI驱动"、"开源免费"、"简单易用"）

**attrs 优化原则**：
1. 优先从 narration.txt / copy.md / wechat-copy.md 等实际内容提取，勿人工编造
2. 避免与 scenes 中已出现的功能名完全重复（"航空追踪"/"海事监控" 在 scenes.features 已有）
3. 用完整短语不用短词（"WebGL渲染" → "WebGL渲染引擎"）
4. 包含技术规格或协议信息（如 "60fps"、""MIT"）增加权威感

**无文本内容项目的 attrs 手动指定**：若项目无 narration.txt/copy.md 等文件，从 wechat-copy.md 或项目 README 提取功能列表，手动指定 2-4 个具体 attrs。

## 封面 title/subtitle 与 video-config.json 对齐

封面图的文字内容从 `video-config.json cover` 读取：
```json
"cover": {
  "title": "Osiris",
  "subtitle": "开源全球情报可视化平台",
  "attrs": [...]
}
```

title/subtitle 变更后需要重新生成封面图。使用前先确认 video-config.json 中 cover 字段已正确填充。

## keywords 字段质量规范

`video-config.json keywords` 用于平台推荐和搜索优化：
- ✅ 完整词组：`["开源情报", "可视化平台", "WebGL渲染", "航空追踪", "海事监控", "Osiris"]`
- ❌ 被 patch 误切后的残留：`["情报可视", "化平台", "查询", "开源全球", "奥西里斯"]`

**keywords 优化原则**：
1. 完整词组不用碎片（"可视化平台" 而非 "情报可视" + "化平台"）
2. 与项目核心技术栈对齐（Osiris 的 WebGL、航空、海事等）
3. 包含品牌名（如 "Osiris"）利于搜索

## 相关文件

- 本技能封面图渲染文档：[E-VISUAL/video-visual.md](../E-VISUAL/video-visual.md)
- PIL 兜底方案：[E-VISUAL/pil-cover.md](../E-VISUAL/pil-cover.md)（含 alpha_composite 注意事项）