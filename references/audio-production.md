# 音频生产与处理完整流程

> **最后更新**：2026-05-15
> **配套文档**：`tts-production.md`（TTS 语音）、`ass-subtitle-production.md`（字幕生成）、`video-one-shot-checks.md`（生成前验证）

---

## 目录

1. [完整生产流程](#1-完整生产流程)
2. [音频验证协议](#2-音频验证协议)
3. [ffmpeg 音频处理陷阱](#3-ffmpeg-音频处理陷阱)
4. [字幕时间轴计算](#4-字幕时间轴计算)

---

## 1. 完整生产流程

```
Step 1: 配音文本生成与验证
         ↓
Step 2: edge-tts 音频生成
         ↓
Step 3: ffmpeg 语速调整（atempo 1.2x）
         ↓
Step 4: 音频验证（时长、码率、静音检测）
         ↓
Step 5: captions.json 时间轴生成
         ↓
Step 6: captions.json 同步到 video-project/public/audio/
```

### Step 1: 配音文本验证

```bash
python3 << 'PYEOF'
PROJECT_DIR = '/Volumes/OpenClawDrive/.hermes/workspace/{project}'
with open(f'{PROJECT_DIR}/docs/narration.txt', 'r') as f:
    text = f.read()
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
max_chars = int(52 * 3.37)  # 目标52秒
print(f'中文字数: {chinese_chars} / 上限: {max_chars}')
if 100 <= chinese_chars <= max_chars:
    print('✅ 字数合适')
elif chinese_chars < 100:
    print('❌ 字数过少，需要手动重写')
else:
    print('❌ 字数超限，需要精简')
PYEOF
```

> **narration.txt 生成后必须手动重写**：本 session 实测 9 个项目，100% 需手动重写。自动生成内容不连贯、偏少（74-91字）或偏多（176-223字）。
>
> 重写标准：口语化 + 每句完整 + 100-175 字范围内（52秒视频）。

### Step 2: edge-tts 音频生成

```bash
mkdir -p audio

edge-tts \
  --voice zh-CN-YunjianNeural \
  --rate "+0%" \
  --text "$(cat docs/narration.txt)" \
  --write-media audio/neural_full.mp3
```

### Step 3: ffmpeg 语速调整

```bash
# 1.2x 加速（不重编码，保留质量）
ffmpeg -y -i audio/neural_full.mp3 \
  -af "atempo=1.2" \
  -c:a aac -b:a 256k \
  audio/neural_1_2x.m4a

# 验证输出
ffprobe -v error -show_entries format=duration -of csv=p=0 audio/neural_1_2x.m4a
```

**禁止叠加速率**：不要既在 edge-tts 用 `--rate +20%` 又用 `atempo 1.2x`，会导致音频过短。

### Step 4: 音频验证

```bash
# 时长验证
ACTUAL=$(ffprobe -v error -show_entries format=duration -of csv=p=0 audio/neural_1_2x.m4a)
TARGET=43.0
if (( $(echo "$ACTUAL > $TARGET" | bc -l) )); then
    echo "✅ 时长合理: ${ACTUAL}s"
else
    echo "⚠️ 时长偏短: ${ACTUAL}s（目标 ${TARGET}s）"
fi

# 码率验证
ffprobe -v error -select_streams a:0 -show_entries stream=bit_rate -of csv=p=0 audio/neural_1_2x.m4a

# 静音检测
ffmpeg -i audio/neural_1_2x.m4a -af "silencedetect=noise=-30dB:d=0.5" -f null - 2>&1 | grep silence_duration
```

### Step 5: captions.json 生成

```bash
python3 << 'PYEOF'
import json, math

audio_duration = 38.064  # 实测秒数
captions = [
    {"text": "字幕第1句内容...", "startMs": 0, "endMs": 6000},
    {"text": "字幕第2句内容...", "startMs": 6000, "endMs": 12000},
    # ... 根据 narration.txt 的句子生成
]

# 确保末段 endMs = 视频时长 × 1000（不是音频时长！）
captions[-1]["endMs"] = int(round(42.65 * 1000))  # 视频时长

with open('audio/captions.json', 'w', encoding='utf-8') as f:
    json.dump(captions, f, ensure_ascii=False, indent=2)

print(f"✅ 生成 {len(captions)} 条字幕")
PYEOF
```

### Step 6: 同步到 Remotion 项目

```bash
PROJECT_DIR="/Volumes/OpenClawDrive/.hermes/workspace/{project}"
cp "$PROJECT_DIR/audio/captions.json" "$PROJECT_DIR/video-project/public/audio/"
cp "$PROJECT_DIR/audio/neural_1_2x.m4a" "$PROJECT_DIR/video-project/public/audio/"
```

---

## 2. 音频验证协议

### 三阶验证体系

**Gate A — 时长门禁**

| 指标 | 标准 | 不通过处理 |
|------|------|-----------|
| 实际时长 vs 目标时长 | ±5% 内 | 重新生成 narration.txt |
| 音频码率 | ≥128kbps | 重新编码（ffmpeg -b:a 256k） |
| 文件格式 | m4a/aac | 转换格式 |

```python
def gate_a_check(m4a_path):
    dur = float(subprocess.check_output(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'csv=p=0', m4a_path], text=True).strip())
    br = int(subprocess.check_output(
        ['ffprobe', '-v', 'error', '-select_streams', 'a:0',
         '-show_entries', 'stream=bit_rate', '-of', 'csv=p=0', m4a_path],
        text=True).strip() or 0)
    return dur, br
```

**Gate B — 字幕门禁**

| 检查项 | 标准 |
|--------|------|
| captions.json 存在 | 必须存在 |
| startMs/endMs 连续 | 第N条 endMs = 第N+1条 startMs |
| 末段 endMs | ≥ 视频时长×1000（覆盖完整） |

**Gate C — 质量门禁**

| 检查项 | 标准 |
|--------|------|
| 静音段 | <5% 总时长 |
| 截断率 | 末段时长 ≥ 平均段时长×0.5 |
| 黑帧率 | 视频帧平均亮度 ≥ 10 |

---

## 3. ffmpeg 音频处理陷阱

### 陷阱1：叠加速率（禁止）

```bash
# ❌ 错误：两次加速
edge-tts --rate +20% ...    # +20% = 1.2x
ffmpeg -i input -af "atempo=1.2" ...  # 再 1.2x = 1.44x 总速率
# 结果：音频过短，严重失真

# ✅ 正确：二选一
# 方案A: edge-tts 常速 + ffmpeg atempo 1.2x
edge-tts --rate +0% ... && ffmpeg -af "atempo=1.2" ...
# 方案B: edge-tts 加速 + ffmpeg 常速
edge-tts --rate +20% ... && ffmpeg -i input audio.m4a  # 不加 atempo
```

### 陷阱2：ffmpeg re-encoding（可省略）

> **2026-05-12 验证**：edge-tts 输出的 m4a 码率已足够（通常 ≥192kbps），`-c:a aac -b:a 256k` 的 re-encode 只是心理安慰。**可以删除这步以节省 ~10s**。

```bash
# 可选：删除 re-encode 步骤
ffmpeg -y -i audio/neural_full.mp3 \
  -af "atempo=1.2" \
  audio/neural_1_2x.m4a  # 无 -c:a aac -b:a 参数
```

### 陷阱3：RMS 静音检测命令混淆

```bash
# ❌ 错误：astats 对整个文件，不是只对静音段
ffmpeg -i audio.m4a -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null -

# ✅ 正确：silencedetect 检测
ffmpeg -i audio.m4a -af "silencedetect=noise=-30dB:d=0.5" -f null - 2>&1 | grep silence_duration
```

---

## 4. 字幕时间轴计算

### 比例分配算法

总时长 = ffprobe 实测音频时长，每句按句子数等比划分：

```python
import json, subprocess

# 实测音频时长
dur = float(subprocess.check_output(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
     '-of', 'csv=p=0', 'audio/neural_1_2x.m4a'], text=True).strip())

# 读取句子
with open('docs/narration.txt') as f:
    text = f.read().strip()
sentences = [s.strip() for s in text.split('。') if s.strip()]

# 等比分段
total_ms = dur * 1000
ms_per_sentence = total_ms / len(sentences)

captions = []
for i, s in enumerate(sentences):
    start = int(i * ms_per_sentence)
    end = int((i + 1) * ms_per_sentence)
    captions.append({
        "startMs": start,
        "endMs": end,
        "text": s
    })

# 末段 endMs 必须与视频时长同步（不是音频时长）
captions[-1]["endMs"] = int(round(42.65 * 1000))  # 视频实际时长
```

### 时间轴验证

```bash
# 验证字幕与音频同步
python3 << 'PYEOF'
import json, subprocess

dur = float(subprocess.check_output(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
     '-of', 'csv=p=0', 'audio/neural_1_2x.m4a'], text=True).strip())
captions = json.load(open('audio/captions.json'))

last_end = captions[-1]['endMs']
video_dur_ms = int(round(42.65 * 1000))  # 视频时长

print(f"音频时长: {dur:.3f}s = {int(dur*1000)}ms")
print(f"末段 endMs: {last_end}ms")
print(f"视频时长: {video_dur_ms}ms")

if last_end < video_dur_ms:
    print(f"❌ 末段字幕未覆盖完整视频（差 {video_dur_ms - last_end}ms）")
    captions[-1]['endMs'] = video_dur_ms
    json.dump(captions, open('audio/captions.json', 'w'), ensure_ascii=False, indent=2)
    print("✅ 已修复")
elif last_end > video_dur_ms + 500:
    print(f"⚠️ 末段 endMs 超出视频 {last_end - video_dur_ms}ms")
else:
    print("✅ 末段字幕同步正确")
PYEOF
```
