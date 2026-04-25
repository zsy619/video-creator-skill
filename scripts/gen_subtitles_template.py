#!/usr/bin/env python3
"""
字幕生成脚本 - quantdinger 格式
必须严格遵守以下规范：
1. Fontsize=10
2. 使用 \\N 换行
3. 不要设置 PlayResX/PlayResY
4. 每行约10字符
"""
import os
import sys

PROJECT_DIR = os.getcwd()
AUDIO_DIR = os.path.join(PROJECT_DIR, "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

FPS = 60
DURATION = float(sys.argv[1]) if len(sys.argv) > 1 else 60.0
TOTAL_FRAMES = int(DURATION * FPS)

SCENES = []

def frame_to_time(frame):
    total = frame / FPS
    h = int(total // 3600)
    m = int((total % 3600) // 60)
    s = int(total % 60)
    cs = int((total % 1) * 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

def split_text(text, max_chars=10):
    """按语义智能分段，每行最多max_chars个字符"""
    lines, current = [], ""
    for c in text:
        if c in "，、。；：！？""''（）":
            current += c
        elif len(current) >= max_chars:
            lines.append(current)
            current = ""
        else:
            current += c
    if current:
        lines.append(current)
    return lines or [text]

def generate_ass():
    ass = """[Script Info]
Title: Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,PingFang SC,10,&H00FFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,30,30,30,134

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    for start, end, text in SCENES:
        lines = split_text(text)
        content = "\\N".join(lines)
        ass += f"Dialogue: 0,{frame_to_time(start)},{frame_to_time(end)},Default,,30,30,30,,{content}\n"
    return ass

if __name__ == "__main__":
    output = os.path.join(AUDIO_DIR, "subtitles.ass")
    with open(output, 'w', encoding='utf-8') as f:
        f.write(generate_ass())
    print(f"✅ 字幕已保存: {output}")
    print(f"📊 总时长: {DURATION:.3f}秒")
    print(f"📊 字幕规范: quantdinger格式 (Fontsize=10, \\N换行)")