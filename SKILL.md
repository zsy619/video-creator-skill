---
name: video-creator
description: 自动化视频创作技能：从文章/URL/主题生成竖屏社交媒体视频（小红书/视频号/抖音）。整合宝玉技能生态进行内容获取、图片生成、HTML构建和Remotion视频渲染。集成字幕生成、质量检查、自动修复功能，支持批量处理多个视频项目。
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
- **"发布公众号" / "微信公众号" / "微信文章" / "发到公众号"** → 执行 Step 12.5
- **"生成公众号封面图" / "wechat-cover" / "微信封面"** → 执行 Step 6.2
- **"企业级文案" / "优化 wechat-copy" / "优化 wechat-page"** → 执行 B/C 优化

> 详见 [rules/INPUT.md](rules/INPUT.md) - 内容输入模式

---

## ⚠️ 限制（铁律，违者必败）

> 渲染前先执行 `references/video-optimization.md` 中的 4 项预检。问题在起点修复，不是终点补救。
> 用户明确要求：**每次生成视频必须一次到位**，不接受"渲染→发现问题→修复→重新渲染"的返工循环。

### Step 0 铁律
- **禁止跳过 Step 0**（文档生成）。11个文档必须在 Remotion 渲染前全部创建完毕
- **禁止不生成封面图**。封面未生成，不得进入音频生成和视频渲染步骤
- Step 0 完成后必须验证所有文件存在，包括 `session-log.md`（详见 `rules/CHECKLIST.md`）

### 音频铁律
- **禁止分段拼接配音**：必须整段连续生成
- **禁止跳过音频后处理**：必须执行去静音 + atempo + AAC 256k
- **禁止使用旧版 ffmpeg 混流**：Remotion Native 方案（`<Audio>` 直接内嵌 MP4）
- **禁止 edge-tts rate=+20% + atempo=1.2x 叠加**：仅使用 `--rate +0%` + atempo 动态计算
- **音频文件命名**：`audio/neural_full.mp3`（原始）→ `audio/neural_1_2x.m4a`（atempo后）

### 渲染铁律
- **Root.tsx TOTAL_FRAMES** 必须从实际音频时长计算：`⌊audio_duration × 60⌋`，禁止硬编码（如 35×60）
- **caption.json 末段 endMs** 必须等于视频实际时长（毫秒），而非音频时长
- **video-config.json** 必须在项目根目录（不是 `docs/`）
- **所有 .json 配置文件**必须符合 JSON 语法，禁止重复键名

### 清理铁律
- **渲染成功后必须立即清理** `*-repo/` 目录：`rm -rf "${PROJECT_DIR}/*-repo"`
- Git 内容对视频生成无用，删除节省存储空间

### Feishu Base 批量任务铁律
- **禁止使用"快速路径"**：不得用手动 edge-tts + ffmpeg 命令绕过完整工作流程
- **必须完整执行** video-creator 的 Step 0-11（launch.sh all 或等效分步）
- 详见 `references/feishu-base-batch.md`

### generate_docs.js 输出质量
- `generate_docs.js` 生成的 11 个文件中，7 个存在严重质量问题（详见 `references/generate-docs-deep-analysis.md`）
- **Step 0 后强制检查**：narration.txt 必须干净（无 `---`、`|`、反引号），中文字数 ≥20
- 仅 `article.md`、`report.json`、HTML 三件套可直接使用

---

## 📋 规则索引

详细内容必须阅读对应文件，以下为快速索引：

| 类别 | 必须阅读 | 核心要点 |
|------|---------|---------|
| **音频 TTS** | [references/audio-tts.md](references/audio-tts.md) | edge-tts 规范、atempo 动态计算（≠固定1.2）、语音优先级 |
| **字幕生成** | [references/subtitle-production.md](references/subtitle-production.md) | captions.json 格式、TikTokCaptionOverlay、CaptionOverlay 铁律 |
| **封面视觉** | [references/video-visual.md](references/video-visual.md) | attrs 渲染规范（白底+黑字+左侧10px彩色条纹） |
| **PIL 封面** | [references/pil-cover.md](references/pil-cover.md) | generate_cover.py 用法、WeChat 副标题宽度陷阱 |
| **Remotion 渲染** | [references/remotion-troubleshoot.md](references/remotion-troubleshoot.md) | Composition ID=VerticalVideo、Text组件、spring动画 |
| **字幕六禁止** | [rules/SUBTITLES.md](rules/SUBTITLES.md) | Fontsize=72/Outline=2/MarginV=50/\\N换行/10字段 |
| **音频规范** | [rules/VOICE.md](rules/VOICE.md) | 男声优先（YunjianNeural 默认）、禁止女声 |
| **质量检查** | [rules/QUALITY.md](rules/QUALITY.md) · [rules/CHECKLIST.md](rules/CHECKLIST.md) | 11个文档门禁、三封面尺寸 |
| **Session 追踪** | [rules/SESSION_LOG.md](rules/SESSION_LOG.md) | session_status 是工具不是命令、7个关键节点 |
| **Git 隔离** | [references/git-workflow.md](references/git-workflow.md) | `{repo}-repo/` 隔离、launch.sh init 自动隔离 |
| **Feishu Base** | [references/feishu-base-batch.md](references/feishu-base-batch.md) | 11个受影响项目、Base 记录更新语法 |
| **内容文档** | [references/content-document-generation.md](references/content-document-generation.md) | Step 0-3 完整流程 |
| **Subagent 超时** | [references/subagent-timeout.md](references/subagent-timeout.md) | launch.sh 路径陷阱、超时策略 |
| **预检流程** | [references/video-optimization.md](references/video-optimization.md) | 4项预检（narration质量/英文句点/叠速/CaptionOverlay） |

