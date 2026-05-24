# 音频生产与 TTS 语音生成完整流程

> **最后更新**：2026-05-23（`launch.sh audio` 是空壳，必须手动执行 edge-tts）
> **配套文档**：`subtitle-production.md`（字幕生成）、`content-document-generation.md`（narration.txt 生成规范）

---

## ⚠️ 关键发现：`launch.sh audio` 不生成音频

`launch.sh audio` 内部只打印提示信息，**不实际调用 edge-tts**。无法用它自动完成音频生成。

**正确做法：手动执行以下命令**（在 `launch.sh docs` 之后，在手动重写 narration.txt 之后）：

```bash
cd ~/.hermes/workspace/<project>/   # 项目根目录
mkdir -p audio

# Step 1: edge-tts 生成原始音频（--rate +0%，不用 --rate +20%）
edge-tts \
  --voice zh-CN-YunjianNeural \
  --rate "+0%" \
  --text "$(cat docs/narration.txt)" \
  --write-media audio/neural_full.mp3

# Step 2: 动态 atempo 调整到目标时长
SOURCE_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 audio/neural_full.mp3)
TARGET_DUR=50   # 从 video-config.json 的 duration 字段读取
ATEMPO=$(python3 -c "print(round($SOURCE_DUR / $TARGET_DUR, 4))")

ffmpeg -y -i audio/neural_full.mp3 \
  -af "atempo=${ATEMPO}" \
  -c:a aac -b:a 256k \
  audio/neural_1_2x.m4a
```

**工作流顺序**（与文档描述相反）：
1. `bash launch.sh docs` — 生成12个文档（**会覆盖 narration.txt**）
2. **手动重写** `docs/narration.txt`（150-200字，口语化，每句完整）
3. 执行上面的 edge-tts + ffmpeg 命令生成音频
4. 用 Python heredoc 生成 `audio/captions.json`（Node.js heredoc 对中文/反引号有致命缺陷）

---

## 1. edge-tts 语音生成

### 正确语法

```bash
# ✅ 正确：--write-media（不是 --output）
edge-tts \
  --voice zh-CN-YunjianNeural \
  --rate "+0%" \
  --text "$(cat docs/narration.txt)" \
  --write-media audio/neural_1_2x.m4a
```

```bash
# ❌ 错误：--output 不存在
edge-tts --voice ... --output audio/out.m4a
# → edge-tts: error: unrecognized arguments: --output
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `--voice` | 声音名称 |
| `--rate` | 语速百分比，如 +20%（不是倍数） |
| `--text` | 直接传递文本 |
| `--write-media` | 输出音频文件路径（不是 --output） |
| `-f, --file` | 从文件读取文本 |

### 速率与时长关系

edge-tts 直接按目标语速生成，不需要 atempo 后处理：
- `+20%` = 1.2x 语速
- `+0%` = 1.0x 语速
- `-10%` = 0.9x 语速

### 已知可用的中文 voices（2026-05-15 实测）

| Voice | 性别 | 状态 | 备注 |
|-------|------|------|------|
| zh-CN-YunjianNeural | 男 | ✅ 可用 | **用户首选男声（默认）** |
| zh-CN-YunxiNeural | 男 | ✅ 可用 | 科技/工具类备选 |
| zh-CN-XiaoxiaoNeural | 女 | ✅ 可用 | **禁用**（用户不接受女声） |

> **2026-05-15 补充**：
> 1. `zh-CN-YunjianNeural` 实测成功（用户确认温和男声效果满意）
> 2. 用户永久偏好：`zh-CN-YunjianNeural`（默认）> `zh-CN-YunxiNeural` > `zh-CN-YunyangNeural`
> 3. **禁止降级到女声**（XiaoxiaoNeural 等）

### 语音推断规则

从音频文件名无法区分 Yunyang/Yunjian/Yunxi，核心判断依据是 `video-config.json` 的 `voice` 字段（显式覆盖优先）。若无覆盖，按主题推断：
- 科技/工具/GitHub 项目 → `zh-CN-YunxiNeural`
- 新闻/资讯类 → `zh-CN-YunyangNeural`
- 通用/其他 → `zh-CN-YunjianNeural`

> ⚠️ **推断不等于强制**：用户可以在任意项目中选择非主题对应的声音，**voice 字段值 = 最终答案**。

### 服务不可用时的备用方案

生成音频时实现自动备用逻辑：

```python
async def generate_audio(text, output_path, primary_voice="zh-CN-YunjianNeural"):
    # 男声优先：YunjianNeural → YunxiNeural → YunyangNeural
    # 禁止降级到女声（XiaoxiaoNeural 等）
    voices_to_try = ["zh-CN-YunjianNeural", "zh-CN-YunxiNeural", "zh-CN-YunyangNeural"]

    for voice in voices_to_try:
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(output_path)
            print(f"✅ {voice} 成功")
            return
        except edge_tts.exceptions.NoAudioReceived:
            print(f"⚠️ {voice} 不可用，尝试下一个...")
            continue

    raise Exception("所有男声均不可用，请检查网络或 Microsoft 服务状态")
