# generate_docs.js 失败模式与强制重写规程
> **最后更新**：2026-05-24


## 核心问题（2026-05-18 实测确认）

`generate_docs.js` 在 MeiGen-AI-Design-MCP 项目测试中，11 个生成文件中 7 个存在严重质量问题，100% 需要人工重写。

## 已知失败模式

### 1. `narration.txt` — 100% 失败

| 症状 | 根因 |
|------|------|
| 中文字数远超上限（如 479字 vs 175字） | `stripMarkdown()` 将 `|`、`` `:---:` 等表格字符计入，导致截断时含 markdown 噪声 |
| 字数远低于下限（如 33字 vs 175字） | 对中文内容提取能力极弱，几乎每次都生成字数不足版本 |
| 含 markdown 残留字符 | `stripMarkdown()` 无法正确处理中文 Markdown 中的表格、分隔线语法 |

**验证命令**：
```bash
python3 -c "
text = open('docs/narration.txt').read()
chinese = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
print(f'中文字数: {chinese}')
import json, os
cfg = json.load(open('video-config.json'))
max_chars = int(cfg.get('duration', 52) * 3.37)
print(f'安全上限: {max_chars}')
# 检查 markdown 残留
import re
if re.search(r'\|{2,}|:{3,}|(?<!~)-{3}|!\[', text):
    print('❌ 含 markdown 残留字符')
"
```

**触发重写条件（满足任一）**：
- 中文字数 < 20
- 中文字数 > 上限 × 2
- 含 `|`、`---`、`![]()`、`:---` 等字符

### 2. `video-script.md` — 100% 失败

| 症状 | 根因 |
|------|------|
| 场景时长全部 `undefineds` | `sceneDuration` 计算逻辑：`Math.ceil(duration * 0.15)` 在 `isLast` 判断前执行，`isLast` 为 `true` 时 `remaining` 已耗尽但判断顺序错误 |
| 内容被 markdown 表格污染 | 场景内容包含 `| 工具 | 描述 |`、`:---:` 等表格结构残留 |

**验证**：检查文件中是否有 `undefineds` 字符串或 `|` 表格字符。

### 3. `copy.md` / `wechat-copy.md` — 100% 失败

| 症状 | 根因 |
|------|------|
| 标题为"开源代理方案"、"告别卡顿"等通用模板 | `generateCopy()` / `generateWechatCopy()` 使用硬编码占位符，未使用 `article.md` 实际内容 |
| 摘要描述与项目不符 | 同上 |

**验证**：搜索文件内容是否包含模板残留字符串（如 `开源代理`、`告别卡顿`、`Hysteria` 等非项目实际名称）。

### 4. `posting-guide.md` — 100% 失败

| 症状 | 根因 |
|------|------|
| 标题模板示例未替换（如 `【Hysteria】`、`neon达人`） | `generatePostingGuide()` 使用 `config.theme` 而非实际项目内容生成标题示例 |

**验证**：检查标题模板示例是否与项目实际名称不符。

## 强制门禁（SKILL.md 第 78 行后）

```bash
chinese_chars=$(python3 -c "
text = open('$PROJECT_DIR/docs/narration.txt').read()
print(sum(1 for c in text if '\u4e00' <= c <= '\u9fff'))
")
max_chars=$(python3 -c "import json; cfg=json.load(open('$PROJECT_DIR/video-config.json')); print(int(cfg.get('duration', 52) * 3.37))")

if [ "$chinese_chars" -lt 20 ]; then
  echo "❌ narration.txt 提取失败（中文字数: $chinese_chars < 20）— 必须重写"
  exit 1
fi
if [ "$chinese_chars" -gt $((max_chars * 2)) ]; then
  echo "❌ narration.txt 含大量 markdown 残留（中文字数: $chinese_chars）— 必须重写"
  exit 1
fi
if echo "$(cat "$PROJECT_DIR/docs/narration.txt")" | grep -qE '\|{2}|:{3,}|(?<!~)\-{3}|!\['; then
  echo "❌ narration.txt 含 markdown 残留字符 — 必须重写"
  exit 1
fi
echo "✅ narration.txt 检查通过（中文字数: $chinese_chars / $max_chars）"
```

## 可接受自动生成的文件

| 文件 | 原因 |
|------|------|
| `article.md` | 原始输入，无生成逻辑 |
| `report.json` | 纯数据，无内容质量问题 |
| `landing-page.html` / `article-page.html` / `wechat-page.html` | 结构简单，基于项目名和 article.md 生成，无复杂逻辑 |

## 相关文件

- `scripts/generate_docs.js` — 问题根源，需修复 stripMarkdown() / sceneDuration / 文案生成逻辑
- `SKILL.md` — 强制门禁规则和重写规程已写入

---

## 附录：extractNarration() 根因补丁记录（2026-05-18）

> 以下是 generate_docs.js 的已知缺陷根因，已在脚本内修复，仅供调试参考。

### A. `extractNarration()` 不会过滤 markdown（已修复）

**文件**：`scripts/generate_docs.js` 行 143

**根因**：`extractNarration()` 使用 `line.trim()` 直接 push，不过滤任何 markdown 标记。场景内容中的 `**粗体**` 、`|表格|`、`---` 分隔线等会原样进入 `narration.txt`。

**症状**：
- `narration.txt` 含 `**`、`|`、`---` 等 markdown 残留字符
- edge-tts 配音时这些字符被读出（"星星星星"、"反引号"等）
- 中文字数统计被噪声字符稀释

**修复**（2026-05-18）：行 143 改为：
```javascript
const strippedLine = line
  .replace(/^\*\*时长\*\*\s*\d+s\n?/, "")   // 去掉时长标注
  .replace(/[*_~`#|>]/g, "")                    // 去掉 markdown 噪声
  .replace(/\|+/g, "")                           // 去掉表格竖线
  .replace(/^-+$/, "")                          // 去掉 --- 分隔线
  .trim();
if (capture && strippedLine) {
  narrationLines.push(strippedLine);
}
```

**验证方法**：生成 narration.txt 后搜索 `**`、`|`、`---`，应为空。

### B. video-script.md 场景格式依赖

`extractNarration()` 依赖以下格式：

```
## 场景 1：开场（5s）

**时长**: 5s

场景内容文字...
```

- 场景必须以 `## 场景` 开头（capture 开关）
- `**时长**` 行被跳过（continue）
- 遇到下一个 `#` 标题时停止捕获

如果 `generateVideoScript()` 生成的格式变化，提取会失败。

### C. 生成质量不稳定

`generate_docs.js` 对中文内容的提取质量不稳定，建议：
- narration.txt 始终手动检查或重写
- SKILL.md 门禁已改为自动修复 + 警告，不做硬终止