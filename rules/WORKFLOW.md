# 视频创作工作流程 (Video Creator Workflow)

> **所属模块**: video-creator / SKILL.md → 核心工作流
> **版本**: v4.0.0
> **相关模块**: [INPUT.md](INPUT.md) · [COPY.md](COPY.md) · [THEMES.md](THEMES.md) · [VOICE.md](VOICE.md) · [QUALITY.md](QUALITY.md)

本文档定义了使用 Remotion 和 baoyu 技能体系创建专业级社交媒体视频的完整工作流程。

---

## 📋 工作流程概览

```
Step 0        Step 1        Step 2        Step 3        Step 4        Step 5
创建文档   →   内容获取   →   分析内容   →   构建项目   →   生成文案   →   构建HTML
                                                                              ↓
Step 11       Step 10        Step 9        Step 8        Step 7        Step 6
生成报告   ←   生成视频   ←   质量检查   ←   生成字幕   ←   生成音频   ←   生成视觉
```

---

## ⚠️ 铁律：文档必须全部生成，禁止跳过任何一个文件

> **经验教训（flowboard-video 项目血泪史）**：
> 1. 不能先做 Remotion 视频再补文档——会漏，必须先创建所有文档再开始渲染
> 2. `session-log.md` 必须主动写入，不是光调用 `session_status` 就完了
> 3. 每完成一个 Step 都要验证输出文件是否存在
> 4. **封面图未生成，不得进入 Step 7（音频）和 Step 10（视频渲染）**

**输出文件清单（必须全部生成，缺一不可）**：


| 文件 | 路径 | 说明 |
|------|------|------|
| 项目首页 | `docs/README.md` | 项目概览、规格、时间轴、文件清单 |
| 原始内容 | `docs/article.md` | 原始抓取或整理的内容 |
| 视频脚本 | `docs/video-script.md` | 分镜脚本和场景描述 |
| 营销文案集 | `docs/copy.md` | 小红书/视频号/抖音三版本文案 |
| 公众号文案 | `docs/wechat-copy.md` | 公众号正文（hook→功能→号召→结尾） |
| 发布指南 | `docs/posting-guide.md` | 各平台发布参数 + 检查清单 |
| 落地页 | `docs/landing-page.html` | Tailwind 深色科技风宣传页 |
| 文章阅读页 | `docs/article-page.html` | 深色竖屏阅读页 |
| 公众号适配页 | `docs/wechat-page.html` | 公众号白底适配页 |
| **会话日志** | `docs/session-log.md` | **必须主动写入，不是光调用 session_status** |
| 执行报告 | `docs/report.json` | JSON 格式完整报告 |
| 🔴 封面图 | `docs/assets/cover.png` | **竖屏封面（9:16），**平台尺寸见 PLATFORM.md，**禁止跳过** |
| 封面生成脚本 | `docs/assets/generate_cover.py` | PIL 封面生成模板 |
| 字幕生成脚本 | `docs/assets/gen_subtitles.py` | ASS 字幕生成脚本 |
| 音频文件 | `audio/neural_1_2x.m4a` | 处理后音频（atempo 后，文件名反映实际语速） |
| 字幕文件 | `audio/subtitles_58s.ass` | ASS 格式（文件名反映实际时长） |
| 最终视频 | `video-project/out/final-video.mp4` | 音频混流后的成品 |

---

## Step 0: 创建全部文档（必须先执行，禁止跳过）

> **本步骤必须生成的文件（见 PATHS.md 完整清单）**：
> - `docs/README.md` — 项目首页（概览、规格、时间轴、文件清单）
> - `docs/video-script.md` — 分镜脚本
> - `docs/copy.md` — 营销文案集
> - `docs/wechat-copy.md` — 公众号文案
> - `docs/posting-guide.md` — 发布指南
> - `docs/landing-page.html` — 落地页（Tailwind 深色科技风）
> - `docs/article-page.html` — 文章阅读页（深色竖屏）
> - `docs/wechat-page.html` — 公众号白底适配页
> - `docs/session-log.md` — Session 日志（token 消耗追踪）
> ⚠️ **以上文件必须全部创建，禁止跳过任何一个。Step 0 是预防遗漏的第一道防线。**

> **重要性**：所有文档必须在创建 Remotion 项目之前生成完毕。Remotion 视频渲染是最后一步，在此之前必须确保所有 docs/ 目录下的文件已就位。

### 0.1 创建目录结构

```bash
PROJECT_NAME="{project-name}"   # 替换为实际项目名
PROJECT_DIR="{workspace}/${PROJECT_NAME}"
mkdir -p "${PROJECT_DIR}/docs/assets/imgs"
mkdir -p "${PROJECT_DIR}/docs/assets/illustrations"
mkdir -p "${PROJECT_DIR}/audio"
mkdir -p "${PROJECT_DIR}/video-project/src"
mkdir -p "${PROJECT_DIR}/video-project/out"
mkdir -p "${PROJECT_DIR}/video-project/public/audio"
echo "目录结构创建完成"
```

### 0.2 生成 session-log.md（必须写入文件）

```bash
PROJECT_DIR="{workspace}/${PROJECT_NAME}"
SKILL_SCRIPT="${SKILL_DIR}/scripts/session-log-append.py"

# Step 0.2a: 初始化 session-log.md 文件
cat > "${PROJECT_DIR}/docs/session-log.md" << 'HDRY'
# Session Log - {project-name}

## 项目信息
- **项目名称**: {project-name}
- **开始时间**: {start_time}
- **状态**: 进行中

## 模型配置
- **默认模型**: minimax/MiniMax-M2.7
- **Token 追踪**: session_status 工具（session 级别累计，emoji 格式输出）

## 请求记录

| # | 时间 | 任务 | 模型 | 输入token | 输出token | 总token | 费用 | Context |
|---|------|------|------|----------|----------|---------|------|---------|
HDRY
# 替换占位符
START_TIME=$(date '+%Y-%m-%d %H:%M %Z')
sed -i '' "s/{start_time}/${START_TIME}/" "${PROJECT_DIR}/docs/session-log.md"
sed -i '' "s/{project-name}/${PROJECT_NAME}/" "${PROJECT_DIR}/docs/session-log.md"
echo "✅ session-log.md 已初始化"
```

### 0.3 封面图预生成（强制执行）

> ⚠️ **封面是唯一可以在 Step 6.1 预先生成的视觉素材。**
> 如果视频渲染还未开始，先把封面生成了——这样后续流程不会被封面缺失卡住。
> **所有 API 不可用时，必须用 PIL 生成（禁止跳过）。**

#### Step 0.3a：生成 AI Prompt 文件

