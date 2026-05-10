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
      - "Remotion音频隔离"
      - "ffmpeg-map音频"
      - "静音音频轨道"
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
- [references/remotion-package-discovery.md](references/remotion-package-discovery.md) — `@remotion/core` 不存在；正确包名 `remotion`；47个 exports（Text 不存在）；React Error #130 根因；package.json 正确写法；渲染+混流命令
- [低码率音频修复](references/low-bitrate-audio-fix.md) — edge-tts 音频 2kbps 导致无声的根因与修复
- [Remotion 版本冲突修复](references/remotion-version-conflict.md) — EISDIR 错误的根因与修复
- [音频验证协议](references/audio-validation-protocol.md) — 音频有效性验证完整协议（4个验证节点）
- [ASS字幕 ms()函数Bug修复](references/subtitle-ms-function-bug.md) — ms()时间戳格式Bug：3位毫秒→2位厘秒
- [references/ass-subtitle-spec-2026-05-10.md](references/ass-subtitle-spec-2026-05-10.md) — **最终权威值**：Fontsize=72/PlayResX=1080/PlayResY=1920/MarginV=50/Outline=2/Format 10字段
- [references/cover-smart-resize.md](references/cover-smart-resize.md) — PIL 封面 `smart_resize_text()` 自动缩放函数；实测 STHeiti 130px 字体渲染实际高度 81px（62%效率），长标题自动缩至 36px；以及封面质量门禁节点 E 检查项
- [atempo 加速+裁剪反模式](references/atempo-crop-anti-pattern.md) — 长音频atempo加速+裁剪导致音画不同步
- [Remotion Sequence 黑屏修复](references/remotion-sequence-black-screen-fix.md) — Sequence内帧计算错误（局部帧vs全局帧）
- [Remotion 双字幕问题修复](references/remotion-subtitles-double-fix.md) — `<Subtitles />` 组件 + ASS 烧录导致双层字幕

---

## ⚠️ 音频与字幕铁律（强制执行，违反将导致质量问题）

> **执行音频步骤前必须阅读** `rules/VOICE.md`
> **执行字幕步骤前必须阅读** `rules/SUBTITLES.md`

### 强约束：文本长度 → 目标时长

> **核心问题**：配音文本太长导致音频时长超过目标，反复用 atempo 压缩会损失质量，且压缩后时长仍与视频帧数不匹配。
>
> **修复**：在生成配音前强制校验文本长度，超长则必须精简。

| 目标时长 | 文本字数上限 | 语速 | 说明 |
|---------|-------------|------|------|
| 45秒 | ≤540字 | 1.2x | 45s ÷ 1.2 = 37.5s 原始 ≈ 450字@4字/秒 |
| 60秒 | ≤720字 | 1.2x | 60s ÷ 1.2 = 50s 原始 ≈ 600字@4字/秒 |
| 90秒 | ≤1080字 | 1.2x | 90s ÷ 1.2 = 75s 原始 ≈ 900字@4字/秒 |

**计算公式**：`字数上限 = 目标时长(秒) ÷ 1.2 × 4`

**检查命令**：
```bash
# 生成音频前执行文本长度检查
node {SKILL_DIR}/scripts/pre-subtitle-check.js <project-dir> --target-duration 60
```

### 音频三禁止
| 禁止 | 正确做法 |
|------|---------|
| 禁止分段拼接配音 | 整段连续生成 |
| 禁止跳过音频后处理 | 去静音 + 1.2x 语速 + AAC 256k |
| 禁止在 Remotion 内嵌音频 | Remotion 渲染无音频 → ffmpeg 混流 |

### ⚠️ 音频验证（必须执行）

> **根因**：Remotion 渲染的 raw 视频内部含有一个结构正常但实际静音的 AAC 轨道（ffprobe 显示 codec_name=aac + bit_rate=317k，看起来完全正常，但 astats 显示所有帧 RMS=-inf）。当使用 `-c:a copy` 合并时，ffmpeg 默认选择第一个音频流（Remotion 内嵌的静音轨），导致最终视频音频静默。
>
> **修复**：合并前先隔离视频轨道，丢弃 Remotion 内嵌的静音音频：
> ```bash
> # Step 1: 提取纯视频轨道
> ffmpeg -y -i remotion_raw.mp4 -map 0:v -c:v copy video_only.mp4
> # Step 2: 用纯视频与外部音频合并
> ffmpeg -y -i video_only.mp4 -i neural_1_2x.m4a -map 0:v -map 1:a -c:v copy -c:a copy final.mp4
> ```

