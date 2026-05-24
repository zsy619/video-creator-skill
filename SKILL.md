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

> 渲染前先执行 `references/G-WORKFLOW/video-optimization.md` 中的 4 项预检。问题在起点修复，不是终点补救。
> 用户明确要求：**每次生成视频必须一次到位**，不接受"渲染→发现问题→修复→重新渲染"的返工循环。

### Step 0 铁律
- **禁止跳过 Step 0**（文档生成）。11个文档必须在 Remotion 渲染前全部创建完毕
- **禁止不生成封面图**。封面未生成，不得进入音频生成和视频渲染步骤
- Step 0 完成后必须验证所有文件存在，包括 `session-log.md`（详见 `rules/CHECKLIST.md`）

### 音频铁律
- **禁止分段拼接配音**：必须整段连续生成
- **禁止跳过音频后处理**：必须执行去静音 + atempo + AAC 256k
- **禁止使用旧版 ffmpeg 混流**：Remotion Native 方案（`<Audio>` 直接内嵌 MP4）
- **禁止 edge-tts rate=+20% + atempo=1.2x 叠加**：使用 `--rate +0%` + `voice.atempo` 配置值（优先从 video-config.json 读取，不再动态计算）
- **音频文件命名**：`audio/neural_full.mp3`（原始）→ `audio/neural_1_2x.m4a`（atempo后）

### 渲染铁律
- **Root.tsx TOTAL_FRAMES**：必须用 `calculateMetadata` 动态计算（`getAudioDuration(staticFile("audio/neural_1_2x.m4a")) × fps`），禁止在 JSX 中硬编码帧数（硬编码值会覆盖 CLI 的 `--duration-in-frames` 参数）
- **caption.json 末段 endMs** 必须等于视频实际时长（毫秒），而非音频时长
- **video-config.json** 必须在项目根目录（不是 `docs/`）
- **所有 .json 配置文件**必须符合 JSON 语法，禁止重复键名
- **⚠️ `--props` 必须传入 scenes/title/subtitle/theme**：不传则 `scenes: []`，触发 `DEFAULT_SCENES` 回退，全部场景显示"视频标题/痛点场景/解决方案"等占位符。props 对象结构：
  ```json
  {"scenes":[{"id":1,"name":"Cover","duration":7.4,"title":"真实标题","subtitle":""},...],"title":"MiaoYan","subtitle":"副标题","theme":"cyberpunk"}
  ```
  scenes 从 captions.json 的 N 句 narration 等比分配到动态数量的场景（规则见下）；title/subtitle 从 video-config.json 的 cover.title / cover.subtitle 读取

**动态 N 场景规则（launch.sh Step 7 自动推断）：**
- 2-3 句 → Cover + Ending（首尾）
- 4-6 句 → Cover + PainPoint + Solution + Ending
- 7-9 句 → Cover + PainPoint + Solution + Features + Ending
- 10+ 句 → Cover + PainPoint + Solution + Features + Start + Ending

**场景类型（scene.name）决定 DynamicScene.tsx 渲染组件：**
- `Cover` / `PainPoint` / `Solution` / `Features` / `Start` / `Ending` / `Generic`（兜底）

### 清理铁律
- **渲染成功后必须立即清理** `*-repo/` 目录：`rm -rf "${PROJECT_DIR}/*-repo"`
- Git 内容对视频生成无用，删除节省存储空间

### Feishu Base 批量任务铁律
- **禁止使用"快速路径"**：不得用手动 edge-tts + ffmpeg 命令绕过完整工作流程
- **必须完整执行** video-creator 的 Step 0-11（launch.sh all 或等效分步）
- 详见 `references/G-WORKFLOW/feishu-base-batch.md`

### generate_docs.js 输出质量
- `generate_docs.js` 生成的 11 个文件中，7 个存在严重质量问题（详见 `references/F-GENDOCS/generate-docs-deep-analysis.md`）
- **Step 0 后强制检查**：narration.txt 必须干净（无 `---`、`|`、反引号），中文字数 ≥20
- 仅 `article.md`、`report.json`、HTML 三件套可直接使用

### ⚠️ 已确认失败模式：Subagent Step 0 Bypass
**症状**：Subagent 创建了 narration.txt + 音频 + 视频，但 docs/ 下缺少其余 10 个文档（README.md、video-script.md、copy.md、wechat-copy.md、posting-guide.md、session-log.md、landing-page.html、article-page.html、wechat-page.html、report.json），导致发布流程不完整。

**根因**：
1. Subagent 认为"只要有 narration.txt 就能做视频"，跳过了 generate_docs.js
2. `session_status` 在 Step 0 未完成时被误报为 completed
3. 主进程验证依赖 session_status 而非实际文件存在性

