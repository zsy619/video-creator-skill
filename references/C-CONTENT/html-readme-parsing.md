# HTML 开头 README 解析规范

> **触发场景**：GitHub 项目 README.md 以 HTML 标签开头（如 `<a href=...><picture>...<h1>...`），普通 Markdown 解析器无法提取标题和描述。
> **典型案例**：`margelo/react-native-graph`，`nicolengersdorf/core` 等 modern GitHub 项目。

## 解析策略

### 标题提取

HTML 开头 README 的 h1 标签结构示例：

```html
<h1>
  📈 <br/>
  react-native-graph <br/> <br/>
  <img src="./img/demo.gif" ...>
</h1>
```

**Python 正则提取**：

```python
import re

def extract_title_from_html_readme(readme):
    m = re.search(r'<h1>[\W\w]*?>([\w\W]+?)</h1>', readme, re.DOTALL)
    if not m:
        return None
    title = re.sub(r'<[^>]+>', '', m.group(0)).strip()
    title = re.sub(r'\s+', ' ', title)
    return title  # "📈 react-native-graph"
```

### 描述提取

**从 `<b>` 标签提取**：

```python
m = re.search(r'<b>([^<]+)</b>', readme)
desc = m.group(1) if m else ''  # "Beautiful, high-performance..."
```

**从 About 段落提取（margelo 风格）**：

```python
m = re.search(r'\*\*([^*]+)\*\* is (.+?)(?:\n\n|\n##|$)', readme, re.DOTALL)
about = m.group(2).strip() if m else ''
```

### 纯文本转换（用于 article.md / narration.txt）

```python
def html_to_plain_text(readme):
    clean = re.sub(r'<style[^>]*>.*?</style>', '', readme, flags=re.DOTALL)
    clean = re.sub(r'<script[^>]*>.*?</script>', '', clean, flags=re.DOTALL)
    clean = re.sub(r'<[^>]+>', ' ', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean
```

## 已知模式

### margelo 风格（`<picture>` + `<h1>` + `<b>`）

```html
<a href="https://margelo.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./img/bg-dark.png" />
    <img alt="Nitro Modules" src="./img/bg-light.png" />
  </picture>
</a>
<div align="center">
  <h1>📈 <br/>react-native-graph <br/> <br/><img ...></h1>
  <b>Beautiful, high-performance Graphs/Charts for React Native.</b>
</div>
```

标题从 `<h1>` 内提取，描述从 `<b>` 提取。

### Shields.io Badges 开头（常见于新项目）

README 以 `[![License](https://img.shields.io/...` 等 badge 序列开头，紧接着 `# 项目名`，可直接用标准 Markdown 解析。

## 验证

```bash
# 检查 README 是否以 HTML 开头
head -c 10 README.md | grep -oP '<\w+' || echo "Markdown 开头"

# 验证标题提取
python3 -c "
import re, sys
readme = open('README.md').read()
m = re.search(r'<h1>[\W\w]*?>([\w\W]+?)</h1>', readme, re.DOTALL)
print('title:', re.sub(r'<[^>]+>', '', m.group(0)).strip() if m else 'NOT FOUND')
"