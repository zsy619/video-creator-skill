---
name: video-creator
description: 自动化视频创作技能：从文章/URL/主题生成竖屏社交媒体视频（小红书/视频号/抖音）。整合宝玉技能生态进行内容获取、图片生成、HTML构建和Remotion视频渲染。集成字幕生成、质量检查、自动修复功能，支持批量处理多个视频项目。
homepage: https://github.com/zsy619/video-creator-skill
metadata:
    tags:
      - "video-creator"
      - "创建视频"
      - "生成视频"
      - "视频创作"
      - "竖屏视频"
      - "make video"
      - "create video"
      - "检查视频质量"
      - "修复字幕字体"
      - "批量处理视频"
      - "发布公众号"
      - "公众号封面图"
      - "wechat-cover"
      - "微信公众号"
      - "企业级文案"
    "clawdbot":
        "emoji": "🎬"
        "requires":
            "bins": ["node"]
            "env": []
---

## 何时使用

### 标签匹配
当用户要求以下操作时立即使用本技能：
- "创建视频" / "生成视频" / "视频创作" / "竖屏视频" / "创作视频"
- "把这篇文章做成视频"
- "制作竖屏视频" / "小红书视频" / "抖音视频"
- "video-creator" / "make video" / "create video" / "video creator"
- "检查视频质量" / "修复字幕字体" / "批量处理视频"
- "大字体" / "大字体视频" / "字体要大"
- **"发布公众号" / "微信公众号" / "微信文章" / "发到公众号"** → 执行 Step 12.5
- **"生成公众号封面图" / "wechat-cover" / "微信封面"** → 执行 Step 6.2
- **"企业级文案" / "优化 wechat-copy" / "优化 wechat-page"** → 执行 B/C 优化

## ⚠️ 铁律：封面图是强制必选项

> **封面图是视频的门面，是用户第一眼看到的内容。封面未生成，不得进入音频生成和视频渲染步骤。**
>
> 生成优先级：
> 1. **baoyu-imagine**（AI绘图）→ 生成 9:16 竖屏封面
> 2. **Remotion 单帧渲染** → 用视频第45帧或固定帧输出 PNG
> 3. **PIL/Pillow 代码生成** → 纯字体排版封面（所有 API 不可用时的最终兜底）
>
> 封面尺寸（必填）：
> - 视频号 / 抖音：**1080×1920**（9:16）
> - **微信公众号文章封面：900×383**（约 2.35:1）
> - 小红书：**1440×2560**（9:16）
>
> ⚠️ **注意**：微信公众号封面图是文章详情页顶部的大图，尺寸与其他平台不同，必须单独生成 900×383 尺寸的 `cover-wechat.png`
>
> **禁止跳过封面生成步骤。** 如果 baoyu-imagine 报错，必须按以下顺序重试：
> 1. 检查 `~/.baoyu-skills/baoyu-imagine/EXTEND.md` 确认 provider 配置
> 2. 尝试其他 provider（openrouter / replicate / dashscope / minimax）
> 3. 所有 API 不可用时 → 使用 PIL 代码生成（见 rules/TROUBLESHOOTING.md 方案二）

### 输入模式
- [rules/INPUT.md](rules/INPUT.md) - 内容输入模式

## 构建流程

1. **Step 0: 创建文档（强制）** → 必须先创建全部11个文档，禁止跳过
2. **Step 1: 获取内容**
3. **Step 2: 分析内容**
4. **Step 3: 构建项目**
5. **Step 4: 生成文案**
6. **Step 5: 构建HTML**
7. **Step 6: 生成视觉**（封面强制优先）
8. **Step 7: 生成音频**
9. **Step 8: 生成字幕**
10. **Step 9: 质量检查**
11. **Step 10: 生成视频**
12. **Step 11: 生成报告 + 强制清单检查**