**防护**：
- `launch.sh audio` 和 `launch.sh render` 现已内置 `check_step0_docs()` 门禁，12 个文档不全则拒绝执行
- 任何 subagent 任务在 Remotion 渲染前必须调用 `bash launch.sh docs` 生成完整文档集
- narration.txt 存在 ≠ Step 0 完成；必须全部 12 个文档存在

### ⚠️ 已确认失败模式：Session Compaction 导致 narration.txt 内容损坏
**症状**：narration.txt 文件存在，但内容是乱码/乱字符。Subagent 报告 status=completed，主进程看到文件存在即假定内容正确，直接进入音频步骤，生成的音频是乱码文本的配音。

**根因**：Subagent 会话压缩时，上下文窗口内的变量内容被压缩为摘要，但磁盘上的文件状态未必同步。Subagent 认为"已写入 narration.txt"，实际上写入的是压缩前残留在内存中的破损文本。

**验证方法**（每次重建项目时必做）：
```bash
# 检查 narration.txt 是否为干净文本（无控制字符、无乱码）
python3 -c "
text = open('docs/narration.txt', encoding='utf-8').read()
# 乱码特征：含控制字符（\x00-\x08\x0b\x0c\x0e-\x1f）或异常多的符号
bad = sum(1 for c in text if ord(c) < 32 and c not in '\n\r\t')
print(f'控制字符数: {bad}')
if bad > 0: exit(1)
# 中文字数门禁
cn = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
print(f'中文字数: {cn}')
"
```
如果控制字符数 > 0 或中文字数为 0，立即重新生成 narration.txt。

**防护**：
- narration.txt 写入后立即用上述脚本验证内容完整性
- 乱码特征还包括：内容含反引号、`|`、`---` 等 Markdown 残留字符
- 重新生成 narration.txt 后，同步重新生成音频和字幕（避免级联错误）
- `launch.sh docs` 生成的 narration.txt 质量高于 subagent 手动写入的版本，优先使用 `node generate_docs.js`

---

## 📋 规则索引

详细内容必须阅读对应文件，以下为快速索引：

| 类别 | 必须阅读 | 核心要点 |
|------|---------|---------|
| **音频 TTS** | [references/C-CONTENT/audio-tts.md](references/C-CONTENT/audio-tts.md) | edge-tts 规范、atempo 动态计算（≠固定1.2）、语音优先级 |
| **字幕生成** | [references/C-CONTENT/subtitle-production.md](references/C-CONTENT/subtitle-production.md) | captions.json 格式、TikTokCaptionOverlay、CaptionOverlay 铁律 |
| **封面视觉** | [references/E-VISUAL/video-visual.md](references/E-VISUAL/video-visual.md) | attrs 渲染规范（白底+黑字+左侧10px彩色条纹） |
| **PIL 封面** | [references/E-VISUAL/pil-cover.md](references/E-VISUAL/pil-cover.md) | generate_cover.py 用法、WeChat 副标题宽度陷阱 |
| **Remotion 渲染** | [references/B-REMOTION/remotion-troubleshoot.md](references/B-REMOTION/remotion-troubleshoot.md) | Composition ID=VerticalVideo、Text组件、spring动画 |
| **字幕六禁止** | [rules/SUBTITLES.md](rules/SUBTITLES.md) | Fontsize=72/Outline=2/MarginV=50/\\N换行/10字段 |
| **音频规范** | [rules/VOICE.md](rules/VOICE.md) | 男声优先（YunjianNeural 默认）、禁止女声 |
| **质量检查** | [rules/QUALITY.md](rules/QUALITY.md) · [rules/CHECKLIST.md](rules/CHECKLIST.md) | 11个文档门禁、三封面尺寸 |
| **Session 追踪** | [rules/SESSION_LOG.md](rules/SESSION_LOG.md) | session_status 是工具不是命令、7个关键节点 |
| **Git 隔离** | [references/G-WORKFLOW/git-workflow.md](references/G-WORKFLOW/git-workflow.md) | `{repo}-repo/` 隔离、launch.sh init 自动隔离 |
| **Feishu Base** | [references/G-WORKFLOW/feishu-base-batch.md](references/G-WORKFLOW/feishu-base-batch.md) | 11个受影响项目、Base 记录更新语法 |
| **内容文档** | [references/C-CONTENT/content-document-generation.md](references/C-CONTENT/content-document-generation.md) | Step 0-3 完整流程 |
| **Subagent 超时** | [references/D-SUBAGENT/subagent-timeout.md](references/D-SUBAGENT/subagent-timeout.md) | launch.sh 路径陷阱、超时策略 |
| **预检流程** | [references/G-WORKFLOW/video-optimization.md](references/G-WORKFLOW/video-optimization.md) | 4项预检（narration质量/英文句点/叠速/CaptionOverlay） |

