# 音频时长三元组不匹配：根因分析与修复手册

> **适用场景**：音频时长 ≠ 视频时长（差值 >0.5s），Remotion 渲染后音画不同步
> **技能版本**：2026-05-27（新增 silent tail 修复方案）

---

## 一、元凶定位（三元组分析）

```
audio (原始)   → atempo 处理   →  audio (atempo后)
     ↓                                    ↓
ffprobe 时长                           ffprobe 时长
= 音频文件时长                        = Remotion 读取的实际时长
                                             ↓
                                      video (渲染后时长)
                                           = Root.tsx fps × durationInFrames
```

**关键原则**：Remotion 渲染时长由 `Root.tsx durationInFrames` 决定，不由音频文件决定。

| 组合 | 症状 |
|------|------|
| atempo=1.0，音频=视频 | ✅ 正确（推荐方案）|
| atempo=1.2，音频<视频 | ❌ 音频比视频短，末尾无声 |
| atempo=0.8，音频>视频 | ❌ 音频比视频长，溢出 |

**检测命令**：
```bash
AUDIO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 video-project/public/audio/neural_1_2x.m4a)
VIDEO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 video-project/out/VerticalVideo.mp4)
echo "Audio: ${AUDIO_DUR}s, Video: ${VIDEO_DUR}s"
python3 -c "import sys; a=float('${AUDIO_DUR}'); v=float('${VIDEO_DUR}'); print(f'DIFF: {abs(a-v):.3f}s ({abs(a-v)*1000:.0f}ms)'); sys.exit(1 if abs(a-v)>0.5 else 0)"
```

---

## 二、atempo=1.0 恢复流程（差值 >0.5s 时）

**适用场景**：音频短于视频 0.5s 以上，需要将音频拉伸到视频时长

### Step 1：确认原始音频
```bash
ffprobe -i audio/neural_full.mp3 -show_entries format=duration -v quiet -of csv=p=0
# → 输出：46.968（秒）
```

### Step 2：用原始音频直接替换（atempo=1.0）
```bash
cp audio/neural_full.mp3 audio/neural_1_2x.m4a
# 注意：edge-tts 原始输出是 MP3，转 AAC：
ffmpeg -y -i audio/neural_full.mp3 -acodec aac -b:a 256k -ar 48000 -ac 2 audio/neural_1_2x.m4a
```

### Step 3：更新 Root.tsx durationInFrames
```python
import math, subprocess
result = subprocess.run(['ffprobe', '-i', 'audio/neural_1_2x.m4a', '-show_entries', 'format=duration', '-v', 'quiet', '-of', 'csv=p=0'], capture_output=True, text=True)
audio_dur = float(result.stdout.strip())  # 秒
frames = math.ceil(audio_dur * 60)
print(f"DURATION_FRAMES = {frames}  # {audio_dur}s × 60fps")
```

### Step 4：更新 video-config.json
```python
import json, math, subprocess
result = subprocess.run(['ffprobe', '-i', 'audio/neural_1_2x.m4a', '-show_entries', 'format=duration', '-v', 'quiet', '-of', 'csv=p=0'], capture_output=True, text=True)
audio_ms = round(float(result.stdout.strip()) * 1000)
with open('video-config.json') as f:
    cfg = json.load(f)
cfg['duration'] = round(audio_ms / 1000)
cfg['totalMs'] = audio_ms
# scenes 等分（6场景）
for i in range(7):
    cfg['scenes'][i]['startMs'] = round(i * audio_ms / 6)
    cfg['scenes'][i]['endMs'] = round((i+1) * audio_ms / 6)
    cfg['scenes'][i]['duration'] = round(audio_ms / 6 / 1000, 2)
with open('video-config.json', 'w') as f:
    json.dump(cfg, f, ensure_ascii=False, indent=2)
```

### Step 5：重新解析 captions.json（SRT→JSON）
从 edge-tts 的 `.srt` 文件重新解析（不要复用旧的 captions.json）