```

> **⚠️ 重要**：禁止将 `zh-CN-XiaoxiaoNeural`（女声）加入备用列表。用户默认使用男声，不接受女声配音。

### 服务恢复检测

```bash
# 检测 speech.platform.bing.com 是否恢复
curl -s --max-time 5 https://speech.platform.bing.com 2>&1 | head -1
```

---

## 2. ffmpeg 音频后处理

### 动态 atempo 计算

```bash
# 动态计算 atempo（根据实测音频/目标时长）
SOURCE_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 audio/neural_full.mp3)
TARGET_DUR=52
ATEMPO=$(python3 -c "print(round($SOURCE_DUR / $TARGET_DUR, 4))")

ffmpeg -y -i audio/neural_full.mp3 \
  -af "atempo=${ATEMPO}" \
  -c:a aac -b:a 256k \
  audio/neural_1_2x.m4a
```

### 安全字数上限

> **⚠️ 语速实测修正（2026-05-13）**：
> `zh-CN-YunjianNeural` + `atempo 1.2x` 在实际视频旁白（长复合句，含英文/符号）中实测：
> - 294字 → 78.9秒 = **3.73 字/秒**
> - 184字 → 52.8秒 = **3.73 字/秒**
>
> **安全字数上限**：`⌊目标时长 × 3.37⌋`（3.37 = 3.73 × 0.9）

> ⚠️ 6.45 字/秒基准来自高密度短句测试，与实际视频旁白（含英文/符号/URL、长复合句）差异显著。**实际项目必须用 3.37 安全上限。**

### 叠加速率禁止规则

> **禁止叠加速率**：不要既在 edge-tts 用 `--rate +20%` 又用 `atempo 1.2x`，会导致音频过短。

```bash
# ❌ 错误：两次加速
edge-tts --rate +20% ...    # +20% = 1.2x
ffmpeg -i input -af "atempo=1.2" ...  # 再 1.2x = 1.44x 总速率

# ✅ 正确：二选一
# 方案A: edge-tts 常速 + ffmpeg atempo 1.2x
edge-tts --rate +0% ... && ffmpeg -af "atempo=1.2" ...
# 方案B: edge-tts 加速 + ffmpeg 常速
edge-tts --rate +20% ... && ffmpeg -i input audio.m4a
```

### re-encoding 可省略

> **2026-05-12 验证**：edge-tts 输出的 m4a 码率已足够（通常 ≥192kbps），`-c:a aac -b:a 256k` 的 re-encode 只是心理安慰。**可以删除这步以节省 ~10s**。

```bash
# 可选：删除 re-encode 步骤
ffmpeg -y -i audio/neural_full.mp3 \
  -af "atempo=1.2" \
  audio/neural_1_2x.m4a  # 无 -c:a aac -b:a 参数
```

---

## 3. 音频验证协议

### 三阶验证体系

**Gate A — 时长门禁**

| 指标 | 标准 | 不通过处理 |
|------|------|-----------|
| 实际时长 vs 目标时长 | ±5% 内 | 重新生成 narration.txt |
| 音频码率 | ≥128kbps | 重新编码（ffmpeg -b:a 256k） |
| 文件格式 | m4a/aac | 转换格式 |

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

### 时长验证命令

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
```

---

## 4. captions.json 时间轴生成

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
video_dur_ms = int(round(42.65 * 1000))

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

> ⚠️ **末段 endMs 必须与视频时长同步**：captions.json 末段字幕 endMs 必须等于**视频实际时长（毫秒）**，而非音频时长。

---

## 5. ffmpeg 音频处理陷阱

### RMS 静音检测命令混淆

```bash
# ❌ 错误：astats 对整个文件，不是只对静音段
ffmpeg -i audio.m4a -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null -

# ✅ 正确：silencedetect 检测
ffmpeg -i audio.m4a -af "silencedetect=noise=-30dB:d=0.5" -f null - 2>&1 | grep silence_duration
```