> 在调用 baoyu-imagine 之前，必须先生成 `prompt-cover.txt`。
> 该文件包含标题处理策略，让 AI 知道如何处理长标题。

```bash
# 从 docs/video-script.md 提取主标题（第一行 # 标题）
PROJECT_DIR="{workspace}/${PROJECT_NAME}"
TITLE=$(head -1 "${PROJECT_DIR}/docs/video-script.md" | sed 's/^#* *//' | tr -d '\n')
SUBTITLE=$(grep -A1 '^## ' "${PROJECT_DIR}/docs/video-script.md" | tail -1 | sed 's/^#* *//' | tr -d '\n')

# 生成 AI Prompt 文件（包含长标题处理指令）
cat > "${PROJECT_DIR}/docs/assets/prompt-cover.txt" << 'PROMPT_EOF'
# 封面图生成 Prompt

## 主题
{TITLE}

## 副标题
{SUBTITLE}

## 画面风格
- 赛博朋克风格，深色背景（#0D0221）
- 四角霓虹光晕（青色#00FFFF、品红#FF00FF、紫色#9D00FF）
- 背景网格线（#150828）
- 科技感粒子装饰

## 标题文字处理规则（必须遵守）
1. 标题必须完整显示，不得截断或省略任何字
2. 如标题超过 8 个字：自动缩小字体但必须保持清晰可读（不得小于 48px）
3. 如标题超过 14 个字：可拆分为两行展示（主标题 + 副标题结构）
4. 字体颜色：白色（#FFFFFF），外发光青色（#00FFFF）效果
5. 标题位置：画面垂直方向约 18-25% 高度处居中

## 技术规格
- 尺寸：9比16竖屏格式
- 主标题字号：建议 80-130px（根据字数自动调整）
- 副标题字号：建议 48-60px
- 安全边距：画布左右各留 5% 空白

## 参考元素（可选添加）
- 抽象数据流线条
- 电路板纹理
- 霓虹光效
PROMPT_EOF

# 替换占位符
sed -i '' "s/{TITLE}/${TITLE}/" "${PROJECT_DIR}/docs/assets/prompt-cover.txt"
sed -i '' "s/{SUBTITLE}/${SUBTITLE}/" "${PROJECT_DIR}/docs/assets/prompt-cover.txt"
echo "✅ prompt-cover.txt 已生成"
```

#### Step 0.3b：AI 生成（首选）

```bash
SKILL_DIR="$HOME/.hermes/skills/baoyu-imagine"
BUN_PATH="$HOME/.bun/bin/bun"

# 优先尝试 baoyu-imagine
$BUN_PATH "$SKILL_DIR/scripts/main.ts" \
  --promptfile "${PROJECT_DIR}/docs/assets/prompt-cover.txt" \
  --image "${PROJECT_DIR}/docs/assets/cover.png" \
  --ar 9:16 --quality 2k 2>&1

if [ $? -eq 0 ] && [ -f "${PROJECT_DIR}/docs/assets/cover.png" ]; then
  echo "✅ AI 封面生成成功"
  # 执行 Step 0.3c 质量门禁
  node "$SKILL_DIR/scripts/cover-quality-gate.js" \
    "${PROJECT_DIR}/docs/assets/cover.png" vertical || exit 1
else
  echo "⚠️ baoyu-imagine 失败，切换到 PIL 兜底..."
fi
```

#### Step 0.3c：PIL 兜底（仅在 AI 不可用时）

> ⚠️ **PIL 生成脚本已强制使用 `smart_resize_text()` 自动缩放**
> ——所有文字都会在超宽时自动缩小，不再出现标题溢出错

```bash
SKILL_COVER="$HOME/.hermes/skills/video-creator/scripts/generate_cover.py"

# 从 video-script.md 提取标题
TITLE=$(head -1 "${PROJECT_DIR}/docs/video-script.md" | sed 's/^#* *//' | tr -d '\n')
SUBTITLE=$(grep -A1 '^## ' "${PROJECT_DIR}/docs/video-script.md" | tail -1 | sed 's/^#* *//' | tr -d '\n')

# 三种画布全部生成
python3 "$SKILL_COVER" "$TITLE" "$SUBTITLE" "${PROJECT_DIR}/docs/assets" vertical
python3 "$SKILL_COVER" "$TITLE" "$SUBTITLE" "${PROJECT_DIR}/docs/assets" wechat
python3 "$SKILL_COVER" "$TITLE" "$SUBTITLE" "${PROJECT_DIR}/docs/assets" xhs
```

#### Step 0.3d：质量门禁（强制）

```bash
# 封面质量门禁 — 校验尺寸和文件大小
EXPECTED_SIZES="
${PROJECT_DIR}/docs/assets/cover.png|1080|1920
${PROJECT_DIR}/docs/assets/cover-wechat.png|900|383
${PROJECT_DIR}/docs/assets/cover-xhs.png|1440|2560
"

while IFS='|' read -r path exp_w exp_h; do
  if [ ! -f "$path" ]; then
    echo "❌ 封面缺失: $path"
    exit 1
  fi
  SIZE=$(python3 -c "from PIL import Image; w,h=Image.open('$path').size; print(f'{w}x{h}')" 2>/dev/null)
  if [ "$SIZE" != "${exp_w}x${exp_h}" ]; then
    echo "❌ 封面尺寸错误: $path ($SIZE，期望 ${exp_w}x${exp_h})"
    exit 1
  fi
  KB=$(du -k "$path" | cut -f1)
  if [ "$KB" -lt 20 ]; then
    echo "❌ 封面文件过小: $path (${KB}KB < 20KB)"
    exit 1
  fi
  echo "✅ $path: $SIZE ${KB}KB"
done <<< "$EXPECTED_SIZES"
echo "✅ 封面质量门禁全部通过"
```

#### Step 0.3e：强制检查（禁止跳过）

```bash
# ⚠️ 此检查在 Step 7（音频）之前必须执行
if [ ! -f "${PROJECT_DIR}/docs/assets/cover.png" ]; then
  echo "❌ 封面缺失！必须先生成封面图（Step 0.3）才能继续音频和渲染步骤"
  exit 1
fi
echo "✅ 封面检查通过"

### 0.4 验证文档完整性

```bash
# Step 0 完成后，必须验证所有文件存在才能继续
REQUIRED_FILES=(
  "${PROJECT_DIR}/docs/README.md"
  "${PROJECT_DIR}/docs/article.md"
  "${PROJECT_DIR}/docs/video-script.md"
  "${PROJECT_DIR}/docs/copy.md"
  "${PROJECT_DIR}/docs/wechat-copy.md"
  "${PROJECT_DIR}/docs/posting-guide.md"
  "${PROJECT_DIR}/docs/landing-page.html"
  "${PROJECT_DIR}/docs/article-page.html"
  "${PROJECT_DIR}/docs/wechat-page.html"
  "${PROJECT_DIR}/docs/session-log.md"
  "${PROJECT_DIR}/docs/assets/cover.png"
  "${PROJECT_DIR}/docs/assets/generate_cover.py"
  "${PROJECT_DIR}/docs/assets/gen_subtitles.py"
  "${PROJECT_DIR}/audio/neural_1_2x.m4a"
  "${PROJECT_DIR}/audio/subtitles_*.ass"
  "${PROJECT_DIR}/video-project/out/final-video.mp4"
)

