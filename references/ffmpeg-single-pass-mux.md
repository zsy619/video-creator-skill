# ffmpeg 单次混流：PIL 帧序列 + ASS 字幕 + 音频

## 正确语法（60fps, 1080×1920 竖屏）

```bash
ffmpeg -y \
  -framerate 60 \
  -i video-project/frames/frame_%04d.png \
  -i video-project/audio/neural_1_2x.m4a \
  -filter_complex "[0:v]ass=video-project/audio/subtitles.ass[v]" \
  -map "[v]" -map 1:a \
  -c:v libx264 -preset fast -crf 18 \
  -c:a aac -b:a 128k \
  -r 60 -s 1080x1920 \
  video-project/final.mp4
```

## 关键教训

**❌ 错误写法（已踩坑）：**
```bash
# 错误：把音频放进 filter_complex 的 ASS 输入
-filter_complex "[0:v][1:a]ass=subs.ass[v][a]"
# → Error: More input link labels specified for filter 'ass' than it has inputs
# ASS 过滤器只有1个视频输入端口，不接受音频输入
```

**✅ 正确写法：**
- `[0:v]ass=subs.ass[v]` — ASS 只处理视频帧（输入0视频）
- `-map 1:a` — 音频直接从输入1 map出来，不进滤镜链

## 参数说明

| 参数 | 值 | 说明 |
|------|----|------|
| `-framerate 60` | 输入帧率 | PIL 帧序列必须是 60fps |
| `-r 60` | 输出帧率 | 确保最终视频 60fps |
| `-s 1080x1920` | 分辨率 | 竖屏 9:16 |
| `-crf 18` | 质量 | H.264 CRF 18（高质量） |
| `-preset fast` | 编码速度 | libx264 编码预设 |
| `-c:a aac -b:a 128k` | 音频 | AAC 128k |

## 竖屏坐标基准（ASS PlayResY=1920）

ASS 字幕在 1080×1920 竖屏下的推荐配置（来自 subtitle-generator.js）：
- Fontsize: 72（竖屏标准）
- PlayResX/PlayResY: 1080×1920
- Alignment: 2（底部居中）
- MarginV: 50
- Outline: 2（2px 黑色描边）
