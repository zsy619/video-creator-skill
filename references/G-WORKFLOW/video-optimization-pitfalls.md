# video-optimization-pitfalls
> 本文件记录 video-creator 技能在实际项目中发现的已知陷阱，供渲染前验证使用。
> **最后更新**：2026-05-27（基于 osiris 项目）

---

## 1. captions.json 末段 endMs 必须用视频实际时长

**发现项目**：osiris
**严重程度**：P2（字幕覆盖不完整）

### 问题

渲染前 captions.json 末段 endMs 按音频时长计算（如 51977ms），但 Remotion 渲染的实际视频时长与音频时长有微小差异（osiris 实测：音频 51.977s，视频 52.032s，差 55ms）。结果：视频结尾最后 ~55ms 无字幕覆盖。

### 正确流程

```bash
# 渲染完成后立即执行
VIDEO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 video-project/out/VerticalVideo.mp4)
EXPECTED_ENDMS=$(python3 -c "print(int(round(${VIDEO_DUR} * 1000)))")

python3 -c "
import json
with open('audio/captions.json') as f:
    caps = json.load(f)
caps[-1]['endMs'] = ${EXPECTED_ENDMS}
with open('audio/captions.json', 'w') as f:
    json.dump(caps, f, ensure_ascii=False, indent=2)
print(f'末段 endMs → ${EXPECTED_ENDMS}ms')
"

# 同步到 Remotion public/audio/
cp audio/captions.json video-project/public/audio/captions.json
```

### 验证

```bash
python3 -c "
import json, subprocess
caps = json.load(open('audio/captions.json'))
vdur = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','video-project/out/VerticalVideo.mp4']).strip())
expected = int(round(vdur * 1000))
actual = caps[-1]['endMs']
print('✅ 同步正确' if actual == expected else f'❌ 末段={actual}ms, 视频={expected}ms')
"
```

---

## 2. atempo 音频时长验证公式

**发现项目**：osiris
**严重程度**：P3（音频参数偏差）

### 问题

ffmpeg atempo 处理后时长验证：允许误差应 ≤0.05s，超过说明参数有误或音频被额外处理。

### 公式

```
expected_atempo_dur = raw_dur / atempo
osiris 实测: raw_dur=46.968s, atempo=1.2 → expected=39.140s, actual=39.121s, 误差=0.019s ✅
```

### 验证命令

```python
python3 -c "
raw_dur = 46.968
atempo = 1.2
expected = raw_dur / atempo
actual = 39.121  # ffprobe 实测
print(f'误差: {abs(expected - actual):.3f}s')
print('✅ atempo 正确' if abs(expected - actual) < 0.05 else '❌ atempo 参数有误')
"
```

---

## 3. public/audio/ 目录必须同步更新

**发现项目**：osiris
**严重程度**：P2（字幕 404）

### 问题

`video-project/public/audio/` 在 Remotion bundle 时已编译。渲染后单独更新 `audio/captions.json` 不会自动同步到 `video-project/public/audio/`。

### 同步命令

```bash
cp audio/captions.json video-project/public/audio/captions.json
cp audio/neural_1_2x.m4a video-project/public/audio/neural_1_2x.m4a
```

---

## 4. 音频码率低于目标值不是故障

**发现项目**：osiris
**严重程度**：P4（信息偏差）

`ffmpeg -b:a 256k` 是**目标最大码率**，实际码率由音频内容信息量决定（通常 200-230kbps）。osiris 实测 219827bps（约 220k），不是故障，不影响播放质量。

**合格标准**：bit_rate ≥ 180kbps 且 codec_name=aac。

---

## 5. video-config.json 时间戳校准（渲染后必须执行）

**发现项目**：osiris
**严重程度**：P2（场景时间戳与视频实际时长不同步）
**关联**：与 pitfall #1（captions endMs）同一根源——渲染后需二次校准所有时间相关配置

### 问题

渲染前 video-config.json 的 scenes 时间戳按"每帧固定时长 × 帧数"计算（如 `duration: 8.67s × 6 = totalMs: 52002ms`），但 Remotion 渲染的实际视频时长与计算值有微小差异（osiris 实测：计算 52002ms，实际 52032ms，差 30ms）。

### 正确流程

```bash
VIDEO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 video-project/out/VerticalVideo.mp4)
ACTUAL_MS=$(python3 -c "print(int(round(${VIDEO_DUR} * 1000)))")

python3 -c "
import json
cfg = json.load(open('video-config.json'))
scene_count = len(cfg.get('scenes', []))
for i, scene in enumerate(cfg['scenes']):
    pct_start = i / scene_count
    pct_end = (i + 1) / scene_count
    scene['startMs'] = int(round(pct_start * ACTUAL_MS))
    scene['endMs'] = int(round(pct_end * ACTUAL_MS))
    scene['duration'] = round((pct_end - pct_start) * ACTUAL_MS / 1000, 2)
with open('video-config.json', 'w') as f:
    json.dump(cfg, f, ensure_ascii=False, indent=2)
print(f'✅ totalMs → {ACTUAL_MS}ms，{scene_count}场景等比分配')
"
```

### 验证

```bash
python3 -c "
import json, subprocess
cfg = json.load(open('video-config.json'))
vdur = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','video-project/out/VerticalVideo.mp4']).strip())
expected = int(round(vdur * 1000))
actual = cfg['scenes'][-1]['endMs']
print('✅ 同步正确' if actual == expected else f'❌ endMs={actual}ms, 视频={expected}ms')
"
```