# 📝 字幕生成与质量检查系统

> 所属模块：video-creator / SKILL.md → 字幕生成
>
> ## ⚠️ 最终权威规范（以本文为准，冲突时以此为准）
>
> **主流程（Remotion Native）**：`launch.sh` Step 3 直接生成 `audio/captions.json`（`startMs/endMs` 毫秒格式）。**不需要 ASS 文件。**
>
> **Fallback 流程**：当 Remotion 渲染不可用时，使用 `subtitle-generator.js` 生成 `audio/subtitles.ass` 作为 ffmpeg 烧录字幕。

**核心铁律（必须严格遵守）**：

| 规则 | 正确做法 | ❌ 错误做法 |
|------|---------|-----------|
| 字号 | **fontSize=72**（PlayResY=1920时，约40px视觉，已验证） | ~~10/12/18/36px~~ |
| Outline | **2px**（1px太细） | ~~1px~~ |
| MarginV | **50px** | ~~30px~~ |
| 换行符 | `\N`（单个反斜杠） | `\\N`（双反斜杠） |
| 字幕格式 | **@remotion/captions 烧录（Remotion Native）**；ffmpeg ASS 滤镜（fallback） | MP4 内嵌（不支持） |
| 时间轴基准 | **最终音频时长**（后处理后） | 原始音频时长 |
| PlayRes | **PlayResX=1080, PlayResY=1920** | 不设置 |
| 字段数 | Format 声明10字段，Dialogue 写10字段 | 字段数不匹配 |
| 时间戳格式 | **2位厘秒**（如 `0:00:04.50`） | ~~3位毫秒~~ |

> **⚠️ 字幕时间轴必须基于最终音频时长**。在音频后处理（atempo）完成之前，禁止生成字幕。

### 字幕烧录方案

| 方案 | 渲染路径 | 字幕来源 |
|------|----------|----------|
| **Remotion Native（主）** | Remotion 渲染 | `captions.json`（由 `launch.sh` Step 3 直接生成，比例分配算法）|
| **ffmpeg ASS（fallback）** | PIL 帧序列混流 | `subtitles.ass`（`subtitle-generator.js` 输出）|

> **Remotion Native 字幕烧录**：`launch.sh` Step 3 使用比例分配算法（总时长=ffprobe实测时长，按句子数等比划分）直接生成 `captions.json`（startMs/endMs 毫秒格式）。`CaptionOverlay` 组件读取 `captions.json` 通过 `@remotion/captions` API 渲染到帧。**无需 ASS 转换**。

### 规范冲突记录（已废弃的值）

| 废弃值 | 废弃原因 | 正确值 |
|--------|---------|--------|
| Fontsize 10/12/18/36px | 竖屏1080×1920下不可读 | 72px |
| Outline 1px | 描边太细 | 2px |
| MarginV 30px | 距底边太近 | 50px |
| Format 5字段 | 字段不完整 | 10字段 |
| 3位毫秒时间戳 | ms() bug导致时间错误 | 2位厘秒 |

### 验证命令

#### 主流程（captions.json）
```bash
# 验证 captions.json 格式
node -e "var c=require('./audio/captions.json');console.log('段落数:',c.length,'末段endMs:',c[c.length-1].endMs);"

# 验证视频时长与末段 endMs 偏差
ffprobe -v error -show_entries format=duration -of csv=p=0 out/final.mp4
```

#### Fallback（ASS 烧录）
```bash
# 验证字幕 Fontsize=72
ffmpeg -y -i final.mp4 -vf "subtitles=audio/subtitles.ass" -frames:v 1 /tmp/check.png
# 检查截图中的字幕大小（应约40px视觉）
```

## 🎯 功能概述

video-creator 技能现在集成了完整的字幕生成和质量检查系统，包括：

### 核心功能
1. **captions.json 生成**（主流程）：`launch.sh` Step 3 使用比例分配算法，直接生成 `startMs/endMs` 格式
2. **质量检查**：全面检查视频项目的字体、音频、字幕、视频质量
3. **自动修复**：自动修复常见问题（如字体兼容性）
4. **ASS Fallback**：当 Remotion 不可用时，`subtitle-generator.js` 生成 `subtitles.ass` 作为 ffmpeg 烧录路径

---

## ⚠️ 字幕格式规范（强制执行）

> **经过多个项目验证，本技能统一使用以下字幕规范。**

### 正确格式示例
```ass
[Script Info]
Title: Video Creator Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,STHeiti Medium,72,&H00FFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,30,30,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:04.00,Default,,30,30,50,,想拥有一个自己的\NAI 量化交易系统？
```

