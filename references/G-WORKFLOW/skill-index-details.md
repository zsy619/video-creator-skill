# SKILL.md 外置索引与检查细则

> 何时读：需要完整规则索引、`create-remotion-project.js` 验证清单、HTML / 占位符检查，或 references 维护规范时阅读。以下各节从 `SKILL.md` 原文搬迁，未改写。

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

### 历史重组记录

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

### 📚 references/ 目录维护规范（2026-05-30 新增）

> **本技能的结构原则**：SKILL.md = 导航索引（轻量+链接丰富），dense 知识 → `references/` 子文件。维护时遵守以下规范：

1. **根目录最多一个索引**：`references/` 下只能有 `README.md`，禁止另存 `index.md`（会导致双入口维护负担和读者困惑）
2. **每个子目录一个索引**：每个子目录（B-REMOTION/、C-CONTENT/ 等）应有且只有一个 `README.md`，列出该目录文件清单
3. **表格首行禁空第一格**：Markdown 表格第一行若以 `|` 开头，空的第一格会被渲染引擎误判为格式错误 → 写 `| 文件` 而非 `| 文件`
4. **H-CONFIG/ 不需要 README**：纯 JSON 配置目录，查询格式直接读 JSON 文件，无需索引文档
5. **删除旧文件后立即更新所有引用**：删除或重命名文件后，搜索全项目 `grep -r "旧文件名" ~/.hermes/skills/video-creator/` 确认无残留引用
6. **SKILL.md 铁律段落禁止重复**：已迁移至 `rules/` 的铁律，在 SKILL.md 只保留一行指向性摘要，不全文抄录（避免版本分裂和维护负担）

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
