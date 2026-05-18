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

## 📁 references/ 目录结构

深度知识已外置至此目录，避免 SKILL.md 臃肿：

| 文件 | 用途 |
|------|------|
| `feishu-base-batch.md` | Feishu Base 批量处理失败项目列表、根因分析、atempo规则、API参考 |
| `generate-docs-deep-analysis.md` | generate_docs.js 根因分析、质量总览表、auto_fix循环逻辑 |
| `references/video-workflow-failures.md` | 6 个实测验证的 subagent 失败模式（generate_docs.js绕过、narration噪声、captions末段endMs不同步、Git隔离嵌套、Base更新静默失败、execSync encoding bug） |
| `references/generate-docs-failures.md` | generate_docs.js 失败模式 + extractNarration() 根因补丁 |
| `remotion-troubleshoot.md` | Remotion错误根因：Composition ID陷阱、Text组件、字幕、CaptionOverlay |
| `subagent-timeout.md` | launch.sh路径陷阱、subagent超时策略 |
| `audio-tts.md` | edge-tts规范、atempo动态计算、音频参数 |
| `subtitle-production.md` | ASS字幕格式、Fontsize=72规范、六禁止铁律 |
| `documentation-consistency.md` | 文档一致性检查（死链已修复） |
| `git-workflow.md` | 目录分离、launch.sh init隔离逻辑、Git清理规范 |

## ⚠️ Feishu Base 批量处理警告

> **本节是所有 Feishu Base 批量视频生成任务的最高优先级入口规则。**

### 致命陷阱：不得使用"快速路径"

**RuView-video（2026-05-17）之后的所有 Feishu Base 项目均存在严重质量问题：没有文档、没有封面、音频命名混乱。**

**根因**：执行者直接使用手动 edge-tts + ffmpeg 命令绕过了 video-creator 的完整工作流程（Step 0-11）。

**正确做法**：Feishu Base 批量任务**必须完整执行** video-creator 的 Step 0-11 工作流程，launch.sh all 或等效分步执行。

> ⚠️ **深度知识库**：[references/feishu-base-batch.md](references/feishu-base-batch.md) 包含完整问题列表、11个受影响项目、根因分析、atempo 动态计算规则、音频命名规范、封面图规范。

### Git 内容隔离门禁

Git 克隆内容必须与 video-creator 生成物严格隔离，在进行任何 Step 之前必须先隔离：

```bash
# Step -0.5: Git 内容隔离确认
REPO_NAME=$(basename "$PROJECT_DIR")
if [ -f "$PROJECT_DIR/.git/config" ]; then
  echo "❌ 检测到 Git 内容未隔离：存在 .git/config"
  echo "执行 launch.sh init 或手动隔离后再继续"
  exit 1
fi
if [ -d "$PROJECT_DIR/${REPO_NAME}-repo" ]; then
  echo "✅ Git 内容已隔离至 ${REPO_NAME}-repo/"
elif [ -d "$PROJECT_DIR/$REPO_NAME" ] && [ -f "$PROJECT_DIR/$REPO_NAME/.git/config" ]; then
  echo "⚠️ 嵌套隔离未完成，手动执行隔离后再继续"
  exit 1
else
  echo "✅ 项目为纯净 video-creator 结构"
fi
```

### Feishu Base 批量处理门禁

执行任何一个 Feishu Base 视频项目前，**必须先验证以下文件全部存在**，缺失任意一个立即停止并生成后再继续：

```bash
REQUIRED_FILES=(
  "docs/article.md"  "docs/narration.txt"  "docs/video-script.md"
  "docs/copy.md"  "docs/wechat-copy.md"  "docs/posting-guide.md"
  "docs/report.json"  "docs/assets/cover.png"  "docs/assets/cover-wechat.png"
  "docs/assets/cover-xhs.png"  "video-config.json"
  "audio/neural_1_2x.m4a"  "video-project/public/audio/captions.json"
)
for f in "${REQUIRED_FILES[@]}"; do
  [ ! -f "$PROJECT_DIR/$f" ] && echo "❌ 缺失: $f" && exit 1
done
echo "✅ 门禁通过"
```