### ❌ 禁止的格式
1. **必须使用 PlayResX/PlayResY** - 设置 PlayResX=1080, PlayResY=1920
2. **禁止使用 `\\N` 换行** - 必须用 `\N`
3. **禁止字号低于36px** - 竖屏视频72px是最佳阅读尺寸，最低不低于36px

### 🔴 致命Bug：Format 字段数与 Dialogue 字段数不匹配

> **影响**：在 2026-04-27 的 cangjie-skill-video 项目中发现。
> **症状**：烧录后的视频画面上，字幕文字前面出现 `Default,0,0,0,,` 等杂缀。

#### 错误写法（导致杂缀）

```
Format: Layer, Start, End, Style, Text          ← 只有5个字段！
Dialogue: 0,0:00:00.00,0:00:04.00,Default,Default,0,0,0,,今天给大家介绍...  ← 写入了10个字段的值
```

解析时，`Default`（Name字段的值）和后面的 `Default,0,0,0,,` 全部被当作 **Text 文本内容**烧入画面。

#### 正确写法

```
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text  ← 10个字段
Dialogue: 0,0:00:00.00,0:00:04.00,Default,,0,0,50,,今天给大家介绍...           ← Name为空，MarginV=50
```

#### gen_subtitles.py 规范写法

```python
lines = [
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
]
for i, (start, end, text) in enumerate(subtitles):
    text_escaped = text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")
    if "/" in text_escaped:
        text_escaped = text_escaped.replace("/", "\\N")
    # Name=空, MarginL=0, MarginR=0, MarginV=50, Effect=空
    lines.append(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,50,,{text_escaped}")
```

> **⚠️ 自动检查**：运行 `ffmpeg -i final.mp4 -filter_complex "ass=subs.ass" -f null -` 时，如果看到 `Track has custom format line(s)` 警告，说明 Format 行声明的字段数与实际 Dialogue 行字段数不匹配。

### 标准参数（必须严格遵守）

> ⚠️ **Fontsize 取决于使用场景**：
> - ASS 标准（PlayResY=1920 归一化）→ Fontsize=12（这是 ASS 规范的标准值）
> - **video-creator 统一值**→ Fontsize=72（实测约 40px 视觉，经验证可用）
> - 两者均可通过 PlayResX/PlayResY 在 ASS 中正确渲染，差异仅是 ASS 内部归一化计算方式不同

| 参数 | 值 | 说明 |
|------|-----|-----|
| `Fontsize` | **72** | ASS字幕标准化像素值（PlayResY=1920时，约40px视觉，已验证） |
| `PlayResX` | **1080** | 竖屏视频宽度 |
| `PlayResY` | **1920** | 竖屏视频高度 |
| `PrimaryColour` | `&H00FFFF` | 黄色（#FFFF00）|
| `Alignment` | **2** | 底部居中 |
| `MarginL` | **30** | 左侧边距 30px |
| `MarginR` | **30** | 右侧边距 30px |
| `MarginV` | **50** | 底部边距 50px |
| `WrapStyle` | **0** | 支持 `\N` 换行符 |
| `Fontname` | `STHeiti Medium` | macOS 系统中文字体，实测 ffmpeg 烧录可用 |
| `Outline` | **2** | 2px 黑色描边（1px太细） |
| `Shadow` | **0** | 无阴影（霓虹风格用发光效果更好） |

### ⚠️ 多行字幕显示规范（强制！）

**换行原则**：
1. 每行不超过 **10个字符**（中文约5-8个字）
2. 按**语义停顿点**换行，不要在单词中间断开
3. 保持每行长度相近
4. 使用 `\N` 换行符（不是 `\\N`）

**正确示例**：
```ass
Dialogue: 0,0:00:00.00,0:00:04.00,Default,,30,30,30,,想拥有一个自己的\NAI 量化交易系统？
Dialogue: 0,0:00:04.00,0:00:08.00,Default,,30,30,30,,机构工具太贵？\N数据安全没保障？\N策略写起来太复杂？
```

**错误示例**：
```ass
# ❌ 错误：单行太长
Dialogue: 0,0:00:00.00,0:00:05.00,Default,,30,30,30,,今天给大家介绍一个开源工具 Audiblez，它可以把你书架上的电子书一键变成有声书。

# ❌ 错误：使用了 \\N
Dialogue: 0,0:00:00.00,0:00:05.00,Default,,30,30,30,,今天给大家介绍一个开源工具\\NAudiblez，它可以把你书架上的电子书\\N一键变成有声书。
```

---

## 🔧 安装与使用

### 安装依赖
```bash
# 进入video-creator目录
cd {SKILL_DIR}

# 安装依赖
npm install commander chalk figlet
```