MISSING=""
for f in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    MISSING="$MISSING\n  缺失: $f"
  fi
done
if [ -n "$MISSING" ]; then
  echo "❌ 以下文件缺失，Step 0 未完成：$MISSING"
  echo "请先创建所有文档再继续！"
  exit 1
else
  echo "✅ Step 0 完成，所有文件就绪"
fi
```

### 0.5 强制检查：封面未生成则禁止渲染

```bash
# ⚠️ 此检查在 Step 7（音频）之前必须执行
if [ ! -f "${PROJECT_DIR}/docs/assets/cover.png" ]; then
  echo "❌ 封面缺失！必须先生成封面图（Step 6.1）才能继续音频和渲染步骤"
  exit 1
fi
echo "✅ 封面检查通过"
```

### 0.6 ⚠️ 强制记录 Session 日志（铁律）

> **⚠️ 【铁律】每个 Step 完成后必须调用 `session_status` 工具并记录到 session-log.md**
>
> `session_status` 是 OpenClaw 工具调用，不是 shell 命令。调用后在 AI 对话中会看到 emoji 格式输出，**必须立即将此输出追加到 session-log.md**。
>
> 格式：
> ```bash
> # 1. 调用 session_status 工具（在 AI 对话中）
> # 2. 看到 emoji 输出后，立即追加到 session-log.md
> echo "| $(printf '%02d' $((++REQ_COUNT))) | $(date '+%Y-%m-%d %H:%M:%S') | Step N: 任务名 | minimax/MiniMax-M2.7 | - | - | - | - | <emoji输出> |" >> "${PROJECT_DIR}/docs/session-log.md"
> ```
>
> **所有 Step（0-11）完成后都要记录，禁止跳过任何一个。**
> 这是追踪 Token 消耗和审计的唯一手段。

### 0.7 追加 session-log（旧版，请忽略）

> 以下为旧版说明，已被 0.5 铁律替代，仅作参考。

```bash
# ⚠️ session_status 是工具调用（tool），不是 shell 命令！
# 正确流程：
#   1. 调用 session_status 工具 → 得到 emoji 格式输出
#   2. 将输出作为参数传给 Python 脚本写入文件
#
# ❌ 错误写法（无效）：
#   STATUS=$(session_status)          # session_status 不是 shell 命令
#   session_status > file.txt        # 输出在 tool result，不在 stdout
#
# ✅ 正确写法：先调用工具，将结果手动追加到 session-log.md
PROJECT_DIR="{workspace}/${PROJECT_NAME}"
SKILL_SCRIPT="${SKILL_DIR}/scripts/session-log-append.py"

# 手动追加一行（每次大步骤完成后执行）
python3 "${SKILL_SCRIPT}" "${PROJECT_DIR}" "内容获取（baoyu-fetch）"

# 或直接用 echo 追加（无需解析）：
TS=$(date '+%Y-%m-%d %H:%M:%S %Z')
echo "| 01 | $TS | 内容获取 | minimax/MiniMax-M2.7 | - | - | - | - | - |" >> "${PROJECT_DIR}/docs/session-log.md"
```

---


## Step 1: 内容获取

**输入模式**: 根据用户提供的内容形式选择对应处理方式

### 🔗 链接模式

当用户提供网址时执行：

1. **使用 baoyu-url-to-markdown 抓取内容并下载图片**
   ```bash
   bun $SKILL_DIR/scripts/vendor/baoyu-fetch/src/cli.ts <url> \
     --output docs/article.md \
     --download-media \
     --media-dir docs/assets/imgs/
   ```

2. **记录来源链接（强制）**
   > ⚠️ **必须**：在 `docs/README.md`、`docs/article.md`、`docs/report.json` 中明确记录原始链接地址
   - GitHub 项目：`https://github.com/xxx/yyy`
   - X/Twitter 推文：`https://x.com/xxx/status/yyy`
   - 其他链接：按实际来源如实记录

3. **解析 Markdown 提取关键信息**
   - 标题（title）
   - 正文内容（body）
   - 元数据（metadata）
   - 关键段落和论点

4. **下载的图片存放位置**
   - 路径：`docs/assets/imgs/`
   - 图片可直接用于 Step 6（视觉生成）和 Remotion 视频组件

5. **记录 Session 日志**
   ```bash
   # 记录本次内容获取的 token 消耗
   session_status
   ```
   > 详见 [SESSION_LOG.md](SESSION_LOG.md) - 追踪输入/输出 token、数量、请求模型、处理时长

### 🔍 主题模式

当用户提供主题关键词时执行：

1. **多关键词组合搜索**
   ```bash
   # 使用 web_search 搜索相关内容
   # 建议搜索组合：
   # - 主关键词 + 行业词
   # - 主关键词 + 应用场景
   # - 主关键词 + 数据/案例
   ```

2. **搜索结果整合**
   - 提取重复出现的主题和观点
   - 识别权威来源
   - 构建内容摘要框架

### 📝 内容模式

当用户直接提供内容时执行：

1. **直接解析提供的内容**
   - 识别标题结构
   - 提取关键段落
   - 标记重要引用和数据

2. **内容结构化处理**
   - 重组为适合视频的叙事结构
   - 划分可独立呈现的要点
   - 添加过渡和连接语句

---

## Step 2: 分析内容

**质量检查**: 详见 [QUALITY.md](QUALITY.md)

### 内容质量验证

- **长度检查**：建议 500-2000 字
- **结构完整性**：验证标题、段落、结论
- **可读性评分**：评估内容是否适合视频化

### 内容结构化

```javascript
{
  "title": "文章标题",
  "summary": "100-200字摘要",
  "keywords": ["关键词1", "关键词2", ...],
  "sections": [
    { "heading": "小标题1", "content": "段落内容", "emphasis": true },
    { "heading": "小标题2", "content": "段落内容", "emphasis": false }
  ],
  "suggestedDuration": 45, // 秒
  "platform": "xhs|wechat|all"
}
```

### 时长规划

