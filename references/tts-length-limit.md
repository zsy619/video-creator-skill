# TTS 工具长度限制与应对策略

## 核心发现（2026-05-13 修正）

`zh-CN-YunjianNeural` + `atempo 1.2x` 在实际视频旁白（长复合句，含英文/符号）中实测：

| 中文字数 | 实际时长 | 语速 |
|---------|---------|------|
| 294字 | 78.9秒 | **3.73 字/秒** |
| 184字 | 52.8秒 | **3.73 字/秒** |

**安全字数上限**：`⌊目标时长 × 3.37⌋`（3.37 = 3.73 × 0.9）

> ⚠️ 6.45 字/秒基准来自高密度短句测试，与实际视频旁白（含大量英文、符号、URL、长复合句）差异显著。**实际项目必须用 3.37 安全上限。**

| 场景 | 文本长度 | 生成时长 | 结果 |
|------|---------|---------|------|
| 长文本（完整旁白） | ~300字 | 23.9s | 截断，文本后半部分丢失 |
| 短文本（单场景） | ~50字 | 4-6s | 正常生成 |

**现象**：调用 `text_to_speech` 生成约 300 字旁白，返回 23.9s 音频（约 23-24s 时被截断），后续文本内容完全丢失。

## 应对策略

### 策略一：ffmpeg atempo 拉伸（推荐）

适用于：配音文本可以一次生成但需要加速的场景

```bash
# 1. 生成长文本原始音频（允许截断）
text_to_speech --text "完整旁白..." --output audio/original.mp3

# 2. 检查实际生成时长
ffprobe -v error -show_entries format=duration audio/original.mp3
# → 例如：23.9s

# 3. 用 atempo 拉伸到目标时长
ffmpeg -y -i audio/original.mp3 \
  -af "atempo=1.0" \
  -c:a aac audio/full.mp3
```

### 策略二：ffmpeg 拼接 + 1.2x（当前 session 采用）

适用于：有原始长音频（>50s），需要压缩到视频长度

```bash
# 原始音频 62.4s → 1.2x → 51.7s → apad → 58.95s
ffmpeg -y -i neural_full.mp3 \
  -af "silenceremove=start_periods=1:start_duration=0.1:start_threshold=-50dB:detection=peak,atempo=1.2" \
  -c:a aac -b:a 128k neural_1_2x.m4a

ffprobe -v error -show_entries format=duration neural_1_2x.m4a
# → 51.685s

# 用 apad 补齐到视频长度
ffmpeg -y -i neural_1_2x.m4a \
  -af "apad=whole_dur=58.95" \
  -c:a aac -b:a 128k neural_padded.m4a
```

### 策略三：分段生成 + 拼接（理论上可行）

理论流程：
```bash
# 将配音文本分成多段，每段 < 24s
text_to_speech --text "段落1" --output part1.mp3
text_to_speech --text "段落2" --output part2.mp3
ffmpeg -y -i "concat:part1.mp3|part2.mp3" -c:a copy full.mp3
```

> ⚠️ **实测问题**：拼接后音频衔接处可能有静音或杂音。

## 关键教训

1. **不要依赖 text_to_speech 生成精确时长的音频** — 它会自动截断
2. **视频 > 音频时的解决方案**：apad 补齐静音（ffmpeg）
3. **最可靠的流程**：先生成原始音频 → 后处理（atempo/apad）→ 确认最终时长 → 生成字幕

## 相关命令

```bash
# 检查音频时长
ffprobe -v error -show_entries format=duration audio.mp3

# 去静音 + 1.2x + AAC
ffmpeg -y -i input.mp3 \
  -af "silenceremove=start_periods=1:start_duration=0.1:start_threshold=-50dB:detection=peak,atempo=1.2" \
  -c:a aac -b:a 128k output.m4a

# 补齐到目标时长
ffmpeg -y -i input.m4a \
  -af "apad=whole_dur=TARGET_DURATION" \
  -c:a aac -b:a 128k output_padded.m4a
```
