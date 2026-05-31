# edge-tts 大文本处理与 atempo 固定值模式

> **最后更新**：2026-05-31
> **来源**：setube/stackprism 项目视频生成 session

---

## 1. edge-tts 大文本 inline 技术

### 问题

当 narration.txt 字符数较多（>1500 字符）时，使用 `--text "$(cat file)"` 会因 shell 参数超限导致 timeout：

```
Command timed out after 120s
ls -la audio/neural_1_2x.m4a  # 文件大小为 0
```

### 解决方案

将文本直接内联到命令行中，避免 shell 参数传递：

```bash
# ✅ inline 方式（适用于大文本）
edge-tts \
  --voice zh-CN-YunjianNeural \
  --text "StackPrism 栈棱镜是网页技术栈识别扩展，支持 Chrome、Edge、Firefox..." \
  --write-media audio/neural_1_2x.m4a

# ❌ --text "$(cat file)" 方式（120s timeout，文件 0 字节）
edge-tts --text "$(cat docs/narration.txt)" --write-media audio/neural_1_2x.m4a
```

### 实测数据

| 项目 | 字符数 | --text "$(cat file)" | inline |
|------|--------|---------------------|--------|
| stackprism | 2305 | timeout（120s），0 字节 | ✅ 成功 |
| codeburn | ~2000 | 正常 | 正常 |

### 何时用 inline

建议：无论文本长短，优先使用 inline 方式。若 inline 超过 10000 字符，考虑分段。

---

## 2. 固定 atempo=1.2 模式（用户指定优先）

### 模式

用户通过 `video-config.json` 的 `voice.atempo` 字段指定固定 atempo（如 `1.2`）。工作流直接使用该值，**不重新计算**。

```json
{
  "voice": {
    "name": "zh-CN-YunjianNeural",
    "rate": "+0%",
    "atempo": 1.2
  }
}
```

### 工作流

```bash
# 1. 读取用户指定的 atempo（不重新计算）
ATEMPO=$(python3 -c "import json; print(json.load(open('video-config.json'))['voice']['atempo'])")
echo "使用用户指定的 atempo: ${ATEMPO}"

# 2. edge-tts 生成原始音频（--rate +0%，不用 --rate +20%）
edge-tts --voice zh-CN-YunjianNeural --rate "+0%" \
  --text "..." \
  --write-media audio/neural_full.mp3

# 3. 直接使用固定 atempo（不用动态计算）
ffmpeg -y -i audio/neural_full.mp3 \
  -af "atempo=${ATEMPO}" \
  -c:a aac -b:a 256k \
  audio/neural_1_2x.m4a
```

### 与动态 atempo 的区别

| 维度 | 固定 atempo（用户指定） | 动态 atempo（自动计算） |
|------|---------------------|---------------------|
| 来源 | video-config.json voice.atempo | ffprobe 实测 / 目标时长 |
| 计算 | 不计算，直接使用 | SOURCE_DUR / TARGET_DUR |
| 适用 | 用户明确指定 atempo | 无用户指定时 fallback |
| 优先级 | 最高 | 次之 |

---

## 3. stackprism 项目完整音频参数

作为横向验证记录：

| 参数 | 值 |
|------|-----|
| narration 中文字符数 | 312 |
| 句子数 | 13 |
| edge-tts 原始音频 | 92.224s |
| atempo | 1.2（用户指定） |
| atempo 后音频 | 58.503s |
| 目标时长 | 58s |
| 偏差 | +0.87% |

---

## 4. 快速检查清单

```bash
# 检查 atempo 来源
ATEMPO=$(python3 -c "import json; d=json.load(open('video-config.json')); print(d['voice'].get('atempo', 'not-set'))")
echo "atempo: $ATEMPO"

# 检查 narration 字符数
python3 -c "print(len(open('docs/narration.txt').read()))"

# 检查音频时长
ffprobe -v error -show_entries format=duration -of csv=p=0 video-project/public/audio/neural_1_2x.m4a
```