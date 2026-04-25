# 📝 字幕生成与质量检查系统

## 🎯 功能概述

video-creator 技能现在集成了完整的字幕生成和质量检查系统，包括：

### 核心功能
1. **智能字幕生成**：自动生成ASS格式字幕，支持字体兼容性
2. **质量检查**：全面检查视频项目的字体、音频、字幕、视频质量
3. **自动修复**：自动修复常见问题（如字体兼容性）
4. **批量处理**：支持批量处理多个视频项目

---

## ⚠️ 字幕格式规范（强制执行）

> **经过多个项目验证，本技能统一使用 quantdinger 字幕格式作为标准。**

### 正确格式示例
```ass
[Script Info]
Title: Video Creator Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,PingFang SC,10,&H00FFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,30,30,30,134

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:04.00,Default,,30,30,30,,想拥有一个自己的\NAI 量化交易系统？
```

### ❌ 禁止的格式
1. **禁止使用 PlayResX/PlayResY** - 不要设置分辨率
2. **禁止使用 `\\N` 换行** - 必须用 `\N`
3. **禁止字号超过10px** - 竖屏视频10px是最佳阅读尺寸

### 标准参数（必须严格遵守）

| 参数 | 值 | 说明 |
|------|-----|------|
| `Fontsize` | **10** | 10px，竖屏视频最佳阅读尺寸 |
| `PrimaryColour` | `&H00FFFF` | 黄色（#FFFF00）|
| `Alignment` | **2** | 底部居中 |
| `MarginL` | **30** | 左侧边距 30px |
| `MarginR` | **30** | 右侧边距 30px |
| `MarginV` | **30** | 底部边距 30px |
| `WrapStyle` | **0** | 支持 `\N` 换行符 |
| `Fontname` | `PingFang SC` | macOS 系统中文字体 |
| `Outline` | 1 | 1px 黑色描边 |

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
cd ~/.openclaw/skills/video-creator

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
  - macOS: `PingFang SC`
  - Windows: `Microsoft YaHei`
  - Linux: `WenQuanYi Micro Hei`
- **ASS格式支持**：生成标准ASS字幕文件
- **智能分段**：根据语义和长度自动分段文本
- **时间轴计算**：自动计算字幕显示时间

### API 使用示例
```javascript
const SubtitleGenerator = require('./scripts/subtitle-generator');

// 创建实例 - 必须传入 fontSize=10
const generator = new SubtitleGenerator({
  fontSize: 10,  // 必须是10！
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
```
1. edge-tts 生成原始音频
         ↓
2. atempo 后处理（1.2x）→ 确认最终时长 T
         ↓
3. Remotion 渲染视频（帧数 = T × 60fps）
         ↓
4. 生成 ASS 字幕（基于 T 时长，fontSize=10）
         ↓
5. ffmpeg 合并视频+音频（stream copy）
         ↓
6. ffmpeg 烧录字幕（-vf "ass=xxx.ass"）→ 最终视频
```

### 字幕烧录命令（必须分两步）
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
4. **字幕质量**：检查ASS格式、时间轴、fontSize=10
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
     文件: video/out/video.mp4
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
| 字号使用 14px/18px/28px/36px | **必须使用 10px** |
| 使用 `\\N` 换行 | 必须使用 `\N` 换行 |
| 使用 PlayResX/PlayResY | 不要设置分辨率 |

---

## 🎯 总结

1. **字幕字号**：必须使用 **10px**
2. **换行符**：必须使用 `\N`（不是 `\\N`）
3. **Script Info**：不要设置 PlayResX/PlayResY
4. **底部边距**：MarginV=30
5. **颜色**：PrimaryColour=&H00FFFF（黄色）

通过遵循 quantdinger 字幕格式标准，确保所有视频的字幕显示效果一致且可读。