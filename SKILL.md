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

> ⚠️ **完整铁律内容已迁移至 `rules/UNIFIED_RULES.md`、`rules/CHECKLIST.md`、`rules/VOICE.md`**。以下为快速摘要索引。

### Step 0 铁律

- `launch.sh init` 必须在项目目录内执行（Git 仓库用完必须 `rm -rf {repo}/{repo}-repo/`）
- `docs/article.md` 中文字数 < 100 或含 `"请在此处"` → 立即停止，断言失败
- `launch.sh docs` 的 `check_step0_docs()` 门禁：12 个文档缺一不可执行音频 pipeline

### 音频铁律

- `narration.txt` 必须手写（中文字符 175-337，无控制字符，无英文句号`.`）
- **不依赖 `generate_docs.js` 生成 narration**（5 个确认 Bug，详见 `references/G-WORKFLOW/video-creator-deep-lessons.md` 9.1节）
- edge-tts 音色：默认 `zh-CN-YunjianNeural`，科技类用 `zh-CN-YunxiNeural`
- `atempo` 只能用于压缩长音频，**禁止**用于拉伸短音频
- `launch.sh audio` 是空壳，必须手动执行 edge-tts 命令（详见 `rules/VOICE.md`）

### 渲染铁律

- Remotion `--props` JSON 中 `scenes` 数组每条必须含 `startMs/endMs`，缺一不可渲染
- `Root.tsx` 帧数必须用 `round(实测秒数 × 60)` 而非 `ceil()`
- `DynamicScene.tsx` 行数 < 50 或含 `literal \n` → 直接从 `references/B-REMOTION/dynamic-scene-template.md` 复制模板覆盖
- 渲染后 captions.json 末段 endMs 必须用 `ffprobe` 视频实际时长校准

### narration 门禁

- 中文字符数 175-337；英文句号 `.` = 0；控制字符 = 0
- 验证脚本（Step 0 后必做）：
```python
text = open('docs/narration.txt', encoding='utf-8').read()
bad = sum(1 for c in text if ord(c) < 32 and c not in '\n\r\t')
cn = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
if bad > 0 or cn < 20: exit(1)
```

### 清理铁律

- `rm -rf {repo}/{repo}-repo/` — Git 仓库内容用完即删
- 渲染前 `video-project/out/` 必须存在
- `video-config.json` patch 操作每次只改一个字段，改后必须 `python3 -c "import json; json.load(open('x.json'))"` 验证
- `generate_docs.js` 生成的 11 个文件存在严重质量问题，**必须人工重写 narration**

### Feishu Base 铁律

- `lark-cli` 每次调用必须带完整 `--base-token` 和 `--table-id`（不跨调用持久化）
- Base 更新：`--json '{"video-creator":"是"}'`（字段名是字符串，非变量）
- `video-creator="是"` 的记录必须 totalMs/scenes 字段完整；Subagent status=completed 不可信（详见 `rules/UNIFIED_RULES.md`）

### cover 字段检测

- `video-config.json` 的 `cover.title` 为占位符（"视频标题"）时必须手动修复
- `attrs` 数组是封面图底部属性标签数据源（详见 `references/E-VISUAL/pil-cover.md`）

### ⚠️ 已确认致命 Bug（已迁移至 `references/G-WORKFLOW/video-creator-deep-lessons.md`）