### 使用字幕生成
```bash
# 生成字幕文件
node scripts/video-check.js generate-subtitles \
  --input audio/full_narration.txt \
  --output audio/subtitles.ass \
  --duration 60

# 修复字体兼容性
node scripts/video-check.js fix-fonts --project ./my-video-project

# 检查字幕质量
node scripts/video-check.js check-quality --project ./my-video-project
```

### 通过video-creator CLI使用
```bash
# 检查项目质量
video-creator check --project ./my-video-project

# 修复字体问题
video-creator subtitles --fix --project ./my-video-project

# 批量处理
video-creator batch --directory ./workspace --fix
```

---

## 📝 字幕生成器 (SubtitleGenerator)

### 功能特性
- **智能字体选择**：自动根据操作系统选择兼容字体
  - macOS: `STHeiti Medium`（PingFang SC 在 ffmpeg 烧录时不可用）
  - Windows: `Microsoft YaHei`
  - Linux: `WenQuanYi Micro Hei`
- **ASS格式支持**：生成标准ASS字幕文件
- **智能分段**：根据语义和长度自动分段文本
- **时间轴计算**：自动计算字幕显示时间

### API 使用示例

#### 主流程：captions.json（Remotion Native）
```javascript
// captions.json 由 launch.sh Step 3 自动生成，无需手动调用
// 格式：[{startMs, endMs, text}, ...]
// launch.sh 验证：
const captions = require('./audio/captions.json');
console.log('段落数:', captions.length, '末段endMs:', captions[captions.length-1].endMs);
```

#### Fallback：ASS 格式（subtitle-generator.js）
```javascript
const SubtitleGenerator = require('./scripts/subtitle-generator');

// 创建实例 - 必须传入 fontSize=72
const generator = new SubtitleGenerator({
  fontSize: 72,  // PlayResY=1920时，约40px视觉，已验证
  color: '&H00FFFF' // 黄色
});

// 生成字幕
const subtitles = await generator.generateFromText(
  '完整配音文本内容...',
  60 // 总时长60秒
);

// 保存ASS文件
await generator.generateASS(subtitles, 'audio/subtitles.ass');
```

---

## 🚀 集成到视频创作工作流

### 标准流程（强制执行）

#### 主流程（Remotion Native）- 推荐
```
1. edge-tts 生成原始音频（--rate +0%）
         ↓
2. ffmpeg atempo 后处理 → 确认最终时长 T（video-config.json voice.atempo）
         ↓
3. launch.sh Step 3 生成 captions.json（比例分配算法，基于 T）
         ↓
4. create-remotion-project.js 生成 Remotion 项目
         ↓
5. Remotion 渲染（final.mp4，音频内嵌，字幕 CaptionOverlay 烧录）
         ↓
6. captions.json 末段 endMs 同步为视频实际时长
```

#### Fallback（ASS + ffmpeg 烧录）
```
1. edge-tts 生成原始音频
         ↓
2. atempo 后处理（1.2x）→ 确认最终时长 T
         ↓
3. subtitle-generator.js 生成 subtitles.ass（基于 T 时长）
         ↓
4. ffmpeg 烧录字幕（-vf "ass=xxx.ass"）→ 最终视频
```

### 字幕烧录命令（Fallback 流程）
```bash
# Step 1: 合并视频 + 音频
ffmpeg -y \
  -i out/video_noaudio.mp4 \
  -i audio/neural_1_2x.m4a \
  -c:v copy \
  -c:a aac -b:a 256k \
  -map 0:v -map 1:a \
  -shortest \
  out/video_with_audio.mp4

# Step 2: 烧录字幕（ASS → 直接烧入画面）
ffmpeg -y \
  -i out/video_with_audio.mp4 \
  -vf "ass=audio/subtitles.ass" \
  -c:v libx264 -preset fast -crf 22 \
  -c:a copy \
  out/final_with_burned_subs.mp4
```

⚠️ **禁止**在同一步使用 `-c:v copy -c:a copy -c:s ass` 混流 ASS 字幕，MP4 不支持。

---

## 🔍 质量检查器 (QualityChecker)

### 检查项目
1. **项目结构**：检查必需的目录和文件
2. **字体兼容性**：检查并修复不兼容字体
3. **音频质量**：检查音频文件格式、时长、码率
4. **字幕质量**：检查ASS格式、时间轴、fontSize=72
5. **视频质量**：检查分辨率、帧率、时长、文件大小

