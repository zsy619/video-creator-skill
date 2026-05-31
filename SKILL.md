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
| **前置门禁** | [scripts/pre-flight-check.js](scripts/pre-flight-check.js) | 12文档+封面+音频+字幕+配置，batch/渲染前强制执行 |
| **Session 追踪** | [rules/SESSION_LOG.md](rules/SESSION_LOG.md) | session_status 是工具不是命令、7个关键节点 |
| **Git 隔离** | [references/G-WORKFLOW/git-workflow.md](references/G-WORKFLOW/git-workflow.md) | `{repo}-repo/` 隔离、launch.sh init 自动隔离 |
| **Feishu Base** | [references/G-WORKFLOW/feishu-base-batch.md](references/G-WORKFLOW/feishu-base-batch.md) | 11个受影响项目、Base 记录更新语法 |
| **内容文档** | [references/C-CONTENT/content-document-generation.md](references/C-CONTENT/content-document-generation.md) | Step 0-3 完整流程 |
| **Subagent 超时** | [references/D-SUBAGENT/subagent-takeover.md](references/D-SUBAGENT/subagent-takeover.md)（附录 D 超时恢复指南） | launch.sh 路径陷阱、超时策略 |
| **文档生成错误** | [references/G-WORKFLOW/subagent-docs-generation-errors.md](references/G-WORKFLOW/subagent-docs-generation-errors.md) | subagent 生成 Step 0 文档时的扩展名错误和修复 |
| **Subagent docs 生成错误** | [references/G-WORKFLOW/subagent-docs-generation-errors.md](references/G-WORKFLOW/subagent-docs-generation-errors.md) | HTML扩展名/.md/无扩展名/session-log修复 |
| **预检流程** | [references/G-WORKFLOW/video-optimization.md](references/G-WORKFLOW/video-optimization.md) | 4项预检（narration质量/英文句点/叠速/CaptionOverlay） |
| **Workspace 还原预检** | [references/G-WORKFLOW/workspace-restore-preflight.md](references/G-WORKFLOW/workspace-restore-preflight.md) | Git 还原后必查 6 项（帧数/音频/字幕/封面） |

### rules/ 目录（技能规则）

[rules/WORKFLOW.md](rules/WORKFLOW.md) · [rules/UNIFIED_RULES.md](rules/UNIFIED_RULES.md) · [rules/THEMES.md](rules/THEMES.md) · [rules/PLATFORM.md](rules/PLATFORM.md) · [rules/TROUBLESHOOTING.md](rules/TROUBLESHOOTING.md) · [rules/SCRIPTS.md](rules/SCRIPTS.md) · [rules/INTEGRATION.md](rules/INTEGRATION.md) · [rules/LAYOUT.md](rules/LAYOUT.md) · [rules/FONTS.md](rules/FONTS.md) · [rules/HTML.md](rules/HTML.md) · [rules/COVER_GENERATE.md](rules/COVER_GENERATE.md) · [rules/WECHAT_COVER.md](rules/WECHAT_COVER.md) · [rules/WECHAT_PUBLISH.md](rules/WECHAT_PUBLISH.md) · [rules/QUICKSTART.md](rules/QUICKSTART.md)

### references/ 目录结构（2026-05-28 重组）

