# 📝 字幕生成与质量检查系统

## 🎯 功能概述

video-creator 技能现在集成了完整的字幕生成和质量检查系统，包括：

### 核心功能
1. **智能字幕生成**：自动生成ASS格式字幕，支持字体兼容性
2. **质量检查**：全面检查视频项目的字体、音频、字幕、视频质量
3. **自动修复**：自动修复常见问题（如字体兼容性）
4. **批量处理**：支持批量处理多个视频项目

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

### 使用质量检查
```bash
# 运行完整质量检查
node scripts/video-check.js check-quality --project ./my-video-project

# 自动修复问题
node scripts/video-check.js check-quality --project ./my-video-project --fix

# 批量处理多个项目
node scripts/video-check.js batch-process --directory ./workspace
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

## 📝 字幕生成器 (SubtitleGenerator)

### 功能特性
- **智能字体选择**：自动根据操作系统选择兼容字体
  - macOS: `PingFang SC`
  - Windows: `Microsoft YaHei`
  - Linux: `WenQuanYi Micro Hei`
- **ASS格式支持**：生成标准ASS字幕文件
- **智能分段**：根据语义和长度自动分段文本
- **时间轴计算**：自动计算字幕显示时间
- **字体修复**：自动修复不兼容字体问题

### API 使用示例
```javascript
const SubtitleGenerator = require('./scripts/subtitle-generator');

// 创建实例
const generator = new SubtitleGenerator({
  fontSize: 12,
  color: '&H0000FFFF' // 黄色
});

// 生成字幕
const subtitles = await generator.generateFromText(
  '完整配音文本内容...',
  60 // 总时长60秒
);

// 保存ASS文件
await generator.generateASS(subtitles, 'audio/subtitles.ass');

// 修复字体兼容性
await generator.fixFontCompatibility('audio/subtitles.ass');

// 检查质量
const result = await generator.checkQuality('audio/subtitles.ass');
console.log(result.summary);
```

### 字幕格式规范
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
Dialogue: 0,0:00:00.50,0:00:03.50,Default,,30,30,30,,PPT这件事，大多数人还在\N用错误的方式做。
Dialogue: 0,0:00:03.50,0:00:07.50,Default,,30,30,30,,长字幕内容\N自动分多行显示
```

**标准参数**（必须严格遵守）：
| 参数 | 值 | 说明 |
|------|-----|------|
| `Fontsize` | **10** | 10px，竖屏视频最佳阅读尺寸 |
| `PrimaryColour` | `&H00FFFF` | 黄色（#00FFFF）|
| `Alignment` | **2** | 底部居中 |
| `MarginL` | **30** | 左侧边距 30px |
| `MarginR` | **30** | 右侧边距 30px |
| `MarginV` | **30** | 底部边距 30px |
| `WrapStyle` | **0** | 支持 `\N` 换行符 |
| `Fontname` | `PingFang SC` | macOS 系统中文字体 |
| `Outline` | 1 | 1px 黑色描边，防止白字在浅色背景看不清 |

## 🔍 质量检查器 (QualityChecker)

### 检查项目
1. **项目结构**：检查必需的目录和文件
2. **字体兼容性**：检查并修复不兼容字体
3. **音频质量**：检查音频文件格式、时长、码率
4. **字幕质量**：检查ASS格式、时间轴、同步
5. **视频质量**：检查分辨率、帧率、时长、文件大小

### 检查报告示例
```
📊 质量检查报告
============================================================
项目目录: ./my-video-project
检查时间: 2026-04-15 21:45:00

❌ 错误: 2
⚠️  警告: 3
ℹ️  信息: 1
🔧 已修复: 1

❌ 严重错误:
  1. FONT_COMPATIBILITY: 文件使用不兼容字体: STHeiti Medium
     文件: audio/subtitles.ass
     解决方案: 替换为 PingFang SC

  2. VIDEO_RESOLUTION: 视频分辨率不正确: 1920x1080
     文件: video/out/video.mp4
     解决方案: 应为1080x1920（竖屏）

⚠️  警告建议:
  1. AUDIO_DURATION: 音频时长过短: 15.3秒
     文件: audio/narration.m4a

💡 优化建议:
  1. 使用PingFang SC字体确保macOS兼容性
  2. 使用edge-tts生成自然人声，避免macOS say机械音
  3. 确保视频分辨率为1080x1920竖屏，帧率60fps
```

### API 使用示例
```javascript
const QualityChecker = require('./scripts/quality-checker');

// 创建检查器
const checker = new QualityChecker({
  projectDir: './my-video-project',
  fixIssues: true, // 自动修复
  verbose: true
});

// 运行检查
const report = await checker.runFullCheck();

// 保存报告
await checker.saveReport(report, 'quality-report.json');

console.log(`检查结果: ${report.summary.passed ? '✅ 通过' : '❌ 失败'}`);
```

## 🚀 集成到视频创作工作流

### 在main.js中集成字幕生成
```javascript
// 在generateVideo方法中添加字幕生成
const SubtitleGenerator = require('./subtitle-generator');

async function generateVideo() {
  // ... 其他代码 ...
  
  // 生成字幕
  const subtitleGenerator = new SubtitleGenerator();
  const narrationText = await fs.readFile('audio/full_narration.txt', 'utf8');
  const subtitles = await subtitleGenerator.generateFromText(
    narrationText,
    videoDuration
  );
  
  await subtitleGenerator.generateASS(
    subtitles,
    'audio/subtitles.ass'
  );
  
  // ... 其他代码 ...
}
```

