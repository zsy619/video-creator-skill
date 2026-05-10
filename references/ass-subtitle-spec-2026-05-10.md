# ASS 字幕规范（2026-05-10 验证）

## 核心参数（已验证）

| 参数 | 值 | 说明 |
|------|-----|------|
| Fontsize | **72** | 竖屏 1080×1920，视觉约40px |
| PlayResX | **1080** | 竖屏宽度 |
| PlayResY | **1920** | 竖屏高度 |
| PrimaryColour | `&H00FFFF` | 黄色 |
| Alignment | **2** | 底部居中 |
| MarginV | **50** | 底部边距 |
| Outline | **2** | 2px描边 |
| 字段数 | **10** | Format和Dialogue各10字段 |

## 换行符
使用 `\N`（单反斜杠），禁止 `\\N`

## 验证命令
```bash
ffmpeg -y -i video_with_audio.mp4 -vf "ass=audio/subtitles.ass" -f null -
```