> ⚠️ **请勿使用 A-ARCHIVED/** 目录下的文件 — 已废弃。
> 快速查询入口：`references/README.md`

| 目录 | 内容 | 文件数 |
|------|------|--------|
| **B-REMOTION/** | Remotion 渲染核心 | 15 |
| **C-CONTENT/** | 内容获取与音频字幕 | 11 |
| **D-SUBAGENT/** | Subagent 超时与上下文 | 3 |
| **E-VISUAL/** | 视觉设计与封面图 | 9 |
| **F-GENDOCS/** | generate_docs.js 分析 | 3 |
| **G-WORKFLOW/** | 工作流与集成 | 16 |
| **H-CONFIG/** | 配置文件 | 3 |
| **A-ARCHIVED/** | 已废弃文档 | 0 |

> 【历史 2026-05-28】删除：`duration-zero-fix.md`、`remotion-tsx-bug.md`、`launch-sh.md`（内容已并入相关文件）
> 【历史 2026-05-28】合并：`pil-cover-usage.md` → `pil-cover.md`；`video-optimization-pitfalls.md` → `video-optimization.md`
> 2026-05-30 重组：精简 `create-remotion-project-bugs.md` 重复章节；更新 `video-creator-deep-lessons.md` 9.25节状态；G-WORKFLOW 重命名 `frame-sync.md` → `frame-sync-workflow.md`
> 2026-06-01 重组：删除 3 个 session artifact 文件；合并 session 记录 → `video-project-sessions.md`；删除 `one-pass.bak.md`；新增 `html-readme-parsing.md`（margelo-style README 解析）

### ⚠️ create-remotion-project.js 验证清单（生成后必查）

1. `wc -l video-project/src/scenes/DynamicScene.tsx` — 应 > 0
2. `python3 -c "open('...','rb').read().count(b'\\x5c\\x6e')"` -- 应为 0（有输出说明含 literal `\\n`，用 Python 修复：`python3 -c "d=open('...','rb').read();open('...','wb').write(d.replace(b'\\x5c\\x6e',b'\\x0a'))"`）
3. `grep 'return <>{{' video-project/src/scenes/DynamicScene.tsx` — 应无输出（无 JSX 双花括号）
4. **⚠️ `captions.json` 会被覆盖！** `create-remotion-project.js` 会将 `video-project/public/audio/captions.json` 重写为 `[]`。如果已手动生成字幕，先备份：`cp video-project/public/audio/captions.json /tmp/captions_backup.json`，渲染后再恢复。
5. **⚠️ captions.json 条数验证**：渲染前检查 `jq length video-project/public/audio/captions.json`，必须 ≥10 条，少于 10 条应拒绝渲染。

### ⚠️ create-remotion-project.js 已知 Bug：literal `\n` 污染（2026-05-31 实测）

**症状**：生成后的 `DynamicScene.tsx` 包含 382 处 literal `\\n` 字节序列（`0x5c 0x6e`），导致文件行数极少（1行）、Remotion 编译失败。

**根因**：`create-remotion-project.js` 生成 TSX 时使用 `writeFileSync` 写入包含 `\n` 转义符的字符串内容，但写入后 `\n` 未被解析为真实换行符，变成两个字符 `\` + `n`。

**检测命令**：
```bash
python3 -c "print(open('video-project/src/scenes/DynamicScene.tsx','rb').read().count(b'\\x5c\\x6e'))"
# 输出 382 = 有污染；输出 0 = 正常
```

**修复命令**（必须立即执行，再继续渲染）：
```bash
python3 -c "
d=open('video-project/src/scenes/DynamicScene.tsx','rb').read()
open('video-project/src/scenes/DynamicScene.tsx','wb').write(d.replace(b'\\x5c\\x6e',b'\\x0a'))
"
wc -l video-project/src/scenes/DynamicScene.tsx  # 修复后应 > 200
```

### B-REMOTION — Remotion 渲染核心（必读）

| 文件 | 用途 |
|------|------|
| `remotion-troubleshoot.md` | Remotion 问题排查总入口 |
| `remotion-render-gotchas.md` | 三个致命陷阱：durationInFrames硬编码 / props传递 / atempo覆盖 |
| `remotion-props.md` | --props JSON 构造算法 + Bash 引号嵌套陷阱 |
| `dynamic-scene-template.md` | DynamicScene.tsx 完整模板（CSS 渐变封面版） |
| `dynamic-scene-vertical-center.md` | 垂直居中规范 + CSS 渐变封面 + 首帧亮度验证 |
| `dynamic-scenes-architecture.md` | SCENE_TYPES 枚举 / 百分比等分 / name 路由（详见 remotion-props.md） |
| `create-remotion-project-bugs.md` | 项目创建 Bug 修复记录（双花括号✅已源码修复 / literal `\n` 污染 / launch.sh权限） |
| `dynamic-scene-tsx-post-render.md` | **【2026-05-30 新增】** 渲染后 4 项验证 + 382 处 literal `\n` 修复实录 |
| `remotion-dynamic-scene-debugging.md` | hive 项目 9 次渲染调试实录 |
| `literal-n-bug-reproduction.md` | **【2026-05-31 新增】** termshot 382 处 literal `\n` 污染 Python 修复实录 |
| `scenes-config-pattern.md` | 场景配置数据结构模式 |
| `remotion-v4-api-changes.md` | Remotion v4 `getAudioDuration` 不存在，必须硬编码帧数 |
| `remotion-props-json-generation.md` | `--props` JSON 文件预写 + cat 引用方案（解决 shell 引号嵌套） |

### C-CONTENT — 内容与音频字幕

| 文件 | 用途 |
|------|------|
| `audio-short-fix.md` | **【2026-05-31 新增】** narration 音频过短修复（atempo 异常检测 + 重写策略） |
| `audio-tts.md` | edge-tts 规范、atempo 动态计算、审计命令库 |
| `edge-tts-inline-and-atempo-fix.md` | **【2026-05-31 新增】** edge-tts 大文本 inline 模式 + 固定 atempo=1.2 固定值模式 |
| `subtitle-production.md` | captions.json 格式、TikTokCaptionOverlay、ASS 规范 |
| `ass-vs-ms-format-trap.md` | **【2026-05-31 新增】** SubtitleGenerator ASS格式 vs CaptionOverlay毫秒格式陷阱（导致NaN渲染失败） |
| `content-document-generation.md` | Step 0-3 完整流程（narration.txt 生成规范） |
| `video-workflow-failures.md` | video-creator 系统性失败模式（按严重程度排序） |
| `readme-location.md` | README 位置变体（monorepo / doc 子目录） |
| `cloudflare-medium.md` | Medium.com Cloudflare blocking |

### D-SUBAGENT — Subagent 超时与上下文

| 文件 | 用途 |
|------|------|
| `subagent-takeover.md` | 超时接管流程（附录 D 超时恢复指南 + 附录 C 7步恢复 checklist） |
| `subagent-context-preservation.md` | 会话压缩上下文丢失 + narration.txt 损坏防护 |

### E-VISUAL — 视觉设计

| 文件 | 用途 |
|------|------|
| `theme-palette.md` | 50 套主题配色参考（数据源：`scripts/theme-colors.js`） |
| `theme-matching.md` | sceneContent 动态化数据流 |
| `cover-font.md` | 封面字体规范 |
| `cover-image-rendering.md` | 封面图渲染失败诊断（2026-05-23 最终修订） |
| `video-visual.md` | 视觉规范、主题动画 |
| `pil-cover.md` | PIL 本地封面生成（无 AI API 时备用；已合并原 `pil-cover-usage.md` 内容） |

### ⚠️ HTML 发布页必须含 viewport + og: meta 标签（2026-05-27 新增）
所有 HTML 文件（landing-page.html / article-page.html / wechat-page.html）必须在 `<head>` 内包含以下 meta 标签：
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:title" content="<title>">
<meta property="og:description" content="<description>">
<meta property="og:type" content="website">
```
检测脚本：
```bash
python3 -c "
import os
for f in ['docs/landing-page.html','docs/article-page.html','docs/wechat-page.html']:
    c=open(f).read()
    miss=[]
    if 'viewport' not in c: miss.append('viewport')
    if 'og:title' not in c: miss.append('og:title')
    if 'og:description' not in c: miss.append('og:description')
    if 'og:type' not in c: miss.append('og:type')
    print(f'{f}: {\"✅\" if not miss else \"⚠️ \"+\",\".join(miss)}')
"
```

### ⚠️ 占位符 `github.com/xxx` 污染文档（2026-05-27 新增）
**症状**：`report.json`、`copy.md`、`session-log.md` 等文档中存在 `github.com/xxx`、`github.com/xxx/repo` 等占位符字符串。
**根因**：`generate_docs.js` 生成 `report.json` 时，将 `repository` URL 字段输出为占位符（未替换真实用户名）；`copy.md` 平台文案手动编写时引入。
**检测脚本**：
```bash
python3 -c "
import os, re
for root, dirs, files in os.walk('docs'):
    for f in files:
        path = os.path.join(root, f)
        c = open(path).read()
        if re.search(r'github\.com/xxx', c):
            print(f'⚠️  {path}')
"
```
**修复**：`github.com/xxx/repo` → `github.com/<user>/<repo>`（发布前由用户填充）。

### ⚠️ README.md 部署命令应与实际工作流一致（2026-05-27 新增）
**症状**：`docs/README.md` 含 `npm install && bash launch.sh all` 等虚构命令。
**正确命令**：根据实际 Git 工作流，应使用 `git clone + docker-compose up + npm run build`。

### F-GENDOCS — generate_docs.js 分析

| 文件 | 用途 |
|------|------|
| `generate-docs-failures.md` | 失败模式与强制重写规程 |
| `generate-docs-deep-analysis.md` | 深度知识库（stripMarkdown 问题 / 质量统计） |

### G-WORKFLOW — 工作流与集成（5文件）

| 文件 | 用途 |
|------|------|
| `git-workflow.md` | Git 隔离与目录分离规范 |
| `subagent-takeover.md` | Subagent 超时后主进程接管流程（含附录 B 主进程接管 + 附录 C 7步恢复 checklist） |
| `main-process-takeover.md` | 主进程兜底渲染 | status=completed 不可信 / 批量 upsert 验证 |
| `video-project-sessions.md` | **GitHub 仓库视频项目 Session 实战记录** | margelo/react-native-graph + shanselman/PeekDesktop 合并；含通用流程模板和验证命令库 |
| `feishu-base-batch.md` | Feishu Base 批量处理（record_id 查询 / 更新） |
| `html-readme-parsing.md` | **【2026-06-01 新增】** HTML 开头 README 解析规范（margelo-style，含 HTML 标签 stripping Python 方案） |
| `lark-cli-base-record-update.md` | lark-cli record-update 命令实测语法（2026-05-28） |
| `documentation-consistency.md` | 文档一致性维护指南 |
| `node-execsync-bug.md` | Node.js execSync 返回值 bug（macOS arm64） |
| `subagent-docs-generation-errors.md` | **【2026-06-01 新增】** subagent Step 0 文档生成错误（HTML扩展名/非必需文件/session-log无扩展名） |
| `video-optimization.md` | 视频性能优化与质量门禁（含原 `video-optimization-pitfalls.md` 内容） |
| `captions-endms-sync.md` | captions 末段 endMs 精确同步（批量检测脚本） |
| `batch-duration-fix-20260527.md` | **【批量修复手册】** 141 项目四维同步（帧数/音频/字幕/config）实测修复全记录 |
| `audio-duration-mismatch.md` | **【核心修复手册】** atempo/audio/video 三元组不匹配根因 + atempo=1.0 恢复流程 |

### H-CONFIG — 配置文件（无 .md 文件，无需 README）

> ⚠️ **H-CONFIG/** 目录下仅有 JSON 配置文件，无 Markdown 文件，故无 README 索引。查询配置格式请直接读取 JSON 文件。
### A-ARCHIVED — 已废弃文档（请勿使用）

| 文件 | 说明 |
|------|------|
| _(已清空)_ | 该目录已无有效文件 |

---

### 📚 references/ 目录维护规范（2026-05-30 新增）

> **本技能的结构原则**：SKILL.md = 导航索引（轻量+链接丰富），dense 知识 → `references/` 子文件。维护时遵守以下规范：

1. **根目录最多一个索引**：`references/` 下只能有 `README.md`，禁止另存 `index.md`（会导致双入口维护负担和读者困惑）
2. **每个子目录一个索引**：每个子目录（B-REMOTION/、C-CONTENT/ 等）应有且只有一个 `README.md`，列出该目录文件清单
3. **表格首行禁空第一格**：Markdown 表格第一行若以 `|` 开头，空的第一格会被渲染引擎误判为格式错误 → 写 `| 文件` 而非 `| 文件`
4. **H-CONFIG/ 不需要 README**：纯 JSON 配置目录，查询格式直接读 JSON 文件，无需索引文档
5. **删除旧文件后立即更新所有引用**：删除或重命名文件后，搜索全项目 `grep -r "旧文件名" ~/.hermes/skills/video-creator/` 确认无残留引用
6. **SKILL.md 铁律段落禁止重复**：已迁移至 `rules/` 的铁律，在 SKILL.md 只保留一行指向性摘要，不全文抄录（避免版本分裂和维护负担）

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

| `audio/neural_1_2x.m4a` · `audio/captions.json` · `video-project/out/final.mp4`

### ⚠️ narration.txt 字数上限公式（2026-05-28 修正；2026-06-01 再次确认）
**旧公式**（已废弃）：`⌊TARGET_DURATION × 6.45⌋` — 对应 `rate=+20%`，导致字数严重不足
**正确公式**：`⌊TARGET_DURATION × 3.37⌋` — 实测 `zh-CN-YunjianNeural --rate +0%`
**检测**：
```bash
grep -rn "6\.45" scripts/pre-subtitle-check.js scripts/generate_docs.js scripts/launch.sh rules/ references/
# 应无输出（有输出说明未更新）
```
**受影响文件**：`pre-subtitle-check.js` · `generate_docs.js` · `launch.sh`（均已修复）

### GitHub 仓库项目视频制作流程（2026-05-31 新增；2026-06-01 更新）

当用户要求为 GitHub 仓库项目生成视频时（如 `为 shanselman/PeekDesktop 项目生成视频`），执行以下流程：

**Step 1 — 克隆仓库（隔离模式）**
```bash
PROJECT_DIR=/Users/zhushuyan/.hermes/workspace/<repo-name>
REPO_DIR="${PROJECT_DIR}/<repo-name>-repo"
mkdir -p "${REPO_DIR}" && git clone --depth=1 https://github.com/<user>/<repo-name>.git "${REPO_DIR}"
```

**Step 2 — 从 README 提取内容**
读取仓库根目录的 `README.md`，提取核心信息：
- 项目名称与一句话描述
- 核心特性（3-5条）
- 应用场景
- 技术亮点

**Step 3 — 初始化 video-creator 项目**
```bash
# ⚠️ launch.sh init 在 /Users/zhushuyan 下执行，不是在 REPO_DIR 内
cd /Users/zhushuyan && bash {SKILL_DIR}/scripts/launch.sh init <repo-name>
```

**Step 4 — 创建 Remotion 项目（必须单独执行）**
```bash
# ⚠️ 在 PROJECT_DIR 内执行（launch.sh init 已创建目录结构）
cd {PROJECT_DIR} && node {SKILL_DIR}/scripts/create-remotion-project.js .
```

**⚠️ 必须两步走（缺一不可）：**

```bash
# Step 4a: 生成 Remotion 源码（create-remotion-project.js 只创建 package.json，不安装 node_modules）
cd {PROJECT_DIR} && node {SKILL_DIR}/scripts/create-remotion-project.js .

# Step 4b: 安装依赖（跳过此步 → 渲染时报 "No such file or directory: node_modules/.bin/remotion"）
cd {PROJECT_DIR}/video-project && npm install
```

**Step 5 — 修复 literal `\n` 污染（立即执行！）**
创建后立即验证：
```bash
python3 -c "print(open('{PROJECT_DIR}/video-project/src/scenes/DynamicScene.tsx','rb').read().count(b'\x5c\x6e'))"
# 输出 382 = 有污染 → 执行修复
python3 -c "d=open('{PROJECT_DIR}/video-project/src/scenes/DynamicScene.tsx','rb').read();open('{PROJECT_DIR}/video-project/src/scenes/DynamicScene.tsx','wb').write(d.replace(b'\x5c\x6e',b'\x0a'))"
wc -l {PROJECT_DIR}/video-project/src/scenes/DynamicScene.tsx  # 修复后应 > 200
```

**Step 6 — 编写 narration 并生成 TTS**
手动编写 narration（中文字符 ≥175，10句以上），用 `edge-tts --write-media` 生成音频。
⚠️ narration 必须放在 `{PROJECT_DIR}/docs/narration.txt`，不是 `{PROJECT_DIR}/<repo-name>-repo/docs/`。
⚠️ narration 写完后需要估算时长：如果 TTS 原速时长远超目标时长，需要用 atempo 压缩。请在 Step 7 中根据实际音频时长判断是否需要 atempo。
⚠️ **大文本必须用 inline 模式**：`--text "$(cat file)"` 在文本 >1500 字符时会导致 edge-tts 超时（120s），生成 0 字节文件。

```bash
cd {PROJECT_DIR} && edge-tts --voice zh-CN-YunjianNeural --text "长文本内容直接内联到这里..." --write-media audio/neural_1_2x.m4a
```

**Step 7 — 复制音频到 Remotion public 目录（易遗漏！注意是 atempo 后的 Tempo 版本！）**
```bash
# ⚠️ 渲染必须用 atempo 调整后的音频！
cp {PROJECT_DIR}/audio/neural_1_2xTempo.m4a {PROJECT_DIR}/video-project/public/audio/neural_1_2x.m4a
```

**Step 8 — 生成 captions.json**
⚠️ **关键：captions 必须基于 atempo 调整后的音频生成**，否则时间轴错位。
使用 Python 等比分段（注意使用 `neural_1_2xTempo.m4a` 的时长，不是原始 `neural_1_2x.m4a`）：
```python
cd {PROJECT_DIR} && python3 << 'PYEOF'
import json, subprocess, re
# ⚠️ 必须用 atempo 调整后的音频计算时长
dur = float(subprocess.check_output(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
     'audio/neural_1_2xTempo.m4a'], text=True).strip())
with open('docs/narration.txt') as f:
    text = f.read().strip()
sentences = re.split(r'[。！？\n]', text)
sentences = [s.strip() for s in sentences if s.strip()]
ms_per_sentence = dur * 1000 / len(sentences)
captions = []
for i, s in enumerate(sentences):
    start = int(i * ms_per_sentence)
    end = int((i + 1) * ms_per_sentence)
    captions.append({"startMs": start, "endMs": end, "text": s})
captions[-1]["endMs"] = int(round(dur * 1000))  # 末段精确同步
with open('audio/captions.json', 'w', encoding='utf-8') as f:
    json.dump(captions, f, ensure_ascii=False, indent=2)
print(f"Generated {len(captions)} captions from atempo audio ({dur:.2f}s)")
PYEOF
cp {PROJECT_DIR}/audio/captions.json {PROJECT_DIR}/video-project/public/audio/
```

**Step 9 — 更新 Root.tsx 帧数**
```bash
# round(音频时长秒数 × 60)
patch {PROJECT_DIR}/video-project/src/Root.tsx << 'EOF'
-      durationInFrames={3600}
+      durationInFrames={5236}  # 例：87.264s × 60
EOF
```

**Step 10 — 生成 render-props.json**
```bash
cd {PROJECT_DIR} && node -e "
const fs = require('fs');
const captions = JSON.parse(fs.readFileSync('video-project/public/audio/captions.json'));
const totalMs = captions[captions.length - 1].endMs;
const types = ['Cover', 'PainPoint', 'Solution', 'Features', 'Ending'];
const scenes = types.map((name, i) => ({
  id: i + 1, name,
  startMs: Math.round((i / types.length) * totalMs),
  endMs: Math.round(((i + 1) / types.length) * totalMs)
}));
fs.writeFileSync('video-project/render-props.json', JSON.stringify({
  scenes, title: 'PeekDesktop', subtitle: '让Windows拥有macOS Sonoma的桌面预览功能', theme: 'tech-blue'
}, null, 2));
"
```

**Step 11 — 渲染**
```bash
cd {PROJECT_DIR}/video-project && node_modules/.bin/remotion render VerticalVideo out/final.mp4 \
  --concurrency=4 --fps=60 --disable-gpu --log=error --props-file ../render-props.json
```

**Step 12 — 清理**
```bash
rm -rf {PROJECT_DIR}/*-repo  # 清理克隆的仓库目录
```

> ⚠️ **launch.sh init 之后必须单独运行 create-remotion-project.js + npm install**
> ⚠️ **workspace 项目还原后必查 Root.tsx 帧数**：从 Git 克隆的 workspace 项目，`Root.tsx` 的 `durationInFrames` 可能与当前 `audio/neural_full.mp3` 时长不同步（音频时长变了但帧数未更新）。渲染前必须用 `round(音频秒数×60)` 校验并修复，否则帧数错位。
> ⚠️ **渲染前音频复制（易遗漏！）**
`launch.sh init` 仅创建空目录骨架（`video-project/src/` 等），**不生成 Remotion 源码**。必须依次执行：

```bash
# 1. 生成 Remotion 源码
node {SKILL_DIR}/scripts/create-remotion-project.js .

# 2. 安装 node_modules（create-remotion-project.js 只创建 package.json，不执行 npm install）
cd video-project && npm install
```

> ⚠️ 若跳过第 2 步，渲染时会报 `No such file or directory: node_modules/.bin/remotion`。

### edge-tts 大文本 inline 优于 --text "$(cat file)"

当 narration.txt 字符数较多（>1500 字符）时，`--text "$(cat file)"` 可能因 shell 参数超限导致 timeout（120s）。

**修复**：将文本直接内联到命令行中：
```bash
# ✅ 大文本用 inline（stackprism 项目 2305 字符成功）
edge-tts --voice zh-CN-YunjianNeural --text "StackPrism 栈棱镜是网页技术栈识别扩展..." --write-media audio/neural_1_2x.m4a

# ⚠️ 小文本可用 --text "$(cat file)"，大文本会超时
edge-tts --text "$(cat docs/narration.txt)" --write-media audio/neural_1_2x.m4a
```

> 实测 stackprism 项目 narration.txt 2305 字符，inline 方式成功；用 `--text "$(cat file)"` 超时（120s），文件生成 0 字节。

### create-remotion-project.js 验证清单（生成后必查）

创建后必须验证（4项，全通过才可继续）：

```bash
# 1. DynamicScene.tsx 有内容（> 0 行）
wc -l video-project/src/scenes/DynamicScene.tsx

# 2. 检测 literal \n 污染（0 = 正常，382 = 有bug）
python3 -c "print(open('video-project/src/scenes/DynamicScene.tsx','rb').read().count(b'\x5c\x6e'))"

# 3. 修复 literal \n 污染（如有）
python3 -c "d=open('video-project/src/scenes/DynamicScene.tsx','rb').read();open('video-project/src/scenes/DynamicScene.tsx','wb').write(d.replace(b'\x5c\x6e',b'\x0a'))"
wc -l video-project/src/scenes/DynamicScene.tsx  # 修复后应 > 200

# 4. 检测 JSX 双花括号语法错误
grep 'return <>{{' video-project/src/scenes/DynamicScene.tsx  # 无输出 = 正常
```

### 渲染前音频复制（易遗漏！）

```bash
# 音频文件必须复制到 Remotion 能找到的位置
cp audio/neural_1_2x.m4a video-project/public/audio/
```

> ⚠️ 若不复制，Remotion 会在 `http://localhost:3000/public/audio/` 查找，导致 404 渲染失败。这个 404 表现为 `localhost:3000/... could not be found`，极易误判为服务器问题。

### launch.sh 使用（2026-05-23 重要修正）

```bash
bash {SKILL_DIR}/scripts/launch.sh init <项目名>   # 初始化（自动隔离 Git 内容）
bash {SKILL_DIR}/scripts/launch.sh all              # 完整流程（Step 0→10 + 封面）
```

> ⚠️ **launch.sh init 仅创建空目录骨架，不生成 Remotion 项目代码！** `init` 创建 `video-project/src/` 等空目录，但无 `Root.tsx`、`Video.tsx`、`package.json`。必须**单独执行** `node {SKILL_DIR}/scripts/create-remotion-project.js .` 生成 Remotion 源码，否则渲染时 `video-project/src/` 为空导致失败。检测方法：`ls video-project/src/` 为空则说明缺少 Remotion 代码。

> ⚠️ **launch.sh 必须先 chmod +x**：若遇到 `Permission denied`，立即执行 `chmod +x /Users/zhushuyan/.hermes/skills/video-creator/scripts/launch.sh`

> ⚠️ **create-remotion-project.js 执行后必须立即验证（4 项）：**
> 1. `wc -l video-project/src/scenes/DynamicScene.tsx` — 应 > 0；为 0 则文件为空，需手动从 `references/B-REMOTION/dynamic-scene-template.md` 复制模板
> 2. `head -c 200 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e` — 应无输出；有输出说明含 **literal `\n`**（字节 `0x5c 0x6e`），运行 `node {SKILL_DIR}/scripts/fix-remotion-project.js <project-dir>` 修复（自动替换为真实换行符）
> 3. `grep 'return <>{{' video-project/src/scenes/DynamicScene.tsx` — 应无输出；有输出说明含 **JSX 双花括号语法错误**（`return <>{{ hLines }}{{ vLines }}</>`），用 `patch` 修复为 `return <>{hLines}{vLines}</>`
> 4. 执行 `npm install && node_modules/.bin/remotion render ...` 验证编译通过

**⚠️ `npx remotion` 在某些环境下不可用**：必须使用 `node_modules/.bin/remotion` 直接调用。
**⚠️ 渲染命令必须在 `video-project/` 子目录内执行**：`node_modules/.bin/remotion` 位于 `video-project/node_modules/.bin/`，**不是**父目录。cd 到 video-project 再执行。render-props.json 放在父目录时，使用 `$(cat ../render-props.json)` 引用。
**⚠️ narration.txt 更新后必须重新生成音频和字幕**：narration 改变 → 重新 edge-tts → 重新 ffmpeg atempo → 重新生成 captions.json → 重新复制到 `public/audio/` → 更新 Root.tsx 帧数 → 重新生成 render-props.json → 渲染。
**⚠️ Root.tsx 帧数须与实际音频同步**：每次音频重新生成后（atempo 处理），用 `round(新音频时长秒数 × 60)` 更新 Root.tsx 的 `durationInFrames`。不更新会导致渲染帧数与音频不匹配。
**⚠️ DynamicScene.tsx 为空时的恢复顺序**（不要 re-run create-remotion-project.js，直接：
1. 验证 `wc -l video-project/src/scenes/DynamicScene.tsx` → 0 或 1
2. `head -c 200 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e` 查 literal \n
3. 确认无 literal \n 后，直接将 `references/B-REMOTION/dynamic-scene-template.md` 的完整 TSX 模板写入 `video-project/src/scenes/DynamicScene.tsx`
4. 验证写入后行数 > 200
5. 继续渲染 — 不要重跑 create-remotion-project.js（会覆盖已修复的文件）
**⚠️ launch.sh all 渲染失败后的恢复步骤**：
1. 手动修复 DynamicScene.tsx literal \n（Python replace）
2. 重新生成音频（edge-tts → ffmpeg atempo）
3. 重新生成 captions.json（Python 等比分割 narration）
4. 复制音频和字幕到 `public/audio/`
5. 更新 Root.tsx 帧数
6. 生成 render-props.json
7. cd video-project && node_modules/.bin/remotion render ...

### 渲染命令

```bash
# 预写 props JSON 文件（避免 shell 引号嵌套问题）
node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync('video-config.json'));const caps=JSON.parse(fs.readFileSync('video-project/public/audio/captions.json'));const dur=58.4;const ms=dur*1000;const types=['Cover','PainPoint','Solution','Features','Start','Ending'];const scenes=types.map((n,i)=>({id:i+1,name:n,startMs:Math.round(i/types.length*ms),endMs:Math.round((i+1)/types.length*ms),duration:(1/types.length*ms)/1000,title:n==='Cover'?c.cover.title:n==='Solution'?'程序化API访问':n==='Features'?'核心功能':n==='Start'?'pip install':n==='PainPoint'?'痛点场景':n==='Ending'?'立即开始':n,subtitle:n==='Cover'?c.cover.subtitle:'',painPoints:['Web UI 功能有限','批量操作繁琐','API 访问困难'],features:[{name:'Python API',icon:'🐍'},{name:'CLI 工具',icon:'💻'},{name:'AI Agent',icon:'🤖'},{name:'批量下载',icon:'📦'}],steps:[{cmd:'pip install notebooklm-py',desc:'安装库'},{cmd:'notebooklm login',desc:'认证'},{cmd:'notebooklm create',desc:'创建笔记本'}]}));fs.writeFileSync('video-project/render-props.json',JSON.stringify({scenes,title:c.cover.title,subtitle:c.cover.subtitle,theme:c.theme}));"
# Remotion Native（音频内嵌 + 字幕同期烧录，无需 ffmpeg）
# ⚠️ 必须使用 node_modules/.bin/remotion，npx remotion 在某些环境下不可用
# 推荐使用 --props-file（避免 shell 引号嵌套问题）
node_modules/.bin/remotion render VerticalVideo out/final.mp4 --concurrency=4 --fps=60 --disable-gpu --log=error --props-file ../render-props.json

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

> ⚠️ **workspace 项目补封面义务**（2026-06-01 新增）：
> - 每次 video-creator 处理完成的 workspace 项目，**必须**生成 `docs/assets/cover.png`（竖屏 1080×1920）
> - generate_cover.py 位置：`/Users/zhushuyan/.hermes/skills/video-creator/scripts/generate_cover.py`
> - 调用：`python3 /Users/zhushuyan/.hermes/skills/video-creator/scripts/generate_cover.py vertical "标题" "副标题"`
> - 输出到 `docs/assets/cover.png`，同时生成 `cover-wechat.png`（900×383）和 `cover-xhs.png`（1440×2560）
> - **禁止**跳过封面生成步骤，即使项目已"完成"视频渲染
> - 旧路径（已废弃）：`/Volumes/OpenClawDrive/.hermes/workspace/9router/docs/assets/generate_cover.py`
> - 新路径：`/Users/zhushuyan/.hermes/skills/video-creator/scripts/generate_cover.py`
> - 调用方式：`cd {proj} && python3 /Users/zhushuyan/.hermes/skills/video-creator/scripts/generate_cover.py vertical "标题" "副标题"`
> - `documentation-consistency.md`：检查所有对其他 references/ 文件的引用是否仍然有效
> - `subagent-takeover.md` 附录 D：launch.sh 命令引用路径陷阱（`cd` 进入正确目录）

### 规则文档一致性维护（2026-05-28 新增）
**症状**：更新 `references/` 子文档后，rules/ 目录下的规则文档未能同步更新，导致文档间引用不一致。经验证，以下内容最常遗漏：
- `subtitles.ass` / `audio/subtitles_*.ass` → `audio/captions.json`
- `gen_subtitles.py` / `gen_subtitles_template.py` → 已废弃（Remotion Native 字幕生成由 launch.sh Step 3 完成）
- `final-with-subs.mp4` → `final.mp4`（Remotion Native 输出文件名）
- 旧版 3-step ffmpeg 混流渲染流程 → Remotion Native 单步渲染
- 字幕字号 72px Fontsize 约束 → 仅对 ASS 方案有意义，captions.json 方案已不适用
- 小红书封面 1440×1920 → **1440×2560**（1440×1920 是旧错误值）

**维护检查清单**：每次更新核心 pipeline 后，扫描 rules/ 目录：
```bash
grep -rn "subtitles.ass\|final-with-subs\|gen_subtitles\|1440.*1920\|Fontsize.*72" \
  ~/.hermes/skills/video-creator/rules/
```
若有匹配，手动替换为正确值，并更新对应文件的"最后更新"时间戳。

**已确认的过时内容修复记录**（2026-05-28）：
| 文件 | 修复内容 |
|------|---------|
| `rules/CHECKLIST.md` | `.srt 格式` → `captions.json`；`Fontsize≠72` → `字幕与视频不同步`；`ffmpeg 混流` → `检查 Audio 组件` |
| `rules/WORKFLOW.md` | 6处 `subtitles_*.ass` / `gen_subtitles.py` / `final-with-subs` → `captions.json` / `final.mp4` |
| `rules/QUICKSTART.md` | 3处 `subtitles.ass` / `final-with-subs.mp4` → `captions.json` / `final.mp4` |
| `rules/UNIFIED_RULES.md` | 旧 3-step 混流渲染 → Remotion Native 单步；中间文件列表删除；更新 时间戳 |
| `README.md` | 小红书封面 1440×1920 → 1440×2560 |
| `rules/FONTS.md` | 无需修改（Fontsize 规范仅对 ASS 有意义） |
| `rules/VOICE.md` | 无需修改（音频 pipeline 描述正确） |
| `rules/SUBTITLES.md` | 保留 ASS fallback 参考文档（无害） |

> ⚠️ **CHECKLIST.md 已知问题**（2026-05-28 已修复）：