### 在视频渲染后运行质量检查
```javascript
// 在视频生成完成后运行质量检查
const QualityChecker = require('./quality-checker');

async function finalizeVideo() {
  // ... 生成视频 ...
  
  // 运行质量检查
  const checker = new QualityChecker({
    projectDir: this.options.outputDir,
    fixIssues: true
  });
  
  const report = await checker.runFullCheck();
  
  if (!report.summary.passed) {
    console.warn('⚠️  视频质量检查发现问题，请查看报告');
    await checker.saveReport(report);
  }
}
```

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

### 批量处理报告
批量处理会生成详细的JSON报告，包含：
- 每个项目的检查结果
- 发现的问题和修复情况
- 总体统计信息
- 优化建议

## 🔧 常见问题与解决方案

### 1. 字体兼容性问题
**问题**: `STHeiti Medium` 在macOS上不存在
**解决方案**: 
```bash
# 自动修复
node scripts/video-check.js fix-fonts --project ./my-project

# 或手动修复
find . -name "*.ass" -exec sed -i '' 's/STHeiti Medium/PingFang SC/g' {} \;
```

### 2. 音频质量问题
**问题**: 使用macOS say机械音
**解决方案**: 使用edge-tts生成自然人声
```bash
# 安装edge-tts
python3 -m pip install --user edge-tts

# 生成音频
edge-tts --voice zh-CN-YunjianNeural --text "$(cat narration.txt)" --write-media audio/narration.mp3
```

### 3. 字幕同步问题
**问题**: 字幕与音频不同步
**解决方案**: 使用智能时间轴计算
```javascript
const generator = new SubtitleGenerator();
const subtitles = await generator.generateFromText(text, audioDuration);
```

### 4. 字幕轨道丢失（ASS 无法嵌入 MP4）
**问题**: 使用 `ffmpeg -c:v copy -c:a copy` 混流后，ASS 字幕轨道丢失，MP4 容器不支持嵌入 ASS 字幕。
**解决方案**: 必须分两步走：先合并视频音频，再烧录字幕。

```bash
# Step 1: 合并视频 + 音频（不用 -c:s ass，不会生效）
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

### 5. 字幕时间轴与音频语速的关系
**问题**: 字幕按原文速（58s）生成，但音频被 `atempo=1.4x` 压缩到 49.8s，导致字幕时间戳超出视频时长（如 79s），全部错位。

**原则**: 字幕时间轴必须基于**最终音频时长**生成。

**正确流程**:
1. 音频后处理（atempo）→ 确定最终时长 T
2. 字幕生成 → 使用 T 作为总时长生成时间轴
3. 视频渲染 → 帧数 = T × 60fps
4. 混流 + 烧录

**时间轴计算示例**（58s → 3490 帧 @ 60fps）:
```bash
# 音频 1.2x 处理后时长
DUR=$(ffprobe -i audio/neural_1_2x.m4a -show_entries format=duration -v quiet -of csv="p=0")
TOTAL_FRAMES=$(echo "$DUR * 60" | bc | awk '{print int($1+0.5)}')

# 场景比例保持不变，重新计算帧边界
# 原始比例: cover=6%, pain=14%, features=16%, commands=32%, evolve=20%, outro=12%
```

### 6. 视频规格问题
**问题**: 分辨率或帧率不正确
**解决方案**: 确保使用正确参数
```bash
# 使用正确的视频参数
video-creator --width 1080 --height 1920 --fps 60 --duration 60
```

## 📈 最佳实践

### 1. 标准化工作流
```bash
# 1. 创建视频项目
video-creator --url "https://example.com" --output ./my-video

# 2. 生成字幕
video-creator subtitles --generate --project ./my-video

# 3. 运行质量检查
video-creator check --project ./my-video --fix

# 4. 批量处理（定期维护）
video-creator batch --directory ./workspace --fix
```

### 2. 定期质量检查
```bash
# 每周运行一次批量检查
0 9 * * 1 cd ~/.openclaw/skills/video-creator && node scripts/video-check.js batch-process --directory ~/VideoProjects --fix
```

### 3. 集成到CI/CD
```bash
# 在自动化流程中添加质量检查
video-creator check --project $PROJECT_DIR --fix
if [ $? -ne 0 ]; then
  echo "❌ 质量检查失败"
  exit 1
fi
```

## 🎯 总结

新的字幕生成和质量检查系统为video-creator技能提供了：

1. **专业字幕支持**：智能生成兼容性良好的ASS字幕
2. **全面质量保障**：从字体到视频的全面检查
3. **自动化修复**：减少手动操作，提高效率
4. **批量处理能力**：适合管理大量视频项目
5. **标准化输出**：确保每个视频都符合专业标准

---

## ⚠️ 血泪教训（必须遵守）

> **核心原则**：字幕时间轴必须基于**最终音频时长**，在音频后处理（atempo）完成之前，禁止生成字幕。

| 错误做法 | 正确做法 |
|---------|---------|
| 先生成字幕，再调音频语速 | 先调音频语速，确认最终时长，再生成字幕 |
| 用 `ffmpeg -c:s ass` 嵌入 ASS 到 MP4 | 用 `ffmpeg -vf "ass=xxx.ass"` 烧录到画面 |
| 音频 1.4x 压缩后用原速字幕 | 音频 1.2x 处理后，用最终时长 58s 生成字幕 |

**标准流程**：
```
1. edge-tts 生成原始音频（58s）
         ↓
2. atempo 后处理（1.2x）→ 58s → 确认最终时长
         ↓
3. Remotion 渲染视频（帧数 = 58 × 60 = 3480帧）
         ↓
4. 生成 ASS 字幕（基于 58s 时长）
         ↓
5. ffmpeg 合并视频+音频（stream copy）
         ↓
6. ffmpeg 烧录字幕（-vf "ass=xxx.ass"）→ 最终视频
```

通过集成这些功能，video-creator技能现在能够生成更专业、更一致的高质量视频内容。