## 参考文档
- [低码率音频修复](references/low-bitrate-audio-fix.md) — edge-tts 音频 2kbps 导致无声的根因与修复
- [Remotion 版本冲突修复](references/remotion-version-conflict.md) — EISDIR 错误的根因与修复
- [音频验证协议](references/audio-validation-protocol.md) — ⚠️ **【新增·强制阅读】** 音频有效性验证完整协议（4个验证节点 + 快速验证脚本）
- [ASS字幕 ms()函数Bug修复](references/subtitle-ms-function-bug.md) — ⚠️ **【重要】** ms()时间戳格式Bug：0:04:00.00=4分钟而非4秒，正确函数及参数
- [atempo 加速+裁剪反模式](references/atempo-crop-anti-pattern.md) — ⚠️ **【致命】** 长音频atempo加速+裁剪导致音画不同步，正确流程

---

## ⚠️ 音频与字幕铁律（强制执行，违反将导致质量问题）

> **执行音频步骤前必须阅读** `rules/VOICE.md`
> **执行字幕步骤前必须阅读** `rules/SUBTITLES.md`

### 音频三禁止
| 禁止 | 正确做法 |
|------|---------|
| 禁止分段拼接配音 | 整段连续生成 |
| 禁止跳过音频后处理 | 去静音 + 1.2x 语速 + AAC 256k |
| 禁止在 Remotion 内嵌音频 | Remotion 渲染无音频 → ffmpeg 混流 |

### ⚠️ 音频验证（必须执行）

> **根因**：Remotion 渲染的 raw 视频可能含结构正常但实际静音的音频轨道（`codec_name=aac` + 正常bit_rate，但 RMS 全为 `-inf`）。`ffprobe` 显示正常但播放无声音。

**诊断命令**：
```bash
ffmpeg -i video.mp4 -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l
```
- 结果 = 0：音频轨道静默，**禁止用 `-c:a copy`**
- 结果 > 0：音频正常

