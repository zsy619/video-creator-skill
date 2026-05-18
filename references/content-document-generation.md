# 内容获取与文档生成工作流

> **最后更新**：2026-05-18（合并 content-workflow + generate-docs-html-table-bug + generate-docs-known-issues + captions-json-python-generation）
> **配套文档**：`audio-tts.md`（音频生产）、`subtitle-production.md`（字幕生成）

---

## 目录

1. [GitHub 项目内容获取](#1-github-项目内容获取)
2. [generate_docs.js 完整工作流](#2-generate_docsjs-完整工作流)
3. [generate_docs.js 已知问题与修复](#3-generate_docsjs-已知问题与修复)
4. [generate_docs.js 失败模式](#4-generate_docsjs-失败模式)
5. [narration.txt 重写策略](#5-narrationtxt-重写策略)
6. [动态 atempo 计算](#6-动态-atempo-计算)
7. [captions.json Python 生成](#7-captionsjson-python-生成)
8. [验证命令](#8-验证命令)

---

## 1. GitHub 项目内容获取

### 标准流程

```bash
# 1. 克隆仓库（浅克隆，只取最新代码）
git clone --depth 1 "https://github.com/<owner>/<repo>.git" "/tmp/${repo}-$$"

# 2. 提取 README.md
ARTICLE=$(cat "/tmp/${repo}-$$/README.md" | python3 -c "
import sys, re
md = sys.stdin.read()
# 移除 markdown 图片和链接，保留文字
md = re.sub(r'!\[.*?\]\(.*?\)', '', md)
md = re.sub(r'\[([^\]]+)\]\(https?://[^\)]+\)', r'\1', md)
md = re.sub(r'#{1,6}\s+', '##', md)
print(md[:8000])
")

# 3. 写入 article.md
mkdir -p "$PROJECT_DIR/docs"
echo "$ARTICLE" > "$PROJECT_DIR/docs/article.md"

# 4. 清理仓库
rm -rf "/tmp/${repo}-$$"
```

### 仓库克隆后必须删除

> **规范**：GitHub 项目视频制作流程中，仓库源码在 article.md 生成后不再被后续流程使用。视频渲染完成后**必须删除 `{repo}-repo` 目录**（严格分离的仓库目录）。

```bash
rm -rf "{WORKSPACE_DIR}/{repo}-repo"
```

### shallow clone 注意事项

- **优点**：减少存储，只取最新 commit
- **缺点**：`git log`、`git blame`、完整 diff 不可用
- **充分性**：对视频项目使用场景足够（只读 README + top-level 文件）

### README 位置变体

GitHub repositories don't always place README.md at the repo root. Monorepos, documentation-centric repos, and agent-focused projects commonly store it in subdirectories.

| Pattern | Example | Finding Session |
|---------|---------|-----------------|
| `README.md` at root | Most repos | — |
| README in `docs/` subdir | `nvim-treesitter` → `docs/README.md` | 2026-05-14 |
| `AGENTS.md` as real README | `ForgedCode` → `AGENTS.md` has full project overview, `README.md` is minimal | 2026-05-14 |

**诊断协议**：
```bash
# Try root first (standard)
cat "$PROJECT_DIR/$REPO_DIR/README.md"

# If missing or minimal, probe subdirs
ls "$PROJECT_DIR/$REPO_DIR/*.md"           # all markdown at root
ls "$PROJECT_DIR/$REPO_DIR/docs/*.md"      # docs subdir

# Check for AGENTS.md (agent-focused repos)
cat "$PROJECT_DIR/$REPO_DIR/AGENTS.md"

# For monorepos: check root level markdown files
find "$PROJECT_DIR/$REPO_DIR" -maxdepth 2 -name "*.md" -not -path "*/node_modules/*"
```

---

## 2. generate_docs.js 完整工作流

`generate_docs.js` 是 video-creator 技能的文档生成核心脚本，负责从 article.md 生成 11 个必需文档。

### 11 个文档必须全部生成（Step 0 铁律）

| # | 文件 | 说明 |
|---|------|------|
| 1 | `article.md` | 原始内容（拷贝） |
| 2 | `video-script.md` | 分镜脚本 |
| 3 | `narration.txt` | 配音文本（**需验证字数**） |
| 4 | `copy.md` | 小红书营销文案 |
| 5 | `wechat-copy.md` | 公众号文案 |
| 6 | `posting-guide.md` | 多平台发布指南 |
| 7 | `session-log.md` | 会话日志 |
| 8 | `landing-page.html` | 落地页 |
| 9 | `article-page.html` | 文章阅读页 |
| 10 | `wechat-page.html` | 公众号适配页 |
| 11 | `report.json` | 执行报告 |

### video-config.json 路径要求

> ⚠️ **video-config.json 必须在项目根目录**（不是 docs/），否则 generate_docs.js 报错。

正确位置：
```
{workspace}/{project-name}/         ← video-config.json 在这里（项目根目录）
├── docs/
│   └── video-config.json           ← ❌ 不在这里
└── video-project/
```

### 标准工作流

```bash
# Step 1: 执行 generate_docs.js
node {SKILL_DIR}/scripts/generate_docs.js {PROJECT_DIR}

# Step 2: 立即运行字数验证
python3 << 'PYEOF'
PROJECT_DIR = '{WORKSPACE_DIR}/<项目>-video'
with open(f'{PROJECT_DIR}/docs/narration.txt', 'r') as f:
    text = f.read()
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
target_dur = 52
max_chars = int(target_dur * 3.37)
print(f'中文字数: {chinese_chars} / 上限: {max_chars}')
if chinese_chars < 100 or chinese_chars > max_chars:
    print('❌ 需要手动重写')
else:
    print('✅ 字数合适')
PYEOF

# Step 3: 手动重写时，保持口语化+每句完整+100-175字范围内
# Step 4: 再次验证，通过后再继续
```

---

## 3. generate_docs.js 已知问题与修复

### extractNarration() 截断逻辑缺陷（已修复 2026-05-17）

**旧版问题**：`extractNarration()` 截断使用 `maxChars`（总字符数）与 `narration.length` 比较，但安全上限 `maxChineseChars` 是**中文字符数**，单位不一致。每次都生成字数不足或超限的 narration.txt。

**关键教训**：
- `narration.length`（总字符）vs `maxChineseChars`（中文字符数）是**不同单位**，不能直接比较
- 必须统一用中文字符数 `countChinese()` 进行截断判断
- 增加第二层安全网强制截断，确保输出永远不超过上限

---

## 4. generate_docs.js 失败模式

| 输入类型 | 失败概率 | 症状 |
|---------|---------|------|
| GitHub README（含HTML标签/表格）| **极高** | narration < 20 字，含 HTML 碎片 |
| 中文博客文章（纯文本）| 低 | 字数在范围内但语义破碎 |
| 含大量代码块的文档 | 中 | 代码块噪声混入 narration |
| 纯英文 README | 高 | 英文被stripMarkdown删除后仅剩标点 |

**实测数据（本 session）**：

| 项目 | 自动字数 | 重写后 | 问题类型 |
|------|---------|--------|---------|
| claude-hud | 74字 | 154字 | 严重偏少 |
| tegaki | 74字 | 141字 | 严重偏少 |
| OpenViking | 74字 | 157字 | 严重偏少 |
| openscreen | 91字 | 152字 | 偏少 |
| open-swe | 50字 | 153字 | 严重偏少 |
| impeccable | 79字 | 167字 | 偏少 |
| deepagents | 183字 | 163字 | 偏多超限 |
| timesfm | 176字 | 128字 | 超限精简 |
| claude-howto | 177字 | 121字 | 超限精简 |

**结论**：本 session 9个项目，100% 需手动重写。

---

## 5. narration.txt 重写策略

### 观察到的规律：3次循环

自动生成的 `narration.txt` 几乎无法首次落在 100-175 字范围内，重写循环遵循固定模式：

| 轮次 | 结果 | 行动 |
|------|------|------|
| #1 | 176–223 字（超限） | 精简内容 |
| #2 | 76–91 字（过短） | 补充细节 |
| #3 | 100–128 字 ✅ | 完成 |

### 重写策略

**字数超限（>175）时**：
- 删除修饰词："called X"、"meaning Y"、括号注释
- 合并并列结构："支持 A、B、C 和 D" → "支持 A、B、C"
- 删除重复概念（如果标题/副标题已陈述）

**字数过少（<100）时**：
- 添加具体化：`"AI tool"` → `"Anthropic Claude Code CLI 编程助手"`
- 补充安装/使用细节
- 添加输出格式/平台兼容性信息
- 包含版本号或量化数据

### 为什么 narration.txt 生成质量差

1. `extractNarration()` 使用 `stripMarkdown()`，对中文文本处理弱
2. 中文标点分段产生句子过长或过短
3. `maxChars` 计算使用字符长度（含标点/英文），而非纯中文字数
4. 安全上限：`⌊duration × 3.37⌋`（实测 3.73 字/秒 × 0.9 安全系数）

### Python 验证脚本

```python
python3 << 'PYEOF'
PROJECT_DIR = '{WORKSPACE_DIR}/{project}'
with open(f'{PROJECT_DIR}/docs/narration.txt', 'r') as f:
    text = f.read()
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
max_chars = int(52 * 3.37)
print(f'中文字数: {chinese_chars} / 上限: {max_chars}')
if 100 <= chinese_chars <= max_chars:
    print('✅ 字数检查通过')
else:
    print('❌ 字数异常')
PYEOF
```

> **关键洞见**：不要使用 `node -e <<'NODEEOF'` heredoc 来生成或验证 narration — Node.js 字符串插值对含中文的反引号内容会失败。**使用 Python heredoc**（captions.json 生成也因同样原因使用 Python）。

---

## 6. 动态 atempo 计算

**公式**：`atempo = source_duration / target_duration`

**旧错误**：固定 `atempo=1.2`（仅适用于 source≈40-45s 的场景）

**正确做法**：
```bash
SOURCE_DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "audio/neural_full.mp3")
TARGET_DURATION=52
ATEMPO=$(python3 -c "import math; print(round(min(max(${SOURCE_DURATION} / ${TARGET_DURATION}, 0.5), 2.0), 4))")
ffmpeg -y -i "audio/neural_full.mp3" -af "atempo=${ATEMPO}" -c:a aac -b:a 256k "audio/neural_1_2x.m4a"
```

**本次实测**：33.384s / 52s = 0.642 → ffmpeg 处理后 51.96s ✅

---

## 7. captions.json Python 生成

> **核心问题**：Node.js -e 模板字符串在含中文/反引号的 narration.txt 场景下有致命缺陷。
> **解决方案**：Python heredoc（100% 可靠）。

```python
python3 << 'PYEOF'
import json, subprocess, re

PROJECT_DIR = '{WORKSPACE_DIR}/workspace/<项目>-video'

with open(f'{PROJECT_DIR}/docs/narration.txt', 'r') as f:
    text = f.read()

# 按中文标点分割句子
sentences = re.split(r'(?<=[。！？])', text)
sentences = [s.strip() for s in sentences if s.strip()]
total = len(sentences)

# 获取音频时长
result = subprocess.run(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
     '-of', 'csv=p=0', f'{PROJECT_DIR}/audio/neural_1_2x.m4a'],
    capture_output=True, text=True
)
duration = float(result.stdout.strip())
slot = duration / total

# 生成 captions.json
captions = []
for i, s in enumerate(sentences):
    start_ms = round(i * slot * 1000)
    end_ms = round((i + 1) * slot * 1000)
    captions.append({'text': s, 'startMs': start_ms, 'endMs': end_ms})

# 末段 endMs 必须与视频时长同步（不是音频时长）
video_dur = float(subprocess.run(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
     '-of', 'csv=p=0', f'{PROJECT_DIR}/video-project/out/final.mp4'],
    capture_output=True, text=True
).stdout.strip())
captions[-1]['endMs'] = int(round(video_dur * 1000))

with open(f'{PROJECT_DIR}/audio/captions.json', 'w') as f:
    json.dump(captions, f, ensure_ascii=False, indent=2)

print(f'✅ captions.json: {total}条')
PYEOF
```

**关键点**：
- `'PYEOF'` (带单引号) 确保 heredoc 内容原样传递，不受 shell 变量展开影响
- narration.txt 内容作为 Python 变量读取，不经过 shell 插值
- 无任何模板字符串问题

**验证**：本 session 8个项目全部使用 Python 方法生成 captions.json，全部成功。

---

## 8. 验证命令

Step 0 完成后必执行：

```bash
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"
for f in article.md video-script.md narration.txt copy.md wechat-copy.md posting-guide.md session-log.md landing-page.html article-page.html wechat-page.html report.json; do
  if [ ! -f "$PROJECT_DIR/docs/$f" ]; then
    echo "❌ 缺失: $f"
  fi
done

# narration.txt 字数验证（目标秒数 × 3.37）
python3 -c "
text = open('$PROJECT_DIR/docs/narration.txt').read()
chinese = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
max_chars = int(52 * 3.37)
print(f'中文字数: {chinese} / 上限: {max_chars}')
assert chinese <= max_chars, f'字数超限: {chinese} > {max_chars}'
print('✅ 字数检查通过')
"
```

---

## 9. 关键文件路径

| 文件 | 路径 |
|------|------|
| generate_docs.js | `{SKILL_DIR}/scripts/generate_docs.js` |
| launch.sh | `{SKILL_DIR}/scripts/launch.sh` |
| 工作空间 | `{WORKSPACE_DIR}/` |