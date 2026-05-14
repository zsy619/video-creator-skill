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

> **症状**：`generate_docs.js` 执行成功但 `narration.txt` 字数远低于安全上限（如 33字 vs 175字上限），或 `video-config.json` 报错"缺少配置文件"。
>
> **⚠️ 100% 失败率警告（2026-05-14 实测）**：本次会话 8 个项目（oh-my-codex、deer-flow、claude-hud、OpenViking、openscreen、open-swe、impeccable、deepagents）**全部**需要手动重写 narration.txt，无一例外。`generate_docs.js` 的 `extractNarration()` 对中文内容提取能力极弱，几乎每次都生成字数不足的版本。

**根因**：
- `narration.txt` 由 `stripMarkdown()` 提取，该函数对中文标题/表格/列表结构解析能力弱，提取内容碎片化
- `video-config.json` 必须在项目**根目录**（不是 `docs/`），否则 `generate_docs.js` 报错

> **⚠️ JSON 有效性**：所有 `.json` 配置文件必须符合 JSON 语法，禁止重复键名（如 `"fps": 60` 出现两次）。可用 `node -e "JSON.parse(fs.readFileSync('video-config.json'))"` 预检。

> **⚠️ captions.json 路径（已由脚本自动处理）**：`create-remotion-project.js` 已内置 captions.json 复制逻辑。若渲染时仍报 404，手动检查：
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

# 3. 检查 narration.txt 字数
python3 -c "
text = open('$PROJECT_DIR/docs/narration.txt').read()
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
max_chars = int(52 * 3.37)
print(f'字数: {chinese_chars} / 上限: {max_chars}')
assert chinese_chars >= 100, f'字数过少({chinese_chars})，需要手动重写'
"

# 4. 若字数不足，手动重写 narration.txt

# 5. ⚠️ captions.json 生成（使用 Python 避免 Node.js 模板字符串问题）
PROJECT_DIR='/Volumes/OpenClawDrive/.hermes/workspace/{project-name}'
python3 << 'PYEOF'
import json
import subprocess
import re

PROJECT_DIR = '/Volumes/OpenClawDrive/.hermes/workspace/{project-name}'

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