根据内容长度自动计算建议时长：
- 500字以下：10-20秒
- 500-1000字：20-40秒
- 1000-2000字：40-60秒
- 2000字以上：60-90秒

---

## Step 3: 构建项目

**执行方式**: 自动创建，无需手动干预

```bash
# 定义项目名称（建议使用拼音或英文，避免空格和特殊字符）
PROJECT_NAME="项目名称"

# 创建完整的项目目录结构
mkdir -p "{workspace}/{PROJECT_NAME}/docs/assets
mkdir -p "{workspace}/{PROJECT_NAME}/video-project/src/components
mkdir -p "{workspace}/{PROJECT_NAME}/video-project/src/themes
mkdir -p "{workspace}/{PROJECT_NAME}/video-project/out
mkdir -p "{workspace}/{PROJECT_NAME}/audio/raw
mkdir -p "{workspace}/{PROJECT_NAME}/audio/processed
mkdir -p "{workspace}/{PROJECT_NAME}/fonts
```

### 📁 目录结构说明

| 目录 | 用途 | 关键文件 |
|------|------|---------|
| `docs/` | 文档和素材 | `article.md`, `video-script.md`, `wechat.md` |
| `docs/assets/` | 视觉素材 | `cover.webp`, `illustration-*.webp` |
| `video-project/` | Remotion 项目 | `src/`, `out/`, `package.json` |
| `audio/` | 音频文件 | `raw/`, `processed/`, `final.mp3` |
| `fonts/` | 字体文件 | 自定义字体 |

### 🎯 命名规范

- **项目名称**: 拼音或英文，使用连字符分隔（如 `ai-trends-2024`）
- **素材文件**: 小写字母和连字符（如 `cover-image.webp`）
- **组件文件**: PascalCase（如 `VerticalVideo.tsx`）

---

## Step 4: 生成文案

**调用 baoyu 技能生成文案**（详见 [COPY.md](COPY.md)）

### 4.1 原始内容处理

1. **生成内容文件**: `docs/article.md`

   ```markdown
   ---
   title: "文章标题（吸引眼球、带emoji）"
   summary: "摘要（100-200字）"
   tags:
     - 标签1
     - 标签2
     - 标签3
   platform: all
   ---

   # 文章正文内容
   ```

2. **内容规范检查**
   - 标题：不超过 23 个字符
   - 摘要：100-200 字
   - 标签：不少于 5 个相关标签
   - 正文：结构清晰，逻辑连贯

3. **记录 Session 日志**
   ```bash
   # 记录本次文案生成的 token 消耗
   session_status
   ```
   > 详见 [SESSION_LOG.md](SESSION_LOG.md)

### 4.2 视频脚本生成

**生成文件**: `docs/video-script.md`

```markdown
---
metadata:
  platform: [xhs|wechat|all]
  duration: <秒数>
  theme: <主题名称>
  fps: 60
  resolution: [1080x1920]
cover: docs/assets/cover.webp
illustrations:
  - path: docs/assets/illustration-1.webp
    scenes: [1, 2]
---

# 视频脚本

## 场景 1: 开场（0-3秒）
- **画面**: 封面图动画进入
- **文字**: 主标题
- **音频**: 开场音效
```

### 4.3 公众号文案生成

**生成文件**: `docs/wechat-copy.md`

```markdown
---
title: "公众号标题（吸引眼球、带emoji）"
summary: "公众号摘要（100-200字、带emoji）"
tags:
  - 标签1
  - 标签2
  - 标签3
source: https://example.com/original-link  # 来源链接（从Step 1获取）
---

# 公众号正文
```

> ⚠️ **来源链接强制要求**：如果内容来自链接（GitHub、X/Twitter等），必须在 frontmatter 中添加 `source:` 字段，记录原始链接地址。
> - GitHub 项目：`https://github.com/xxx/yyy`
> - X/Twitter 推文：`https://x.com/xxx/status/yyy`
> - 其他链接：按实际来源如实记录

### 4.4 发布指南生成

**生成文件**: `docs/posting-guide.md`

```markdown
---
title: "发布指南"
platforms: [xhs, wechat, douyin, youtube]
tags:
  - 标签1
  - 标签2
  - 标签3
---

## 📱 小红书
| 项目 | 内容 |
|------|------|
| 标题 | （吸引眼球、不超过20个字符）|
| 摘要 | （100-200字）|
| 标签 | #标签1 #标签2 #标签3 #标签4 #标签5 |

## ⏰ 最佳发布时间
| 平台 | 最佳时段 |
|------|----------|
| 小红书 | 19:00-22:00 |
| 视频号 | 12:00-13:00, 20:00-22:00 |
```

> ⚠️ **标签强制要求**：posting-guide.md 中的小红书标签**不少于5个**，格式为 `#标签1 #标签2 #标签3 #标签4 #标签5`

---

## Step 5: 构建HTML

**参考**: [HTML.md](HTML.md) - HTML页面规范

### 落地页

```bash
# 输出：docs/landing-page.html
```

### 文章阅读页

```bash
# 输出：docs/article-page.html
```

### 公众号适配页

```bash
# 输出：docs/wechat-page.html
```

### 模板选择

| 平台 | 模板 | 说明 |
|------|------|------|
| 小红书 | `article-page.html` | 文章阅读页 |
| 视频号 | `wechat-page.html` | 公众号适配页 |
| 落地推广 | `landing-page.html` | 宣传落地页 |

---

## Step 6: 生成视觉

> ⚠️ **封面图必须第一个生成，是所有视觉素材中优先级最高的。**
> 封面未生成到位，不得进入 Step 7（音频生成）和 Step 10（视频渲染）。

**调用 baoyu 技能生成图片**（详见 [THEMES.md](THEMES.md)）

### 6.1 封面图生成（强制优先）

> 🔴 **所有 API 失败时的最终兜底：必须用 PIL 生成封面，禁止留空。**
> 见 TROUBLESHOOTING.md 方案二（`generate_cover.py`）。

```bash
# 使用 baoyu-imagine 生成封面（Step 6.1.1）
# 平台尺寸（按 posting-guide.md 中各平台要求）：
#   - 视频号 / 抖音 / 公众号：1080×1920（9:16）
#   - 小红书：1440×2560（9:16）
# 必填参数：--ar 9:16 --quality 2k

# 输出：docs/assets/cover.png (9:16 竖屏比例)
```

### 6.1.2 记录 Session 日志

```bash
# 记录本次视觉生成的 token 消耗
session_status
```
> 详见 [SESSION_LOG.md](SESSION_LOG.md)

### 6.1.1 封面图生成容错方案

> ⚠️ 当 baoyu 图像生成 API（Seedream / MiniMax / DashScope / OpenAI / OpenRouter）均不可用时，必须使用以下容错方案之一，禁止跳过或留空。详见 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)。

