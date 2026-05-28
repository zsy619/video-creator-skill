# audio-tempo-user-patterns

> **最后更新**：2026-05-26
> **主题**：用户指定 atempo 模式与实测数据

---

## 核心发现：用户指定 atempo 直接使用

用户可以在 `video-config.json` 中通过 `voice.atempo` 字段指定语速倍率（如 `1.2`）。工作流必须尊重该值，**直接使用而非重新计算**。

```json
{
  "voice": {
    "name": "zh-CN-YunjianNeural",
    "rate": "+0%",
    "atempo": 1.2
  }
}
```

---

## 实测数据（2026-05-26）

| 项目 | 原始时长 | atempo | 处理后时长 | 目标时长 | 偏差 |
|------|---------|--------|-----------|---------|------|
| CPA-Helper | 154.632s | 1.0967 | 140.979s | 141s | +0.02% |
| Animal Island UI | 62.064s | 1.2 | 51.987s | 52s | -0.03% |

**结论**：用户指定 atempo=1.2 时，直接使用该值即可满足 52s 目标。无需动态计算。

---

## atempo 计算公式（当用户未指定时）

```
ATEMPO = 原始时长 / 目标时长
目标时长 = video-config.json 的 scenes[-1]['endMs'] / 1000
```

```bash
# 动态计算（用户未指定 atempo 时）
SOURCE_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 audio/neural_full.mp3)
TARGET_DUR=$(python3 -c "import json; print(json.load(open('video-config.json'))['scenes'][-1]['endMs']/1000)")
ATEMPO=$(python3 -c "print(round($SOURCE_DUR / $TARGET_DUR, 4))")
```

---

## 工作流中的 atempo 优先级

1. **最高**：用户通过 video-config.json 明确指定 `voice.atempo`
2. **次之**：动态计算（当用户未指定时）
3. **禁止**：硬编码（如 `ATEMPO=1.2`）

---

## 典型错误模式

### 错误：忽略用户指定的 atempo

```bash
# ❌ 错误：重新计算 atempo，忽略 video-config.json
SOURCE_DUR=$(ffprobe ... audio/neural_full.mp3)
TARGET_DUR=52
ATEMPO=$(python3 -c "print(round($SOURCE_DUR / $TARGET_DUR, 4))")
```

### 正确：尊重用户指定的 atempo

```bash
# ✅ 正确：优先使用 video-config.json 中的 atempo
ATEMPO=$(python3 -c "import json; print(json.load(open('video-config.json'))['voice']['atempo'])")
echo "使用用户指定的 atempo: ${ATEMPO}"

ffmpeg -y -i audio/neural_full.mp3 \
  -af "atempo=${ATEMPO}" \
  -c:a aac -b:a 256k \
  audio/neural_1_2x.m4a
```