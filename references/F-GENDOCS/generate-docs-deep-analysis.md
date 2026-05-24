# generate_docs.js 深度知识库

> **最后更新**：2026-05-18
> **配套文档**：`F-GENDOCS/generate-docs-failures.md`（失败模式）、`C-CONTENT/content-document-generation.md`（Step 0 完整流程）

---

## 1. 输出质量总览（2026-05-18 实测）

> MeiGen-AI-Design-MCP 项目测试表明，11 个生成文件中 7 个存在严重质量问题，**全部需要人工重写**：

| 文件 | 问题 | 必须重写？ |
| --- | --- | --- |
| `narration.txt` | 中文字数 479（上限 175），含 `` ` ``、`---` 等 markdown 噪声 | ✅ 100% |
| `video-script.md` | 场景时长全部 `undefineds`，内容被 markdown 表格污染 | ✅ 100% |
| `copy.md` | 使用通用模板（"开源代理方案"），内容与项目不符 | ✅ 100% |
| `wechat-copy.md` | 同上，摘要描述错误 | ✅ 100% |
| `posting-guide.md` | 标题模板示例未替换（`【Hysteria】`、neon 等残留） | ✅ 100% |
| `session-log.md` | 含未完成的 checkbox，实际使用时需更新 | ⚠️ 建议检查 |
| `landing-page.html` / `article-page.html` / `wechat-page.html` | 结构简单，可接受自动生成版本 | ❌ 可用 |
| `report.json` | 纯数据，无内容质量问题 | ❌ 可用 |
| `article.md` | 原始输入文件，无生成逻辑 | ❌ 可用 |

**结论**：generate_docs.js 生成的 11 个文件中，仅 `article.md`（原始输入）、`report.json`（纯数据）、HTML 三件套可接受自动生成版本；其余 7 个文件**全部需要人工审核和重写**。

---

## 2. 根因分析

### A. `stripMarkdown()` 对中文内容提取能力极弱

**文件**：`scripts/generate_docs.js`

**根因**：`extractNarration()` 行 141-146 使用 `line.trim()` 直接 push，不过滤任何 markdown 标记。场景内容中的 `**粗体**` 、`|表格|`、`---` 分隔线等会原样进入 `narration.txt`。

**症状**：
- 字数远超高限（如 1478字 vs 175字上限），需极端截断
- 截断后的文本含 `:---:`、`|`、`[![]()` 等 markdown 噪声，无法用于配音
- 即使 narration.txt 显示"字数检查通过"，生成的音频内容实际已被 markdown 字符破坏

**修复**（2026-05-18）：行 143 改为过滤 markdown 噪声：
```javascript
const strippedLine = line
  .replace(/^\*\*时长\*\*\s*\d+s\n?/, "")
  .replace(/[*_~`#|>]/g, "")
  .replace(/\|+/g, "")
  .replace(/^-+$/, "")
  .trim();
```

### B. `sceneDuration` 计算逻辑 bug

**根因**：`sceneDuration` 计算时 `isLast` 判断逻辑有误，`Math.ceil(duration * 0.15)` 在 `isLast` 前执行导致 `undefined`。

**症状**：`video-script.md` 场景时长全部显示 `undefineds`，内容被 markdown 表格结构污染（`| 工具 | 描述 |`、`:---:` 混入场景正文）。

### C. 文案生成使用通用占位符模板

**根因**：`copy.md` / `wechat-copy.md` 使用通用模板（"开源代理方案"、"告别卡顿"等），内容与实际项目完全不符，100% 需人工重写。

**根因**：`posting-guide.md` 标题模板示例未替换（如 `【Hysteria】`、`neon达人` 等模板残留），需适配实际项目名。

---

## 3. Step 0 后强制检查与重写规程

1. `generate_docs.js` 执行完毕后，**立即**统计 narration.txt 中文字符数：
   ```bash
   python3 -c "
   text = open('docs/narration.txt').read()
   chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
   print(f'中文字数: {chinese_chars}')
   # 若 < 20 字，或含 '---'、'|'、'[' 等 markdown 残留字符 → 立即重写
   "
   ```
2. **触发重写条件（满足任一）**：
   - 中文字数 < 20（严重提取失败）
   - 文本含 `---`、`|`、`[![]()`、`|:---` 等 markdown 噪声字符
   - 中文字数 > 上限的 2 倍（175 × 2 = 350 字，说明大量英文/符号被混入）

---

## 4. narration.txt 门禁降级（v2.5.0+：硬终止→自动修复循环）

**旧行为**：检查失败时 `exit 1` 硬终止，导致工作流中断。

**新行为**：检查失败后进入自动修复循环，最多 2 次重试，始终不终止工作流。

| 失败类型 | 旧行为 | 新行为 |
| --- | --- | --- |
| 含 markdown 残留（`\|`、`---`） | `exit 1` | sed 自动清理，继续 |
| 超长（> max_chars） | `exit 1` | Python 截断至 max_chars，继续 |
| 严重提取失败（< 10 字） | `exit 1` | 调用 generate_docs.js 重写（最多 2 次） |
| 内容偏少（10~20 字） | `exit 1` | 警告（建议补充），不终止 |
| > max_chars 字 | `exit 1` | 警告（可能超出时长），不终止 |

**自动修复循环逻辑**（嵌入 `launch.sh cmd_all`）：
1. 检测字数 < 10 → 调用 generate_docs.js 重写 → 重新检查
2. 循环最多 2 次，仍失败仅警告不终止

**重写方法**：基于 `article.md` 内容，手动撰写 100~175 字的中文配音文本，涵盖项目名、功能、亮点、使用方式。重写后复检字数，确认在 100~175 字安全区间内，再进入 Step 1。