> **⚠️ 禁止使用 Node.js heredoc 生成含反引号/特殊符号的文本**：当 narration.txt 含有反引号（`）时，`node -e <<'NODEEOF'` heredoc 内的模板字符串会因反引号提前终止。**必须使用 Python 生成 captions.json**（如上模板）。

**预防**：生成后立即检查字数，不要等到音频/渲染阶段才发现。

### 铁律：封面图是强制必选项

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
>
### 封面属性标签（Attrs）

> ⚠️ **attrs 渲染规范已更新（2026-05-14）**：白底 + 黑字 + 左侧 10px 彩色条纹方案，替代旧版白色文字 + 彩色半透明背景。详见 [references/cover-attrs-rendering-fix-2026-05-14.md](references/cover-attrs-rendering-fix-2026-05-14.md)

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
- **所有标签宽度统一**：以最长文字为基准计算 `tag_w`，禁止每列独立计算宽度（会导致两行总宽度不一致）
- 颜色循环使用：青色/洋红/紫色/绿松石/橙色/金色/玫红/天蓝
- 三平台（vertical/wechat/xhs）共享同一组 attrs，按各平台字号独立渲染

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
- [references/subtitle-tiktok-highlight.md](references/subtitle-tiktok-highlight.md) — **⚠️ TikTok 逐字高亮特效完整方案**：`createTikTokStyleCaptions` 需要 word-level timing，ASS 只有 sentence-level，**必须用 interpolate 自定义 CaptionOverlay**；含完整 TSX 实现 + 入场/退场动画 + 荧光绿高亮
- [references/video-one-shot-checks.md](references/video-one-shot-checks.md) — **⚠️ 一次生成到位铁律**：渲染前必做的 4 项预检（字数上限 / 英文句点 split 陷阱 / 叠速检测 / CaptionOverlay 方案确认）；"一次到位"用户偏好，工作流起点执行而非返工补救
- [references/REMOTION_NATIVE.md](references/REMOTION_NATIVE.md) — **Remotion Native 渲染规范**：音频内嵌 + 字幕烧录 + 60fps/1080×1920/MP4 直出；三同步机制；create-remotion-project.js 用法
- [references/remotion-native-caption-burnin.md](references/remotion-native-caption-burnin.md) — **CaptionOverlay 字幕烧录机制**：React 组件在每帧绘制字幕进 MP4（非 HTML overlay）；字幕时间轴采用比例分配算法（ffprobe 实测时长，每句等比划分），与音频完全同步；TikTokCaptionLine 逐字高亮实现原理
- [音频验证协议](references/audio-validation-protocol.md) — 音频有效性验证完整协议（4个验证节点）
- [references/video-creator-remotion-conflicts-2026-05-11.md](references/video-creator-remotion-conflicts-2026-05-11.md) — **C1-C9 冲突审计报告**：video-composer.js Audio组件移除、calculateMetadata添加、entry路径修正、concurrency=4；含 remotion-best-practices 30+ 规则文件审查结果
- [references/ass-subtitle-spec-2026-05-10.md](references/ass-subtitle-spec-2026-05-10.md) — **最终权威值**：Fontsize=72/PlayResX=1080/PlayResY=1920/MarginV=50/Outline=2/Format 10字段
- [references/ass-subtitle-gen.md](references/ass-subtitle-gen.md) — **ASS字幕生成核心陷阱**：`re.split(r'[，。；、]+')` 不包含ASCII句点（否则`Claude4.5`被切断）；ASS时间解析`H:MM:SS.cc`需split成3段而非2段
- [references/cover-smart-resize.md](references/cover-smart-resize.md) — 封面图尺寸验证
- [references/repo-directory-cleanup.md](references/repo-directory-cleanup.md) — **GitHub 项目 -repo 目录清理规范**：克隆仓库提取内容后，渲染完成时删除目录
- [references/remotion-project-copy-workflow.md](references/remotion-project-copy-workflow.md) — **Remotion 项目复制后重建流程**：cp -r 模板 + npm rebuild + 音频混流，已验证 3 个项目成功
- [references/remotion-sequence-black-screen-fix.md](references/remotion-sequence-black-screen-fix.md) — Sequence内帧计算错误（局部帧vs全局帧）
- [references/remotion-subtitles-double-fix.md](references/remotion-subtitles-double-fix.md) — `<Subtitles />` 组件 + ASS 烧录导致双层字幕
- [references/remotion-caption-overlay-pitfalls.md](references/remotion-caption-overlay-pitfalls.md) — ⚠️ **`createTikTokStyleCaptions` 对句子级字幕静默失效**；`useDelayRender` 在 Remotion 4.x 导致 `delayRender is not a function`；含两种解法（直接渲染 + TikTok 逐字高亮 `interpolate` 方案）
- [references/remotion-backup-rebuild.md](references/remotion-backup-rebuild.md) — **从备份恢复 Remotion 项目**：node_modules 版本冲突修复（`Cannot find module './dist/index'`）、Audio 组件路径要求（`public/audio/` 而非 `src/audio/`）、完整重建流程
- [references/remotion-nonfatal-errors-2026-05-15.md](references/remotion-nonfatal-errors-2026-05-15.md) — **Remotion 非致命错误**：`npx remotion still` 的 ProtocolError 不阻塞输出；background render 进程存活但无输出时的判断方法
- [references/remotion-package-discovery.md](references/remotion-package-discovery.md) — `@remotion/core` 不存在；正确包名 `remotion`；47个 exports（Text 不存在）；React Error #130 根因；package.json 正确写法；渲染命令
- [references/edge-tts-cli-usage.md](references/edge-tts-cli-usage.md) — **edge-tts正确CLI用法**：`--write-media`（不是`--output`）；`--rate`用百分比格式；SubtitleGenerator是默认导出（`require()`直接，不可用named import）
- [references/ffmpeg-audio-processing-pitfalls-2026-05-15.md](references/ffmpeg-audio-processing-pitfalls-2026-05-15.md) — **FFmpeg 音频处理陷阱**：`silenceremove` 参数名因版本而异（`delete_threshold` vs `start_threshold`）；`atempo` 范围 0.5~2.0；Remotion 渲染视频时长与音频不匹配时用 `-shortest` 裁断
- [references/git-clone-timeout-fix.md](references/git-clone-timeout-fix.md) — **Git Clone Timeout**：大仓库 clone 超时，使用 `--depth 1` 浅克隆解决
- [references/create-remotion-project-dir-bug-2026-05-15.md](references/create-remotion-project-dir-bug-2026-05-15.md) — **create-remotion-project.js --dir Bug**：`--dir` 解析为相对路径导致项目创建在错误位置；Workaround: 从项目根目录执行或用 `cp -r` 复制已知正常结构
- [references/README-location-variants.md](references/README-location-variants.md) — **⚠️ README位置变体**：nvim-treesitter docs/README.md、ForgedCode AGENTS.md 等模式；诊断树；根目录 README <200字节即重定向信号
- [references/dynamic-scene-boundaries.md](references/dynamic-scene-boundaries.md) — 动态场景帧边界计算：取代硬编码 `SCENE_BOUNDARIES`，基于 `sceneFractions` 比例自动分配，支持任意场景数量

---

## ⚠️ 音频与字幕铁律（强制执行，违反将导致质量问题）

> **执行音频步骤前必须阅读** `rules/VOICE.md`
> **执行字幕步骤前必须阅读** `rules/SUBTITLES.md`

### 强约束：文本长度 → 目标时长

> **核心问题**：配音文本太长导致音频时长超过目标，反复用 atempo 压缩会损失质量，且压缩后时长仍与视频帧数不匹配。
>
> **修复**：在生成配音前强制校验文本长度，超长则必须精简。

| 目标时长 | 文本字数上限 | 实测字数/秒 | 说明 |
|---------|-------------|------------|------|
| 45秒 | **≤151字** | 3.73字/秒 | edge-tts rate=+0% + atempo 1.2x 实测 |
| 52秒 | **≤175字** | 3.73字/秒 | 标准视频长度，安全上限（留10%余量） |
| 60秒 | **≤202字** | 3.73字/秒 | 长视频，安全上限 |
| 90秒 | **≤303字** | 3.73字/秒 | 超长视频 |

**正确计算公式**：`字数上限 = ⌊目标时长 × 3.37⌋`（取整，3.37 = 3.73×0.9）

> ⚠️ **实测依据（2026-05-13）**：实际视频旁白（含英文/符号/长复合句）中 `zh-CN-YunjianNeural --rate +0%` + `atempo 1.2x` 实测 **3.73 中文字符/秒**。安全上限取 3.37（留 10% 余量）。6.45 基准来自高密度短句测试，与实际视频旁白差异显著，**实际项目必须用 3.37 安全上限**。

**计算公式（已废弃旧版）**：`⌊目标时长 ÷ 1.2 × 4⌋` ❌ 严重偏低（52秒仅173字）。`⌊目标时长 × 6.45⌋` ❌ 偏乐观（短句基准）。**正确**：`⌊目标时长 × 3.37⌋`（3.37 = 3.73实测 × 0.9安全系数）。

**正确计算公式**：`字数上限 = ⌊目标时长 × 3.37⌋`（取整，基于实测）

> ⚠️ **实测依据（2026-05-13）**：`zh-CN-YunjianNeural --rate +0%` + `atempo 1.2x` 在实际视频旁白（300+字长复合句，含英文/符号）中实测 **3.73 中文字符/秒**（294字→78.9s；184字→52.8s）。安全上限取 3.37（留 10% 余量）。

**⚠️ 重要更新（2026-05-13 实测修正）**：`rate +0%` 在实际项目旁白（长复合句，含大量英文/符号）中实测 **3.73~3.80 中文字符/秒**。6.45 基准来自高密度短句测试，与实际视频旁白差异显著。

**推荐工作流**：以 **52秒 / 185~195中文** 为安全区间，留 10% 余量。生成后用 ffprobe 验证实际时长，超长则精简文本，不使用 atempo 压缩补救。

**检查命令（生成前必执行）**：
```bash
python3 -c "
text = open('docs/narration.txt').read()
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
target_dur = 52
# 实测安全上限：3.73 字/秒，留 10% 余量 → 3.37
max_chars = int(target_dur * 3.37)
print(f'中文字数: {chinese_chars} / 安全上限: {max_chars}')
assert chinese_chars <= max_chars, f'字数超限: {chinese_chars} > {max_chars}'
"

