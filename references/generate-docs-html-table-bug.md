# generate_docs.js 中文提取失败：HTML 表格污染

## 触发条件

当 `docs/article.md` 包含以下任意内容时，`stripMarkdown()` 的输出必定损坏：

| HTML 元素 / Markdown 结构 | 污染结果 |
|--------------------------|---------|
| `<table>` + `<tr>` + `<td>` HTML 标签 | 混入 `</td>`、`</tr>` 等标签残片 |
| GitHub Flavored Markdown 表格 `\| 列1 \| 列2 \|` | 混入 `\|`、`:---:`、`[![]()` 等 markdown 噪声 |
| `<p align="center">` 等对齐标签 | 混入 HTML 标签残片 |
| Shield.io badge `<img>` 标签 | 混入 `src="..."`、`alt="..."` 属性碎片 |

## 实测案例（2026-05-17）

**项目**: felo-skills  
**输入**: GitHub README.md（含 `<p align="center">`、shield.io badges、命令对照表 `| Command | Description |`）  
**症状**: 输出的 narration.txt 包含 `|:---:|`、`<img src=`、`<a href=` 等完全无法配音的字符  
**字数**: 提取出 1403 字（含噪声），远超 175 字上限  
**根本原因**: `stripMarkdown()` 在解析包含表格结构的 Markdown 时，将 `|` 分隔符和非中文字符全部保留

## 验证命令

```bash
# 检查 narration.txt 是否含 markdown 噪声
python3 -c "
text = open('docs/narration.txt').read()
noise = ['|', '<a ', '<img', ':---:', '[![]']
found = [c for c in noise if c in text]
if found:
    print(f'❌ 含噪声: {found}')
    print(f'总字符: {len(text)}')
    chinese = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    print(f'中文字符: {chinese}')
else:
    chinese = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    print(f'✅ 干净，中文字符: {chinese}')
"
```

## 修复方案

**手动重写 narration.txt**（唯一可靠方案）：

1. 根据 `docs/article.md` 的核心内容，手写一段 100-175 字的纯中文配音文本
2. 不依赖 `stripMarkdown()` 的自动提取结果
3. 重写后用上述验证命令确认无噪声

## 预防

如果 article.md 来自 GitHub README 且含表格，建议 **直接基于 README 核心信息人工撰写**，不要让 `generate_docs.js` 自动提取。

---

**相关**：[「已知问题：generate_docs.js 输出质量」](#已知问题generate_docsjs-输出质量) — 已标记 100% 失败率，felo-skills 为最新实证。