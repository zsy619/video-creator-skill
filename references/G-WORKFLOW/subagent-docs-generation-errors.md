# Subagent 文档生成错误分类与修复手册

> 所属模块：video-creator / G-WORKFLOW
> 最后更新：2026-06-01（基于 whichllm/ai-engineering/shanselman/agentmemory 四个项目实测）

## 背景

`generate_docs.js` 通过 `delegate_task` 派发 subagent 生成 Step 0 文档时，subagent 存在三类典型文件名错误，导致生成的文件扩展名不符合预期，后续流程无法识别。

---

## 错误分类

### 错误类型 A：HTML 文件写成了 .md 扩展名

**症状**：`landing-page.html` / `article-page.html` / `wechat-page.html` 被写成 `.md` 扩展名（如 `landing-page.md`）。

**根因**：subagent 直接使用任务描述中的文件名（任务描述中写的是 `.html`，但 subagent 有时写成 `.md`）。

**修复命令**：
```bash
cd {PROJECT_DIR}/docs
for f in landing-page.md article-page.md wechat-page.md; do
  [ -f "$f" ] && mv "$f" "${f%.md}.html" && echo "renamed: $f → ${f%.md}.html"
done
```

**预防**：`launch.sh all` 在 Step 0 文档生成后强制调用 `pre-flight-check.js`，未通过则阻断并报错文件名错误。

---

### 错误类型 B：ai-engineering-from-scratch 生成了错误的额外文件

**症状**：subagent 为 `ai-engineering-from-scratch` 生成了不该存在的文件：
```
INSTALLATION.md / QUICKSTART.md / FAQ.md / SIX_STEP_CYCLE.md / MULTI...
```
这些文件名来自仓库 README 的章节标题，subagent 错误地将文档标题当成了要生成的文件名。

**根因**：subagent 读取了仓库 README 的目录结构，混淆了"文档标题"和"文件名"。

**修复命令**：
```bash
cd {PROJECT_DIR}/docs
# 删除非 Step 0 必需的文件
ls *.md | grep -vE "^(README|article|video-script|copy|wechat-copy|posting-guide|session-log|report)\.md$" | xargs rm -f
ls *.html 2>/dev/null | grep -vE "^(landing-page|article-page|wechat-page)\.html$" | xargs rm -f
```

**预防**：Step 0 只生成 12 个固定文件名（REQUIRED_FILES），任何额外文件都是错误。

---

### 错误类型 C：session-log 生成时缺少扩展名

**症状**：`session-log` 生成时没有扩展名（`session-log` 而不是 `session-log.md`）。

**修复命令**：
```bash
cd {PROJECT_DIR}/docs
[ -f "session-log" ] && mv "session-log" "session-log.md"
```

---

## 强制前置检查（2026-06-01 新增）

所有 `generate_docs.js` 完成后，必须调用 `pre-flight-check.js` 强制验证：

```bash
node {SKILL_DIR}/scripts/pre-flight-check.js {PROJECT_DIR}
```

`pre-flight-check.js` 检查以下 12 个文档：
```
README.md / article.md / video-script.md / copy.md /
wechat-copy.md / posting-guide.md / landing-page.html /
article-page.html / wechat-page.html / session-log.md /
report.json / narration.txt
```

任何缺失或扩展名错误都会导致 exit code 1 并输出缺失文件清单。

---

## 快速修复脚本（batch 用）

```bash
# 修复所有已知文件名错误
PROJECT_DIR={PROJECT_DIR}

# A: HTML .md → .html
cd "$PROJECT_DIR/docs"
for f in landing-page.md article-page.md wechat-page.md; do
  [ -f "$f" ] && mv "$f" "${f%.md}.html" 2>/dev/null && echo "✓ $f → .html"
done

# B: 删除多余 .md 文件（保留 12 个必需）
for f in *.md; do
  case "$f" in
    README.md|article.md|video-script.md|copy.md|wechat-copy.md|posting-guide.md|session-log.md|report.json) ;;
    *) [ -f "$f" ] && rm "$f" && echo "✗ 删除多余: $f" ;;
  esac
done

# C: session-log 无扩展名
[ -f "session-log" ] && mv "session-log" "session-log.md" && echo "✓ session-log → session-log.md"

# 最终验证
node {SKILL_DIR}/scripts/pre-flight-check.js "$PROJECT_DIR"
```

---

## 附：REQUIRED_FILES 常量（generate_docs.js 第 1061 行）

```javascript
const REQUIRED_FILES = [
  'article.md', 'video-script.md', 'narration.txt', 'copy.md',
  'wechat-copy.md', 'posting-guide.md', 'session-log.md', 'report.json',
  'landing-page.html', 'article-page.html', 'wechat-page.html', 'README.md'
];
```

**只有这 12 个文件是合法的 Step 0 输出**。任何额外的 `.md` / `.html` 文件都是错误生成物，应立即删除。