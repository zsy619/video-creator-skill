# generate_docs.js 深度分析（2026-05-26 修订，2026-05-29 新增 Bug 5）
> **最后更新**：2026-05-26


## 5个已确认致命 Bug

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
  if (!r.some(existing => existing.includes(w))) {
    r.push(w);
  }
}
```

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

**修复**：`if (sw.includes(w) || w.includes(sw)) { continue; }`

---

### Bug 4：`extractNarration()` 字节/字符边界混淆
**位置**：`generate_docs.js` `extractNarration()` 函数

**现象**：中文句子在字符边界被切断，产生乱码 narration

**修复**：使用 `Array.from(text)` 按 Unicode 码点计数和截断，而非按字节。

---

### Bug 5：主题漂移（Topic Drift）

**症状**：`narration.txt` 生成的文本主题与项目实际内容无关（如项目是编程课程，但 narration 讲的是"社交氛围感"）

**根因**：`generate_docs.js` 的 `extractNarration()` 从 article.md 提取内容时，正则匹配到无关段落

**识别**：
```bash
grep -E "社交|氛围|感|放松|舒适|聊天|连接" docs/narration.txt
# 有输出但项目不是该类型 → 跑题
```

**修复策略**：不重新运行 `generate_docs.js`（会再次跑题），直接手动重写 `narration.txt` 和 `video-script.md`

**操作路径**：
1. 读取 `article.md` → 确定项目真实主题
2. 手动撰写正确的 narration（≥10句，≥420中文字）
3. 同步更新 `video-script.md`（6场景分镜）
4. 重新生成音频 + 字幕

**示例**：easy-vibe-video（编程课程）narration 跑题为社交氛围 → 重写为13句/272字编程课程 narration + 6场景分镜脚本

**语音注意**：AI/工具类项目使用 `zh-CN-YunxiNeural`，非AI类使用默认 `zh-CN-YunjianNeural`

---

## 根因：article.md 占位符导致全链路损坏

**根因链**：
```
article.md 含占位符文本
  → stripMarkdown() 解析出乱码片段
    → extractKeywords() 提取垃圾碎片
      → extractNarration() 生成乱码配音文本
        → 视频内容全错
```

---

## 关键文件验证（Step 0 后必做）

```bash
# 1. article.md 不含占位符
grep -q "请在此处粘贴" docs/article.md && echo "ERROR: 占位符" || echo "OK"

# 2. 主题一致性检查
python3 -c "
text = open('docs/narration.txt', encoding='utf-8').read()
off_topic = ['社交', '氛围', '感', '放松', '舒适', '聊天', '连接']
hits = [w for w in off_topic if w in text]
print(f'⚠️ 可能跑题: {hits}' if hits else '✅ 主题一致')
"

# 3. narration.txt 干净
python3 -c "
text = open('docs/narration.txt', encoding='utf-8').read()
bad = sum(1 for c in text if ord(c) < 32 and c not in '\n\r\t')
cn = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
print(f'控制字符: {bad}, 中文字数: {cn}')
if bad > 0 or cn < 20: exit(1)
"
```