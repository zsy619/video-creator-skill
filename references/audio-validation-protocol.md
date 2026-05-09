# 音频验证完整协议

> 所属模块：video-creator / references
> 版本：v1.0.0
> 用途：音频有效性验证的完整协议，涵盖 edge-tts 生成音频、Remotion 渲染音频、混流后视频的验证

---

## 核心问题

**ffprobe 显示音频流正常 ≠ 音频实际有效**

Remotion headless 渲染产生的音频轨道可能：
- 结构完全正常（codec_name=aac, bit_rate=317k, duration=59s）
- 但内容实际为空（所有样本 RMS=-inf，即真静音）

这是 Remotion/chromium 在纯 headless 环境下的已知问题。

---

## 验证方法

### 方法一：astats（最准确）✅

```bash
ffmpeg -i <file> \
  -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" \
  -f null - 2>&1 | grep "RMS_level"
```

**解读**：
- RMS_level=-inf → 该帧音频样本为0（静音或空）
- RMS_level>-60dB → 该帧音频有实际内容

**判断标准**：
```bash
# 统计有效样本数量（0个 = 全部静音）
RMS_COUNT=$(ffmpeg -i <file> \
  -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" \
  -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l)

[ "$RMS_COUNT" -eq 0 ] && echo "❌ 音频无效（全静音）" || echo "✅ 音频有效（$RMS_COUNT 个有效样本）"
```

### 方法二：volumedetect（快速检查）

```bash
ffmpeg -i <file> -vn -af "volumedetect" -f null - 2>&1 | grep -E "mean_volume|max_volume"
```

**解读**：
- mean_volume=-91dB, max_volume=-91dB → 实际是静音
- mean_volume > -60dB → 有实际音频内容

### 方法三：ffprobe（结构检查）

```bash
ffprobe -v error -show_streams <file> 2>&1 | grep -E "codec_name|bit_rate|duration"
```

**注意**：此方法只能看结构，不能判断内容是否有效。Remotion 空轨道的 ffprobe 输出看起来完全正常。

---

## 验证节点（强制）

### 节点1：edge-tts 原始音频
```bash
RMS_COUNT=$(ffmpeg -i audio/neural_original.mp3 \
  -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" \
  -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l)
[ "$RMS_COUNT" -eq 0 ] && echo "❌ edge-tts 原始音频无效" && exit 1
echo "✅ edge-tts 原始音频有效"
```

### 节点2：后处理音频（atempo + 去静音）
```bash
RMS_COUNT=$(ffmpeg -i audio/neural_1_2x.m4a \
  -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" \
  -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l)
[ "$RMS_COUNT" -eq 0 ] && echo "❌ 后处理音频无效" && exit 1
echo "✅ 后处理音频有效"
```

### 节点3：Remotion raw 视频音频（验证隔离必要性）
```bash
# ⚠️ 确认 Remotion raw 视频音频是否为空
RMS_COUNT=$(ffmpeg -i video_raw.mp4 \
  -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" \
  -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l)
echo "Remotion raw 音频有效样本: $RMS_COUNT"
# 如果 =0，说明需要音频隔离
```

### 节点4：最终视频（混流后）
```bash
# ⚠️ 最终验证，禁止跳过
RMS_COUNT=$(ffmpeg -i out/final-video.mp4 \
  -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" \
  -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l)
[ "$RMS_COUNT" -eq 0 ] && echo "❌ 最终视频音频无效" && exit 1
echo "✅ 最终视频音频有效（$RMS_COUNT 个有效样本）"
```

---

## 快速验证脚本

```bash
#!/bin/bash
# audio-validate.sh — 音频有效性快速验证
FILE="$1"
if [ -z "$FILE" ]; then
  echo "用法: $0 <音频或视频文件>"
  exit 1
fi

echo "=== 音频验证: $FILE ==="

# astats 检测
RMS_COUNT=$(ffmpeg -i "$FILE" \
  -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" \
  -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l)

echo "有效音频样本数: $RMS_COUNT"

if [ "$RMS_COUNT" -eq 0 ]; then
  echo "❌ 结果: 音频无效（全静音或空轨道）"
  exit 1
else
  echo "✅ 结果: 音频有效"
fi

# volumedetect 辅助信息
echo ""
echo "=== 音量信息 ==="
ffmpeg -i "$FILE" -vn -af "volumedetect" -f null - 2>&1 | grep -E "mean_volume|max_volume"
```

---

## 问题与解决方案

| 问题 | 原因 | 解决 |
|------|------|------|
| edge-tts 音频码率极低（2-8kbps）| 原始输出特性 | 后处理时用 `-c:a aac -b:a 256k` 重编码 |
| Remotion raw 视频音频全静音 | chromium headless AudioContext 问题 | 混流时用 `-map 0:v -map 1:a` 隔离，只用 edge-tts 音频 |
| `-c:a copy` 后音频仍无效 | 复制了 Remotion 空轨道 | 改用 `-c:a aac -b:a 256k` 强制重编码 |
| ffprobe 显示正常但实际静音 | ffprobe 只读结构不读内容 | 必须用 astats 验证 RMS |

---

## 关键命令速查

```bash
# 1. 快速检查（单行）
ffmpeg -i file.mp4 -vn -af "volumedetect" -f null - 2>&1 | grep -E "mean|max"

# 2. 精确验证（统计有效样本）
ffmpeg -i file.mp4 -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l

# 3. Remotion raw 视频音频检查
ffmpeg -i video_raw.mp4 -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l
# 0 = 空轨道，需要音频隔离

# 4. 最终视频音频验证
ffmpeg -i final-video.mp4 -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l
# 非0 = 有效
```