### 检查报告示例
```
📊 质量检查报告
============================================================
项目目录: ./my-video-project
检查时间: 2026-04-15 21:45:00

❌ 错误: 2
⚠️  警告: 3
🔧 已修复: 1

❌ 严重错误:
  1. SUBTITLE_FONT_SIZE: 字幕字号错误: 14px
     文件: audio/subtitles.ass
     解决方案: 必须使用 fontSize=10

  2. VIDEO_RESOLUTION: 视频分辨率不正确: 1920x1080
     文件: video-project/out/final.mp4
     解决方案: 应为1080x1920（竖屏）
```

---

## 📊 批量处理功能

### 处理多个视频项目
```bash
# 批量检查workspace下的所有视频项目
node scripts/video-check.js batch-process --directory ./workspace

# 批量检查并自动修复
node scripts/video-check.js batch-process --directory ./workspace --fix

# 生成批量处理报告
node scripts/video-check.js batch-process --directory ./workspace --output batch-report.json
```

---

## ⚠️ 血泪教训（必须遵守）

> **核心原则**：字幕时间轴必须基于**最终音频时长**，在音频后处理（atempo）完成之前，禁止生成字幕。

| 错误做法 | 正确做法 |
|---------|---------|
| 先生成字幕，再调音频语速 | 先调音频语速，确认最终时长，再生成字幕 |
| 用 `ffmpeg -c:s ass` 嵌入 ASS 到 MP4 | 用 `ffmpeg -vf "ass=xxx.ass"` 烧录到画面 |
| 字号使用 14px/18px/28px/36px | **必须使用 72px**（约40px视觉，已验证） |
| 使用 `\\N` 换行 | 必须使用 `\N` 换行 |
| 使用 PlayResX/PlayResY | 不要设置分辨率 |

---

## 🎯 统一字幕规范（最终结论）

| 参数 | 值 | 说明 |
|------|-----|-----|
| `Fontsize` | **72** | ASS字幕标准化像素值（PlayResY=1920时，约40px视觉，已验证） |
| `PlayResX` | **1080** | 竖屏视频宽度 |
| `PlayResY` | **1920** | 竖屏视频高度 |
| `PrimaryColour` | `&H00FFFFFF` | **白色**（TikTokCaptionOverlay 负责高亮染色） |
| `Alignment` | **2** | 底部居中 |
| `MarginL` | **10** | 左侧边距 10px |
| `MarginR` | **10** | 右侧边距 10px |
| `MarginV` | **10** | 底部边距 10px（TikTokCaptionOverlay 自行用 bottom:56 定位） |
| `WrapStyle` | **0** | 支持 `\N` 换行符 |
| `Fontname` | `STHeiti Medium` | macOS 实测可用（PingFang SC 在 ffmpeg 烧录时不可用） |
| `Outline` | **2** | 2px 黑色描边（1px太细） |
| `Shadow` | **0** | 无阴影（霓虹风格用发光效果更好） |

> **⚠️ 颜色说明**：`PrimaryColour=&H00FFFFFF`（白色）是 ASS 文件规范色。TikTokCaptionOverlay 在渲染时动态将当前朗读字变为 `#39E508` 荧光绿、已读字变为半透明白 `rgba(255,255,255,0.45)`。如果直接在 ASS 里设置高亮色，就无法实现逐字动态变色效果。

### ⚠️ re.split 致命陷阱：ASCII 句点切断英文词

> **已确认 bug**（2026-05-12 调试 9Router 项目时发现）

**错误 pattern**：
```python
re.split(r'[，。；、→\.．,;]+', text)  # ❌ 含 \. 会匹配英文句点
```
当 text 包含 `Claude4.5` 时，ASCII 句点 `.` 触发分割：
```
'三个免费AI方案：Kiro AI提供Claude4'  ← 25字符，orphaned 5
'5'                                      ← 单独成条目
```

**正确 pattern**：
```python
re.split(r'[，。；、]+', text)  # ✅ 只分割中文句子边界
```
> **原则**：中文文本的 ASS 字幕，**只用中文标点**（，。；、...）作为分割符。英文句点、逗号、永不混入 split pattern。

**验证命令**：
```bash
python3 -c "
import re
text = open('audio/full_narration.txt').read()
# 找含英文句点的段落
import re
for m in re.finditer(r'[a-zA-Z0-9]\.[a-zA-Z0-9]', text):
    idx = m.start()
    print(repr(text[max(0,idx-10):idx+20]))
parts = re.split(r'[，。；、]+', text)
for p in parts:
    if 'Claude' in p:
        print(f'Claude段 len={len(p)}: {p}')
"
```

> **重要**：Fontsize=72 是相对于 PlayResY=1920 的标准化值，不是实际像素值。

通过遵循 quantdinger 字幕格式标准，确保所有视频的字幕显示效果一致且可读。