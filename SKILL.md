---
name: video-creator
description: 自动化视频创作技能：从文章/URL/主题生成竖屏社交媒体视频（小红书/视频号/抖音）。整合宝玉技能生态进行内容获取、图片生成、HTML构建和Remotion视频渲染。集成字幕生成、质量检查、自动修复功能，支持批量处理多个视频项目。
display_name: "视频创作器"
display_name_en: "Video Creator"
description_zh: "自动化视频创作技能：从文章/URL/主题生成竖屏社交媒体视频（小红书/视频号/抖音）。整合宝玉技能生态进行内容获取、图片生成、HTML构建和Remotion视频渲染。集成字幕生成、质量检查、自动修复功能，支持批量处理多个视频项目。"
description_en: "Automated video creation skill: turns an article, URL, or topic into vertical social videos for Xiaohongshu, WeChat Channels, and Douyin. Uses the Baoyu skill ecosystem for content fetching, image generation, HTML building, and Remotion rendering, with subtitles, quality checks, auto-fixes, and batch processing of multiple video projects."
homepage: https://github.com/zsy619/video-creator-skill
metadata:
    tags:
      - "video-creator"
      - "video creator"
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
      - "Remotion Native渲染"
      - "@remotion/captions"
      - "音频内嵌视频"
      - "60fps视频"
    "clawdbot":
        "emoji": "🎬"
        "requires":
            "bins": ["node"]
            "env": []
---

## 何时使用

当用户要求以下操作时立即使用本技能：

- "创建视频" / "生成视频" / "视频创作" / "竖屏视频" / "创作视频"
- "把这篇文章做成视频"
- "制作竖屏视频" / "小红书视频" / "抖音视频"
- "video-creator" / "make video" / "create video" / "video creator"
- "检查视频质量" / "修复字幕字体" / "批量处理视频"
- "大字体" / "大字体视频" / "字体要大"
- **"发布公众号" / "发到公众号" / "post to wechat"** → 先确认计划，再执行 Step 12.5（见 [rules/WECHAT_PUBLISH.md](rules/WECHAT_PUBLISH.md)）。仅提到「微信公众号」或「微信文章」时，先走文案 / 封面（Step 6.2 / B/C 优化），不得直接发布或群发
- **"生成公众号封面图" / "wechat-cover" / "微信封面"** → 执行 Step 6.2
- **"企业级文案" / "优化 wechat-copy" / "优化 wechat-page"** → 执行 B/C 优化

> 详见 [rules/INPUT.md](rules/INPUT.md) - 内容输入模式

## 先确认计划

接到多步任务时，先用简体中文复述计划并等待用户确认，不要直接开跑：

1. 目标：源内容（文章 / URL / 主题 / GitHub 仓库）、目标平台、项目目录
2. 步骤：将执行的 Step（如 0→11，或仅质量检查 / 封面 / 文案）
3. 命令：将调用的脚本或 CLI（如 `launch.sh`、`create-remotion-project.js`、`generate_cover.py`、`pre-flight-check.js`）
4. 产物：文档、封面、音频、字幕、`video-project/out/final.mp4` 等
5. 副作用：将写入或覆盖哪些本地文件；是否涉及公众号草稿或发布（默认无）

等用户回复「开始」或明确同意后再执行。
用户点名且参数齐全的单条只读检查（如 `launch.sh help`、`pre-flight-check.js`、`launch.sh gate`）可以跳过确认。
渲染、覆盖 `captions.json`、删除 `*-repo/`、公众号发布或群发，一律先确认。

## ⚠️ 铁律速查

> ⚠️ **完整内容已迁移至 `rules/UNIFIED_RULES.md`、`rules/CHECKLIST.md`、`rules/VOICE.md`**。
> 以下为快速索引，详情必读对应文件。

| 类别 | 快速索引 |
|------|---------|
| **Step 0** | `launch.sh init` 在项目目录内执行；article.md < 100 字或含 `"请在此处"` → 立即失败 |
| **音频** | narration 必须手写（中文字符 175-337）；禁用 `generate_docs.js` 生成 narration；atempo处理后时长不能用于帧数校验 |
| **渲染** | `--props` 每条 scene 必须含 `startMs/endMs`；Root.tsx 帧数用 `round(秒×60)` 而非 `ceil()` |
| **Workspace 还原** | Git 还原项目渲染前必查 Root.tsx `durationInFrames` 与当前音频时长是否同步 |
| **narration** | 中文字符 ≥175；英文句号 `.` = 0；控制字符 = 0；句数 ≥10（4-6句=4帧，7-9句=5帧，10+句=6帧） |
| **清理** | `rm -rf {repo}/{repo}-repo/`；video-config.json patch 每次只改一字段 |
| **Feishu Base** | 每次调用带 `--base-token`；更新用 `--json '{"video-creator":"是"}'` |
| **Subagent** | `status=completed` 不可信；主进程必须重新验证 Base 字段已写入 |
| **Bug 索引** | 见 `references/G-WORKFLOW/video-creator-deep-lessons.md` 第 9 节（9.1–9.25，其中 9.25 已源码级修复） |

