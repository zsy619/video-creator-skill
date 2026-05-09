# 字幕字号规范（2026-05-10 验证）

## 核心结论

**ASS Fontsize 是相对于 PlayResY=1920 的标准化值，不是像素值。**

```
视觉大小(px) ≈ Fontsize / 1920 * 屏幕宽度(1080)
```

| Fontsize | 视觉大小 | 可读性 |
|---------|---------|--------|
| 12 | ~7px | ❌ 几乎不可见 |
| 28 | ~16px | ⚠️ 偏小 |
| 36 | ~20px | ⚠️ 偏小 |
| **54** | **~30px** | **✅ 清晰** |
| **72** | **~40px** | **✅ 醒目（已验证）** |
| 90 | ~50px | ⚠️ 偏大 |

## 已验证方案（officecli-video 项目）

- 视频：1080×1920, 60fps, 58.95秒
- 字幕：**Fontsize=72**, PlayResX=1080, PlayResY=1920
- 效果：视觉约40px，黄色，清晰可读

## ASS 字幕标准参数（1080×1920竖屏）

```
Fontsize=72
PlayResX=1080
PlayResY=1920
PrimaryColour=&H00FFFF（黄色）
Alignment=2（底部居中）
MarginL=30, MarginR=30, MarginV=30
Fontname=PingFang SC
Outline=1
WrapStyle=0
```

## gen_subtitles.py 模板

```python
def generate_ass(output_path, subtitles, fps=60):
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("""[Script Info]
Title: Video Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,PingFang SC,72,&H00FFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,30,30,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""")
        for start, end, text in subtitles:
            # ... 字幕行写入
```

## 教训

- Fontsize=12 → 用户反馈太小（6px视觉）
- Fontsize=28 → 用户反馈太小
- Fontsize=36 → 用户反馈太小
- Fontsize=72 → ✅ 用户确认可读

**建议默认值：Fontsize=72**（约40px视觉），不要低于54。