### Step 6：同步到 Remotion public/
```bash
cp audio/neural_1_2x.m4a video-project/public/audio/
cp audio/captions.json video-project/public/audio/
```

### Step 7：重新渲染
```bash
cd video-project && npx remotion render VerticalVideo out/final.mp4
```

---

## 三、Silent Tail 修复（差值 <1s，微调场景）

**适用场景**：音频与视频差值 < 1s（如 osiris：音频 46.968s，视频 47.04s，差 72ms）

**根因**：Remotion 渲染的实际视频时长比 `durationInFrames / 60fps` 多几十毫秒，音频在视频结束前几十毫秒就结束了。

**方案**：用 `apad`（音频填充 pad）将音频 padding 到精确的视频时长

```bash
TARGET_MS=47040
TARGET_S=$(python3 -c "print(${TARGET_MS}/1000)")
ffmpeg -y -i audio/neural_1_2x.m4a \
  -af "apad=whole_dur=${TARGET_S}" \
  -b:a 256k \
  audio/neural_1_2x_padded.m4a
```

**验证**：
```bash
ffprobe -i audio/neural_1_2x_padded.m4a -show_entries format=duration -v quiet -of csv=p=0
# 输出应为 47.040（精确匹配视频）
```

**AAC 转码（保持 256k 48kHz stereo）**：
```bash
ffmpeg -y -i audio/neural_1_2x_padded.m4a \
  -acodec aac -b:a 256k -ar 48000 -ac 2 \
  audio/neural_1_2x.m4a
```

**验证最终音频规格**：
```bash
ffprobe -i audio/neural_1_2x.m4a \
  -show_entries stream=codec_name,sample_rate,channels,bit_rate \
  -v quiet -of csv=p=0
# 输出应为：aac,48000,2,<bitrate>
```

---

## 四、完整验证流程（渲染后必做）

```bash
#!/bin/bash
set -e
PROJECT_DIR=$1

# 1. 视频实际时长
VIDEO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 ${PROJECT_DIR}/video-project/out/VerticalVideo.mp4)
echo "Video: ${VIDEO_DUR}s"

# 2. 音频实际时长
AUDIO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 ${PROJECT_DIR}/audio/neural_1_2x.m4a)
echo "Audio: ${AUDIO_DUR}s"

# 3. 差值检测
python3 -c "import sys; a=float('${AUDIO_DUR}'); v=float('${VIDEO_DUR}'); d=abs(a-v); print(f'DIFF: {d:.3f}s ({d*1000:.0f}ms)'); sys.exit(1 if d>0.5 else 0)" || {
    echo "❌ 差值 >0.5s：需要修复"
    exit 1
}
echo "✅ 音画同步"
```

---

## 五、osiris 案例（2026-05-27）

| 阶段 | 音频 | 视频 | 差值 |
|------|------|------|------|
| 原始（atempo=1.2） | 39.121s | 52.096s | 12.975s ❌ |
| 恢复 atempo=1.0 | 46.968s | 47.04s | 72ms ❌ |
| apad padding 后 | 47.04s | 47.04s | 0ms ✅ |

**修复记录**：
1. 移除了 `atempo=1.2` 配置，改为 `rate=+0%` edge-tts 直接输出
2. 音频从 46.968s pad 到 47.04s：`apad=whole_dur=47.04`
3. 转码为 AAC 256k 48kHz stereo
4. captions.json 末段 endMs 更新为 47040ms
5. 重新渲染，0ms 误差

---

## 六、atempo 叠加陷阱（绝对禁止）

```
edge-tts --rate +20%  →  音频加速 1.2x
atempo 1.2x           →  音频再加速 1.2x
结果：音频实际速度 = 1.44x（灾难性音质破坏）
```

**正确做法**：
- edge-tts `--rate +0%`（原始速度）
- `voice.atempo` 从 video-config.json 读取（如 1.2）
- **但**：当 atempo 导致音频 < 视频时，直接用 atempo=1.0

**本技能规则**：atempo 只用于将"长音频压缩到目标时长"，不能用 atempo 将"短音频拉伸到视频时长"。