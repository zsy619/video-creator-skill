# 字幕生成与 MP4 混流

> **类型**: 技术参考  
> **版本**: v1.2.0  
> **更新**: 2026-05-10（补充 ASS 字幕处理与软字幕方案）  
> **相关**: WORKFLOW.md Step 7 · remotion-audio-strip.md

---

## SRT 字幕格式

```srt
1
00:00:00,000 --> 00:00:03,000
Fireworks Tech Graph

2
00:00:03,000 --> 00:00:08,000
还在用手画技术图？
```

- 时间：`HH:MM:SS,mmm --> HH:MM:SS,mmm`（毫秒用逗号）
- 序号从 1 开始
- 时间轴参考 `docs/video-script.md` 场景边界

---

## ASS 字幕格式（高级样式）

```ass
[Script Info]
Title: AiToEarn 字幕
PlayResX: 1080
PlayResY: 1920
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,PingFang SC,72,&H00FFFF,&H000000FF,&H00000000,&H00000000,-1,2,0,2,20,20,50,134

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:03.00,Default,,0,0,50,,欢迎来到 AiToEarn
```

**关键参数**：
- `Fontsize=72`（竖屏 1080x1920 推荐值，ASS 单位非像素）
- `PrimaryColour=&H00FFFF`（黄色字幕，BGR 格式）
- `Alignment=2`（底部居中）
- `Outline=2`（描边宽度）
- 10 字段标准格式

**ASS 时间轴格式**：`H:MM:SS.cc`（厘秒 centiseconds）

---

## MP4 内嵌字幕（mov_text）+ 音频混流

> ⚠️ **优先使用软字幕**（mov_text），烧录（ASS滤镜）极慢（~25分钟/分钟视频）

```bash
cd video-project

# 方案A：软字幕嵌入（推荐，秒级完成）
ffmpeg -y \
  -i out/video_with_audio.mp4 \
  -i audio/subtitles.srt \
  -map 0:v -map 0:a -map 1:s:0 \
  -c:v copy -c:a copy -c:s mov_text \
  final_with_subs.mp4

# 方案B：ASS 烧录（耗时长，但兼容所有播放器）
# ⚠️ ASS 滤镜极慢，1080x1920@60fps 视频约需 20-30 分钟烧录
ffmpeg -y -i video_with_audio.mp4 -vf "ass=audio/subtitles.ass" \
  -c:v libx264 -preset ultrafast -crf 23 \
  -c:a copy \
  final_hard_subs.mp4
```

---

## 仅音频混流（无字幕）

```bash
ffmpeg -y \
  -i out/video_raw.mp4 \
  -i public/audio/neural_processed.m4a \
  -c:v copy -c:a aac -b:a 192k \
  -map 0:v:0 -map 1:a:0 \
  -shortest \
  out/final-video.mp4
```

---

## 去除 Remotion 自动混入的音频

> ⚠️ Remotion 4.x 会自动将 `public/` 下的音频混入输出。重新混流前须先去除。

```bash
ffmpeg -y -i out/video_raw.mp4 \
  -c:v copy -an \
  out/video_clean.mp4
```

---

## 音频速率同步问题

> ⚠️ edge-tts 生成 1.2x 加速音频时，字幕时间轴必须同步调整

**问题**：1.2x 加速后音频时长 = 原时长 / 1.2，字幕时间轴若使用原时长会导致不同步

**解决方案**：生成字幕时直接使用 1.2x 音频的实际时长计算时间轴

```bash
# 查看音频实际时长
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 audio/neural_1_2x.m4a
# 输出：57.764000（原70秒音频加速后）

# 场景帧边界计算（57.764秒 @ 60fps = 3465帧）
# 1.2x 音频的字幕时间轴需按 57.764 秒总长分配
```

---

## ASS 字幕滤镜问题汇总

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `Error opening font: PingFangUI.ttc` | 系统找不到该字体 | 改用 `Fontname=PingFang SC`，macOS 会自动映射 |
| 烧录极慢（~25分钟/分钟视频） | libass + yuv420p 转码瓶颈 | 改用软字幕（mov_text），或使用 `preset ultrafast` |
| `force_style` 选项不存在 | ffmpeg 语法错误 | 直接在 ASS 文件中定义 style，不使用 filtergraph 参数 |
| 视频画面偏移/裁剪 | PlayResX/PlayResY 与视频分辨率不匹配 | 确保 ASS 文件中 `PlayResX: 1080`, `PlayResY: 1920` |

---

## 验证命令

| 检查项 | 命令 |
|--------|------|
| 视频流 | `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,duration -of default=noprint_wrappers=1 <file>` |
| 音频轨道 | `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of default=noprint_wrappers=1 <file>` |
| 字幕轨道 | `ffprobe -v error -select_streams s:0 -show_entries stream=codec_name -of default=noprint_wrappers=1 <file>` |
| 音频时长 | `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 <file>` |
| 帧数 | `ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of default=noprint_wrappers=1 <file>` |

---

## 历史案例

| 日期 | 项目 | 需求 | 方案 |
|------|------|------|------|
| 2026-05-08 | fireworks-tech-graph | 有声+有字幕 | ffmpeg 混流 + mov_text |
| 2026-05-10 | AiToEarn | 57.75秒视频+字幕 | 软字幕秒级完成；ASS烧录超时改用mov_text |
