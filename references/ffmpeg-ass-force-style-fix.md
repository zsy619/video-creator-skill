# ffmpeg ASS 字幕烧录 — `force_style` 不存在问题

> 来源：officecli-video 项目，2026-05-09
> 关联：video-creator / TROUBLESHOOTING.md / SUBTITLES.md

## 问题

**症状**：
```
[fc#-1] Error applying option 'force_style' to filter 'ass': Option not found
Error opening output file final_with_subtitles.mp4.
```

**触发命令**：
```bash
ffmpeg -y -i video_raw_audio.mp4 \
  -vf "ass=../../audio/subtitles.ass:force_style='FontSize=72,PrimaryColour=&H00FFFF,Alignment=2,MarginV=30'" \
  -c:v libx264 -preset fast -crf 23 -c:a copy \
  final_with_subtitles.mp4
```

**根因**：ffmpeg 内嵌的 libass 滤镜不支持 `force_style` 参数。`force_style` 是 VSFilter/MPC-HC 的扩展语法，不是标准 ASS 滤镜参数。

---

## 正确做法

将所有样式直接写入 `.ass` 文件，ffmpeg 只负责烧录，不做样式覆盖。

### ASS 文件模板（72px 青色粗体，底部居中）

```ass
[Script Info]
Title: OfficeCLI Video Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,72,&H00FFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,2,2,30,30,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:03.00,Default,,30,30,30,,让 AI Agent 控制 Office 文档
```

### 关键 Style 字段

| 字段 | 值 | 说明 |
|------|-----|------|
| Fontsize | 72 | 竖屏视频最佳阅读尺寸 |
| PrimaryColour | &H00FFFF | 青色（十六进制 ARGB） |
| Bold | -1 | 加粗（-1=True, 0=False） |
| Alignment | 2 | 底部居中（1=左下, 2=正中下, 3=右下） |
| Outline | 2 | 2px 描边（可见性保障） |
| Shadow | 2 | 2px 阴影（深度感） |
| MarginL/MarginR | 30 | 左右边距 30px |
| MarginV | 30 | 底部边距 30px |
| Fontname | Arial | 兼容性最佳（避免 PingFang SC 等系统字体路径问题） |

### ffmpeg 烧录命令（只烧录，不改样式）

```bash
# ✅ 正确 — 样式已在 ASS 文件内定义
ffmpeg -y -i video_raw_audio.mp4 \
  -vf "ass=audio/subtitles.ass" \
  -c:v libx264 -preset fast -crf 23 \
  -c:a copy \
  video-project/out/final_with_subtitles.mp4

# ❌ 错误 — force_style 参数不存在
ffmpeg -y -i video_raw_audio.mp4 \
  -vf "ass=audio/subtitles.ass:force_style='FontSize=72,...'" \
  ... → Option not found
```

---

## 工作流（完整）

```
1. edge-tts 生成配音 → audio/neural_full.mp3
         ↓
2. 确认音频时长 T（如 58.944 秒）
         ↓
3. 生成 ASS 字幕（含完整 Style，用 Arial/72px/青色）
         ↓
4. Remotion 渲染无音频视频 → /tmp/raw.mp4
         ↓
5. ffmpeg 混流（视频 + 音频，用 -shortest 截断到 T）
         ↓
6. ffmpeg 烧录字幕（只用 -vf "ass=subs.ass"）
```

---

## 经验总结

1. **不要依赖 ffmpeg 覆盖 ASS 样式** — 样式必须在 ASS 文件内定义完整
2. **Fontname 用 Arial** — 比 PingFang SC 等系统字体更稳定，避免字体路径问题
3. **Outline=2, Shadow=2** — 竖屏视频背景复杂，必须加描边才能保证字幕可见性
4. **Bold=-1** — 中文内容加粗提升可读性
