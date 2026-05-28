# generate_cover.py 用法与常见问题（2026-05-27 修订）

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