**检查命令**：
```bash
# 生成音频前执行文本长度检查
node {SKILL_DIR}/scripts/pre-subtitle-check.js <project-dir> --target-duration 60
```

**精确字数检查（推荐）**：
```bash
python3 -c "
text = open('docs/narration.txt').read()
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
target_dur = 52
max_chars = int(target_dur * 3.37)
print(f'中文字数: {chinese_chars} / 上限: {max_chars}')
assert chinese_chars <= max_chars, f'字数超限: {chinese_chars} > {max_chars}'
"

### ⚠️ 一次生成到位：返工预防优先

> **用户明确要求**：每次生成视频必须一次到位，不接受"渲染→发现问题→修复→重新渲染"的返工循环。
>
> **工作流起点**：渲染前先执行 `video-one-shot-checks.md` 中的 4 项预检。问题在起点修复，不是终点补救。

**预检顺序（不可跳过）**：
1. 配音文本字数上限验证（目标秒数 × 3.37）
2. 英文句点分割陷阱检查（`Claude4.5` 等含 ASCII 句点的词不得被 split 切断）
3. 音频叠速检查（`edge-tts +20%` + `atempo 1.2x` 禁止叠加）
4. CaptionOverlay 方案确认（`interpolate` 替代 `createTikTokStyleCaptions`）

### 音频三禁止
| 禁止 | 正确做法 |
|------|---------|
| 禁止分段拼接配音 | 整段连续生成 |
| 禁止跳过音频后处理 | 去静音 + 1.2x 语速 + AAC 256k |
| 禁止使用旧版 ffmpeg 混流 | ✅ **Remotion Native（2026-05-13）**：Remotion `<Audio>` 组件直接内嵌 MP4，无需 ffmpeg 混流。字幕通过 `CaptionOverlay` + `@remotion/captions` 同期烧录进每一帧，无需 ffmpeg ASS 滤镜。 |

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

### 清理 `-repo` 目录
**时机**：Remotion 渲染成功并验证后，每个项目**必须立即删除**。
```bash
rm -rf "${PROJECT_DIR}/*-repo"
```
**原因**：Git 克隆的仓库（`*-repo/`）仅用于读取 README，音频/字幕/渲染不依赖其内容。删除可节省存储空间。
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
| 禁止字号 ≠ 72px | ASS Fontsize=72（PlayResY=1920 时，约40px视觉） |
| 禁止 `\\\\N` 换行 | ASS 必须 `\N` 换行 |
| 禁止字段数不匹配 | ASS Format 10字段，Dialogue 10字段 |
| 禁止先于音频生成字幕 | 必须音频后处理完成后生成 |
| 禁止双重加速 | 禁止 edge-tts rate=+20% + atempo=1.2 叠加；正确：edge-tts rate=+0%，ffmpeg atempo 1.2 单独处理 |
| 禁止 ffmpeg ASS 滤镜 | **字幕在 Remotion 内同期烧录**，无需 ffmpeg `-vf "ass=..."` |

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

> **铁律：Step 0 完成后必须验证所有文件存在，包括 `session-log.md`**

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
### 清理 `-repo` 目录
**时机**：Remotion 渲染成功并验证后，每个项目**必须立即删除**。
```bash
rm -rf "${PROJECT_DIR}/*-repo"
```
**原因**：Git 克隆的仓库（`*-repo/`）仅用于读取 README，音频/字幕/渲染不依赖其内容。删除可节省存储空间。

**⚠️ generate_docs.js 执行后必须检查 narration.txt**：脚本输出的 narration.txt 常常字数过少（<50字），需要手动重写。详见"generate_docs.js 输出质量"章节。

---

## 📋 输出文件清单（强制全部生成）

> ⚠️ **铁律：以下 11 个文档文件必须在 Step 0 全部创建，禁止跳过任何一个。**
> 这是预防遗漏的第一道防线。视频渲染前必须确认所有文件存在。

### 文档文件（11个）

> ⚠️ **session-log.md 必须主动初始化，不是光调用 session_status 就完了**
> 详见 [rules/SESSION_LOG.md](rules/SESSION_LOG.md)

```bash
# Step 0 开始时：初始化 session-log.md
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"
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
| 16 | 字幕 | `audio/captions.json` | 字幕时间戳（startMs/endMs 毫秒格式），供 Remotion CaptionOverlay 使用 |
| 17 | 最终视频 | `video-project/out/final.mp4` | Remotion Native 直出（音频内嵌 / 字幕同期），52.8秒@60fps |