> ⚠️ `video-config.json` 必须含 `totalMs` 和 `scenes[]`（含 startMs/endMs）才可渲染，缺一拒绝。
> ⚠️ `captions.json` 条数 < 10 → 拒绝渲染。

## 📋 规则索引

详细内容必须阅读对应文件。完整必读表、`create-remotion-project.js` 验证清单、HTML / 占位符检查、references 维护规范见 [references/G-WORKFLOW/skill-index-details.md](references/G-WORKFLOW/skill-index-details.md)。
分类目录与快速查询见 [references/README.md](references/README.md)。请勿使用 `A-ARCHIVED/`。

## 执行约束

- 脚本当黑盒：只运行本技能文档、`rules/`、`references/` 里写明的命令，或对脚本执行 `--help` / `help`；根据帮助和输出行动。不要为了决定参数去读或修改 `scripts/` 源码。
- 先确认实际路径：使用环境变量或用户指定的 `SKILL_DIR`、`PROJECT_DIR`；不要默认文档里的个人本机绝对路径。
- 密钥不写入 skill、聊天、memory 或 git。
- 未经用户明确要求，不得发布、群发或定时发布到公众号或其他平台；即使用户要求发布，也须先确认计划。默认最多保存草稿。
- 封面主路径为 PIL（见 `rules/COVER_GENERATE.md`）。若改走 AI 图像生成且失败，先告知用户并等待确认后再降级到 PIL，不要静默切换。

## 🔄 流程

### Step 概览

```
Step 0  → Step 1  → Step 2  → Step 3  → Step 4  → Step 5
创建文档   内容获取   分析内容   构建项目   生成文案   构建HTML

        Step 11 ← Step 10 ← Step 9  ← Step 8  ← Step 7  ← Step 6
        生成报告   生成视频   质量检查   生成字幕   生成音频   生成视觉（封面）
```

详细规范：[rules/WORKFLOW.md](rules/WORKFLOW.md)

### 强制检查清单

| 时机 | 检查内容 | 命令/文件 |
|------|---------|---------|
| Step 0 完成 | 11个文档全部存在 | `rules/CHECKLIST.md` |
| Step 6 完成 | 三封面尺寸正确（1080×1920 / 900×383 / 1440×2560） | `rules/CHECKLIST.md` |
| Step 7 完成 | 音频参数（AAC 256k / atempo后时长） | `references/C-CONTENT/audio-tts.md` |
| Step 8 完成 | captions.json 末段 endMs = 视频时长 | `references/C-CONTENT/subtitle-production.md` |
| 渲染前 | 4项预检全部通过 | `references/G-WORKFLOW/video-optimization.md` |
| 渲染后 | 视频时长=音频时长，RMS有效 | `references/C-CONTENT/audio-tts.md` |

### 核心输出文件

| `audio/neural_1_2x.m4a` · `audio/captions.json` · `video-project/out/final.mp4`

narration.txt 字数上限见 [rules/VOICE.md](rules/VOICE.md)：`⌊TARGET_DURATION × 3.37⌋`（旧公式 `× 6.45` 已废弃）。
为 GitHub 仓库制作视频的完整步骤见 [references/G-WORKFLOW/github-repo-video-workflow.md](references/G-WORKFLOW/github-repo-video-workflow.md)。

### 清理

```bash
# 渲染成功后立即执行
rm -rf "${PROJECT_DIR}/*-repo"
```

### Session 追踪

`session_status` 是 OpenClaw **工具调用**（不是 shell 命令），输出在 AI 对话 tool result 中（emoji 格式）。

**追加命令**（Step X 完成后在 AI 对话中调用 session_status，然后执行）：
```bash
TS=$(date '+%Y-%m-%d %H:%M %Z')
cat >> "${PROJECT_DIR}/docs/session-log.md" << 'EOF'
## Step X 完成时的 Session 快照
- 时间: TS_PLACEHOLDER
- 累计 Tokens: {emoji输出}
EOF
```

详见 [rules/SESSION_LOG.md](rules/SESSION_LOG.md)
