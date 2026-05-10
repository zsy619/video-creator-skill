# Remotion 内置字幕 + ASS 烧录 = 双字幕问题

> 来源：aitoearn-video 项目，2026-05-10
> 关联：video-creator / rules/SUBTITLES.md

## 问题

**症状**：视频播放时同一位置显示两行字幕，颜色可能不同。

**根因**：Remotion 视频组件中使用了 `<Subtitles />` 组件（渲染到视频帧内），再执行 ASS 字幕烧录，会产生双层字幕：
- 一层是 Remotion 渲染进画面的字幕（颜色、位置由 React 组件控制）
- 一层是 ffmpeg 烧录的 ASS 字幕

## 解决方案

渲染 Remotion 视频之前，必须先移除所有场景的 `<Subtitles />` 组件调用：

```bash
# 移除所有 <Subtitles /> 行（保留 Subtitles 组件定义供其他项目参考）
sed -i '' 's/<Subtitles \/>//g' src/Video-{project}.tsx
```

## 正确流程

```
1. 生成 ASS 字幕（Fontsize=72, 10字段标准格式）
         ↓
2. 渲染 Remotion 视频（确保已移除 <Subtitles /> 调用）
         ↓
3. ffmpeg 混流（视频 + 音频）
         ↓
4. ffmpeg 烧录字幕 → 最终视频（只有一层 ASS 字幕）
```

## 验证命令

烧录后检查是否只有一层字幕：
```bash
ffprobe -v error -show_entries stream=codec_type -of csv=p=0 final.mp4
# 应输出：
# video
# audio
# 不应有第二个 subtitle 流
```
