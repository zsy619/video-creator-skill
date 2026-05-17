# 封面字体选择规范

> **最后更新**：2026-05-17
> **配套**：`scripts/generate_cover.py`（PIL 封面生成）、`scripts/generate_docs.js`（文档生成）

---

## 核心铁律

1. **所有文字必须经过 `smart_resize_text()` 检测**，超出画布 90% 宽度时自动缩小
2. **禁止直接用固定字号渲染而不检测宽度**
3. **字体路径由系统动态探测，禁止硬编码不存在的字体文件**
4. **字体必须支持 CJK 文字**，用 `_cjk_detect_render()` 前置检测方块/乱码

---

## `_find_cjk_font()` 字体探测优先级（2026-05-17 修订）

### 搜索目录顺序（优先级从高到低）

| 优先级 | 目录 | 说明 |
|--------|------|------|
| 1 | `~/Library/Fonts` | 用户安装的中文字体（LXGWWenKai 等） |
| 2 | `/System/Library/Fonts` | 系统字体 |
| 3 | `/Library/Fonts` | 系统字体 |

### 字体名关键词（按优先级）

```python
keywords = [
    # 用户安装字体（优先）
    'lxgw', 'wenkai', 'cangti', 'tsanger',
    'pingfang', 'hiragino', 'heiti', 'songti', 'kaiti',
    'yozai', 'noto', 'source han', '_SOURCE_',
]
```

### CJK 字体精确匹配表（2026-05-17 新增）

用于匹配带后缀的标准字体名（如 `LXGWWenKai-Regular` vs `LXGWWenKai`）：

```python
cjk_fonts = [
    'LXGWWenKai-Regular', 'LXGWWenKai-Bold',          # 霞鹜文楷（用户安装首选）
    'PingFangSC-Regular', 'PingFangSC-Medium', 'PingFangSC-Semibold',
    'HiraginoSansGB-W3', 'HiraginoSansGB-W6',
    'STHeitiSC-Medium', 'STHeitiSC-Light',
    'STSongti-SC-Regular', 'STSongti-SC-Bold',
    'AppleSDGothicNeo', 'Yuanti-SC',
]
```

### 匹配机制

1. **子串匹配**：字体文件名含 `keywords` 任一关键词
2. **精确匹配**：字体文件名（含后缀去 `-`）包含 `cjk_fonts` 任一字体名
3. **文件大小校验**：字体文件 > 100KB 才认为有效

---

## `_cjk_detect_render()` 乱码检测原理

```python
def _cjk_detect_render(text, font_path, size=72):
    # CJK 正常字 bbox 宽 > 高，aspect > 1.1
    # 方块字/缺失字体 bbox 宽高接近 1:1
    bbox = draw.textbbox((0, 0), text[:8], font=font)
    aspect = (bbox[2] - bbox[0]) / (bbox[3] - bbox[1])
    return aspect > 1.1  # True = 正常，False = 方块/乱码
```

调用时机：`smart_resize_text()` 入口处，若检测失败用 52px 再测一次，仍失败则报错。

---

## 常见字体问题

### macOS LXGWWenKai 用户安装字体位置

```
~/Library/Fonts/LXGWWenKai-Regular.otf
~/Library/Fonts/LXGWWenKai-Bold.otf
```

### 旧版问题（2026-05-17 前）

- `keywords` 只有 `pingfang, hiragino, heiti, songti, wenkai, cangti, tsanger, lxgw`
- 无 `cjk_fonts` 精确匹配表，`LXGWWenKai-Regular` 会被漏掉
- 用户目录 `~/Library/Fonts` 未优先搜索

---

## 验证命令

```bash
# 验证字体探测能找到 LXGWWenKai
python3 -c "
import sys
sys.path.insert(0, '~/.hermes/skills/video-creator/scripts')
from generate_cover import _find_cjk_font, _cjk_detect_render
font = _find_cjk_font()
print('字体:', font)
if font:
    ok = _cjk_detect_render('测试文字ABC', font, 72)
    print('CJK检测:', '✅ 正常' if ok else '❌ 方块/乱码')
"

# 验证封面无乱码（文件大小应 > 50KB）
ls -la docs/assets/cover*.png
```