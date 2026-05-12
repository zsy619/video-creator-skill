# ASS 字幕生成与修复

> **最后更新**：2026-05-12
> **适用范围**：所有使用 Python re.split 生成 ASS 字幕的项目
> **前置阅读**：`subtitle-tiktok-highlight.md`（TikTokCaptionOverlay 完整 TSX 实现）

---

## ⚠️ 规则一：只用中文标点分割，绝不混入 ASCII `.` 或 `,`

**根因**：`\.` 在 regex 中匹配 ASCII 句点，导致 `Claude4.5` 被切断为 `Claude4` + `5`。

**错误 pattern**：
```python
re.split(r'[，。；→\.,;]+', text)        # ❌ 含 . 和 ,
re.split(r'[，。；→\.．,;。]+', text)     # ❌ 含 ASCII .
```

当 text 包含 `Claude4.5`、`Codex.1.0` 等英文句点时触发硬切。

**正确 pattern**：
```python
re.split(r'[，。；、]+', text)  # ✅ 只用中文标点
```

**后果**：原 pattern 会产生：
- `三个免费AI方案：Kiro AI提供Claude4` (25字符，orphaned `5`)
- `5` (单独条目)

**验证**：
```bash
python3 -c "
import re
text = open('audio/voice_text.txt').read()
parts = re.split(r'[，。；、]+', text)
for p in parts:
    if 'Claude' in p:
        assert 'Claude4.5' in p, f'断字: {p}'
        print(f'✅ Claude4.5 完整: {p}')
"
```

---

## 规则二：ASS 时间格式 `H:MM:SS.cc` → 毫秒

ASS 时间格式：`H:MM:SS.cc`（时:分:秒.厘秒）

**错误**（假设冒号分割后得到3段）：
```python
m, rest = t.split(':')   # "00:00:23.35".split(':') → ['00','00','23.35']
s, cs = rest.split('.')  # ValueError: too many values
```

**正确**：
```python
def to_ms(t):
    h, m, cs = t.split(':')           # → ['00','00','23.35']
    s = int(float(cs))
    cs_frac = int(round((float(cs) - s) * 100))
    return int(h)*3600000 + int(m)*60000 + s*1000 + cs_frac*10
```

> ASS 厘秒(centiseconds) = 10ms，所以 `23.35` 秒 → `23350ms`。

---

## gen_ass.py 参考实现

```python
#!/usr/bin/env python3
import re, sys

def gen_ass(text, out_path, fontsize=72, total_duration=53.4):
    # ⚠️ 规则一：只用中文标点分割，绝不包含 ASCII 句点
    parts = re.split(r'[，。；、]+', text)
    parts = [p.strip() for p in parts if p.strip()]

    total_chars = sum(len(p) for p in parts)
    char_duration = total_duration / total_chars

    entries = []
    cursor = 0.0
    for part in parts:
        n_chars = len(part)
        dur = n_chars * char_duration
        entries.append((cursor, cursor + dur, part))
        cursor += dur

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write("[Script Info]\nTitle: Subtitles\nScriptType: v4.00+\nCollisions: Normal\n\n")
        f.write("[V4+ Styles]\n")
        f.write("Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\n")
        # 白色 + STHeiti Medium + 2px描边
        f.write(f"Style: Default,STHeiti Medium,{fontsize},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1\n\n")
        f.write("[Events]\n")
        f.write("Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n")

        for start, end, part in entries:
            start_str = f"{int(start//3600)}:{int((start%3600)//60):02d}:{start%60:05.2f}"
            end_str   = f"{int(end//3600)}:{int((end%3600)//60):02d}:{end%60:05.2f}"
            text_escaped = part.replace('\\', '\\\\').replace('\n', '\\N')
            f.write(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{text_escaped}\n")

    return entries
```

> **total_duration 必须是最终音频时长**（ffmpeg atempo 后）。在音频后处理完成前禁止生成字幕。

---

## ASS → captions.json 转换

captions.json 是 sentence-level（无 word timing），用于 TikTokCaptionOverlay（**不是** `createTikTokStyleCaptions`）。

```python
import json, re, sys

def ass_to_captions(ass_path):
    captions = []
    for line in open(ass_path, encoding="utf-8"):
        if not line.startswith("Dialogue:"): continue
        parts = line[9:].split(",", 9)
        if len(parts) < 10: continue
        start, end = parts[1].strip(), parts[2].strip()
        text = parts[9].strip().replace(r"\N", " ").replace(r"\n", " ")
        h, m, cs = start.split(":")
        start_ms = int(h)*3600000 + int(m)*60000 + int(float(cs))*1000
        h, m, cs = end.split(":")
        end_ms   = int(h)*3600000 + int(m)*60000 + int(float(cs))*1000
        captions.append({"startMs": start_ms, "endMs": end_ms, "text": text})
    return captions

caps = ass_to_captions(sys.argv[1])
with open(sys.argv[2], "w") as f:
    json.dump(caps, f, ensure_ascii=False, indent=2)
print(f"{len(caps)} captions -> {sys.argv[2]}")
```

用法：
```bash
python3 ass_to_captions.py audio/subtitles.ass video-project/public/audio/captions.json
```

---

## 验证字幕完整性

```bash
python3 -c "
lines = open('subtitles.ass', 'rb').read().split(b'\n')
for line in lines:
    if b'Dialogue' in line:
        parts = line[9:].split(b',', 9)
        if len(parts) >= 10:
            print(parts[9].decode('utf-8', errors='replace'))
"
```

重点检查：`Claude4.5` 是否完整（不能是 `Claude4` + `5` 两行）。
