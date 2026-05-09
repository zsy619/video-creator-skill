# 字幕字号规范（2026-05 实测修正）

## 核心修正

| 平台 | 字号 | 说明 |
|------|------|------|
| **竖屏视频**（小红书/抖音/视频号） | **28px** | 2026-05 实测通过，28px 在 1080x1920 上清晰可读 |
| 桌面端/横屏视频 | 10px | ASS 字幕标准化像素值 |

## 矛盾根源

`rules/SUBTITLES.md` 存在内部矛盾：
- 表格写 `fontSize=10`
- 文字写 `禁止字号低于36px`
- 旧版还写 `72px黄色`

实际 session（ian-handdrawn-ppt，2026-05-09）用 **28px** 成功烧录，人眼可读。

## ffmpeg 烧录命令（已验证）

```bash
# ✅ 正确：不要加 force_style
ffmpeg -y \
  -i video_noaudio.mp4 \
  -vf "ass=subtitles.ass:fontsdir=/System/Library/Fonts" \
  -c:a copy \
  final.mp4

# ❌ 错误：force_style 会报 "option not found"
ffmpeg -y -i video.mp4 -vf "ass=subs.ass:fontsdir=...:force_style=..." final.mp4
```

## 字幕生成脚本核心参数（竖屏 28px）

```python
def generate_ass(subtitles, output_path, font_size=28):
    style_line = (
        "Style: Default,PingFang SC,"
        f"{font_size},"          # ← 竖屏用 28
        "&H00FFFF,"              # 黄色
        ...
    )
```

## 黑屏问题修复（fadeIn 动画）

| 问题 | 原因 | 修复 |
|------|------|------|
| 视频开头 0-0.5s 黑屏 | fadeIn/slideUp 动画 25-20 帧太长 | 改为 15 帧内完成 |

动画太长会导致首帧看起来是黑屏，实际内容在动画结束后才完全显示。

## 封面标题溢出

| 问题 | 修复 |
|------|------|
| 标题 80px 超出 1080px 宽度 | 80px→56px，width:"90%", left:"50%", transform:"translate(-50%,0)" |

18 字符标题在 56px 下约 1008px 宽，配合 90% 宽度约束可以完整显示。

## 音画同步

| 关键点 | 操作 |
|--------|------|
| 先确认音频最终时长 | ffprobe -v error -show_entries format=duration |
| 再生成字幕时间轴 | 基于最终时长，不是原始时长 |
| 最后调整视频帧数 | `durationInFrames = round(T * fps)` |

atempo 1.15x 处理后音频为 58.3s，视频设为 3500 帧（58.33s），偏差 <0.1s 人耳不可闻。