> SKILL.md 第 203-702 行 Confirmed Bugs 和失败模式段落已迁移至 `references/G-WORKFLOW/video-creator-deep-lessons.md` 第 9 节（9.1–9.24），实现零丢失集中管理。
>
> 以下为快速索引：
>
> | Bug | 文件 | 关键内容 |
> |-----|------|---------|
> | 占位符 + generate_docs.js 5 Bug | `video-creator-deep-lessons.md` 9.1 | 字节/字符边界混淆 / `\|` 是字面字符 |
> | Root.tsx durationInFrames={0} | `video-creator-deep-lessons.md` 9.2 | 必须正数初始值 |
> | CoverScene attrs 断连 | `video-creator-deep-lessons.md` 9.3 | 5环节修复链路 |
> | DURATION_FRAMES 正则4模式 | `video-creator-deep-lessons.md` 9.6 | JSX/const/TOTAL_FRAMES/DURATION |
> | captions endMs 缩放 | `video-creator-deep-lessons.md` 9.8 | `scale = video_ms / cap_endms` |
> | h264x 误判 | `video-creator-deep-lessons.md` 9.9 | h264/h264x/libx264 三选一白名单 |
> | Subagent completed≠完成 | `video-creator-deep-lessons.md` 9.10 | 主进程强制验证 |
> | node_modules 失效 | `video-creator-deep-lessons.md` 9.11 | 不复制，直接 npm install |
> | JSON trailing comma | `video-creator-deep-lessons.md` 9.12 | Python 3.9 RFC 8259 严格拒绝 |
> | audio 不确定 | `video-creator-deep-lessons.md` 9.13 | 永远以 ffprobe 视频时长为准 |
> | AbsoluteFill flex 失效 | `video-creator-deep-lessons.md` 9.15 | transform translate(-50%,-50%) |
> | Step 0 Bypass | `video-creator-deep-lessons.md` 9.16 | 12 文档门禁 |
> | atempo operator precedence | `video-creator-deep-lessons.md` 9.17 | 三元运算符优先级陷阱 |
> | OpenClawDrive .m4a 覆写 | `video-creator-deep-lessons.md` 9.19 | ffmpeg → /tmp/ → cp |
> | 三字段同步 | `video-creator-deep-lessons.md` 9.20 | totalMs / scenes[-1].endMs / scenes[-1].duration |
> | patch 损坏 JSON | `video-creator-deep-lessons.md` 9.23 | 每次只改一字段 |

---

### ✅ 冲突已解决（SKILL.md 内联保留索引）

| 冲突 | 状态 | 详见 |
|------|------|------|
| 冲突 8：文档时长过期引用 | ✅ 2026-05-27 | `video-creator-deep-lessons.md` 9.14 |
| 冲突 9：CoverScene attrs 断连 | ✅ 2026-05-27 | `video-creator-deep-lessons.md` 9.3 |
| 冲突 10：voice.atempo 字段说明 | ✅ 2026-05-28 | `video-creator-deep-lessons.md` 9.4 |
| 冲突 11：duration/scenes 近似值 | ✅ 2026-05-27 | `video-creator-deep-lessons.md` 9.5 |

> **2026-05-30 更新**：铁律内容已迁移至 `rules/` 目录，Confirmed Bugs 已迁移至 `references/G-WORKFLOW/video-creator-deep-lessons.md` 第 9 节，SKILL.md 改为技能导航索引角色。

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
- **禁止 edge-tts rate=+20% + atempo=1.2x 叠加**：使用 `--rate +0%` + `VOICE_ATEMPO` 配置值（从 video-config.json `voice.atempo` 读取，默认 1.2）。音频 pipeline 流程：`edge-tts --rate +0%` 生成原始音频 → `ffmpeg atempo ${VOICE_ATEMPO}` 后处理。
- **用户指定 atempo**：从 `video-config.json` 的 `voice.atempo` 字段读取（如 1.2），工作流直接使用该值。若字段不存在则使用默认值 1.2。
- **atempo 仅在后处理生效**：atempo 在 ffmpeg 后处理阶段对音频文件操作，不影响 TTS 生成速率。Remotion 直接播放 `audioFile` 路径的文件，该文件已经过 atempo 处理。
- **音频文件命名**：`audio/neural_full.mp3`（原始）→ `audio/neural_1_2x.m4a`（atempo后）
- **目标时长从 video-config.json 获取**：从 `scenes[-1]['endMs']/1000` 动态计算，禁止硬编码（如 `TARGET_DUR=52`）
- **ffmpeg pad/truncate 必须用 /tmp/ 中转**：直接 `ffmpeg ... output.m4a` 覆盖输入文件会触发 returncode=234（OpenClawDrive 挂载卷特有）；必须先写 `/tmp/` 再 `cp` 覆盖