#### 方案一：Remotion 代码生成（推荐）

**适用场景**：需要动画效果、已有 Remotion 项目、需要与视频风格一致。

**核心步骤**：
1. 创建独立 `cover-project/` 项目（参考 TROUBLESHOOTING.md）
2. 使用 `frame = 60`（固定帧）避免 `useCurrentFrame` 报错
3. 必须通过 `Composition` 注册组件
4. 渲染后用 ffmpeg 提取单帧 PNG

```bash
# ✅ 正确方式：渲染第0帧为PNG（不要用 remotion still，文字不会渲染）
npx remotion render CoverImage --frames=0 --log=error
# 输出：out/CoverImage.png

# 复制到项目目录
cp out/CoverImage.png docs/assets/cover.png
```

#### 方案二：PIL/Pillow 纯代码生成

**适用场景**：API 全部不可用、快速生成、无需 AI 绘图能力。

**核心步骤**：
1. 参考模板创建 `docs/assets/generate_cover.py`
2. 使用系统字体（macOS: `/System/Library/Fonts/STHeiti Medium.ttc`）
3. 垂直居中布局：先计算总高度，再计算起始 Y 坐标
4. 输出分辨率：1080×1920（竖屏 9:16）

**参考实现**：
```bash
# 运行封面生成脚本
python3 docs/assets/generate_cover.py
# 输出：docs/assets/cover.png
```

**关键字体路径（macOS）**：
| 字体         | 路径                                       |
| ------------ | ------------------------------------------ |
| 黑体（中等） | `/System/Library/Fonts/STHeiti Medium.ttc` |
| 苹方         | `/System/Library/Fonts/PingFang.ttc`       |
| 黑体（细）   | `/System/Library/Fonts/STHeiti Light.ttc`  |


### 6.2 内容插图生成（优先使用下载图片）

```bash
# Step 6.2.1: 筛选并裁剪下载的图片适配9:16竖屏
# 图片存放位置：docs/assets/imgs/
# 裁剪后存放：docs/assets/illustrations/

# 使用 Python PIL 自动裁剪
python3 $SKILL_DIR/scripts/crop-images.py \
  --input docs/assets/imgs/ \
  --output docs/assets/illustrations/ \
  --target-size 1080x1920 \
  --mode center-crop

# Step 6.2.2: 如果下载图片不足或质量不够，使用 baoyu-article-illustrator 生成
# 每个主要段落配 1 张插图
# 数据和统计配信息图

# 输出：docs/assets/illustrations/illustration-1.webp, illustration-2.webp, ...
```

#### 6.2.3 图片自动筛选与场景匹配

> **核心逻辑**：从 `docs/assets/imgs/` 中自动筛选最相关的图片，匹配视频脚本中的场景关键词。

```python
# 图片筛选规则：
# 1. 提取场景关键词（来自 video-script.md）
# 2. 计算图片名/alt text 与关键词的相似度
# 3. 按相关性排序，选择 top-N
# 4. 裁剪为 9:16 竖屏比例
```

#### 6.2.4 图片裁剪规范

| 原始比例 | 目标比例 | 处理方式 |
|---------|---------|---------|
| 16:9 横版 | 9:16 竖屏 | 居中裁剪，保留主体 |
| 4:3 | 9:16 竖屏 | 居中裁剪 |
| 1:1 方版 | 9:16 竖屏 | 上下填充模糊背景 |
| 9:16 竖屏 | 9:16 竖屏 | 智能缩放，保持完整 |

```python
# 裁剪算法伪代码
if source_aspect > target_aspect:  # 横版图片
    # 计算裁剪区域（居中）
    crop_height = width / target_ratio
    offset_y = (height - crop_height) / 2
    crop_box = (0, offset_y, width, offset_y + crop_height)
else:  # 竖版图片
    # 智能缩放，主体内容不裁剪
    scale = max(target_width / width, target_height / height)
    new_size = (int(width * scale), int(height * scale))
    # 居中放置，背景填充
```

### 6.3 信息图生成（如适用）

```bash
# 使用 baoyu-infographic 生成数据可视化
# 适用于：统计数据、对比信息、流程图等

# 输出：docs/assets/infographic.webp
```

---

## Step 7: 生成音频

> ⚠️ **前置条件：封面图必须已生成（Step 6.1）。封面未生成则不开始本步骤。**
> ⚠️ **⚠️ 渲染前必须通过质量门禁（见 Step 10 前置检查）。**
> **⚠️ 详细说明**: 请参考 [VOICE.md](VOICE.md) - Azure Neural TTS 自然语音合成最佳实践

### 7.0 ⚠️ 强制质量门禁（禁止跳过）

```bash
# ⚠️ 渲染前必须先通过 audio 节点门禁，退出码≠0 时禁止继续
SKILL_DIR="$HOME/.hermes/skills/video-creator"
GATE="${SKILL_DIR}/scripts/video-quality-gate.js"
if ! node "${GATE}" "${PROJECT_DIR}" "audio"; then
  echo "❌ 音频节点未通过，请修复上述问题"
  exit 1
fi
echo "✅ audio 节点门禁通过"
```

### 7.1 音频生成流程

```bash
# 1. 使用 Azure Neural TTS 生成音频（整段连续生成，禁止分段拼接）
# 参考 VOICE.md 中的 API 调用方式

# 2. 音频后处理
# ⚠️ atempo 值决定最终时长 → 必须记录 DURATION 供字幕生成使用
# ⚠️ 必须用 -c:a aac -b:a 256k 强制重编码（禁止 -c:a copy）
ffmpeg -y -i raw/audio.mp3 \
  -af "silenceremove=start_periods=1:start_duration=0.5:start_threshold=-50dB:detection=peak,atempo=1.2" \
  -c:a aac -b:a 256k -ar 48000 -ac 2 \
  -c:a aac -b:a 256k -ar 48000 -ac 2 \
  audio/neural_1_2x.m4a

# 3. ⚠️【强制】音频有效性验证（禁止跳过）
# RMS=-inf 表示静音/无效音频；非0个样本表示有声音
RMS_COUNT=$(ffmpeg -i audio/neural_1_2x.m4a \
  -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" \
  -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l)
if [ "$RMS_COUNT" -eq 0 ]; then
  echo "❌ 音频无效（RMS 全为 -inf），停止执行"
  exit 1
fi
echo "✅ 音频有效（$RMS_COUNT 个有效样本）"

# 4. 获取音频时长（供 Step 8 字幕生成使用，禁止跳过）
DURATION=$(ffprobe -i audio/neural_1_2x.m4a -show_entries format=duration -v quiet -of csv="p=0")
echo "最终音频时长: ${DURATION}s"
```