### Feishu Base 批量音频命名规范

| 阶段 | 正确文件名 | 错误文件名 |
| --- | --- | --- |
| edge-tts 原始 | `audio/neural_full.mp3` | `source.mp3` |
| atempo 处理后 | `audio/neural_1_2x.m4a` | `speech.mp3` |
| Remotion 引用 | `staticFile("audio/neural_1_2x.m4a")` | `staticFile("audio/speech.mp3")` |

### Feishu Base 批量 atempo 计算规则

> ⚠️ **atempo 不是固定值 1.2，必须根据 source 时长计算：**
> `atempo = source_duration / target_duration`
> 例：source=23.784s，目标=35s → atempo=0.68
> 深度说明见 [references/feishu-base-batch.md](references/feishu-base-batch.md#4-atempo-动态计算规则)

### 封面图规范（强制必填）

```
Step 6.1 generate_cover.py → cover.png (1080×1920)
Step 6.2 PIL → cover-wechat.png (900×383)
Step 6.3 PIL → cover-xhs.png (1440×2560)
```
禁止：只生成 cover.png / 用 Baoyu-imagine 改名 / 跳过 generate_cover.py

---

### ⚠️ 文档一致性陷阱

references/ 文档间存在交叉引用。创建新文档或重命名文件后，必须检查以下文件的内部链接：
- `documentation-consistency.md`：检查所有对其他 references/ 文件的引用是否仍然有效
- `subagent-timeout.md`：launch.sh 命令引用路径是否正确

已验证死链（2026-05-18）：
- `remotion-project-creation.md` → `remotion-troubleshoot.md` ✅ 已修复
- `tts-production.md` → `audio-tts.md` ✅ 已修复

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
- **"生成公众号封面图" / "wechat-cover" / "微信封面"** → 执行 Step 6.2（使用 `generate_cover.py` PIL 生成）
- **"企业级文案" / "优化 wechat-copy" / "优化 wechat-page"** → 执行 B/C 优化

### 已知问题：generate_docs.js 输出质量

> ⚠️ **深度知识库**：[references/generate-docs-deep-analysis.md](references/generate-docs-deep-analysis.md) 包含完整根因分析、质量总览表、auto_fix 循环逻辑详解。
>
> **摘要**：generate_docs.js 生成的 11 个文件中，7 个存在严重质量问题（narration.txt、video-script.md、copy.md、wechat-copy.md、posting-guide.md 等），**全部需要人工审核和重写**。仅 `article.md`、`report.json`、HTML 三件套可直接使用。

**Step 0 后强制检查**：
- 执行后检查 narration.txt 是否含 markdown 噪声（`---`、`|`、反引号），若有必须重写
- 触发重写条件：含 markdown 噪声 / 中文字数 < 20 / 总字符数 < 50
- **字数上限已取消**：以音频时长验证为准（见 Step 3）



---
**音频文件命名必须遵守**：

```
edge-tts 原始输出 → audio/neural_full.mp3（禁止叫 source.mp3）
atempo 处理后    → audio/neural_1_2x.m4a（禁止叫 speech.mp3）
Remotion 引用    → staticFile("audio/neural_1_2x.m4a")
```

**Root.tsx TOTAL\_FRAMES 必须从实际音频计算**：

```
TOTAL_FRAMES = ⌊实际音频时长(atempo后) × 60⌋
禁止：TOTAL_FRAMES = 35 * 60（硬编码）
```

**根因**：

- `narration.txt` 由 `stripMarkdown()` 提取，该函数对中文标题/表格/列表结构解析能力弱，提取内容碎片化
- `video-config.json` 必须在项目**根目录**（不是 `docs/`），否则 `generate_docs.js` 报错

> **⚠️ JSON 有效性**：所有 `.json` 配置文件必须符合 JSON 语法，禁止重复键名（如 `"fps": 60` 出现两次）。可用 `node -e "JSON.parse(fs.readFileSync('video-config.json'))"` 预检。

> **⚠️ captions.json 路径（已由脚本自动处理）**：`create-remotion-project.js` 已内置 captions.json 复制逻辑。若渲染时仍报 404，手动检查：
>
> ```bash
> ls "$PROJECT_DIR/audio/captions.json"          # 源文件存在？
> ls "$PROJECT_DIR/video-project/public/audio/captions.json"  # 已复制到 public？
> ```

**修复流程**：

```bash
# 1. 确认 video-config.json 在正确位置
[ -f "$PROJECT_DIR/video-config.json" ] || mv "$PROJECT_DIR/docs/video-config.json" "$PROJECT_DIR/"

# 2. 运行 generate_docs.js
node {SKILL_DIR}/scripts/generate_docs.js "$PROJECT_DIR"

# 3. 验证 narration.txt 质量
# 检查 markdown 噪声（narration 必须干净，无表格符/分隔符/反引号）
python3 -c "
text = open('$PROJECT_DIR/docs/narration.txt').read()
problems = []
if '|' in text: problems.append('含表格符|')
if '---' in text: problems.append('含分隔符---')
if '\`' in text: problems.append('含反引号')
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
if chinese_chars < 20: problems.append(f'中文字数不足({chinese_chars})')
if len(text.strip()) < 50: problems.append('总字符数不足')
if problems:
    print('❌ ' + '; '.join(problems))
    print('需手动重写 narration.txt')
    exit(1)
print(f'✅ narration.txt 质量检查通过（中文字数: {chinese_chars}）')
"

# 5. ⚠️ captions.json 生成（使用 Python 避免 Node.js 模板字符串问题）
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"
python3 << 'PYEOF'
import json
import subprocess
import re

PROJECT_DIR = '{WORKSPACE_DIR}/{project-name}'

with open(f'{PROJECT_DIR}/docs/narration.txt', 'r') as f:
    text = f.read()

# 按中文标点分割句子
sentences = re.split(r'(?<=[。！？])', text)
sentences = [s.strip() for s in sentences if s.strip()]
total = len(sentences)

# 获取音频时长
result = subprocess.run(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{PROJECT_DIR}/audio/neural_1_2x.m4a'],
    capture_output=True, text=True
)
duration = float(result.stdout.strip())
slot = duration / total

captions = []
for i, s in enumerate(sentences):
    start_ms = round(i * slot * 1000)
    end_ms = round((i + 1) * slot * 1000)
    captions.append({'text': s, 'startMs': start_ms, 'endMs': end_ms})

with open(f'{PROJECT_DIR}/audio/captions.json', 'w') as f:
    json.dump(captions, f, ensure_ascii=False, indent=2)

print(f'✅ captions.json 已生成: {total}条, 每句{slot:.3f}s')
PYEOF
```

> **⚠️ 禁止使用 Node.js heredoc 生成含反引号/特殊符号的文本**：当 narration.txt 含有反引号（`）时，`node -e <<'NODEEOF'\` heredoc 内的模板字符串会因反引号提前终止。**必须使用 Python 生成 captions.json**（如上模板）。

**预防**：生成后立即检查字数，不要等到音频/渲染阶段才发现。

### 铁律：封面图是强制必选项

> **封面图是视频的门面，是用户第一眼看到的内容。封面未生成，不得进入音频生成和视频渲染步骤。**
>
> **⚠️ 封面生成规则（2026-05-15 修订）**：
>
> 1. **必须使用** `$SKILL_DIR/scripts/generate_cover.py` 生成封面，这是经过调试的正确 PIL 实现
> 2. **禁止**自己编写 PIL/Pillow 代码生成封面（会导致字号/配色/主题不匹配）
> 3. baoyu-imagine AI绘图 → Remotion still帧 → PIL兜底 的优先级仅在 generate\_cover.py 失败时使用
>
> 生成优先级：
>
> 1. **`$SKILL_DIR/scripts/generate_cover.py`** → PIL脚本（主题/字号/配色已调试正确，**首选**）
> 2. **baoyu-imagine**（AI绘图）→ 生成 9:16 竖屏封面
> 3. **Remotion 单帧渲染** → 用视频第45帧或固定帧输出 PNG
> 4. **PIL/Pillow 代码生成** → 纯字体排版封面（所有 API 不可用时的最终兜底）
>
> 封面尺寸（必填）：
>
> - 视频号 / 抖音：**1080×1920**（9:16）
> - **微信公众号文章封面：900×383**（约 2.35:1）
> - 小红书：**1440×2560**（9:16）
>
> ⚠️ **注意**：微信公众号封面图是文章详情页顶部的大图，尺寸与其他平台不同，必须单独生成 900×383 尺寸的 `cover-wechat.png`
>
> **禁止跳过封面生成步骤。** 如果 baoyu-imagine 报错，必须按以下顺序重试：
>
> 1. 检查 `~/.baoyu-skills/baoyu-imagine/EXTEND.md` 确认 provider 配置
> 2. 尝试其他 provider（openrouter / replicate / dashscope / minimax）
> 3. 所有 API 不可用时 → 使用 PIL 代码生成（见 rules/TROUBLESHOOTING.md 方案二）

### 封面属性标签（Attrs）

> ⚠️ **attrs 渲染规范**：白底 + 黑字 + 左侧 10px 彩色条纹方案，替代旧版白色文字 + 彩色半透明背景。详见 [references/video-visual.md](references/video-visual.md)

PIL 封面支持在**副标题下方**渲染 4-8 个属性标签（偶数个，双行棋盘格排版）。属性从 `video-config.json` 的 `cover.attrs` 字段读取：

```json
{
  "cover": {
    "title": "主标题",
    "subtitle": "副标题",
    "attrs": ["开源免费", "纯本地运行", "支持Gemma4", "保护隐私"]
  }
}
```

**规则**：

- 必须为偶数个（4/6/8/10），奇数自动丢弃最后一个
- 超出 10 个自动截断
- 双行棋盘格排版：每行 2 个标签，白底 + 黑字 + 左侧 10px 彩色条纹
- **⚠️ 微信公众号封面（wechat 画布 900×383）副标题必须简短**：画布极扁，即使缩到最小字号(36px)仍可能超出画布90%。本次实测副标题「AI 金融技能集合 · 一键赋予 Agent 华尔街分析能力」超出限制（823px > 810px）。**wechat 副标题建议控制在15字以内**，如「AI 金融技能集合」。
- **所有标签宽度统一**：以最长文字为基准计算 `tag_w`，禁止每列独立计算宽度（会导致两行总宽度不一致）
- 颜色循环使用：青色/洋红/紫色/绿松石/橙色/金色/玫红/天蓝
- 三平台（vertical/wechat/xhs）共享同一组 attrs，按各平台字号独立渲染

### 输入模式

- [rules/INPUT.md](rules/INPUT.md) - 内容输入模式

## 构建流程

> ⚠️ **关键约束**（必须遵守）：
>
> - 禁止跳过 Step 0（文档生成）
> - 禁止不生成封面图
> - narration.txt 中文字数必须 ≥20（字数上限已取消，以音频时长验证为准）
> - 渲染完成后必须清理项目源码目录（如 oransim-repo）
> - `launch.sh all` 必须在**项目目录内**执行，且 `PROJECT_DIR` 必须指向项目根目录（不是 workspace 根目录）

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

### 参考文档索引

> ⚠️ **完整列表**：详见上方表格（含 references/ 目录结构）

| 类别 | 核心文档 |
|------|----------|
| **核心流程** | [content-document-generation.md](references/content-document-generation.md) · [subagent-timeout.md](references/subagent-timeout.md) |
| **渲染字幕** | [remotion-troubleshoot.md](references/remotion-troubleshoot.md) · [subtitle-production.md](references/subtitle-production.md) |
| **音频TTS** | [audio-tts.md](references/audio-tts.md) |
| **视觉封面** | [video-visual.md](references/video-visual.md) · [video-optimization.md](references/video-optimization.md) · [cover-font.md](references/cover-font.md) · [pil-cover.md](references/pil-cover.md) |
| **文档Git** | [documentation-consistency.md](references/documentation-consistency.md) · [feishu-base-batch.md](references/feishu-base-batch.md) · [git-workflow.md](references/git-workflow.md) |
| **专项问题** | [cloudflare-medium.md](references/cloudflare-medium.md) · [node-execsync-bug.md](references/node-execsync-bug.md) · [readme-location.md](references/readme-location.md) |
| **技能规则** | [rules/UNIFIED\_RULES.md](rules/UNIFIED_RULES.md)（最高优先级） · [VOICE.md](rules/VOICE.md) · [SUBTITLES.md](rules/SUBTITLES.md) · [WORKFLOW.md](rules/WORKFLOW.md) · [THEMES.md](rules/THEMES.md) · [PLATFORM.md](rules/PLATFORM.md) · [TROUBLESHOOTING.md](rules/TROUBLESHOOTING.md) · [QUALITY.md](rules/QUALITY.md) · [INPUT.md](rules/INPUT.md) · [INTEGRATION.md](rules/INTEGRATION.md) · [SCRIPTS.md](rules/SCRIPTS.md) · [SESSION\_LOG.md](rules/SESSION_LOG.md) |

> ⚠️ **archived/** 目录（5个废弃文件）：feishu-base-batch.md · one-pass.md · launch-sh.md（×2） · feishu-base-completion.md

***

## ⚠️ 音频与字幕铁律

> **执行音频步骤前必须阅读** `rules/VOICE.md`
> **执行字幕步骤前必须阅读** `rules/SUBTITLES.md`
> **详细参数规范（含字数上限表/atempo计算/验证命令）**：详见 `references/audio-tts.md`

**核心约束**：禁止分段拼接；禁止跳过音频后处理（去静音 + 1.2x + AAC 256k）；禁止 edge-tts rate=+20% + atempo=1.2x 叠加。**字数上限已取消，Step 3 仅做质量检查（markdown 噪声/中文字数≥20），以音频时长验证（Step 4）为准。**

> **用户明确要求**：每次生成视频必须一次到位，不接受"渲染→发现问题→修复→重新渲染"的返工循环。
>
> **工作流起点**：渲染前先执行 `video-optimization.md` 中的 4 项预检。问题在起点修复，不是终点补救。

**预检顺序（不可跳过）**：
1. 配音文本质量检查（markdown噪声/中文字数≥20）
2. 英文句点分割陷阱检查（`Claude4.5` 等含 ASCII 句点的词不得被 split 切断）
3. 音频叠速检查（`edge-tts +20%` + `atempo 1.2x` 禁止叠加）
4. CaptionOverlay 方案确认（`interpolate` 替代 `createTikTokStyleCaptions`）
5. **video-config.json theme 与项目风格匹配**（如 GitHub AI/工具类项目默认用 `cyberpunk` 主题，**禁止**使用 `tech-professional`）

### 音频三禁止
| 禁止 | 正确做法 |
|------|---------|
| 禁止分段拼接配音 | 整段连续生成 |
| 禁止跳过音频后处理 | 去静音 + 1.2x 语速 + AAC 256k |
| 禁止使用旧版 ffmpeg 混流 | ✅ **Remotion Native（2026-05-13）**：Remotion `<Audio>` 组件直接内嵌 MP4，无需 ffmpeg 混流。字幕通过 `CaptionOverlay` + `@remotion/captions` 同期烧录进每一帧，无需 ffmpeg ASS 滤镜。 |

**语速基准修正（2026-05-17）**：
⚠️ **feedgrab 12.05 chars/s 实为字节数，非字符数**：277 bytes = narration.txt 文件大小（含换行），不是 277 个中文字符。真实 feedgrab 中文字符语速约 **3.40 Chinese chars/s**（110 个中文 / 32.36s），与 edge-tts 自然语速 3.37~3.73 完全一致。

视频旁白语速基准：**3.37~3.73 Chinese chars/s**（edge-tts 自然语速），无需刻意匹配某个"参考视频"字节数指标。

验证命令（勿用字节数混淆）：
```bash
python3 -c "
text = open('docs/narration.txt').read()
chinese = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
import subprocess
r = subprocess.run(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0','audio/neural_1_2x.m4a'], capture_output=True, text=True)
dur = float(r.stdout.strip())
rate = chinese / dur
print(f'中文字符: {chinese}, 时长: {dur:.3f}s, 语速: {rate:.2f} chars/s')
"
```

| 项目 | 语速 | 说明 |
|------|------|------|
| feedgrab (误标) | 12.05 bytes/s | 277 bytes / 22.99s，非字符数 |
| feedgrab (修正) | 3.40 Chinese chars/s | 正常 edge-tts 语速 |

| obsidian-skills | 3.40 Chinese chars/s | 正常值，无需调整 |

**⚠️ 不要按 bytes/s 计算语速**，否则会把正常语速的视频（如 needle）用 atempo=0.5 强行拉慢 50%，浪费渲染帧数。

**⚠️ 必须同步修改的文件（atempo 路径，三者缺一不可）**：

## 路径规范

### 占位符层级

| 占位符 | 含义 | 展开值 |
|--------|------|--------|
| `{SKILL_DIR}` | skill 根目录 | `~/.hermes/skills/video-creator` |
| `{WORKSPACE_DIR}` | 用户 workspace | `~/video-projects` |
| `$SKILL_DIR` | bash 变量形式 | 同上 |

### 常见错误

| 错误写法 | 正确写法 | 说明 |
|----------|----------|------|
| `$SKILL_DIR/video-creator/scripts/` | `$SKILL_DIR/scripts/` | skill 目录本身就是 video-creator，无需嵌套 |
| `~/.openclaw/skills/video-creator` | `{SKILL_DIR}` | 使用标准占位符 |
| `SKILL_DIR="{SKILL_DIR}"` | `SKILL_DIR="{SKILL_DIR}"` | bash 代码块中花括号是占位符，不是变量 |

### 引用规则

- **skill 内脚本调用**：`{SKILL_DIR}/scripts/launch.sh`
- **skill 间引用**：`../remotion-best-practices`（跨 skill 相对路径）
- **rules/ 内互引**：同目录 `[VOICE.md](VOICE.md)`，无需加 rules/ 前缀
- **references/ 内互引**：同目录 `[video-visual.md](video-visual.md)`

---

## 审计命令库

| 检查项 | 命令 |
|--------|------|
| `audio/neural.mp3` | `ffmpeg -i neural_full.mp3 -filter:a "atempo=0.5" neural.mp3` |
| `Root.tsx` | `TOTAL_FRAMES` 硬编码值：`⌊audio_duration × fps⌋`（例：57.33s × 60 = 3440） |
| `captions.json` | 时间戳按 atempo 比例缩放：所有 `startMs/endMs × atempo`（例：0.5 时 ×2.0） |

**Root.tsx TOTAL_FRAMES 计算公式**：
````

TOTAL\_FRAMES = audio\_duration\_after\_atempo × fps
例：57.33s × 60 = 3440

```

**captions.json 缩放公式**：
```

scale\_factor = atempo\_value
所有 startMs/endMs × scale\_factor
例：atempo=0.5 → scale\_factor=2.0（音频延长2倍，时间戳也延长2倍）

````

**⚠️ 致命陷阱**：Remotion 的 `durationInFrames` 来自 **Root.tsx 的 TOTAL_FRAMES**。atempo 调整音频后，帧数必须重新计算（`audio_duration × fps`），Video.tsx 的 `<Audio>` 组件**不使用** `playbackRate` prop（ playbackRate 由 atempo 在音频层面处理）。

**验证命令**：
```bash
# 检查 TOTAL_FRAMES
grep "TOTAL_FRAMES" video-project/src/Root.tsx

# 检查音频时长（atempo 后）
ffprobe -v quiet -show_entries format=duration -of csv=p=0 video-project/public/audio/neural.mp3

# 验证视频实际时长 = audio_duration
ffprobe -i video-project/out/needle_v1_3_final.mp4 -show_entries format=duration -v quiet -of csv="p=0"

# 验证语速（699 chars / 57.33s ≈ 12.19 chars/s ≈ feedgrab 基准 12.05）
python3 -c "
chars = sum(1 for c in open('docs/narration.txt').read() if '\u4e00' <= c <= '\u9fff')
dur = float(open('video-project/public/audio/neural.mp3').close() or 0)
# 用 ffprobe 代替
import subprocess
r = subprocess.run(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0','video-project/public/audio/neural.mp3'], capture_output=True, text=True)
dur = float(r.stdout.strip())
rate = chars / dur
print(f'语速: {rate:.2f} chars/s（目标: 12.05 chars/s）')
"

**渲染后必须验证**：时长 = audio_duration / playbackRate × fps，否则说明 TOTAL_FRAMES 未同步。
**渲染后必须验证**：时长 = audio_duration / playbackRate × fps，否则说明 TOTAL_FRAMES 未同步。

**音频验证详情**：详见 `references/audio-tts.md`（含 Remotion 静音 AAC 轨道根因 + pre-subtitle-check.js / pre-render-check.js 前置检查）

**字幕六禁止**：详见 `rules/SUBTITLES.md`（Fontsize=72/Outline=2/MarginV=50/\\N换行/10字段）

**CaptionOverlay 铁律**：详见 `references/subtitle-production.md`。核心：`Video.tsx` 必须含 `<CaptionOverlay captionsFile="audio/captions.json" />`；末段 `endMs = 视频时长(秒)×1000`。

---

## 封面属性标签

> **详细规范**：详见 `references/pil-cover.md`（含 WeChat 副标题宽度陷阱、launch.sh init 路径陷阱）

**核心约束**：`video-config.json` 必须含 `cover.attrs` 数组，`generate_cover.py` 以逗号分隔字符串作为第5参数。WeChat 画布副标题控制在 15 字以内（实测 810px 限制）。

### ⚠️ Remotion render 命令 Composition ID 陷阱（2026-05-17）

> **症状**：`Could not find composition with ID RemotionRoot. Available compositions: VerticalVideo`

**根因**：`create-remotion-project.js` 注册的 composition ID 是 `VerticalVideo`，但旧版 launch.sh 错误使用 `RemotionRoot`（这是 React 组件导出名，不是 Remotion composition ID）

**已修复**：launch.sh 渲染命令已统一使用 `VerticalVideo`，详见 `references/remotion-troubleshoot.md`（Composition ID 不匹配问题）。

### 字幕生成

> ⚠️ 字幕在 Remotion 内通过 `CaptionOverlay` + `@remotion/captions` 同期烧录，无需 ASS 格式文件。`captions.json` 使用 `startMs/endMs` 毫秒格式（每条字幕含 `text`、`startMs`、`endMs` 字段）。

### 执行顺序（不可颠倒，Remotion Native 路径）

```
1. edge-tts 整段生成原始音频 → neural_full.mp3
         ↓
2. ffmpeg 后处理（去静音 + 1.2x + AAC）→ neural_1_2x.m4a
         ↓（确认最终时长）
3. 生成字幕 JSON（captions.json，startMs/endMs 毫秒格式）
         ↓
4. Remotion 渲染（音频内嵌 + 字幕同期烧录）→ 最终 MP4
         ↓（封面）
5. PIL generate_cover.py → cover.png → cover-wechat.png / cover-xhs.png
```

### ⚠️ Step 0 强制检查清单（禁止跳过）

> **铁律：Step 0 完成后必须验证所有文件存在，包括** **`session-log.md`**

```bash
# Step 0 完成后必须执行此验证
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"
for f in README.md article.md video-script.md copy.md wechat-copy.md posting-guide.md landing-page.html article-page.html wechat-page.html session-log.md report.json; do
  if [ ! -f "$PROJECT_DIR/docs/$f" ]; then
    echo "❌ 缺失: $f"
    exit 1
  fi
done
echo "✅ Step 0 完成，所有11个文档已创建"
```

***

### ⚠️ Session Status 强制追踪

> ⚠️ **完整规程**：详见 [rules/SESSION_LOG.md](rules/SESSION_LOG.md)（7个关键节点、emoji 格式解析、Snapshot 快照法）。
>
> **摘要**：`session_status` 是 OpenClaw 工具调用（不是 shell 命令），输出在 AI 对话 tool result 中（emoji 格式）。必须在 Step 0/1/4/6/7/10/11 完成时调用并追加到 session-log.md。

**追加命令**（Step X 完成后在 AI 对话中调用 session_status，然后执行）：
```bash
TS=$(date '+%Y-%m-%d %H:%M %Z')
cat >> "${PROJECT_DIR}/docs/session-log.md" << 'EOF'
## Step X 完成时的 Session 快照
- 时间: TS_PLACEHOLDER
- 累计 Tokens: {emoji输出}
EOF
```

### 清理 `-repo` 目录

**时机**：Remotion 渲染成功并验证后，**必须立即删除**。

```bash
rm -rf "${PROJECT_DIR}/*-repo"
```
Git 克隆的仓库（`*-repo/`）仅用于读取 README，音频/字幕/渲染不依赖其内容。删除可节省存储空间。

**⚠️ generate_docs.js 执行后必须检查 narration.txt**：详见"已知问题：generate_docs.js 输出质量"章节。

## 📋 输出文件清单（强制全部生成）

> ⚠️ **铁律：以下 11 个文档文件必须在 Step 0 全部创建，禁止跳过任何一个。**
> 这是预防遗漏的第一道防线。视频渲染前必须确认所有文件存在。

---

### 输出文件清单

> **完整列表**：11个文档 + 6个资源文件，详见 Step 0 规范 `[rules/WORKFLOW.md](rules/WORKFLOW.md)`

**核心输出**：`docs/assets/cover.png`(视频号封面) · `docs/assets/cover-wechat.png`(公众号封面) · `docs/assets/cover-xhs.png`(小红书封面) · `docs/narration.txt` · `audio/neural_1_2x.m4a` · `audio/captions.json` · `video-project/out/final.mp4`

> **多文件同步检查**：修改渲染管道参数后必须 grep 验证，详见 `references/remotion-troubleshoot.md`（多文件同步铁律）

### Feishu Base 记录更新正确语法

> ⚠️ **Feishu Base 更新语法与文档旧版冲突，以此为准。**

**错误语法**（试错得出）：
```bash
lark-cli base +record-upsert --fields '{"video-creator": "是"}'  # ❌ 报错
```

**正确语法**：
```bash
lark-cli base +record-upsert \
  --base-token {base-token} \
  --table-id {table-id} \
  --record-id {record-id} \
  --json '{"video-creator": "是"}'
```

**参数说明**：
- `--json`：传递 JSON 字符串，字段名为 Map Key，值为 CellValue
- 字段名为单选/文本类型时，直接传字符串值 `"是"`
- 不支持 `--fields` 参数（会报错）

**验证步骤**（强制，执行后立即验证）：
```bash
# 读取当前记录值，确认更新成功
lark-cli base +record-list \
  --base-token {base-token} \
  --table-id {table-id} \
  --record-id {record-id} \
  --format json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
rows = data['data']['data']
for row in rows:
    vc = row[2]  # video-creator 字段索引
    vc_val = vc[0] if vc else '(空)'
    print(f'video-creator: {vc_val}')
    if '是' in str(vc_val):
        print('✅ Base 更新验证通过')
    else:
        print('❌ Base 更新失败，需重试')
        exit(1)
"
```

---

## 如何使用

> ⚠️ **详细文档索引**：见上方"参考文档索引"。以下为核心使用指南。

### launch.sh 一键生成

```bash
bash {SKILL_DIR}/scripts/launch.sh init <项目名>   # 初始化
bash {SKILL_DIR}/scripts/launch.sh all              # 完整流程（Step 0→10 + 封面）
```

**质量门禁**：`node {SKILL_DIR}/scripts/video-quality-gate.js <project-dir> all`

### 渲染与封面

> **Remotion Native 唯一方案**：`npx remotion render VerticalVideo`
> **封面**：`python3 generate_cover.py` 三平台（vertical/wechat/xhs）
> **清理**：渲染后立即 `rm -rf "${PROJECT_DIR}/*-repo"`

**Remotion 4.x 技术细节**：详见 `references/remotion-troubleshoot.md`（Text组件移除/themes连字符key/CaptionOverlay useDelayRender/spring动画/final.mp4同步）