### 渲染铁律
- **Root.tsx TOTAL_FRAMES**：必须用 `calculateMetadata` 动态计算（`getAudioDuration(staticFile("audio/neural_1_2x.m4a")) × fps`），禁止在 JSX 中硬编码帧数（硬编码值会覆盖 CLI 的 `--duration-in-frames` 参数）。若直接硬编码帧数，必须用 `round(实测秒数 × 60)` 而非 `ceil()`（Remotion 内部用 round()，ceil 会导致多 1 帧偏差）。帧数配置有 4 种形式（`durationInFrames={N}`、`durationInFrames={60*N}`、`TOTAL_FRAMES` const、`DURATION` const），正则必须全覆盖。详见 `references/B-REMOTION/frame-round-calculation.md`。
- **caption.json 末段 endMs** 必须等于视频实际时长（毫秒），而非音频时长
- **video-config.json 必须在项目根目录**（不是 `docs/`）
- **所有 .json 配置文件**必须符合 JSON 语法，禁止重复键名
- **⚠️ `video-config.json` 两项为 CRITICAL 失败条件**（缺少则拒绝渲染）：
  - `totalMs`：数字字段，等于音频实际时长（毫秒），控制视频总帧数
  - `scenes`：非空数组，每条含 `startMs/endMs`，控制场景时间边界
  - 验证命令：`node video-quality-gate.js <project> render` 或 `node video-quality-gate.js <project> config`
  - 若缺失，**必须先补全再渲染**，不得跳过或使用 DEFAULT_SCENES 硬编码蒙混过关
- **⚠️ `captions.json` 条数 < 10 → 拒绝渲染**：条数不足会导致场景时间边界错误，必须扩充 narration.txt 后重新生成字幕
- **⚠️ narration.txt 句数 <10 → 视频质量不达标**：4-6句=4帧，7-9句=5帧，10+句=6帧（最低要求）。低于6帧不符合最低规格。若句数不足，手动补充过渡句确保 ≥10 句。
- **⚠️ `--props` 必须传入 scenes/title/subtitle/theme**：不传则 `scenes: []`，触发 `DEFAULT_SCENES` 回退，全部场景显示"视频标题/痛点场景/解决方案"等占位符。props 对象结构：
  ```json
  {"scenes":[{"id":1,"name":"Cover","duration":7.4,"title":...,...},...],"title":"...","subtitle":"...","theme":"..."}
  ```
  **⚠️ 每条 scene 必须含内容字段**（`painPoints`/`features`/`steps`/`url`/`license`），只传 title/subtitle 会导致场景内容为空（PainPoint 无痛点列表、Features 无功能卡片、Start 无命令步骤、Ending 无链接）。
  ```
  scenes 从 captions.json 的 N 句 narration 等比分配到动态数量的场景（规则见上）；title/subtitle 从 video-config.json 的 cover.title / cover.subtitle 读取

**⚠️ narration.txt 句数不足触发 6 帧的致命后果**：
- 若 narration 只有 7-9 句 → 5 帧场景（无 Start 场景）
- 若 narration 只有 4-6 句 → 4 帧场景（无 Features + Start）
- **低于 6 帧的视频不符合最低质量要求**
- 防护：**手动补充过渡句到 narration.txt**，确保中文字数 ≥420（N ≥10 句）后再进入音频阶段

**动态 N 场景规则（launch.sh Step 7 自动推断）：**
- 2-3 句 → Cover + Ending（首尾）→ **2 帧**
- 4-6 句 → Cover + PainPoint + Solution + Ending → **4 帧**
- 7-9 句 → Cover + PainPoint + Solution + Features + Ending → **5 帧**
- **10+ 句 → Cover + PainPoint + Solution + Features + Start + Ending → 6 帧（最低要求）**

> ⚠️ **narration.txt 中文字数下限**：约 420 字（10 句 × 42 字/句），经 `⌊audio_dur × 3.37⌋` 门禁验证。若句数不足 10 句，视频将只有 4-5 帧，低于最低 6 帧要求。**必须确保 narration ≥10 句**。

**场景类型（scene.name）决定 DynamicScene.tsx 渲染组件：**
- `Cover` / `PainPoint` / `Solution` / `Features` / `Start` / `Ending` / `Generic`（兜底）

**场景数量计算与音频同步（百分比等分，绝对正确公式）：**

```javascript
// captions.json 句数 N → types[] 推断
const types = n<=3  ? ['Cover','Ending']
             : n<=6  ? ['Cover','PainPoint','Solution','Ending']
             : n<=9  ? ['Cover','PainPoint','Solution','Features','Ending']
             :         ['Cover','PainPoint','Solution','Features','Start','Ending'];

// 末 caption startMs = 视频总时长（毫秒），不是音频时长
const totalMs = captions[n - 1].startMs;