### ⚠️ 多文件同步检查（每次渲染流程修改后必做）

> **核心教训（2026-05-14）**：渲染管道参数（输出文件名/帧率/字幕路径/音频路径）修改时，
> 如果只改一个文件而不同步所有引用，会导致 16 个文件产生矛盾冲突，极难发现。
>
> **预防方法**：修改以下任意一项后，立即执行 grep 全局验证。

| 修改项 | 必须同步检查的文件 |
|--------|------------------|
| 输出文件名（`final.mp4`） | launch.sh, video-quality-gate.js, video-composer.js, WORKFLOW.md, SKILL.md, 所有 rules/*.md, 所有 references/*.md |
| 字幕路径（`public/audio/captions.json`） | launch.sh Step 3, create-remotion-project.js, CaptionOverlay.tsx |
| 帧率（`60fps`） | launch.sh, WORKFLOW.md, create-remotion-project.js, ONEPASS_WORKFLOW.md |
| 音频路径（`audio/neural_1_2x.m4a`） | launch.sh, create-remotion-project.js, video-quality-gate.js |

```bash
# 验证命令：渲染流程关键参数无矛盾
SKILL_DIR="$HOME/.hermes/skills/video-creator"
grep -rn "final_with_subs\|final-video\.mp4\|processed/audio_1_2x\|fps.*60\b" \
  "$SKILL_DIR/scripts/" "$SKILL_DIR/rules/" "$SKILL_DIR/references/" 2>/dev/null | \
  grep -v "CONFLICTS.md\|#.*期望\|注释\|示例" | \
  grep -v "^.*\.md.*final_with_subs"  # allow in historical reference docs
# 期望：0 行（任意匹配都表示有残留冲突）
```

### Step 0 验证命令

```bash
# 验证所有文档是否存在
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"
for f in README.md article.md video-script.md copy.md wechat-copy.md posting-guide.md landing-page.html article-page.html wechat-page.html session-log.md report.json; do
  if [ ! -f "$PROJECT_DIR/docs/$f" ]; then
    echo "❌ 缺失: $f"
  fi
done
```

## ⚠️ 致命错误修复记录（2026-05-10）

> 以下是已确认的技能文档级错误，已验证修复。遇到文档与实际行为冲突时，以本文为准。

### ⚠️ 验证铁律：上下文摘要≠实际落盘

> **经验**：上下文压缩（context compaction）将"声称完成"当作"实际完成"处理。摘要来自 handoff，不是文件系统真相。

### 验证清单（每次修订后必须执行）
```bash
# 0. 【关键】移除文件引用前必须先验证文件是否真实存在
# 摘要声称"X不存在"不等于X不存在——必须ls确认
for f in references/REMOTION_NATIVE.md rules/SESSION_LOG.md scripts/session-log-append.py; do
  if [ -f "$SKILL_DIR/$f" ]; then echo "✅ 存在: $f"
  else echo "❌ 不存在: $f（确认后再移除引用）"; fi
done

# 1. launch.sh all 是否真正执行全链路（不只是跑门禁）
grep -n "edge-tts\|ffmpeg\|remotion render\|subtitle" {SKILL_DIR}/scripts/launch.sh | grep -v "^#" | head -5

# 2. 关键脚本行号验证
grep -n "fontSize: 72\|outline: 2\|marginV: 50" {SKILL_DIR}/scripts/subtitle-generator.js | head -3

# 3. 关键文件存在性
for f in scripts/launch.sh scripts/subtitle-generator.js scripts/video-quality-gate.js; do
  [ -f "{SKILL_DIR}/$f" ] || echo "❌ 缺失: $f"
done
```

### ⚠️ 多文件同步修订铁律（2026-05-13 经验）

> **核心教训**：同时修订多个相关联文件时（如 launch.sh + video-quality-gate.js），错误会在编译/语法检查时集中暴露。建议按以下顺序执行，避免反复回滚。

**修订顺序**：
1. **先读全部相关文件**（了解真实结构，不只是目标行）
2. **先修被引用最多的文件**（video-quality-gate.js 被 launch.sh 调用，先修它）
3. **每修一个文件立即语法检查**（`node --check` / `bash -n`）
4. **发现语法错误立即修**，不要"攒着一起修"
5. **最后做全文 grep 验证**

**常见陷阱**：
- **移除 if 守卫时漏掉内部代码块**：删了 `if (condition) {` 但忘了删对应 `}` 里的内容，导致语法错误
- **重复声明**：`const pkgFile = ...` 在两次 patch 后出现两次，第二次 patch 替换了中间的整个 block
- **孤立的 else 分支**：删了 if 块但保留了 else 块，else 没有对应的 if

**验证命令**：
```bash
# 每个 .js 文件修改后立即检查语法
node --check {SKILL_DIR}/scripts/video-quality-gate.js || echo "❌ 语法错误" && exit 1

# 每个 .sh 文件修改后立即检查语法
bash -n {SKILL_DIR}/scripts/launch.sh || echo "❌ shell 语法错误" && exit 1

# 所有文件修改完成后，grep 验证无残留冲突引用
grep -rn "subtitles.ass\|PIL.*fallback\|混流" {SKILL_DIR}/scripts/launch.sh {SKILL_DIR}/scripts/video-quality-gate.js | grep -v "^#"
# 期望：0 行（无任何残留）
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
# 验证 captions.json 格式（Remotion Native 字幕）
grep "startMs\|endMs" {project}/audio/captions.json | head -5
# 期望：每条字幕含 startMs、endMs、text 字段，例：
# {"text":"Hysteria 是开源社区明星项目","startMs":0,"endMs":5425}
# Remotion 字幕叠加层陷阱与解法

## ✅ CaptionOverlay 字幕烧录机制（Remotion Native）

> **⚠️ 旧版文档（2026-05-13 之前）错误声称"HTML 字幕组件不进 MP4"——这是错的，已删除。**

`CaptionOverlay`（`create-remotion-project.js` 第 171-292 行）是 React 组件，通过 `staticFile` 读取 `captions.json`，在 Remotion 渲染每一帧时用 `<Sequence>` + 绝对定位 `<div>` 将字幕绘制进画面。**最终 MP4 包含烧录后的字幕，无需 ffmpeg ASS 滤镜。**

**验证**：
```bash
# 渲染后检查字幕是否烧入（看帧内容，不看流）
ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 out/final.mp4
# 显示帧数（每帧含字幕）≠ 0
```

**字幕同步机制**：captions.json 的 startMs/endMs 由 launch.sh Step 3 生成，采用**比例分配算法**（总时长 = ffprobe 实测音频时长，字幕按句子数等比划分时间槽）。每条字幕的 startMs/endMs 精确对应音频实际时间轴，字幕与音频完全同步。

---

## 致命陷阱：`createTikTokStyleCaptions` 对句子级字幕静默失效

**影响**：Remotion 渲染成功无报错，但字幕完全不可见。

**根因**：`createTikTokStyleCaptions` 需要词级时间戳（每个词有 `fromMs/toMs`），来自语音识别服务。当 captions.json 只有句子级 timing（TTS 文本分割产生）时，所有 token 的 `toMs` 塌陷为 `Infinity`，逐字高亮完全不触发。

**正确做法**：对于句子级字幕，**不使用** `createTikTokStyleCaptions`，直接渲染每条字幕文本。详见 [references/remotion-caption-overlay-pitfalls.md](references/remotion-caption-overlay-pitfalls.md)。

### ⚠️ narration.txt 生成后必须验证字数
`generate_docs.js` 的 `extractNarration()` 使用 `narration.length`（总字符）与 `maxChars`（中文字数上限）比较，两者单位不一致。**几乎每次都会生成字数不足的 narration.txt**，需手动重写。

**验证脚本**：
```bash
python3 -c "
text = open('${PROJECT_DIR}/docs/narration.txt').read()
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
max_chars = int(52 * 3.37)  # duration from video-config.json
print(f'中文字数: {chinese_chars} / 上限: {max_chars}')
assert 100 <= chinese_chars <= max_chars, f'字数异常: {chinese_chars}'
print('✅ 字数检查通过')
"
```

**根因**：`narration.length` 包含标点和空格，与纯中文字数上限不可比。需改为统计中文字符数后比较。

---

### ❌ 错误6：`useDelayRender` 在 Remotion 4.x 导致 `delayRender is not a function`

**影响**：CaptionOverlay 组件加载 captions.json 时崩溃。

**根因**：Remotion 4.x 中 `useDelayRender()` 返回的不是函数类型。

**正确做法**：禁止使用 `useDelayRender()`，改用纯 `useState + useEffect`。详见同上参考文件。

**影响**：session-log.md 只有表头，没有任何 token 记录行，无法追踪成本。

**根因**：`session_status` 是 OpenClaw 工具调用，输出在 tool result 中（emoji 格式），不是 stdout。执行时直接调用工具会忽略 token 追踪。

**修复**：每个 Step 完成后必须：
1. 调用 `session_status` 工具（AI 对话中输入）
2. 将 emoji 输出追加到 `docs/session-log.md` 的请求记录表
3. 使用 `scripts/session-log-append.py` 或手动 echo 追加行

**验证命令**：
```bash
# 验证 session-log.md 有数据行（不只是表头）
grep -c "^[|]" "${PROJECT_DIR}/docs/session-log.md"
# 结果 >= 3 才正常（表头 + 至少2行数据）
```

---

## 如何使用

阅读各个规则文件以获取详细说明和代码示例：
- [references/remotion-package-discovery.md](references/remotion-package-discovery.md) — `@remotion/core` 不存在；正确包名 `remotion`；47个 exports（Text 不存在）；React Error #130 根因；package.json 正确写法；渲染命令
- [references/subtitle-tiktok-highlight.md](references/subtitle-tiktok-highlight.md) — **TikTok 逐字高亮特效完整方案**：`CaptionOverlay` + `interpolate` 自定义逐字高亮；含完整 TSX 实现 + 入场/退场动画
- [references/video-one-shot-checks.md](references/video-one-shot-checks.md) — **一次生成到位铁律**：渲染前必做的 4 项预检（字数上限 / 英文句点 split 陷阱 / 叠速检测 / CaptionOverlay 方案确认）
- [references/remotion-esbuild-errors-2026-05-13.md](references/remotion-esbuild-errors-2026-05-13.md) — **Remotion esbuild 语法错误修复**：themes/index.ts 连字符key无引号、JSX多余`}`、组件prop缺失；含自动修复脚本和验证命令
- [references/skill-audit-methodology.md](references/skill-audit-methodology.md) — **技能深度审计方法论**：识别文档与脚本脱节的 8 类问题模板；2026-05-12 审计发现 8 类缺陷（5个已修复/3个待修复）；含一键验证命令。**摘要永远不可信**，必须 grep 验证文件系统实际值；8类文件检查清单；常见遗漏模式（验证器不同步/实例化覆盖/文档不同步）。
- [references/remotion-project-hardcoded-content-2026-05-13.md](references/remotion-project-hardcoded-content-2026-05-13.md) — ⚠️ **架构级缺陷**：create-remotion-project.js 场景内容全为 Hysteria 硬编码模板，与实际项目无关；临时方案（绕过脚本手动编写）和长期方案（重构为脚手架生成器）
- [references/baoyu-config.json](references/baoyu-config.json) - 宝玉技能配置
- [references/cdn-mapping.json](references/cdn-mapping.json) - CDN映射配置
- [references/tailwind-config.json](references/tailwind-config.json) - Tailwind配置
- [rules/UNIFIED_RULES.md](rules/UNIFIED_RULES.md) - ⚠️ **【最高优先级】** 视频创作铁律清单，包含字幕规格、帧数计算、居中布局、封面生成、赛博朋克风格、文件清理等强制规则。**必须首先阅读此文件。**
- [rules/PATHS.md](rules/PATHS.md) - 规定了 video-creator 技能中项目命名、目录结构和文件命名的规范，确保输出文件统一组织在 workspace/{project-name}/ 下的 docs/ 和 video-project/ 目录中。
- [rules/REMOTION.md](rules/REMOTION.md) - 详细规定了使用 Remotion 框架创建视频组件的规范，包括组件结构、动画效果（打字机、词高亮、渐入等）、主题配置、字体选择以及视频渲染参数。
- [rules/VOICE.md](rules/VOICE.md) - 规定了使用微软 Azure Neural TTS（推荐 zh-CN-YunjianNeural）进行自然人声合成的工作流程，强调整段连续生成、音频后处理（AAC 256k）。
- [rules/HTML.md](rules/HTML.md) - 规定国内CDN资源引用规范，提供落地页、公众号适配页、文章阅读页三种HTML模板。
- [rules/FONTS.md](rules/FONTS.md) - 视频字幕和正文字体大小规范（主标题130px/副标题52px/内容72-96px）、ASS字幕格式及大字体居中设计原则。ASS字幕规范值：**Fontsize=72 / MarginV=50 / Outline=2**，详见 [rules/SUBTITLES.md](rules/SUBTITLES.md)。
- [rules/WORKFLOW.md](rules/WORKFLOW.md) - 定义视频创作从内容获取到报告生成的11步完整工作流程。
- [rules/COPY.md](rules/COPY.md) - 规定公众号文案的输出格式、标题规范（8-32字）、摘要规范（≤44字）及正文结构（开头→引出→解决→功能→效果→号召→结尾）。
- [rules/SUBTITLES.md](rules/SUBTITLES.md) - 集成智能字幕生成（ASS格式）、质量检查（字体/音频/字幕/视频）及自动修复功能，支持批量处理多个视频项目。

**文档一致性维护**：详见 [references/documentation-consistency-guide.md](references/documentation-consistency-guide.md) — 预防 skill 文档与实际代码脱节的检查清单和常见模式。

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

**launch.sh 一键生成**（完整流程）：

```bash
# 1. 初始化项目（创建 video-config.json + article.md 占位文件）
bash {SKILL_DIR}/scripts/launch.sh init <项目名>

# 2. 编辑 video-config.json（平台/时长/主题/封面标题/配音等）
# 3. 粘贴内容到 docs/article.md

# 4. 一键生成（Remotion Native 路径）：
#    Step 0: generate_docs.js（11个文档，含 narration.txt）
#    Step 1: edge-tts --rate +0%（配音）
#    Step 2: ffmpeg（去静音 + atempo 1.2x + AAC 256k）
#    Step 3: captions.json 生成（startMs/endMs 毫秒格式，供 CaptionOverlay 使用）
#    Step 4: create-remotion-project.js（Remotion 项目，含 CaptionOverlay 逐字高亮）
#    Step 5: npm install
#    Step 6: npx remotion render（60fps/1080×1920，音频+字幕内嵌）
#    Step 7: PIL generate_cover.py（三平台封面）
bash {SKILL_DIR}/scripts/launch.sh all
```

**输出文件清单**：
| `docs/assets/cover.png` | 视频号封面 |
| `docs/assets/cover-wechat.png` | 公众号封面 |
| `docs/assets/cover-xhs.png` | 小红书封面 |


- `docs/narration.txt` — 配音文本
- `docs/video-script.md` — 分镜脚本
- `audio/neural_1_2x.m4a` — 处理后音频（AAC 256k）
- `audio/captions.json` — 字幕时间戳（startMs/endMs 格式，供 Remotion CaptionOverlay 使用）
- `video-project/out/final.mp4` — 最终视频（Remotion Native，含音频+字幕，60fps/H.264）

**性能优化（2026-05-12 v3）**：
- edge-tts + 帧生成并行：两者同时执行（~20s + ~50s → ~50s），节省 ~20s
- Gate A + 字幕生成并行：两者无数据依赖，同时执行节省 5-10s
- Gate B（~3s）在帧生成完成后串行执行（无法提前，因为字幕文件需要等字幕生成完成）
- Remotion 帧并行化：`--concurrency=4` 参数控制并行渲染
- 删除 re-encoding：edge-tts 输出码率已足够，跳过无意义重编码
- 封面：PIL generate_cover.py 直接生成三平台封面，无需 Remotion still
- 整体构建时间：~300-400s → ~50-80s（提升 75-85%）
- 时间线：`[edge-tts+帧生成(并行50s)] → [GateA+字幕(并行25s)] → [GateB(3s)] → [Remotion渲染(20-60s)] → [封面(5s)]`
- [rules/QUALITY.md](rules/QUALITY.md) - 定义视频质量检查清单，涵盖内容、视觉、文件、技术、音频五大维度的检查标准。
- [rules/INPUT.md](rules/INPUT.md) - 定义三种内容输入模式：链接输入（baoyu-url-to-markdown抓取）、主题输入（web_search搜索）、详细内容输入（直接解析），并规定各自的处理流程。
- [rules/THEMES.md](rules/THEMES.md) - 定义20种视频主题风格（科技、创意、生活，自然，专业四大类），包含主色、辅色、背景色、字体、粒子数等视觉参数及平台规格（小红书/视频号/抖音/油管）。
- [rules/THEME_ANIMATIONS.md](rules/THEME_ANIMATIONS.md) - 定义20种主题的动画参数预设（spring/fade/slide/scale/glow/particle配置），配合 `scripts/themes.js` 和 `scripts/useThemeAnimation.ts` 实现主题适配的动画效果。
- [rules/PLATFORM.md](rules/PLATFORM.md) - 定义视频号、小红书、抖音/快手的平台规格（分辨率、帧率、时长、文件大小、编码）及 Remotion 竖屏配置参数。
- [rules/TROUBLESHOOTING.md](rules/TROUBLESHOOTING.md) - 提供视频渲染失败、baoyu获取内容、字体异常、音频回音/拼接、Remotion编码杂音、Chrome下载失败、create-video CLI交互bug等常见问题的解决方案。
- [references/cloudflare-blocking-medium.md](references/cloudflare-blocking-medium.md) - **Medium.com Cloudflare 阻断**：所有自动化抓取均被阻止，article-to-video 任务需用户手动提供文章内容
- [references/github-fetch-fallback.md](references/github-fetch-fallback.md) - **GitHub 内容获取降级流程**：HTTPS/代理/gh CLI/git:// 全部失败时的诊断顺序和用户报告模板
- [references/generate_docs-issues-2026-05-14.md](references/generate_docs-issues-2026-05-14.md) — **generate_docs.js 已知问题**：video-config.json 路径 + narration.txt 100%返工率（本 session 8个项目全部手动重写）
- [references/launch-sh-bugs-2026-05-14.md](references/launch-sh-bugs-2026-05-14.md) — **launch.sh Bug 修复**：SKILL_DIR 路径错误 + captions.json 未同步到 audio/ + pre-render-check 路径问题
- [references/captions-json-python-generation-2026-05-14.md](references/captions-json-python-generation-2026-05-14.md) — **captions.json 必须用 Python 生成**：Node.js -e inline 模板字符串在中文 TTS 场景有致命缺陷，Python heredoc 100% 可靠
- [references/narration-rewrite-pattern.md](references/narration-rewrite-pattern.md) — **narration.txt 必然经历 3 次重写**：generate_docs.js 几乎每次都生成字数异常（实测 8/8 项目），需经过"超限→精简→过短→补全"循环；含 Python 验数字数和 rewrite 策略
- [references/launch-all-workflow-gaps-2026-05-14.md](references/launch-all-workflow-gaps-2026-05-14.md) — **`launch.sh all` 已知问题**：Gate B 失败后路径不一致导致提前退出，手动兜底流程
- [references/remotion-captions-404-fix-2026-05-14.md](references/remotion-captions-404-fix-2026-05-14.md) — **captions.json 404 根因**：create-remotion-project.js 后 Remotion bundle 缓存导致音频文件丢失；必须在创建项目之前生成正确的 audio 文件
- [references/node-execsync-encoding-bug.md](references/node-execsync-encoding-bug.md) - **Node.js execSync { encoding: 'utf8' } 返回值 bug**：encoding:'utf8' 直接返回字符串而非 { stdout } 对象；macOS arm64 Node.js 24 受影响；影响 ffprobe 解析

## ⚠️ 渲染路径：Remotion Native（唯一方案）

| ⚠️ **重要更新（2026-05-13）** | 封面渲染帧号必须使用动画**最后一帧减1**（如179而非0），详见 rules/COVER_GENERATE.md Section 帧号选择原则 |

### 渲染流程

```bash
# Step 1: Remotion 渲染（含音频内嵌）
cd video-project
npx remotion render VerticalVideo out/final.mp4 \
  --concurrency=4 \
  --fps=60 \
  --disable-gpu \
  --log=error

# Step 2: 复制到输出目录
cp out/final.mp4 "${OUTPUT_DIR}/final.mp4"
echo "✅ 最终视频已输出: final.mp4"
```

### 封面生成（PIL）

> **⚠️ 2026-05-14 更新**：封面改用 `generate_cover.py` PIL 脚本直接生成三平台封面，不再依赖 Remotion still。

```bash
SKILL_DIR="{SKILL_DIR}"
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"

# 主标题和副标题从 video-config.json 或 docs/assets/ 获取
TITLE=$(node -e "const c=require('./video-config.json');console.log(c.title||c.topic)")
SUBTITLE=$(node -e "const c=require('./video-config.json');console.log(c.subtitle||'')" 2>/dev/null || echo "")

# 三平台封面一次性生成
python3 "$SKILL_DIR/scripts/generate_cover.py" "$TITLE" "$SUBTITLE" "$PROJECT_DIR/docs/assets" vertical
python3 "$SKILL_DIR/scripts/generate_cover.py" "$TITLE" "$SUBTITLE" "$PROJECT_DIR/docs/assets" wechat
python3 "$SKILL_DIR/scripts/generate_cover.py" "$TITLE" "$SUBTITLE" "$PROJECT_DIR/docs/assets" xhs
```

### 渲染验证

```bash
# 验证最终视频
ffprobe -v error -show_streams out/final.mp4 2>&1 | grep -E "codec_name|width|height|duration|r_frame_rate"
# 期望：codec_name=h264, width=1080, height=1920, duration≈43.4s, r_frame_rate=60000/1001
```

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

4. **themes/index.ts 连字符key**：ThemeConfig 接口定义中的 key（如 `tech-modern`）未加引号，esbuild 解析失败（`Expected "}" but found "-"`）。修复方法：Python 脚本自动将 `key-name:` 替换为 `"key-name":`：
   ```python
   import re
   content = open('src/themes/index.ts').read()
   fixed = re.sub(r'(\s+)([a-z][a-z0-9]*-[a-z0-9-]+):(\s*\{)', r'\1"\2":\3', content)
   open('src/themes/index.ts', 'w').write(fixed)
   ```
   **必须在 npm install 后、remotion render 前执行此修复。**

5. **CaptionOverlay `delayRender is not a function`**：`create-remotion-project.js` 生成的 `CaptionOverlay.tsx` 使用了 `useDelayRender()` hook，但该 hook 在 Remotion 4.0.459 中返回的不是函数类型，导致 `delayRender is not a function`。修复方法：**重写 CaptionOverlay**，移除所有 `useDelayRender` 相关逻辑，改为纯 state + useEffect：
   ```tsx
   // ✅ 正确的 CaptionOverlay 模式（无 useDelayRender）
   export const CaptionOverlay: React.FC<{ captionsFile?: string }> = ({ captionsFile = "audio/captions.json" }) => {
     const [captions, setCaptions] = useState<Caption[] | null>(null);
     const { fps } = useVideoConfig();

     useEffect(() => {
       fetch(staticFile(captionsFile))
         .then(r => r.json())
         .then(data => setCaptions(data))
         .catch(() => {});
     }, [captionsFile]);

     if (!captions || captions.length === 0) return null;

     const pages = createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: 1200 }).pages;
     // ... 使用 Sequence 渲染每页
     return (/* ... */);
   };
   ```
   **禁止使用 `useDelayRender()`**。

6. **spring() 动画缺少 fps 参数**：Scene 组件中的 `spring({ frame, config: {...} })` 缺少 `fps` 参数会报错。修复：所有 spring 动画改为 `interpolate(frame, [0, 30], [0.85, 1], { extrapolateRight: "clamp" })`。

> **根因**：这些问题都是 `create-remotion-project.js` 模板生成代码与 Remotion 4.0.459 实际 API 不匹配导致的。模板中的 `spring()` 和 `useDelayRender()` 是旧版 Remotion（3.x）的 API。**必须同时修复模板文件和现有受损项目**。

### 清理 `-repo` 目录
**时机**：Remotion 渲染成功并验证后，每个项目**必须立即删除**。
```bash
rm -rf "${PROJECT_DIR}/*-repo"
```
**原因**：Git 克隆的仓库（`*-repo/`）仅用于读取 README，音频/字幕/渲染不依赖其内容。删除可节省存储空间。
  该脚本自动修复：themes/index.ts 连字符key、CaptionOverlay useDelayRender、Scene spring() 动画。运行后必须重新 `npm install` 再 `remotion render`。

**实际验证（2026-05-13）**：在 Mac M-series headless 环境下 `npx remotion render` **成功渲染**，输出 4.4MB / 43.4秒 / 1080×1920 / 60fps 视频。结论与旧版文档矛盾，以本条为准。
### launch.sh all 说明

`launch.sh all` 执行完整生成流程（不是只跑门禁）：
- 依次调用 `cmd_audio` → `cmd_subtitle` → `cmd_render`
- `cmd_render` 执行 Remotion CLI 渲染（Remotion Native 唯一路径）
- `cmd_render` 内部自动执行门禁 C 和门禁 D
- [rules/INTEGRATION.md](rules/INTEGRATION.md) - 定义 baoyu 技能调用方式（url-to-markdown/cover-image/illustrator等）及自动化脚本模板和依赖安装说明。
- [rules/SCRIPTS.md](rules/SCRIPTS.md) - 定义视频脚本的 Markdown 输出结构，包含小红书/视频号版本、场景分镜（视觉/文字/动画）、配音及时长、帧边界计算方法。
- [rules/SESSION_LOG.md](rules/SESSION_LOG.md) - 追踪每次大模型请求的输入/输出 token 数量、请求模型、处理时长及 session 数据，输出到 `docs/session-log.md` 供审计和成本分析。