---

## 6. 语音优先级规范

| 优先级 | 语音 | 风格 | 适用场景 |
|--------|------|------|----------|
| 1 | `zh-CN-YunjianNeural` | 温和男声，自然流畅 | **通用默认** |
| 2 | `zh-CN-YunxiNeural` | 年轻男声，清晰有力 | 科技/工具类 |
| 3 | `zh-CN-YunyangNeural` | 新闻男声，稳重 | 新闻/资讯类 |

**Fallback 规则**：首选不可用时，必须选择另一个男声，**禁止降级到女声**。

---

## 7. 完整音频生产流程

```
Step 1: 配音文本生成与验证（narration.txt）
         ↓
Step 2: edge-tts 音频生成
         ↓
Step 3: ffmpeg 语速调整（atempo 动态计算）
         ↓
Step 4: 音频验证（时长、码率、静音检测）
         ↓
Step 5: captions.json 时间轴生成
         ↓
Step 6: captions.json 同步到 video-project/public/audio/
```

### 完整命令

```bash
mkdir -p audio

# Step 2: edge-tts 音频生成
edge-tts \
  --voice zh-CN-YunjianNeural \
  --rate "+0%" \
  --text "$(cat docs/narration.txt)" \
  --write-media audio/neural_full.mp3

# Step 3: ffmpeg 语速调整
SOURCE_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 audio/neural_full.mp3)
TARGET_DUR=52
ATEMPO=$(python3 -c "print(round($SOURCE_DUR / $TARGET_DUR, 4))")

ffmpeg -y -i audio/neural_full.mp3 \
  -af "atempo=${ATEMPO}" \
  -c:a aac -b:a 256k \
  audio/neural_1_2x.m4a

# Step 6: 同步到 Remotion 项目
PROJECT_DIR="{WORKSPACE_DIR}/{project}"
cp "$PROJECT_DIR/audio/neural_1_2x.m4a" "$PROJECT_DIR/video-project/public/audio/"
```

---

## 8. 审计命令库（音频/字幕/渲染）

> **最后更新**：2026-05-22（从 SKILL.md 迁移）
> **配套文档**：`C-CONTENT/subtitle-production.md`（字幕时间轴）、`B-REMOTION/remotion-troubleshoot.md`（渲染验证）

### A. 音频审计命令

```bash
# 检查 TOTAL_FRAMES
grep "TOTAL_FRAMES" video-project/src/Root.tsx

# 检查音频时长（atempo 后）
ffprobe -v quiet -show_entries format=duration -of csv=p=0 video-project/public/audio/neural.mp3

# 验证视频实际时长
ffprobe -i video-project/out/final.mp4 -show_entries format=duration -v quiet -of csv="p=0"
```

**Root.tsx TOTAL_FRAMES 计算**：
```
TOTAL_FRAMES = ⌊实际音频时长(atempo后) × 60⌋
例：57.33s × 60 = 3440
禁止：TOTAL_FRAMES = 35 * 60（硬编码）
```

**captions.json 缩放公式**：
```
scale_factor = atempo_value
所有 startMs/endMs × scale_factor
例：atempo=0.5 → scale_factor=2.0
```

### B. ⚠️ 致命陷阱

Remotion 的 `durationInFrames` 来自 **Root.tsx 的 TOTAL_FRAMES**。atempo 调整音频后，帧数必须重新计算（`audio_duration × fps`），Video.tsx 的 `<Audio>` 组件**不使用** `playbackRate` prop。

### C. 音频 RMS 验证

```bash
ffmpeg -i final.mp4 \
  -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" \
  -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l
# 非0个样本 = 有效音频
```

### D. 音频三禁止

| 禁止 | 正确做法 |
|------|---------|
| 禁止分段拼接配音 | 整段连续生成 |
| 禁止跳过音频后处理 | 去静音 + atempo + AAC 256k |
| 禁止使用旧版 ffmpeg 混流 | ✅ **Remotion Native**：`<Audio>` 直接内嵌 MP4 |

### E. 语速基准修正

⚠️ **feedgrab 12.05 chars/s 实为字节数，非字符数**。真实 feedgrab 中文字符语速约 **3.40 Chinese chars/s**，与 edge-tts 自然语速 3.37~3.73 完全一致。

**不要按 bytes/s 计算语速**，会把正常语速的视频用 atempo=0.5 强行拉慢 50%。