### 7.2 推荐语音

| 语音 | 说明 | 场景 |
|------|------|------|
| `zh-CN-YunjianNeural` | 温和男声 | **通用推荐** |
| `zh-CN-YunxiNeural` | 年轻男声 | 科技/工具类 |
| `zh-CN-XiaoxiaoNeural` | 温柔女声 | 通用推荐 |

### 7.3 记录 Session 日志

```bash
# 记录本次音频生成的 token 消耗
session_status
```
> 详见 [SESSION_LOG.md](SESSION_LOG.md) |

---

## Step 8: 生成字幕

**参考**: [SUBTITLES.md](SUBTITLES.md) - 字幕生成与质量检查文档

> ⚠️ **必须先完成 Step 7（音频后处理）确认最终时长，再生成字幕**
> 字幕时间轴必须基于 `atempo` 处理后的最终音频时长，禁止用原速时长。

### 8.0 ⚠️ 强制前置检查（禁止跳过）

```bash
# ⚠️ 生成字幕前必须执行此检查，退出码≠0 时禁止继续
SKILL_DIR="$HOME/.hermes/skills/video-creator"
node "${SKILL_DIR}/scripts/pre-subtitle-check.js" "${PROJECT_DIR}"
# 检查内容：音频文件存在、时长有效、非静音、文本长度合理
# 不通过 → 修复音频问题，禁止强行生成字幕

# ⚠️ 同时执行字幕节点质量门禁
node "${SKILL_DIR}/scripts/video-quality-gate.js" "${PROJECT_DIR}" "subtitle"
# 不通过 → 修复字幕格式问题
```

### 8.1 字幕生成（Fontsize=72，禁止其他值）

```javascript
// ⚠️ 必须先执行 8.0 前置检查，确认最终时长
const DURATION = 58.16; // 最终音频时长（atempo 1.2x 处理后），从 Step 7 获取

// 字幕规范（统一值，禁止修改）：
//   Fontsize: 72, PlayResX: 1080, PlayResY: 1920
//   PrimaryColour: &H00FFFF (黄色)
//   Alignment: 2 (底部居中)
//   MarginV: 50, Outline: 2
const generator = new SubtitleGenerator();
const subtitles = await generator.generateFromText(text, DURATION);
await generator.generateASS(subtitles, 'audio/subtitles.ass');
```

### 8.2 字幕格式规范（2026-05-10 统一值）

| 参数 | 值 | 说明 |
|------|-----|-----|
| **Fontsize** | **72** | 竖屏1080×1920标准，禁止10/12/36 |
| **PlayResX/PlayResY** | **1080/1920** | 必须设置 |
| **PrimaryColour** | `&H00FFFF` | 黄色 |
| **Alignment** | **2** | 底部居中 |
| **MarginV** | **50** | 距底边50px |
| **Outline** | **2** | 2px描边，禁止1 |
| **Format字段数** | **10** | Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text |
| **Dialogue字段数** | **10** | 必须与Format一致 |
| **换行符** | `\N` | 禁止`\\N` |

### 8.3 字幕质量验证

```bash
# 烧录一帧截图验证字幕显示效果
ffmpeg -y -i video-project/out/final-video.mp4 \
  -vf "ass=audio/subtitles.ass" \
  -frames:v 1 -q:v 2 /tmp/subtitle-check.png

# 检查字幕文件时长覆盖
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 audio/subtitles.ass
```

### 8.4 记录 Session 日志

```bash
# 记录本次字幕生成的 token 消耗
session_status
```
> 详见 [SESSION_LOG.md](SESSION_LOG.md)

---

## Step 9: 质量检查

**参考**: [QUALITY.md](QUALITY.md) - 质量检查规范

### 检查项目

| 检查项 | 标准 | 不合格处理 |
|--------|------|-----------|
| 内容长度 | 500-2000字 | 自动调整 |
| 标题吸引力 | 通过测试 | 重新生成 |
| 封面图 | 清晰度 > 80% | 重新生成 |
| 插图匹配度 | 与内容相关 | 替换或删除 |
| 音频同步 | 误差 < 0.1秒 | 重新计算帧边界 |
| 字幕同步 | 误差 < 0.2秒 | 调整时间轴 |

### 自动修复

```javascript
const checker = new QualityChecker({
  projectDir: './my-video',
  fixIssues: true // 自动修复
});
const report = await checker.runFullCheck();
```

---

## Step 10: 生成视频

> ⚠️ **前置条件：封面图和音频必须都已生成。两者缺一则不开始本步骤。**

### 10.0 ⚠️ 强制前置检查（禁止跳过）

```bash
# ⚠️ 渲染前必须执行此检查，退出码≠0 时禁止渲染
SKILL_DIR="$HOME/.hermes/skills/video-creator"
GATE="${SKILL_DIR}/scripts/video-quality-gate.js"

# A. 音频节点门禁
if ! node "${GATE}" "${PROJECT_DIR}" "audio"; then
  echo "❌ audio 节点未通过"
  exit 1
fi

# B. 字幕节点门禁
if ! node "${GATE}" "${PROJECT_DIR}" "subtitle"; then
  echo "❌ subtitle 节点未通过"
  exit 1
fi

# C. 渲染前检（新增：2026-05-10）
# 检查：package.json使用remotion、Video.tsx无<Text>、node_modules/remotion存在
if ! node "${GATE}" "${PROJECT_DIR}" "render"; then
  echo "❌ render 节点未通过"
  echo "常见问题："
  echo "  1. package.json 使用 @remotion/core（应改为 remotion）"
  echo "  2. Video.tsx 存在 <Text> 组件（应改为 <div>）"
  echo "  3. node_modules/remotion 未安装"
  exit 1
fi

# D. 代码级预检（原有）
node "${SKILL_DIR}/scripts/pre-render-check.js" \
  "video-project/src/Video.tsx" 60 "${DURATION}"
```

### 10.1 Remotion 项目初始化

```bash
# 进入视频项目目录
cd workspace/${PROJECT_NAME}/video-project

# 初始化 Remotion 项目
npx create-video@latest . --template vertical

# 安装依赖
npm install
```

### 10.2 主题配置

**参考**: [THEMES.md](THEMES.md) - 主题色板 + **字体大小规范（1080×1920竖屏）**

> ⚠️ **【强制要求】所有视频必须使用大字体！**
> - 主标题：**120-180px**（封面场景可用更大）
> - 副标题：**48-72px**
> - 正文：**40-56px**
> - 场景标题：**64-96px**
> - 全部内容块**上下左右居中**，禁止拆分标题区/内容区
> 
> 详见 [FONTS.md](FONTS.md) - 大字体居中设计规范。