types.forEach((name, i) => {
  const pctStart = i / types.length;         // 0/6, 1/6, ... 5/6
  const pctEnd   = (i + 1) / types.length;    // 1/6, 2/6, ... 6/6
  scenes.push({
    id:       i + 1,
    name:     name,
    startMs:  Math.round(pctStart * totalMs),
    endMs:    Math.round(pctEnd   * totalMs),
    duration: (pctEnd - pctStart) * totalMs / 1000,  // 秒
  });
});
// Σ scenes[].duration = totalMs / 1000（精确，无越界）
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

### references/ 目录结构（2026-05-28 重组）

> ⚠️ **请勿使用 A-ARCHIVED/** 目录下的文件 — 已废弃。
> 快速查询入口：`references/README.md`

| 目录 | 内容 | 文件数 |
|------|------|--------|
| **B-REMOTION/** | Remotion 渲染核心 | 9 |
| **C-CONTENT/** | 内容获取与音频字幕 | 7 |
| **D-SUBAGENT/** | Subagent 超时与上下文 | 2 |
| **E-VISUAL/** | 视觉设计与封面图 | 8 |
| **F-GENDOCS/** | generate_docs.js 分析 | 2 |
| **G-WORKFLOW/** | 工作流与集成 | 13 |
| **H-CONFIG/** | 配置文件 | 3 |
| **A-ARCHIVED/** | 已废弃文档 | 3 |

> 2026-05-28 删除：`duration-zero-fix.md`、`remotion-tsx-bug.md`、`launch-sh.md`（内容已并入相关文件）
> 2026-05-28 合并：`pil-cover-usage.md` → `pil-cover.md`；`video-optimization-pitfalls.md` → `video-optimization.md`
> 2026-05-28 新增：各子目录 `README.md`（共 7 个）

### B-REMOTION — Remotion 渲染核心（必读）

| 文件 | 用途 |
|------|------|
| `remotion-troubleshoot.md` | Remotion 问题排查总入口 |
| `remotion-render-gotchas.md` | 三个致命陷阱：durationInFrames硬编码 / props传递 / atempo覆盖 |
| `remotion-props.md` | --props JSON 构造算法 + Bash 引号嵌套陷阱 |
| `dynamic-scene-template.md` | DynamicScene.tsx 完整模板（CSS 渐变封面版） |
| `dynamic-scene-vertical-center.md` | 垂直居中规范 + CSS 渐变封面 + 首帧亮度验证 |
| `dynamic-scenes-architecture.md` | SCENE_TYPES 枚举 / 百分比等分 / name 路由（详见 remotion-props.md） |
| `create-remotion-project-bugs.md` | create-remotion-project.js 三大 Bug 修复（含双花括号/literal `\n`/`key={'h'+i}` 单引号 JSX 属性） |
| `remotion-dynamic-scene-debugging.md` | hive 项目 9 次渲染调试实录 |
| `scenes-config-pattern.md` | 场景配置数据结构模式 |

> ⚠️ `duration-zero-fix.md` 和 `remotion-tsx-bug.md` 已删除，内容并入 `remotion-render-gotchas.md` 和 `create-remotion-project-bugs.md`

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
| `subagent-takeover.md` | Subagent 超时后主进程接管流程（2026-05-28） |
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
| `subagent-takeover.md` | Subagent 超时后主进程接管流程（2026-05-28） |
| `feishu-base-batch.md` | Feishu Base 批量处理（record_id 查询 / 更新） |
| `lark-cli-base-record-update.md` | lark-cli record-update 命令实测语法（2026-05-28） |
| `documentation-consistency.md` | 文档一致性维护指南 |
| `node-execsync-bug.md` | Node.js execSync 返回值 bug（macOS arm64） |
| `video-optimization.md` | 视频性能优化与质量门禁（含原 `video-optimization-pitfalls.md` 内容） |
| `captions-endms-sync.md` | captions 末段 endMs 精确同步（批量检测脚本） |
| `batch-duration-fix-20260527.md` | **【批量修复手册】** 141 项目四维同步（帧数/音频/字幕/config）实测修复全记录 |
| `audio-duration-mismatch.md` | **【核心修复手册】** atempo/audio/video 三元组不匹配根因 + atempo=1.0 恢复流程 |
| `frame-sync-regex-patterns.md` | **【正则提取】** DURATION_FRAMES 正则提取 4 种模式（JSX硬编码/乘法表达式/TOTAL_FRAMES/DURATION别名） |

### H-CONFIG — 配置文件（无 .md 文件，无需 README）

> ⚠️ **H-CONFIG/** 目录下仅有 JSON 配置文件，无 Markdown 文件，故无 README 索引。查询配置格式请直接读取 JSON 文件。
### A-ARCHIVED — 已废弃文档（请勿使用）

| 文件 | 说明 |
|------|------|
| `feishu-base-completion.bak.md` | 旧版手动流程，已被 launch.sh all 替代 |
| `one-pass.bak.md` | ⚠️ 已废弃 |
| `remotion-render-output.md` | ⚠️ 已废弃 |

> ⚠️ `launch-sh.md` 已删除，内容并入 `D-SUBAGENT/subagent-timeout.md`

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

### ⚠️ narration.txt 字数上限公式（2026-05-28 修正）
**旧公式**（已废弃）：`⌊TARGET_DURATION × 6.45⌋` — 对应 `rate=+20%`，导致字数严重不足
**正确公式**：`⌊TARGET_DURATION × 3.37⌋` — 实测 `zh-CN-YunjianNeural --rate +0%`
**检测**：
```bash
grep -rn "6\.45" scripts/pre-subtitle-check.js rules/ references/
# 应无输出（有输出说明未更新）
```
**受影响文件**：`pre-subtitle-check.js:122` · `generate_docs.js:13` · `launch.sh:125,460`（均已修复）

### launch.sh 使用（2026-05-23 重要修正）

```bash
bash {SKILL_DIR}/scripts/launch.sh init <项目名>   # 初始化（自动隔离 Git 内容）
bash {SKILL_DIR}/scripts/launch.sh all              # 完整流程（Step 0→10 + 封面）
```

> ⚠️ **launch.sh init 仅创建空目录骨架，不生成 Remotion 项目代码！** `init` 创建 `video-project/src/` 等空目录，但无 `Root.tsx`、`Video.tsx`、`package.json`。必须**单独执行** `node {SKILL_DIR}/scripts/create-remotion-project.js .` 生成 Remotion 源码，否则渲染时 `video-project/src/` 为空导致失败。检测方法：`ls video-project/src/` 为空则说明缺少 Remotion 代码。

> ⚠️ **launch.sh 必须先 chmod +x**：若遇到 `Permission denied`，立即执行 `chmod +x /Users/zhushuyan/.hermes/skills/video-creator/scripts/launch.sh`

> ⚠️ **create-remotion-project.js 生成后必须验证**：
> 1. `wc -l video-project/src/scenes/DynamicScene.tsx` — 应 > 0；为 0 则文件为空，需手动从 `references/B-REMOTION/dynamic-scene-template.md` 复制模板
> 2. `head -3 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e` — 应无输出；有输出说明含 literal `\n`，用 `node -e "...(Buffer替换)..."` 修复
> 3. 修复后执行 `npm install && npx remotion render ...` 进行渲染

> ⚠️ 必须在**项目目录内**执行，且 `PROJECT_DIR` 必须指向项目根目录（不是 workspace 根目录）

> ⚠️ **create-remotion-project.js 执行后必须立即验证（3 项）：**
> 1. `wc -l video-project/src/scenes/DynamicScene.tsx` — 应 > 0；为 0 则文件为空，需手动从 `references/B-REMOTION/dynamic-scene-template.md` 复制模板
> 2. `head -3 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e` — 应无输出；有输出说明含 **literal `\n`**（字节 `0x5c 0x6e`，共 383 处），用 `python3 -c "data.replace(b'\x5c\x6e',b'\x0a')"` 修复
> 3. `grep 'return <>{{' video-project/src/scenes/DynamicScene.tsx` — 应无输出；有输出说明含 **JSX 双花括号语法错误**（`return <>{{ hLines }}`），用 `patch` 修复为 `return <>{hLines}{vLines}</>`
> 4. 修复后执行 `npm install && npx remotion render ...` 进行渲染

**质量门禁**：`node {SKILL_DIR}/scripts/video-quality-gate.js <project-dir> all`

### 渲染命令

```bash
# Remotion Native（音频内嵌 + 字幕同期烧录，无需 ffmpeg）
npx remotion render VerticalVideo out/final.mp4

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
