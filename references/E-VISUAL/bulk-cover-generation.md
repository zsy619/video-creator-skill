# 批量封面图生成 — 2026-05-28 实测记录

## 核心路径（已修正）

**`generate_cover.py` 位于 skill scripts 目录**，不是项目本地：
```
/Users/zhushuyan/.hermes/skills/video-creator/scripts/generate_cover.py
```

## Python API 调用规范（推荐）

subprocess 配合 repr() 避免 shell 转义问题：

```python
import subprocess, os

script = "/Users/zhushuyan/.hermes/skills/video-creator/scripts/generate_cover.py"
script_dir = os.path.dirname(script)

def gen_cover(title, subtitle, attrs, out_path, canvas_type, theme='cyberpunk'):
    code = f"""import sys
sys.path.insert(0, '{script_dir}')
from generate_cover import create_cover
create_cover({repr(title)}, {repr(subtitle)}, {repr(attrs)}, {repr(out_path)}, {repr(canvas_type)}, {repr(theme)})
"""
    result = subprocess.run(['python3', '-c', code], capture_output=True, text=True, timeout=60)
    return result.returncode == 0
```

## 三封面批量生成模板

```python
covers = [
    (f"{base}/docs/assets/cover.png", 'vertical', subtitle),
    (f"{base}/docs/assets/cover-wechat.png", 'wechat', subtitle[:20]),  # wechat ≤20 chars
    (f"{base}/docs/assets/cover-xhs.png", 'xhs', subtitle),
]
for out_path, canvas_type, sub in covers:
    gen_cover(title, sub, attrs, out_path, canvas_type, theme)
```

## 检测占位符标题并从 article.md 提取真实标题

```python
import re, json

cfg_file = f"{workspace}/{p}/video-config.json"
with open(cfg_file) as f:
    c = json.load(f)

title = c['cover']['title']
if title in ('视频标题', '', None) or not title:
    # 从 article.md H1 提取
    article_path = f"{workspace}/{p}/docs/article.md"
    if os.path.exists(article_path):
        content = open(article_path).read()
        h1 = re.search(r'^#\s+(.+)', content, re.MULTILINE)
        if h1:
            title = h1.group(1).strip()
            c['cover']['title'] = title
            with open(cfg_file, 'w') as f:
                json.dump(c, f, ensure_ascii=False, indent=2)
```

## wechat 画布副标题限制

- 画布尺寸：900×383 px
- 副标题应 ≤20 字符
- 超长 subtitle 会触发 `smart_resize_text` 缩小到 36px 仍超出 → 报错
- 实测 md-preview 原始 subtitle `极轻量的 Markdown 预览工具，约 5MB 二进制，无 Electron，纯原生实现`（42字）wechat 渲染报错，截断至 20 字正常

## 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| `generate_cover.py not found` | 在项目目录内找本地脚本 | 用完整 skill 路径调用 |
| wechat 报错 `ValueError: 标题宽度...超过画布90%` | subtitle >20 字 | 截断至 20 字 |
| vertical 报错但 xhs 正常 | title 含单引号未转义 | 用 `repr()` 而非 f-string 直接插值 |