```typescript
export const theme = {
  name: 'tech-modern',
  colors: {
    primary: '#3B82F6',
    secondary: '#1E40AF',
    background: '#0F172A',
    text: '#F8FAFC',
    accent: '#22D3EE'
  },
  fonts: {
    heading: 'Noto Sans SC',
    body: 'Noto Sans SC'
  }
}
```

### 10.3 竖屏视频组件

**参考**: [REMOTION.md](REMOTION.md) - 居中场景模板和竖屏配置

```typescript
export const VerticalVideo: React.FC<{
  scenes: Scene[]
}> = ({ scenes }) => {
  return (
    <AbsoluteFill
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: theme.colors.background
      }}
    >
      {scenes.map((scene, index) => (
        <Scene key={index} {...scene} />
      ))}
    </AbsoluteFill>
  )
}
```

### 10.4 视频渲染

```bash
# ⚠️ 必须先执行 10.0 前置检查（Sequence帧数、帧数和验证）

# 渲染无音频视频
npx remotion render VerticalVideo \
  --output out/video_noaudio.mp4 \
  --fps 60 \
  --height 1920 \
  --width 1080
```

### 10.5 音频混流

```bash
# ⚠️ 必须用 -c:a aac -b:a 256k 强制重编码（禁止 -c:a copy）
# ⚠️ Remotion raw 视频的音频轨道可能为空（RMS=-inf），必须完全替换
ffmpeg -y \
  -i out/video_noaudio.mp4 \
  -i processed/audio_1_2x.m4a \
  -c:v copy \
  -c:a aac -b:a 256k \
  -map 0:v -map 1:a \
  -shortest \
  out/final-video.mp4

# ⚠️【强制】混流后音频验证（禁止跳过）
# 最终视频的音频必须来自 edge-tts 文件，Remotion raw 视频只取视频流
RMS_COUNT=$(ffmpeg -i out/final-video.mp4 \
  -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" \
  -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l)
if [ "$RMS_COUNT" -eq 0 ]; then
  echo "❌ 最终视频音频无效（RMS 全为 -inf），检查音频源"
  exit 1
fi
echo "✅ 最终视频音频有效（$RMS_COUNT 个有效样本）"

# volumedetect 辅助验证
ffmpeg -i out/final-video.mp4 -vn -af "volumedetect" -f null - 2>&1 | grep -E "mean_volume|max_volume"
```

### 10.6 记录 Session 日志

```bash
# 记录本次视频渲染的 token 消耗
session_status
```
> 详见 [SESSION_LOG.md](SESSION_LOG.md)

### 10.7 视频预览（可选）

```bash
# 方案一：Remotion still 预览（快速生成单帧预览）
cd video-project
npx remotion still VerticalVideo out/preview-frame-0.png --frame 0
npx remotion still VerticalVideo out/preview-frame-mid.png --frame 450

# 方案二：ffmpeg 生成缩略图预览（快速验证）
ffmpeg -i video-project/out/final-video.mp4 \
  -vf "fps=1,scale=360:-1" \
  -frames:v 6 \
  video-project/out/preview-thumbs.jpg

# 方案三：生成 GIF 预览（适合分享，文件较大）
ffmpeg -i video-project/out/final-video.mp4 \
  -vf "fps=5,scale=360:-1" \
  -frames:v 30 \
  video-project/out/preview.gif

# 预览完成后清理
rm -f video-project/out/preview-*.png video-project/out/preview-thumbs.jpg
```

---

## Step 11: 生成报告 + 强制清单检查

### 11.0 ⚠️ 必须先对照文件清单检查（禁止跳过）

> **在生成任何报告之前，先运行 Step 11.4 的文件清单检查脚本。**
> 如有缺失文件，必须先补全，再继续。

### 11.1 写入 session-log.md（必须执行，禁止跳过）

> **血泪教训**：flowboard-video 项目中，`session_status` 调用了无数次但从未写入文件，导致 session-log.md 完全缺失。`session_status` 只读取数据，必须配合文件写入操作才生效。

```bash
PROJECT_DIR="workspace/${PROJECT_NAME}"
SKILL_SCRIPT="${HOME}/.hermes/skills/video-creator/scripts/session-log-append.py"

# ✅ 方法一（推荐）：用 Python 脚本解析 session_status 输出
#    1. 先调用 session_status 工具，复制输出文本
#    2. 将文本作为参数传入脚本
STATUS_TEXT="🧮 Tokens: 85k in / 123 out · 💵 Cost: \$0.03 · 📚 Context: 111k/205k (54%)"
python3 "${SKILL_DIR}/scripts/session-log-append.py}" "${PROJECT_DIR}" "最终报告生成" "${STATUS_TEXT}"

# ✅ 方法二（备用）：直接追加一行（无 token 数据）
TS=$(date '+%Y-%m-%d %H:%M:%S %Z')
REQ_COUNT=$(($(grep -c "^[|]" "${PROJECT_DIR}/docs/session-log.md" 2>/dev/null || echo 0) + 1))
echo "| $(printf '%02d' $REQ_COUNT) | $TS | 最终报告生成 | minimax/MiniMax-M2.7 | - | - | - | - | - |" >> "${PROJECT_DIR}/docs/session-log.md"

# 更新项目状态
sed -i '' 's/- **状态**: 进行中/- **状态**: 已完成/' "${PROJECT_DIR}/docs/session-log.md"
echo "✅ session-log.md 已更新（最终状态）"
```

### 11.2 生成 report.json

```json
{
  "title": "Video Creator 执行报告",
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "project": {
    "name": "${PROJECT_NAME}",
    "path": "workspace/${PROJECT_NAME}"
  },
  "files": {
    "video": "video-project/out/final-video.mp4",
    "audio": "audio/neural_1_2x.m4a",
    "subtitles": "audio/subtitles_*.ass"
  }
}
```

### 11.3 批量处理视频项目

```bash
# 进入 video-creator 目录
cd $HOME/.hermes/skills/video-creator

# 批量检查所有项目（不自动修复）
node scripts/video-check.js batch-process \
  --directory ~/VideoProjects

# 批量检查并自动修复问题
node scripts/video-check.js batch-process \
  --directory ~/VideoProjects \
  --fix

# 批量检查 + 自动修复 + 生成缺失字幕
node scripts/video-check.js batch-process \
  --directory ~/VideoProjects \
  --fix \
  --generate-subtitles
```

**批量处理报告输出到**：`~/VideoProjects/batch-processing-report.json`