**正确流程**：始终从处理后的音频文件（`neural_256k_final.m4a`）重新编码混流，绝不直接复制 Remotion raw 视频的音频轨道。
| **禁止 `-c:a copy` 复制低码率音频** | **必须 `-c:a aac -b:a 256k` 强制重编码** |
| 禁止音频码率低于 128k | edge-tts 原始输出码率极低，混流前必须重新编码 |
| 禁止 Remotion 版本碎片化 | 所有 remotion/* 包必须同版本（如 4.0.448），版本不一致会导致 EISDIR 错误 |

### 字幕六禁止
| 禁止 | 正确做法 |
|------|---------|
| 禁止字号 ≠ 72px | 必须 Fontsize=72（PlayResY=1920 时，约40px视觉） |
| 禁止 `\\\\N` 换行 | 必须 `\N` 换行 |
| 禁止字段数不匹配 | Format 10字段，Dialogue 10字段 |
| 禁止先于音频生成字幕 | 必须音频后处理完成后生成 |
| 禁止 MP4 内嵌 ASS | 必须用 `-vf "ass=..."` 烧录 |
| 禁止 Outline=1 | 必须 Outline=2（1px太细） |

### 执行顺序（不可颠倒）
```
1. edge-tts 整段生成原始音频 → neural_full.mp3
         ↓
2. ffmpeg 后处理（去静音 + 1.2x + AAC）→ neural_1_2x.m4a
         ↓（确认最终时长）
3. 生成 ASS 字幕（基于最终时长，Fontsize=72）
         ↓
4. Remotion 渲染无音频视频
         ↓
5. ffmpeg 混流（视频 + neural_1_2x.m4a）
         ↓
6. ffmpeg 烧录字幕（-vf "ass=subtitles.ass"）
```

### ⚠️ TTS 工具长度限制

> **重要**：`text_to_speech` 工具单次调用上限约 24 秒。
> - 短文本（≤24s）：直接调用一次生成完整音频
> - 长文本（>24s）：先生成原始音频，再用 ffmpeg atempo 1.2x 处理
>
> **当前 session 教训**：text_to_speech 生成 23.9s 音频后无法继续，拼接后音频太短。最终改用原始 62s 音频经 atempo 1.2x 处理为 51.7s，再用 apad 补齐到视频长度。

### ⚠️ TTS 工具长度限制

> **重要**：`text_to_speech` 工具单次调用上限约 24 秒，长文本会被截断。
> 详见 [references/tts-length-limit.md](references/tts-length-limit.md) — 包含 atempo/apad 补齐等应对策略。

### ⚠️ Step 0 强制检查清单（禁止跳过）

> **铁律：Step 0 完成后必须验证所有文件存在，包括 `session-log.md`**

```bash
# Step 0 完成后必须执行此验证
PROJECT_DIR="~/VideoProjects/{project-name}"
for f in README.md article.md video-script.md copy.md wechat-copy.md posting-guide.md landing-page.html article-page.html wechat-page.html session-log.md report.json; do
  if [ ! -f "$PROJECT_DIR/docs/$f" ]; then
    echo "❌ 缺失: $f"
    exit 1
  fi
done
echo "✅ Step 0 完成，所有11个文档已创建"
```

---

### ⚠️ Session Status 强制追踪（防止遗漏）

> **⚠️ 【重灾区】session-log.md 的 token 记录经常被遗漏！**
>
> **根本原因**：`session_status` 是 OpenClaw **工具调用**，不是 shell 命令。它的输出在 AI 对话的 tool result 中（emoji 格式），不是 stdout。
>
> **问题**：执行时直接批量调用工具，忽略了 token 追踪。
>
> **解决方案**：在以下关键节点**必须显式调用** `session_status` **工具**，并将 emoji 输出追加到 session-log.md：

| 节点 | 时机 | 操作 |
|------|------|------|
| **Step 0 完成** | 初始化 session-log.md 后 | 调用 `session_status` 并记录 |
| **Step 1 完成** | 内容获取完成后 | 调用 `session_status` 并记录 |
| **Step 4 完成** | 文案生成完成后 | 调用 `session_status` 并记录 |
| **Step 6 完成** | 封面/视觉生成完成后 | 调用 `session_status` 并记录 |
| **Step 7 完成** | 音频生成完成后 | 调用 `session_status` 并记录 |
| **Step 10 完成** | 视频渲染完成后 | 调用 `session_status` 并记录 |
| **Step 11 完成** | 报告生成完成后 | 调用 `session_status` 并记录最终累计 |

```bash
# ❌ 错误做法（遗漏 token 追踪）：
# 直接调用工具生成内容，不记录 session_status
generate_content()

# ✅ 正确做法（在关键节点调用并记录）：
generate_content()
session_status  # ← 在 AI 对话中输入，AI 会返回 emoji 格式输出
# 然后手动将 emoji 输出追加到 session-log.md
```

**session_status emoji 输出格式示例**：
```
🦎 OpenClaw 2026.4.15 (041266a)
🧠 Model: minimax/MiniMax-M2.7 · 🔑 api-key (minimax:cn)
🧮 Tokens: 138k in / 723 out · 💵 Cost: $0.04
🗄️ Cache: 0% hit · 30k cached, 43.3m new
📚 Context: 168k/205k (82%)
```

**追加到 session-log.md 的方法**：
```bash
# 在 AI 对话中看到 emoji 输出后，手动执行：
TS=$(date '+%Y-%m-%d %H:%M %Z')
cat >> "${PROJECT_DIR}/docs/session-log.md" << 'EOF'

## Step X 完成时的 Session 快照
- 时间: TS_PLACEHOLDER
- 累计 Tokens: 138k in / 723 out
- 费用: $0.04
- Context: 168k/205k (82%)
EOF
```

---

## 📋 输出文件清单（强制全部生成）

> ⚠️ **铁律：以下 11 个文档文件必须在 Step 0 全部创建，禁止跳过任何一个。**
> 这是预防遗漏的第一道防线。视频渲染前必须确认所有文件存在。

### 文档文件（11个）

> ⚠️ **session-log.md 必须主动初始化，不是光调用 session_status 就完了**
> 详见 [rules/SESSION_LOG.md](rules/SESSION_LOG.md)

```bash
# Step 0 开始时：初始化 session-log.md
PROJECT_DIR="~/VideoProjects/{project-name}"
START_TIME=$(date '+%Y-%m-%d %H:%M %Z')

cat > "${PROJECT_DIR}/docs/session-log.md" << 'HDRY'
# Session Log - {project-name}

## 项目信息
- **项目名称**: {project-name}
- **开始时间**: START_TIME_PLACEHOLDER
- **状态**: 进行中

## 模型配置
- **默认模型**: minimax/MiniMax-M2.7

## 请求记录

| # | 时间 | 任务 | 模型 | 输入token | 输出token | 总token | 费用 | Context |
|---|------|------|------|----------|----------|---------|------|---------|
HDRY

sed -i '' "s/START_TIME_PLACEHOLDER/${START_TIME}/" "${PROJECT_DIR}/docs/session-log.md"
sed -i '' "s/{project-name}/{project_name}/" "${PROJECT_DIR}/docs/session-log.md"
echo "✅ session-log.md 已初始化"
```

| # | 文件 | 路径 | 说明 |
|---|------|------|------|
| 1 | 项目首页 | `docs/README.md` | 项目概览、规格、文件清单 |
| 2 | 原始内容 | `docs/article.md` | 内容分析文档 |
| 3 | 视频脚本 | `docs/video-script.md` | 分镜脚本 |
| 4 | 营销文案集 | `docs/copy.md` | 短/中/长文案 |
| 5 | 公众号文案 | `docs/wechat-copy.md` | 公众号正文 |
| 6 | 发布指南 | `docs/posting-guide.md` | 多平台发布参数 |
| 7 | 落地页 | `docs/landing-page.html` | Tailwind深色科技风 |
| 8 | 文章页 | `docs/article-page.html` | 深色竖屏阅读页 |
| 9 | 微信适配页 | `docs/wechat-page.html` | 公众号白底适配页 |
| 10 | **会话日志** | `docs/session-log.md` | **Token消耗追踪（必须写入文件）** |
| 11 | 执行报告 | `docs/report.json` | JSON格式完整报告 |

### 资源文件

| # | 文件 | 路径 | 说明 |
|---|------|------|------|
| 12 | 封面图 | `docs/assets/cover.png` | **强制必填，9:16竖屏（1080×1920）** |
| 13 | 微信公众号封面 | `docs/assets/cover-wechat.png` | **强制必填，900×383（约2.35:1）** |
| 14 | 小红书封面 | `docs/assets/cover-xhs.png` | **强制必填，1440×2560（9:16）** |
| 15 | 配音 | `audio/neural_1_2x.m4a` | edge-tts生成，1.2x语速 |
| 16 | 字幕 | `audio/subtitles.ass` | ASS格式，Fontsize=72（视觉40px）黄色，PlayResX=1080, PlayResY=1920 |
| 17 | 最终视频 | `video-project/out/final_with_subs.mp4` | 字幕已烧录，59秒@60fps |

### Step 0 验证命令

```bash
# 验证所有文档是否存在
PROJECT_DIR="~/VideoProjects/{project-name}"
for f in README.md article.md video-script.md copy.md wechat-copy.md posting-guide.md landing-page.html article-page.html wechat-page.html session-log.md report.json; do
  if [ ! -f "$PROJECT_DIR/docs/$f" ]; then
    echo "❌ 缺失: $f"
  fi
done
```

## 如何使用

阅读各个规则文件以获取详细说明和代码示例：
- [references/baoyu-config.json](references/baoyu-config.json) - 宝玉技能配置
- [references/cdn-mapping.json](references/cdn-mapping.json) - CDN映射配置
- [references/tailwind-config.json](references/tailwind-config.json) - Tailwind配置
- [rules/UNIFIED_RULES.md](rules/UNIFIED_RULES.md) - ⚠️ **【最高优先级】** 视频创作铁律清单，包含字幕规格、帧数计算、居中布局、封面生成、赛博朋克风格、文件清理等强制规则。**必须首先阅读此文件。**
- [rules/PATHS.md](rules/PATHS.md) - 规定了 video-creator 技能中项目命名、目录结构和文件命名的规范，确保输出文件统一组织在 workspace/{project-name}/ 下的 docs/ 和 video-project/ 目录中。
- [rules/REMOTION.md](rules/REMOTION.md) - 详细规定了使用 Remotion 框架创建视频组件的规范，包括组件结构、动画效果（打字机、词高亮、渐入等）、主题配置、字体选择以及视频渲染参数。
- [rules/VOICE.md](rules/VOICE.md) - 规定了使用微软 Azure Neural TTS（推荐 zh-CN-YunjianNeural）进行自然人声合成的工作流程，强调整段连续生成、音频后处理及通过 ffmpeg 混流避免 Remotion 编码杂音。
- [rules/HTML.md](rules/HTML.md) - 规定国内CDN资源引用规范，提供落地页、公众号适配页、文章阅读页三种HTML模板。
- [rules/FONTS.md](rules/FONTS.md) - 规定视频字幕和正文的字体大小规范（主标题120px/副标题44px/内容40px）、ASS字幕格式（PingFang SC/黄色/底部居中）及大字体居中设计原则。
- [rules/WORKFLOW.md](rules/WORKFLOW.md) - 定义视频创作从内容获取到报告生成的11步完整工作流程。
- [rules/COPY.md](rules/COPY.md) - 规定公众号文案的输出格式、标题规范（8-32字）、摘要规范（≤44字）及正文结构（开头→引出→解决→功能→效果→号召→结尾）。
- [rules/SUBTITLES.md](rules/SUBTITLES.md) - 集成智能字幕生成（ASS格式）、质量检查（字体/音频/字幕/视频）及自动修复功能，支持批量处理多个视频项目。
- [rules/QUALITY.md](rules/QUALITY.md) - 定义视频质量检查清单，涵盖内容、视觉、文件、技术、音频五大维度的检查标准。
- [rules/INPUT.md](rules/INPUT.md) - 定义三种内容输入模式：链接输入（baoyu-url-to-markdown抓取）、主题输入（web_search搜索）、详细内容输入（直接解析），并规定各自的处理流程。
- [rules/THEMES.md](rules/THEMES.md) - 定义20种视频主题风格（科技、创意、生活，自然，专业四大类），包含主色、辅色、背景色、字体、粒子数等视觉参数及平台规格（小红书/视频号/抖音/油管）。
- [rules/THEME_ANIMATIONS.md](rules/THEME_ANIMATIONS.md) - 定义20种主题的动画参数预设（spring/fade/slide/scale/glow/particle配置），配合 `scripts/themes.js` 和 `scripts/useThemeAnimation.ts` 实现主题适配的动画效果。
- [rules/PLATFORM.md](rules/PLATFORM.md) - 定义视频号、小红书、抖音/快手的平台规格（分辨率、帧率、时长、文件大小、编码）及 Remotion 竖屏配置参数。
- [rules/TROUBLESHOOTING.md](rules/TROUBLESHOOTING.md) - 提供视频渲染失败、baoyu获取内容、字体异常、音频回音/拼接、Remotion编码杂音、Chrome下载失败、create-video CLI交互bug等常见问题的解决方案。
- [rules/INTEGRATION.md](rules/INTEGRATION.md) - 定义 baoyu 技能调用方式（url-to-markdown/cover-image/illustrator等）及自动化脚本模板和依赖安装说明。
- [rules/SCRIPTS.md](rules/SCRIPTS.md) - 定义视频脚本的 Markdown 输出结构，包含小红书/视频号版本、场景分镜（视觉/文字/动画）、配音及时长、帧边界计算方法。
- [rules/SESSION_LOG.md](rules/SESSION_LOG.md) - 追踪每次大模型请求的输入/输出 token 数量、请求模型、处理时长及 session 数据，输出到 `docs/session-log.md` 供审计和成本分析。
