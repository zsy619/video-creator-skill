# generate_docs.js 深度分析（2026-05-26 修订）

## 4个已确认致命 Bug

以下 bug 会导致内容全链路损坏 — 必须按顺序全部修复。

---

### Bug 1：`[字符类]` 内 `|` 是字面字符非或运算

**位置**：`generate_docs.js` 第 359 行附近，`generateSceneContent()` 内的 painPatterns

**错误代码**：
```javascript
// 错误：[] 字符类内的 | 是字面字符，不是或运算
/([^.！？]{8,30}[问题|困难|麻烦|障碍|痛点][^.！？]{0,20})/g
```

**现象**：正则几乎无法匹配任何中文句子，painPoints 全靠兜底数据

**修复**：
```javascript
// 修复：使用 (?:...) 非捕获组
/([^。！？]{8,30}(?:问题|困难|麻烦|障碍|痛点|挑战)[^。！？]{0,20})/g
```

---

### Bug 2：关键词去重优先保留短词

**位置**：`generate_docs.js` `extractKeywords()` 函数（约第 158-166 行）

**错误逻辑**：
```javascript
// 原逻辑：短词先加入，长词被 includes 过滤掉
for (const w of words) {
  if (!r.some(existing => existing.includes(w))) {  // 短词先命中
    r.push(w);  // 短词加入
  }
}
```

**现象**：关键词中出现"发现"（被"发现工具"包含），长词反而被丢弃

**修复**：对排序后的数组反向迭代，已有词包含当前词则丢弃当前词：
```javascript
for (const w of sorted) {
  if (!r.some(existing => w.includes(existing))) {
    r.push(w);
  }
}
```

---

### Bug 3：`STOP_WORD_MULTI` 使用 `startsWith` 而非 `includes`

**位置**：`extractKeywords()` 函数的停用词过滤段

**错误代码**：
```javascript
// 错误：仅过滤词首匹配，"为安全研"出现在中间时不过滤
if (w.startsWith(sw)) { continue; }
```

**修复**：
```javascript
// 修复：停用词出现在任意位置都过滤
if (sw.includes(w) || w.includes(sw)) { continue; }
```

---

### Bug 4：`extractNarration()` 字节/字符边界混淆

**位置**：`generate_docs.js` `extractNarration()` 函数

**错误代码**：
```javascript
acc++;  // 按 UTF-8 字符计数
const breakIdx = Math.min(i + 20, chars.length);
const chunk = chars.slice(0, breakIdx).join('');  // slice 按字节截断
```

**现象**：中文句子在字符边界被切断，产生乱码 narration

**修复**：使用字符感知的截断方式：
```javascript
// 方法：将字符串转为数组（Unicode 码点）后按字符计数和截断
const chars = Array.from(text);
let acc = 0;
for (let i = 0; i < chars.length; i++) {
  acc++;
  if (acc >= targetLen) {
    // 按字符截断（非字节）
    const chunk = chars.slice(0, i + 1).join('');
    result.push(chunk);
    acc = 0;
  }
}
```

---

## 根因：article.md 占位符导致全链路损坏

**症状**：视频每帧显示"请在此处粘贴原始文章内容..."等无关内容

**根因链**：
```
article.md 含占位符文本
  → stripMarkdown() 解析出乱码片段
    → extractKeywords() 提取垃圾碎片（"为安全研"、"这是一款专"）
      → extractNarration() 生成乱码配音文本
        → 音频配音变成无意义声音
          → 视频内容全错
```

**防护**：Step 0 后强制验证 article.md 不含占位符：
```bash
if grep -q "请在此处粘贴" docs/article.md; then
  echo "ERROR: article.md 仍含占位符内容"
  exit 1
fi
```

---

## 关键文件验证（Step 0 后必做）

```bash
# 1. article.md 不含占位符
grep -q "请在此处粘贴" docs/article.md && echo "ERROR: 占位符" || echo "OK"

# 2. narration.txt 干净（无控制字符、中文≥20字）
python3 -c "
text = open('docs/narration.txt', encoding='utf-8').read()
bad = sum(1 for c in text if ord(c) < 32 and c not in '\n\r\t')
cn = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
print(f'控制字符: {bad}, 中文字数: {cn}')
if bad > 0 or cn < 20: exit(1)
"

# 3. keywords 无垃圾碎片（STOP_WORD_MULTI 过滤验证）
python3 -c "
import json
data = json.load(open('docs/report.json'))
kw = data.get('keywords', [])
stop = ['为安全研', '这是一款专', '是一款专', '专为安全']
bad = [w for w in kw if any(s in w for s in stop)]
print(f'含停用词片段: {bad}')
if bad: exit(1)
"
```