# generate_docs.js 已知失败场景（2026-05-17 实测补充）

## GitHub README → narration 失败（本次 session）

**项目**: ShadowBroker (shadowbroker-video)  
**症状**: `launch.sh all` 后 narration.txt 仅 10 个中文字符，内容为 HTML 标签碎片 + 英文残留
**根因**: `stripMarkdown()` 无法正确处理 `<p align="center">` HTML 块和表格结构的 README 内容

**实测数据**:
- `generate_docs.js` 输出的 narration.txt: 10 中文字符（严重失败）
- 手动重写后的 narration.txt: 116 中文字符（符合 100~175 上限）
- edge-tts 原始音频: 33.384s
- atempo = 33.384 / 52 = 0.642（动态计算，非固定 1.2）
- 处理后音频: 51.96s ✅

**结论**: GitHub README 含 HTML 格式表格时，`generate_docs.js` 的 `stripMarkdown()` 几乎必然失败。任何含 `<` 标签、多表格、英文为主的 README 都应视为高风险，必须在 Step 0 后立即检查并手动重写 narration。

---

## 已知的 generate_docs.js 失败模式

| 输入类型 | 失败概率 | 症状 |
|---------|---------|------|
| GitHub README（含HTML标签/表格）| **极高** | narration < 20 字，含 HTML 碎片 |
| 中文博客文章（纯文本）| 低 | 字数在范围内但语义破碎 |
| 含大量代码块的文档 | 中 | 代码块噪声混入 narration |
| 纯英文 README | 高 | 英文被stripMarkdown删除后仅剩标点 |

---

## 动态 atempo 计算（2026-05-17 已修复）

**公式**: `atempo = source_duration / target_duration`  
**旧错误**: 固定 `atempo=1.2`（仅适用于 source≈40-45s 的场景）  
**正确做法**: 
```bash
SOURCE_DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "audio/neural_full.mp3")
ATEMPO=$(python3 -c "import math; print(round(min(max(${SOURCE_DURATION} / ${TARGET_DURATION}, 0.5), 2.0), 4))")
ffmpeg -y -i "audio/neural_full.mp3" -af "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.3,atempo=${ATEMPO}" -c:a aac -b:a 256k "audio/neural_1_2x.m4a"
```

**本次实测**: 33.384s / 52s = 0.642 → ffmpeg 处理后 51.96s ✅

---

## captions.json Python 生成（含反引号的 safe 生成方式）

当 narration.txt 含反引号（`` ` ``）时，Node.js heredoc 的模板字符串会提前终止。**必须使用 Python**:

```python
import json, re, subprocess

with open('docs/narration.txt', 'r') as f:
    text = f.read()

duration = float(subprocess.run(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', 'audio/neural_1_2x.m4a'],
    capture_output=True, text=True
).stdout.strip())

sentences = re.split(r'(?<=[。！？])', text)
sentences = [s.strip() for s in sentences if s.strip()]
slot = duration / len(sentences)

captions = [{'text': s, 'startMs': round(i*slot*1000), 'endMs': round((i+1)*slot*1000)} 
            for i, s in enumerate(sentences)]

with open('video-project/public/audio/captions.json', 'w') as f:
    json.dump(captions, f, ensure_ascii=False, indent=2)
```