```json
{
  "timestamp": "2026-04-23T10:30:00.000Z",
  "directory": "~/VideoProjects",
  "totalProjects": 5,
  "successful": 4,
  "failed": 1,
  "projects": [...]
}
```

### 11.4 清理无用文件

```bash
# 清理 Remotion 临时文件
rm -rf video-project/node_modules/.cache
rm -rf video-project/out/temp

# 清理中间视频文件（保留最终视频）
find video-project/out -name "*.mp4" ! -name "final-video.mp4" -delete

# 清理重复/低质量素材
rm -f docs/assets/illustration-*_low.webp

# 清理临时音频文件
rm -f audio/raw/temp_*.mp3
```

### 11.5 ⚠️ 强制文件清单检查（禁止跳过）

> **⚠️ 制作完成前，必须逐项对照以下清单检查所有文件是否已生成。缺失的文件必须在此步骤补全，禁止跳过任何一个。**

**文件清单检查命令**：
```bash
PROJECT_DIR="workspace/${PROJECT_NAME}"
REQUIRED_FILES=(
  "docs/README.md"
  "docs/article.md"
  "docs/video-script.md"
  "docs/copy.md"
  "docs/wechat-copy.md"
  "docs/posting-guide.md"
  "docs/landing-page.html"
  "docs/article-page.html"
  "docs/wechat-page.html"
  "docs/session-log.md"
  "docs/report.json"
  "docs/assets/cover.png"
  "docs/assets/generate_cover.py"
  "docs/assets/gen_subtitles.py"
  "audio/neural_1_2x_speed.m4a"
  "audio/subtitles_*.ass"
  "video-project/out/final-video.mp4"
)

MISSING=""
for f in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$PROJECT_DIR/$f" ]; then
    echo "❌ MISSING: $f"
    MISSING="$MISSING $f"
  else
    echo "✅ $f"
  fi
done

if [ -n "$MISSING" ]; then
  echo ""
  echo "⚠️  Missing files detected:$MISSING"
  echo "⚠️  These files must be generated before completing the project."
  echo "⚠️  Run: python3 $HOME/.hermes/skills/video-creator/scripts/session-log-append.py $PROJECT_DIR --init"
  exit 1
else
  echo ""
  echo "✅ All required files present. Project complete."
fi
```

> **如果有任何文件缺失，必须立即生成缺失的文件，然后重新运行检查命令确认全部通过。**
> 这是最后一道关卡，不完成清单检查不得宣告项目结束。

---

**相关模块**:
- [INPUT.md](INPUT.md) - 输入模式详细说明
- [COPY.md](COPY.md) - 文案生成规范
- [THEMES.md](THEMES.md) - 主题系统
- [VOICE.md](VOICE.md) - 音频合成
- [QUALITY.md](QUALITY.md) - 质量检查
- [REMOTION.md](REMOTION.md) - Remotion 组件规范
- [SESSION_LOG.md](SESSION_LOG.md) - Session 日志追踪
## 📊 输出文件清单

| 文件 | 路径 | 说明 |
|------|------|------|
| 项目首页 | `docs/README.md` | 项目概览、规格、时间轴、文件清单 |
| 原始内容 | `docs/article.md` | 原始抓取或整理的内容 |
| 视频脚本 | `docs/video-script.md` | 分镜脚本和场景描述 |
| 营销文案集 | `docs/copy.md` | 小红书/视频号/抖音三版本文案 |
| 公众号文案 | `docs/wechat-copy.md` | 公众号正文（hook→功能→号召→结尾） |
| 发布指南 | `docs/posting-guide.md` | 各平台发布参数 + 检查清单 |
| 落地页 | `docs/landing-page.html` | Tailwind 深色科技风宣传页 |
| 文章阅读页 | `docs/article-page.html` | 深色竖屏阅读页 |
| 公众号适配页 | `docs/wechat-page.html` | 公众号白底适配页 |
| 会话日志 | `docs/session-log.md` | token 消耗、模型、处理时长追踪 |
| 执行报告 | `docs/report.json` | JSON 格式完整报告 |
| 封面图 | `docs/assets/cover.png` | 竖屏封面（9:16） |
| 封面生成脚本 | `docs/assets/generate_cover.py` | PIL 封面生成模板 |
| 内容插图 | `docs/assets/illustration-*.webp` | 场景配图 |
| 音频文件 | `audio/neural_1_2x.m4a` | 处理后音频（atempo 后） |
| 字幕文件 | `audio/subtitles_58s.ass` | ASS 格式字幕（基于最终音频时长） |
| 最终视频 | `video-project/out/final-video.mp4` | 音频混流后的成品 |

> ⚠️ **文档必须全部生成**，禁止跳过任何一个文件。参考 [PATHS.md](PATHS.md) 查看完整目录结构。

> ⚠️ **音频和字幕文件名**必须反映实际内容，如 `neural_1_2x.m4a`（1.2x 语速）、`subtitles_58s.ass`（58s 时长），禁止使用 `final.mp3` / `subtitles.ass` 等泛泛名称。

---

**相关模块**:
- [INPUT.md](INPUT.md) - 输入模式详细说明
- [COPY.md](COPY.md) - 文案生成规范
- [THEMES.md](THEMES.md) - 主题系统
- [VOICE.md](VOICE.md) - 音频合成
- [QUALITY.md](QUALITY.md) - 质量检查
- [REMOTION.md](REMOTION.md) - Remotion 组件规范
- [SESSION_LOG.md](SESSION_LOG.md) - Session 日志追踪

---

## 📸 Session Tracking 快速参考

> ⚠️ `session_status` 是**工具调用**（tool），不是 shell 命令，无法 `$()` 捕获。
> 正确流程：① 调用 session_status 工具 → ② 复制 emoji 输出 → ③ 追加到日志。

### 每个 Step 完成后手动执行：

```bash
SKILL_SCRIPT="$HOME/.hermes/skills/video-creator/scripts/session-log-append.py"
PROJECT_DIR="workspace/${PROJECT_NAME}"

# snapshot 模式（记录累计值）：
python3 "$SKILL_SCRIPT" "$PROJECT_DIR" "Step X: 任务名" \
  --snapshot "🧮 Tokens: 85k in / 123 out · 💵 Cost: $0.03 · 📚 Context: 111k/205k"

# delta 模式（自动计算与上次快照差值）：
python3 "$SKILL_SCRIPT" "$PROJECT_DIR" "Step X: 任务名" \
  --delta "🧮 Tokens: 90k in / 130 out · 💵 Cost: $0.035 · 📚 Context: 115k/205k"
```

### 初始化新项目 session-log：

```bash
python3 "$SKILL_SCRIPT" "$PROJECT_DIR" --init
```

> 详见 [SESSION_LOG.md](SESSION_LOG.md)
