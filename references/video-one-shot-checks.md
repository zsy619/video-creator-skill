# 视频一次生成到位：字幕与音频铁律

> **最后更新**：2026-05-12
> **适用范围**：每次 video-creator 任务开始前必读
> **目标**：避免渲染→发现字幕/音频问题→修复→重新渲染的返工循环

---

## 一次到位检查清单（在生成任何音频/字幕之前执行）

### 1/4 — 配音文本：字数上限验证

```bash
python3 -c "
text = open('audio/voice_text.txt').read()
chars = len(text)
target_dur = 53   # 目标秒数（根据项目调整）
max_chars = int(target_dur * 6.45)
print(f'字数: {chars} / 上限: {max_chars}')
assert chars <= max_chars, f'字数超限: {chars} > {max_chars}，请精简'
print('✅ 字数检查通过')
"
```

**超标处理**：精简配音文本，禁止用 atempo 补救。

### 2/4 — 配音文本：英文句点分割陷阱检查

```bash
python3 -c "
import re
text = open('audio/voice_text.txt').read()
# 找所有含英文句点的词
hits = re.findall(r'[a-zA-Z0-9]\.[a-zA-Z0-9]', text)
if hits:
    print(f'⚠️ 含英文句点的词: {set(hits)}')
    parts = re.split(r'[，。；、]+', text)
    for p in parts:
        for h in hits:
            if h in p and len(p) > 40:
                print(f'  风险段落（>{len(p)}字）: {p[:60]}...')
"
```

**根因**：如果 ASS 生成脚本的 split pattern 误含 `\.`，`Claude4.5` 会被切成 `Claude4` + `5`。正确 pattern 只有中文标点：`r'[，。；、]+'`。

### 3/4 — 音频：禁止叠速检查

```bash
# 正确做法二选一：
# A) edge-tts --rate +0% → ffmpeg atempo 1.2x ✅
# B) edge-tts --rate +20% → ffmpeg atempo 1.0x（不加速）✅
# 错误：edge-tts --rate +20% → ffmpeg atempo 1.2x ❌（两次加速叠加，音频过短）
```

### 4/4 — 字幕：TikTokCaptionOverlay 路径确认

```bash
# 确认 CaptionOverlay.tsx 使用 interpolate 方案（不是 createTikTokStyleCaptions）
grep -q "createTikTokStyleCaptions" video-project/src/components/CaptionOverlay.tsx && \
  echo "❌ 使用了 createTikTokStyleCaptions（需要 word-level timing，ASS 无法提供）" || \
  echo "✅ CaptionOverlay 使用 interpolate 方案"
```

---

## 返工预防：修复顺序铁律

```
生成音频前                   生成字幕前                   渲染前
   │                           │                           │
   ▼                           ▼                           ▼
字数验证 ← 新规！        re.split pattern 验证      CaptionOverlay 方案确认
英文句点检查 ← 新规！    Claude4.5 完整性验证       帧数 = ceil(音频时长×60)
叠速检查 ← 新规！        total_duration 精确值
```

每次生成视频，严格按上述顺序验证。发现任何一项不符，立即修复配音文本或代码，**不得带着问题进入下一步**。
