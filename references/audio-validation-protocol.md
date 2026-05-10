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
| `-c:a copy` 后音频仍无效 | 复制了 Remotion 内嵌的静音音频轨道 | 先 `ffmpeg -map 0:v -c:v copy` 提取纯视频，再混流 |
| ffprobe 显示正常但实际静音 | Remotion 视频含结构正常的静音 AAC 轨（317kbps） | 必须用 astats 验证 RMS；volumedetect 显示 -91dB 恒定值即静音 |
| ffprobe 显示正常但实际静音 | ffprobe 只读结构不读内容 | 必须用 astats 验证 RMS |

---

## 新增：Remotion 内嵌静音轨干扰混流（v1.1.0）

> **现象**：Remotion 渲染的 raw 视频内部含有一个结构正常但实际静音的 AAC 轨道（不是空轨道）。ffprobe 显示 `codec_name=aac, bit_rate=317k`，但 `astats` 显示所有帧 RMS=-inf（真静音）。当直接用 `ffmpeg -i remotion_raw.mp4 -i audio.m4a -c:v copy -c:a copy` 合并时，ffmpeg 默认选择第一个音频流（Remotion 内嵌的静音轨），导致最终视频音频静默。

**诊断特征**：
- ffprobe 显示 `codec_name=aac` + 正常 bit_rate（317k）
- astats 显示所有帧 RMS=-inf（真静音）
- volumedetect 显示 -91dB 恒定（静音特征）
- 直接 `-c:a copy` 合并后音频无效

**解决方案**：两步隔离法
```bash
# Step 1: 提取纯视频轨道（丢弃 Remotion 内嵌的静音音频）
ffmpeg -y -i remotion_raw.mp4 -map 0:v -c:v copy video_only.mp4

# Step 2: 用纯视频与外部音频合并
ffmpeg -y -i video_only.mp4 -i neural_1_2x.m4a \
  -map 0:v -map 1:a \
  -c:v copy -c:a copy \
  final_with_audio.mp4
```

**关键**：`ffmpeg -c:a copy` 默认选择输入的第一个音频流，必须用 `-map 0:v -map 1:a` 显式指定只从第二个输入（外部音频文件）取音频。

---

## 新增：音频时长偏差阈值（v1.2.0）

> **核心问题**：atempo 加速 + 裁剪模式会导致音频时长与目标偏差过大，字幕时间轴与实际内容错位。
>
> **根因**：先生成超长配音 → atempo 加速 → 裁剪 → 基于错误时长生成字幕 → 音画不同步。
>
> **修复**：强制 5% 偏差阈值，超出则退出码=1，阻止继续生成。

### 阈值检查命令
```bash
#!/bin/bash
TARGET_DURATION=60   # 目标时长（秒）
AUDIO_FILE="audio/neural_1_2x.m4a"
THRESHOLD_PCT=5      # 允许偏差 5%

ACTUAL=$(ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=nokey=1 "$AUDIO_FILE")

DIFF=$(python3 -c "print(abs($ACTUAL - $TARGET_DURATION) / $TARGET_DURATION * 100)")
PASS=$(python3 -c "exit(0 if $DIFF <= $THRESHOLD_PCT else 1)")

if [ $? -eq 0 ]; then
  echo "✅ 音频时长偏差 ${DIFF}%（≤ ${THRESHOLD_PCT}%），通过"
else
  echo "❌ 音频时长偏差 ${DIFF}%（> ${THRESHOLD_PCT}%），失败"
  echo "   目标: ${TARGET_DURATION}s, 实际: ${ACTUAL}s"
  echo "   可能原因：atempo 加速 + 裁剪反模式"
  exit 1
fi
```

### 嵌入 video-quality-gate.js 节点 A
此检查已内置于 `video-quality-gate.js --node audio`：
- 音频时长偏差 > 5% → `❌ 音频时长偏差过大，可能存在 atempo+裁剪反模式`
- 音频时长偏差 ≤ 5% → `✅ 音频时长正常`

### 快速检查（单行）
```bash
python3 -c "d=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=nokey=1 audio/neural_1_2x.m4a); exit(0 if abs(d-60)/60*100<=5 else 1)" && echo "通过" || echo "失败"
```

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