**诊断命令**：
```bash
ffmpeg -i video.mp4 -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l
```
- 结果 = 0：音频轨道静默，**禁止用 `-c:a copy`**
- 结果 > 0：音频正常

**正确流程**：始终从处理后的音频文件（`neural_1_2x.m4a`）重新编码混流，绝不直接复制 Remotion raw 视频的音频轨道。

**字幕生成前置检查**：
```bash
# ⚠️ 生成字幕前必须执行此检查
node {SKILL_DIR}/video-creator/scripts/pre-subtitle-check.js <project-dir>
# 检查通过后才能生成字幕
```

**Remotion 渲染前置检查**：
```bash
# ⚠️ 渲染前必须执行此检查
node {SKILL_DIR}/video-creator/scripts/pre-render-check.js <Video.tsx> <fps> <duration>
# 检查通过后才能渲染
```
| **禁止 `-c:a copy` 复制低码率音频** | **必须 `-c:a aac -b:a 256k` 强制重编码** |
| 禁止音频码率低于 128k | edge-tts 原始输出码率极低，混流前必须重新编码 |
| 禁止 Remotion 版本碎片化 | 所有 remotion/* 包必须同版本（如 4.0.459），版本不一致会导致 EISDIR 错误。**注意**：`@remotion/core` 在 npm 不存在，正确包名是 `remotion` |

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

## ⚠️ 致命错误修复记录（2026-05-10）

> 以下是已确认的技能文档级错误，正在分阶段修复。遇到文档与实际行为冲突时，以本文为准。

### ⚠️ 验证铁律：上下文摘要≠实际落盘

> **本次（2026-05-10）经验**：多轮修订后，上下文摘要声称 12 项全部完成，但实际验证发现 `references/ONEPASS_WORKFLOW.md` 根本不存在，`launch.sh all` 也只跑门禁检查而非执行生成步骤。
>
> **根因**：上下文压缩（context compaction）将"声称完成"当作"实际完成"处理。摘要来自 handoff，不是文件系统真相。
>
> **修复**：每次大修订后，必须用 `read_file` 或 `search_files` 验证关键文件**实际存在且内容正确**，不能信任摘要声称。

**验证清单（每次修订后必须执行）**：
```bash
# 1. ONEPASS_WORKFLOW.md 是否存在
ls -la {SKILL_DIR}/references/ONEPASS_WORKFLOW.md

# 2. launch.sh all 命令是否真正执行全链路（不只是跑门禁）
grep -A5 "cmd_all()" {SKILL_DIR}/scripts/launch.sh | grep "edge-tts\|ffmpeg\|remotion render"

# 3. 关键脚本行号验证
grep -n "fontSize: 72\|outline: 2\|marginV: 50" {SKILL_DIR}/scripts/subtitle-generator.js
```

### ❌ 错误1：技能文档引用不存在的 `@remotion/core`

**影响**：所有使用 `@remotion/core` 的视频项目从第一天就无法运行（"could not determine executable" 或 React Error #130）。

**根因**：`@remotion/core` 在 npm 上**不存在**（只有 `1.0.0-y.x` 预发布版本）。Remotion 4.x 的正确包名是 **`remotion`**（无 `@` 前缀）。

**正确 import**：
```tsx
// ✅ 正确（remotion 4.x）
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';

// ❌ 错误（@remotion/core 不存在）
import { AbsoluteFill } from '@remotion/core';
```

**正确 package.json**：
```json
{
  "dependencies": {
    "remotion": "4.0.459",
    "@remotion/cli": "4.0.459",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

**注意**：`@remotion/cli`、`@remotion/bundler`、`@remotion/renderer` 等是独立包，由 `remotion` 主包统一版本号。安装 `@remotion/cli` 时会自动引入所有依赖，**无需单独安装**。

### ❌ 错误2：`Text` 组件在 Remotion 4.x 中被移除

**影响**：代码中的 `<Text>` 导致 `React.createElement(undefined, ...)` → React Error #130。

**根因**：remotion 4.0.459 的 47 个 exports 中**没有 Text**。

**正确修复**：用 `<div>` DOM 元素替代 `<Text>`，CSS `textShadow` 实现描边效果：
```tsx
// ✅ 正确：div + inline style
<div style={{
  fontFamily: 'PingFang SC',
  color: '#FFFFFF',
  textShadow: '0 0 20px #00FFFF, 0 0 40px #00FFFF',
  fontSize: 72,
}}>{children}</div>

// ❌ 错误：Text 不存在于 remotion 4.x
<Text style={{...}}>{children}</Text>
```

### ❌ 错误3：字幕字号规范冲突（18px vs 72px）

**影响**：FONTS.md 说"字幕必须18px"，与实际需求（竖屏1080×1920下可读性）冲突，导致字幕太小。

**正确值**：ASS Fontsize=72（PlayResY=1920 时约40px视觉，足够可读）。

**验证命令**：
```bash
# 验证 subtitle-generator.js 实际输出规范值（不要信任摘要，只信任文件系统）
grep -n "fontSize\|outline\|marginV" {SKILL_DIR}/scripts/subtitle-generator.js | head -10
# 期望：fontSize: 72, outline: 2, marginV: 50

# 验证 ASS 字幕文件
grep -i "fontsize\|marginv\|outline" {project}/audio/subtitles.ass
# 期望：Fontsize: 72, MarginV: 50, Outline: 2
```

---

## 如何使用

阅读各个规则文件以获取详细说明和代码示例：
- [references/ONEPASS_WORKFLOW.md](references/ONEPASS_WORKFLOW.md) — **一键生成工作流**：配置驱动，10步完整命令（edge-tts→门禁A→字幕→门禁B→Remotion渲染→门禁C→混流→字幕烧录→门禁D），含完整 bash 脚本。**所有步骤的门禁退出码控制**。
- [references/skill-audit-methodology.md](references/skill-audit-methodology.md) — 技能深度审计方法论。**摘要永远不可信**，必须 grep 验证文件系统实际值；8类文件检查清单；常见遗漏模式（验证器不同步/实例化覆盖/文档不同步）。
- [references/baoyu-config.json](references/baoyu-config.json) - 宝玉技能配置
- [references/cdn-mapping.json](references/cdn-mapping.json) - CDN映射配置
- [references/tailwind-config.json](references/tailwind-config.json) - Tailwind配置
- [rules/UNIFIED_RULES.md](rules/UNIFIED_RULES.md) - ⚠️ **【最高优先级】** 视频创作铁律清单，包含字幕规格、帧数计算、居中布局、封面生成、赛博朋克风格、文件清理等强制规则。**必须首先阅读此文件。**
- [rules/PATHS.md](rules/PATHS.md) - 规定了 video-creator 技能中项目命名、目录结构和文件命名的规范，确保输出文件统一组织在 workspace/{project-name}/ 下的 docs/ 和 video-project/ 目录中。
- [rules/REMOTION.md](rules/REMOTION.md) - 详细规定了使用 Remotion 框架创建视频组件的规范，包括组件结构、动画效果（打字机、词高亮、渐入等）、主题配置、字体选择以及视频渲染参数。
- [rules/VOICE.md](rules/VOICE.md) - 规定了使用微软 Azure Neural TTS（推荐 zh-CN-YunjianNeural）进行自然人声合成的工作流程，强调整段连续生成、音频后处理及通过 ffmpeg 混流避免 Remotion 编码杂音。
- [rules/HTML.md](rules/HTML.md) - 规定国内CDN资源引用规范，提供落地页、公众号适配页、文章阅读页三种HTML模板。
- [rules/FONTS.md](rules/FONTS.md) - 视频字幕和正文字体大小规范（主标题130px/副标题52px/内容72-96px）、ASS字幕格式及大字体居中设计原则。ASS字幕规范值：**Fontsize=72 / MarginV=50 / Outline=2**，详见 [rules/SUBTITLES.md](rules/SUBTITLES.md)。
- [rules/WORKFLOW.md](rules/WORKFLOW.md) - 定义视频创作从内容获取到报告生成的11步完整工作流程。
- [rules/COPY.md](rules/COPY.md) - 规定公众号文案的输出格式、标题规范（8-32字）、摘要规范（≤44字）及正文结构（开头→引出→解决→功能→效果→号召→结尾）。
- [rules/SUBTITLES.md](rules/SUBTITLES.md) - 集成智能字幕生成（ASS格式）、质量检查（字体/音频/字幕/视频）及自动修复功能，支持批量处理多个视频项目。

### ⚠️ 强制质量门禁（2026-05-10 升级版）

> **根因**：每次生成视频要反复修订音频、字幕（格式/位置/大小）、画面与字幕与音频同步问题，核心原因是缺乏强制验证节点。
>
> **修复**：升级 `video-quality-gate.js` 一键门禁脚本，新增 C 节点（render）检查项。**所有节点退出码=0才能进入下一步。**

```bash
# 完整检查（推荐：渲染前必做全部检查）
node {SKILL_DIR}/scripts/video-quality-gate.js <project-dir> all

# 渲染前必须通过 render 节点检查
# 新增检查项（2026-05-10）：
#   C1. package.json 包名验证（@remotion/core → remotion）
#   C2. <Text> 组件检查（Remotion 4.x 不存在）
#   C3. node_modules/remotion 存在性
#   C4. useCurrentFrame 动画
#   C5. Sequence 内无全局帧误用
#   C6. AbsoluteFill 使用
node {SKILL_DIR}/scripts/video-quality-gate.js <project-dir> render
```

**launch.sh 快速启动**（推荐）：
```bash
bash {SKILL_DIR}/scripts/launch.sh init <项目名>   # 创建项目
bash {SKILL_DIR}/scripts/launch.sh gate all         # 质量门禁检查

# ⭐ 一键生成（完整执行，不是只跑门禁）：
# Step 1: edge-tts 配音
# Step 2: ffmpeg 重编码 256k
# Step 3: 门禁 A（音频：存在/静音/命名/5%偏差）
# Step 4: SubtitleGenerator 生成 ASS（Fontsize=72/MarginV=50/Outline=2）
# Step 5: 门禁 B（字幕：格式/字号/换行符）
# Step 6: <Text>→<div> 自动修复（Remotion 4.x 不存在 Text 组件）
# Step 7: Remotion 渲染（无音频，AudioContext 隔离）
# Step 8: 门禁 C（render：package.json/remotion 包/<Text>检查）
# Step 9: ffmpeg 混流 + 字幕烧录
# Step 10: 门禁 D（最终视频：codec/尺寸/时长/音频）
bash {SKILL_DIR}/scripts/launch.sh all
```
- [rules/QUALITY.md](rules/QUALITY.md) - 定义视频质量检查清单，涵盖内容、视觉、文件、技术、音频五大维度的检查标准。
- [rules/INPUT.md](rules/INPUT.md) - 定义三种内容输入模式：链接输入（baoyu-url-to-markdown抓取）、主题输入（web_search搜索）、详细内容输入（直接解析），并规定各自的处理流程。
- [rules/THEMES.md](rules/THEMES.md) - 定义20种视频主题风格（科技、创意、生活，自然，专业四大类），包含主色、辅色、背景色、字体、粒子数等视觉参数及平台规格（小红书/视频号/抖音/油管）。
- [rules/THEME_ANIMATIONS.md](rules/THEME_ANIMATIONS.md) - 定义20种主题的动画参数预设（spring/fade/slide/scale/glow/particle配置），配合 `scripts/themes.js` 和 `scripts/useThemeAnimation.ts` 实现主题适配的动画效果。
- [rules/PLATFORM.md](rules/PLATFORM.md) - 定义视频号、小红书、抖音/快手的平台规格（分辨率、帧率、时长、文件大小、编码）及 Remotion 竖屏配置参数。
- [rules/TROUBLESHOOTING.md](rules/TROUBLESHOOTING.md) - 提供视频渲染失败、baoyu获取内容、字体异常、音频回音/拼接、Remotion编码杂音、Chrome下载失败、create-video CLI交互bug等常见问题的解决方案。

## ⚠️ 渲染决策：Remotion CLI vs ffmpeg 兜底（2026-05-10 新增）

> **经验教训**：Remotion CLI 在 headless Mac M-series 环境无法完成渲染，核心原因是 `@remotion/renderer` 的 `selectComposition()` 需要 HTTP serveUrl 参数，而 bundler dev server 在 arm64 环境不响应（60s 超时）。这不是包版本问题，而是架构限制。

### 渲染路径选择

```
                    用户请求渲染
                          │
            ┌─────────────┴─────────────┐
            │                           │
      Remotion CLI 可用？          是否有多场景动态画面？
            │                           │
    ┌───────┴───────┐           ┌──────┴──────┐
    │               │           │             │
   是              否          是            否
    │               │           │             │
    ▼               ▼           ▼             ▼
Remotion render  ffmpeg兜底   Remotion     ffmpeg兜底
                  (静态封面+   多场景      (静态封面+
                   音频+字幕)   动画         音频+字幕)
```

**判断条件**：
- Remotion CLI 可用 = `remotion compositions --entry-point src/index.ts` 能列出 composition（非超时）
- 多场景动态画面 = 视频脚本包含 ≥2 个不同场景，且需要转场/动画效果

**实际经验**：截至 2026-05-10，在 Mac M-series headless 环境下，Remotion CLI **始终超时**，所有视频项目均通过 ffmpeg 兜底完成。

### ffmpeg 兜底渲染命令（标准输出）

```bash
ffmpeg -y -loop 1 \
  -i "{WORKSPACE_DIR}/docs/assets/cover.png" \
  -i "{WORKSPACE_DIR}/audio/neural_1_2x.m4a" \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,subtitles='{WORKSPACE_DIR}/audio/subtitles.ass':fontsdir='/System/Library/Fonts/Supplemental':force_style='Fontsize=72,MarginV=50,Outline=2'" \
  -shortest \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 192k \
  "{WORKSPACE_DIR}/video-project/out/final_with_subs.mp4"
```

关键说明：
- `subtitles='...ass':force_style='Fontsize=72,MarginV=50,Outline=2'` — 强制覆盖 ASS 内部样式
- `fontsdir` 必须存在，否则 ASS 字幕无法渲染（ASS 内置字体查找失败）
- `-map 0:v -map 1:a` 通过 `-shortest` 隐式实现（视频循环 + 音频终止 → 自动停止）
- 输出：H.264 + AAC，1080×1920，时长=音频时长

### Remotion 4.x 已知限制

**`Text` 组件不存在**：remotion 4.0.459 的 47 个 exports 中**没有 Text 组件**。使用 `<Text>` 会触发 React Error #130（React.createElement(undefined, ...)）。

修复方法（已在 Video.tsx 生成时自动应用）：
```tsx
// ❌ 错误
import { Text } from 'remotion';
<Text style={{fontSize: 72}}>内容</Text>

// ✅ 正确：用 div 替代，CSS 实现描边
<div style={{
  fontFamily: 'PingFang SC',
  color: '#FFFFFF',
  textShadow: '0 0 10px #00FFFF, 0 0 20px #00FFFF',
  fontSize: 72,
}}>内容</div>
```

**package.json 正确写法**（已验证有效）：
```json
{
  "remotion": "4.0.459",
  "react": "18.2.0",
  "react-dom": "18.2.0"
}
```
不要写任何 `@remotion/*` scoped 包（`@remotion/core`、`@remotion/fonts` 等在 npm 不存在）。

**SubtitleGenerator 导出类型**：
```javascript
// subtitle-generator.js 导出的是 class 本身
module.exports = SubtitleGenerator;

// 使用方式：直接 require 后实例化，不需要 .default
const SubtitleGenerator = require('./subtitle-generator.js');
const sg = new SubtitleGenerator(options);
```

### launch.sh all 说明（重要修正）

> ⚠️ `launch.sh all` 当前版本**只执行质量门禁检查**，不执行实际音视频生成步骤。
> 实际生成需要按顺序手动执行：
> ```bash
> bash {SKILL_DIR}/scripts/launch.sh audio    # edge-tts + ffmpeg 重编码
> bash {SKILL_DIR}/scripts/launch.sh subtitle # ASS 字幕生成
> bash {SKILL_DIR}/scripts/launch.sh render   # ffmpeg 兜底渲染（或 Remotion）
> ```

**修复方向**（待实现）：将 ONEPASS_WORKFLOW.md 中的 10 步命令真正嵌入 `launch.sh all`，实现一键生成。
- [rules/INTEGRATION.md](rules/INTEGRATION.md) - 定义 baoyu 技能调用方式（url-to-markdown/cover-image/illustrator等）及自动化脚本模板和依赖安装说明。
- [rules/SCRIPTS.md](rules/SCRIPTS.md) - 定义视频脚本的 Markdown 输出结构，包含小红书/视频号版本、场景分镜（视觉/文字/动画）、配音及时长、帧边界计算方法。
- [rules/SESSION_LOG.md](rules/SESSION_LOG.md) - 追踪每次大模型请求的输入/输出 token 数量、请求模型、处理时长及 session 数据，输出到 `docs/session-log.md` 供审计和成本分析。
