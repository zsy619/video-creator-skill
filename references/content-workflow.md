# 内容获取与生成工作流

> **最后更新**：2026-05-15
> **配套文档**：`github-fetch-fallback.md`（GitHub 内容获取）、`generate_docs-issues.md`（generate_docs 已知问题）

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

> **规范**：GitHub 项目视频制作流程中，仓库源码在 article.md 生成后不再被后续流程使用，却占用大量存储空间。视频渲染完成后**必须删除 `<repo>-repo` 目录**。

```bash
# 判断标准：满足以下全部条件后可清理
# - article.md 已包含仓库核心内容
# - 视频已成功渲染
# - 后续流程不依赖仓库源码
rm -rf "$PROJECT_DIR/<repo>-repo"
```

### shallow clone 注意事项

- **优点**：减少存储，只取最新 commit
- **缺点**：`git log`、`git blame`、完整 diff 不可用
- **充分性**：对视频项目使用场景足够（只读 README + top-level 文件）

---

## 2. generate_docs.js 已知问题

### 问题1：video-config.json 路径

**现象**：`generate_docs.js` 报错 "缺少配置文件: video-config.json"，但文件存在于 `{project}/docs/video-config.json`。

**根因**：脚本读取 `{project-root}/video-config.json`，而非 `{project-root}/docs/video-config.json`。

**正确位置**：
```
{workspace}/{project-name}/         ← video-config.json 在这里（项目根目录）
├── docs/
│   └── video-config.json           ← ❌ 不在这里
└── video-project/
```

### 问题2：narration.txt 自动生成质量差

**现象**：`generate_docs.js` 生成的 narration.txt 内容不连贯，字数过少或不符合口语化要求。

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

### 标准工作流

```bash
# Step 1: 执行 generate_docs.js
node {SKILL_DIR}/scripts/generate_docs.js {PROJECT_DIR}

# Step 2: 立即运行字数验证
python3 << 'PYEOF'
PROJECT_DIR = '/Volumes/OpenClawDrive/.hermes/workspace/<项目>-video'
with open(f'{PROJECT_DIR}/docs/narration.txt', 'r') as f:
    text = f.read()
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
target_dur = 52
max_chars = int(target_dur * 3.37)
min_chars = int(target_dur * 3.37 * 0.5)
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

## 3. 配音文本重写模式

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
PROJECT_DIR = '/Volumes/OpenClawDrive/.hermes/workspace/{project}'
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

### 关键洞见

> **不要使用 `node -e <<'NODEEOF'` heredoc 来生成或验证 narration** — Node.js 字符串插值对含中文的反引号内容会失败。**使用 Python heredoc**（captions.json 生成也因同样原因使用 Python）。