### rules/ 目录（技能规则）

[rules/WORKFLOW.md](rules/WORKFLOW.md) · [rules/UNIFIED_RULES.md](rules/UNIFIED_RULES.md) · [rules/THEMES.md](rules/THEMES.md) · [rules/PLATFORM.md](rules/PLATFORM.md) · [rules/TROUBLESHOOTING.md](rules/TROUBLESHOOTING.md) · [rules/SCRIPTS.md](rules/SCRIPTS.md) · [rules/INTEGRATION.md](rules/INTEGRATION.md) · [rules/LAYOUT.md](rules/LAYOUT.md) · [rules/FONTS.md](rules/FONTS.md) · [rules/HTML.md](rules/HTML.md) · [rules/COVER_GENERATE.md](rules/COVER_GENERATE.md) · [rules/WECHAT_COVER.md](rules/WECHAT_COVER.md) · [rules/WECHAT_PUBLISH.md](rules/WECHAT_PUBLISH.md) · [rules/QUICKSTART.md](rules/QUICKSTART.md)

### references/ 目录结构（2026-05-24 重组）

> ⚠️ **请勿使用 A-ARCHIVED/** 目录下的文件 — 已废弃。
> 快速查询入口：`references/index.md`（含分类索引 + 文件清单）

| 目录 | 内容 | 定位 |
|------|------|------|
| **B-REMOTION/** | Remotion 渲染核心（9文件） | 必读 · 每次渲染前必查 |
| **C-CONTENT/** | 内容获取与音频字幕（6文件） | 必读 · Step 0-3 |
| **D-SUBAGENT/** | Subagent 超时与上下文（2文件） | 辅助 · 深度分析后必读 |
| **E-VISUAL/** | 视觉设计与封面图（6文件） | 辅助 · 封面/视觉相关 |
| **F-GENDOCS/** | generate_docs.js 分析（2文件） | 辅助 · 文档生成问题 |
| **G-WORKFLOW/** | 工作流与集成（5文件） | 辅助 · Git / Base / 文档规范 |
| **H-CONFIG/** | 配置文件（3文件） | 参考 · baoyu / CDN / Tailwind |

### B-REMOTION — Remotion 渲染核心（必读）

| 文件 | 用途 |
|------|------|
| `remotion-troubleshoot.md` | Remotion 问题排查总入口 |
| `remotion-render-gotchas.md` | 三个致命陷阱：durationInFrames硬编码 / props传递 / 输出文件名 |
| `remotion-props.md` | --props JSON 构造算法 + Bash 引号嵌套陷阱 |
| `dynamic-scene-template.md` | DynamicScene.tsx 完整模板（CSS 渐变封面版） |
| `dynamic-scene-vertical-center.md` | 垂直居中规范 + CSS 渐变封面 + 首帧亮度验证 |
| `dynamic-scenes-architecture.md` | SCENE_TYPES 枚举 / 百分比等分 / name 路由 |
| `create-remotion-project-bugs.md` | create-remotion-project.js 三大 Bug 修复 |
| `remotion-dynamic-scene-debugging.md` | hive 项目 9 次渲染调试实录 |
| `remotion-tsx-bug.md` | 双花括号修复快速指南（指向 create-remotion-project-bugs.md） |

### C-CONTENT — 内容与音频字幕

| 文件 | 用途 |
|------|------|
| `audio-tts.md` | edge-tts 规范、atempo 动态计算、审计命令库 |
| `subtitle-production.md` | captions.json 格式、TikTokCaptionOverlay、ASS 规范 |
| `content-document-generation.md` | Step 0-3 完整流程（narration.txt 生成规范） |
| `video-workflow-failures.md` | video-creator 系统性失败模式（按严重程度排序） |
| `readme-location.md` | README 位置变体（monorepo / doc 子目录） |
| `cloudflare-medium.md` | Medium.com Cloudflare blocking |

### D-SUBAGENT — Subagent 管理

| 文件 | 用途 |
|------|------|
| `subagent-timeout.md` | 超时恢复指南（launch.sh / Base 更新 / 清理） |
| `subagent-context-preservation.md` | 会话压缩上下文丢失 + narration.txt 损坏防护 |

### E-VISUAL — 视觉设计

| 文件 | 用途 |
|------|------|
| `theme-palette.md` | 50 套主题配色参考（数据源：`scripts/theme-colors.js`） |
| `theme-matching.md` | sceneContent 动态化数据流 |
| `cover-font.md` | 封面字体规范 |
| `cover-image-rendering.md` | 封面图渲染失败诊断（2026-05-23 最终修订） |
| `video-visual.md` | 视觉规范、主题动画 |
| `pil-cover.md` | PIL 本地封面生成（无 AI API 时备用） |

### F-GENDOCS — generate_docs.js 分析

| 文件 | 用途 |
|------|------|
| `generate-docs-failures.md` | 失败模式与强制重写规程 |
| `generate-docs-deep-analysis.md` | 深度知识库（stripMarkdown 问题 / 质量统计） |

### G-WORKFLOW — 工作流与集成

| 文件 | 用途 |
|------|------|
| `git-workflow.md` | Git 隔离与目录分离规范 |
| `feishu-base-batch.md` | Feishu Base 批量处理（record_id 查询 / 更新） |
| `documentation-consistency.md` | 文档一致性维护指南 |
| `node-execsync-bug.md` | Node.js execSync 返回值 bug（macOS arm64） |
| `video-optimization.md` | 视频性能优化与质量门禁（4 项预检） |

### H-CONFIG — 配置文件

| 文件 | 用途 |
|------|------|
| `baoyu-config.json` | baoyu 技能配置（url-to-markdown / cover-image 等） |
| `cdn-mapping.json` | CDN 映射：中国 / 全球 / fallback 字体配置 |
| `tailwind-config.json` | Tailwind 主题扩展配置 |

### A-ARCHIVED — 已废弃文档（请勿使用）

| 文件 | 说明 |
|------|------|
| `feishu-base-completion.bak.md` | 旧版手动流程，已被 launch.sh all 替代 |
| `launch-sh.md` | ⚠️ 已废弃 |
| `one-pass.bak.md` | ⚠️ 已废弃 |
| `remotion-render-output.md` | ⚠️ 已废弃 |

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
| Step 7 完成 | 音频参数（AAC 256k / atempo后时长） | `references/C-CONTENT/audio-tts.md` |
| Step 8 完成 | captions.json 末段 endMs = 视频时长 | `references/C-CONTENT/subtitle-production.md` |
| 渲染前 | 4项预检全部通过 | `references/G-WORKFLOW/video-optimization.md` |
| 渲染后 | 视频时长=音频时长，RMS有效 | `references/C-CONTENT/audio-tts.md` |

### 核心输出文件

`docs/assets/cover.png`(视频号封面) · `docs/assets/cover-wechat.png`(公众号封面) · `docs/assets/cover-xhs.png`(小红书封面) · `docs/narration.txt` · `docs/session-log.md` · `audio/neural_1_2x.m4a` · `audio/captions.json` · `video-project/out/final.mp4`

### launch.sh 使用（2026-05-23 重要修正）

```bash
bash {SKILL_DIR}/scripts/launch.sh init <项目名>   # 初始化（自动隔离 Git 内容）
bash {SKILL_DIR}/scripts/launch.sh all              # 完整流程（Step 0→10 + 封面）
```

> ⚠️ **launch.sh init 仅创建空目录骨架，不生成 Remotion 项目代码！** `init` 创建 `video-project/src/` 等空目录，但无 `Root.tsx`、`Video.tsx`、`package.json`。必须**单独执行** `node {SKILL_DIR}/scripts/create-remotion-project.js .` 生成 Remotion 源码，否则渲染时 `video-project/src/` 为空导致失败。检测方法：`ls video-project/src/` 为空则说明缺少 Remotion 代码。

> ⚠️ **create-remotion-project.js 生成后必须验证**：
> 1. `wc -l video-project/src/scenes/DynamicScene.tsx` — 应 > 0；为 0 则文件为空，需手动从 `references/B-REMOTION/dynamic-scene-template.md` 复制模板
> 2. `head -3 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e` — 应无输出；有输出说明含 literal `\n`，用 `node -e "...(Buffer替换)..."` 修复
> 3. 修复后执行 `npm install && npx remotion render ...` 进行渲染

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

> ⚠️ **archived/** 目录（5个废弃文件）：feishu-base-batch.md · one-pass.md · launch-sh.md（×2） · feishu-base-completion.md 已移入 A-ARCHIVED/

> ⚠️ **文档一致性陷阱**：references/ 文档间存在交叉引用。创建新文档或重命名文件后，必须检查：
> - `documentation-consistency.md`：检查所有对其他 references/ 文件的引用是否仍然有效
> - `subagent-timeout.md`：launch.sh 命令引用路径是否正确

> ⚠️ **CHECKLIST.md 已知问题**（2026-05-23）：rules/CHECKLIST.md 有两处过时内容需手动修复：
> 1. 验证脚本的 for 循环缺少 `narration.txt`（当前列出11个，应为12个，含 README.md 和 narration.txt）
> 2. 字幕/视频文件名过时：文档写 `subtitles.ass` + `final-with-subs.mp4`，实际应使用 `captions.json` + `final.mp4`（Remotion Native 方案）
> 修复方法：用文本编辑器打开 `~/.hermes/skills/video-creator/rules/CHECKLIST.md` 搜索上述字符串并替换。