### rules/ 目录（技能规则）

[rules/WORKFLOW.md](rules/WORKFLOW.md) · [rules/UNIFIED_RULES.md](rules/UNIFIED_RULES.md) · [rules/THEMES.md](rules/THEMES.md) · [rules/PLATFORM.md](rules/PLATFORM.md) · [rules/TROUBLESHOOTING.md](rules/TROUBLESHOOTING.md) · [rules/SCRIPTS.md](rules/SCRIPTS.md) · [rules/INTEGRATION.md](rules/INTEGRATION.md) · [rules/LAYOUT.md](rules/LAYOUT.md) · [rules/FONTS.md](rules/FONTS.md) · [rules/HTML.md](rules/HTML.md) · [rules/COVER_GENERATE.md](rules/COVER_GENERATE.md) · [rules/WECHAT_COVER.md](rules/WECHAT_COVER.md) · [rules/WECHAT_PUBLISH.md](rules/WECHAT_PUBLISH.md) · [rules/QUICKSTART.md](rules/QUICKSTART.md)

### references/ 目录（深度知识）

| 文件 | 用途 |
|------|------|
| `feishu-base-batch.md` | Feishu Base 批量处理失败项目列表、根因分析、atempo规则、API参考 |
| `generate-docs-deep-analysis.md` | generate_docs.js 根因分析、质量总览表、auto_fix循环逻辑 |
| `video-workflow-failures.md` | 6个实测 subagent 失败模式 |
| `generate-docs-failures.md` | generate_docs.js 失败模式 + extractNarration() 根因补丁 |
| `remotion-troubleshoot.md` | Remotion错误根因：Composition ID陷阱、Text组件、字幕、CaptionOverlay |
| `subagent-timeout.md` | launch.sh路径陷阱、subagent超时策略 |
| `audio-tts.md` | edge-tts规范、atempo动态计算、审计命令库 |
| `subtitle-production.md` | captions.json格式、TikTokCaptionOverlay、ASS规范 |
| `documentation-consistency.md` | 文档一致性检查（死链已修复）、Fontsize修复记录 |
| `refactoring-log.md` | 重构记录（本次维护参考） |
| `git-workflow.md` | 目录分离、launch.sh init隔离逻辑、Git清理规范 |
| `video-visual.md` | 视觉规范、主题动画 |
| `video-optimization.md` | 性能优化、4项预检（含pre-render-check.js路径说明） |
| `cover-font.md` | 封面字体规范 |
| `pil-cover.md` | PIL封面生成参考、Attrs属性标签（attrs必须是数组，不是字符串） |
| `content-document-generation.md` | Step 0-3 完整流程（narration.txt 生成规范） |
| `theme-matching.md` | sceneContent 动态化：封面配色/Remotion场景/关键词传递数据流 |
| `cloudflare-medium.md` · `node-execsync-bug.md` · `readme-location.md` | 专项问题 |
| `launch-testing-findings.md` | launch.sh实测发现（pre-render-check路径/synthesize-voice占位符/attrs数组要求） |

---

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
| Step 7 完成 | 音频参数（AAC 256k / atempo后时长） | `references/audio-tts.md` |
| Step 8 完成 | captions.json 末段 endMs = 视频时长 | `references/subtitle-production.md` |
| 渲染前 | 4项预检全部通过 | `references/video-optimization.md` |
| 渲染后 | 视频时长=音频时长，RMS有效 | `references/audio-tts.md` |

### 核心输出文件

`docs/assets/cover.png`(视频号封面) · `docs/assets/cover-wechat.png`(公众号封面) · `docs/assets/cover-xhs.png`(小红书封面) · `docs/narration.txt` · `docs/session-log.md` · `audio/neural_1_2x.m4a` · `audio/captions.json` · `video-project/out/final.mp4`

### launch.sh 使用

```bash
bash {SKILL_DIR}/scripts/launch.sh init <项目名>   # 初始化（自动隔离 Git 内容）
bash {SKILL_DIR}/scripts/launch.sh all              # 完整流程（Step 0→10 + 封面）
```

> ⚠️ 必须在**项目目录内**执行，且 `PROJECT_DIR` 必须指向项目根目录（不是 workspace 根目录）

**质量门禁**：`node {SKILL_DIR}/scripts/video-quality-gate.js <project-dir> all`

### 渲染命令

```bash
# Remotion Native（音频内嵌 + 字幕同期烧录，无需 ffmpeg）
npx remotion render VerticalVideo

# 封面生成（必须先执行）
python3 generate_cover.py   # 三平台：vertical/wechat/xhs
```

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

---

## 📁 references/ 目录结构

> ⚠️ **archived/** 目录（5个废弃文件）：feishu-base-batch.md · one-pass.md · launch-sh.md（×2） · feishu-base-completion.md

> ⚠️ **文档一致性陷阱**：references/ 文档间存在交叉引用。创建新文档或重命名文件后，必须检查：
> - `documentation-consistency.md`：检查所有对其他 references/ 文件的引用是否仍然有效
> - `subagent-timeout.md`：launch.sh 命令引用路径是否正确
