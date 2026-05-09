# 低码率音频修复：ffmpeg 混流必须强制重编码

## 问题症状
视频包含音频流（ffprobe 显示 codec_name=aac），但播放无声或几乎听不见。

## 根因分类

### 类型一：edge-tts 原始音频码率极低
edge-tts 生成的原始音频码率极低（常为 2-8 kbps），ffmpeg 混流时使用 `-c:a copy` 直接复制流，保留了低码率，导致播放器解码后音频信号极弱。

### 类型二：Remotion raw 视频音频轨道为空 ⚠️【新增重点】
Remotion 在 headless 环境下渲染的视频，音频轨道可能结构完全正常（codec_name=aac, bit_rate=317k, duration=59s），但实际内容为空（所有样本 RMS=-inf / -91dB）。

**这是 Remotion 的已知问题**：chromium 在纯 headless 模式下的 AudioContext 可能产生"空音频轨道"——文件结构正常但内容静音。

**诊断**：
```bash
# ffprobe 显示有音频，但实际为静音
ffprobe -v error -show_streams video_raw.mp4 2>&1 | grep -E "codec_name|bit_rate|duration"
# codec_name=aac, bit_rate=317375 ← 看起来正常

# 但 volumedetect 显示全静音
ffmpeg -i video_raw.mp4 -vn -af "volumedetect" -f null - 2>&1 | grep -E "mean_volume|max_volume"
# mean_volume=-91.0dB, max_volume=-91.0dB ← 实际是静音

# astats 确认所有样本 RMS=-inf
ffmpeg -i video_raw.mp4 -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l
# 0 ← 0个有效样本 = 全部静音
```

## 诊断命令
```bash
ffprobe -v error -show_streams video.mp4 2>&1 | grep -E "codec_name|duration|bit_rate"
# 注意 audio 流的 bit_rate 字段
# 如果是 2000-8000 bps，说明是低码率音频
```

## 正确流程

### edge-tts 音频处理
```bash
# 1. edge-tts 生成原始音频
edge-tts --voice zh-CN-XiaoxiaoNeural --text "..." --write-media neural_original.mp3

# 2. 后处理 + 强制 256k 重编码
ffmpeg -y -i neural_original.mp3 \
  -af "silenceremove=start_periods=1:start_duration=0.1:start_threshold=-50dB:detection=peak,atempo=1.2" \
  -c:a aac -b:a 256k -ar 48000 -ac 2 neural_final.m4a

# 3. apad 补齐到视频时长（如果有静音填充）
ffmpeg -y -i neural_final.m4a \
  -af "apad=whole_dur=58.95" \
  -c:a aac -b:a 256k -ar 48000 -ac 2 neural_padded.m4a

# 4. 混流（注意：不用 -c:a copy，改用 -c:a aac -b:a 256k）
ffmpeg -y -i video_raw.mp4 -i neural_padded.m4a \
  -c:v copy -c:a aac -b:a 256k -shortest output.mp4
```

### Remotion 音频隔离原则 ⚠️【关键】
当 Remotion raw 视频的音频轨道为空时，必须**完全隔离**音频源：

```bash
# ✅ 正确：raw 视频只取视频流，用 -map 0:v 隔离音频轨道
ffmpeg -y \
  -i video_raw.mp4 \
  -i audio_from_edge_tts.m4a \
  -map 0:v \
  -map 1:a \
  -c:v copy \
  -c:a aac -b:a 256k \
  -shortest \
  output.mp4

# ❌ 错误：-c:a copy 会忠实复制 raw 视频中的静音音频流
ffmpeg -y \
  -i video_raw.mp4 \
  -i audio_from_edge_tts.m4a \
  -c:v copy -c:a copy \
  -map 0:v -map 1:a \
  -shortest \
  output.mp4
```

### 音频验证（强制）
```bash
# 验证最终视频音频有效（非0个样本）
RMS_COUNT=$(ffmpeg -i output.mp4 \
  -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" \
  -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l)
[ "$RMS_COUNT" -eq 0 ] && echo "❌ 音频无效" && exit 1
echo "✅ 音频有效（$RMS_COUNT 个样本）"
```

## 关键教训
| 错误做法 | 正确做法 |
|---------|---------|
| `-c:a copy` 复制低码率流 | `-c:a aac -b:a 256k` 强制重编码 |
| 只看音频时长是否匹配 | 必须检查 `bit_rate` 字段是否 ≥ 128k |
| 相信 edge-tts 原始输出码率 | edge-tts 原始码率极低，必须重编码 |
| **❌ 只用 ffprobe 确认音频正常** | **⚠️ 必须用 astats 验证 RMS > -60dB（ffprobe 可能被 Remotion 空轨道骗过）** |
| **❌ Remotion raw 视频音频轨道看似正常** | **⚠️ 必须用 volumedetect 确认 mean_volume > -60dB** |

## 验证
```bash
ffprobe -v error -show_streams output.mp4 2>&1 | grep "bit_rate"
# audio 流 bit_rate 应该 ≥ 128000 (128kbps)
```
