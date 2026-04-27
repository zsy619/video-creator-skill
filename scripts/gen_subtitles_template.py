#!/usr/bin/env python3
"""
字幕生成脚本
规范（与 rules/FONTS.md 一致）：
- Fontsize=72
- Font: PingFang SC
- PrimaryColour: &H00FFFF（黄色）
- Alignment: 2（底部居中）
- MarginL/MarginR/MarginV: 30/30/30
- Outline: 1（1px黑色描边）
- \\N 换行，每行约15字符
- PlayResX: 1080, PlayResY: 1920
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

def split_text(text, max_chars=15):
    """按中文语义智能分段，每行最多max_chars个字符"""
    lines, current = [], ""
    for c in text:
        current += c
        if c in "，、。；：！？""''（）":
            if current.strip():
                lines.append(current.strip())
            current = ""
        elif len(current) >= max_chars:
            lines.append(current.strip())
            current = ""
    if current.strip():
        lines.append(current.strip())
    return lines or [text]

def generate_ass():
    ass = """[Script Info]
Title: Video Creator Subtitles
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
"""
    for start, end, text in SCENES:
        lines = split_text(text)
        content = "\\N".join(lines)
        ass += f"Dialogue: 0,{frame_to_time(start)},{frame_to_time(end)},Default,,30,30,30,,{content}\n"
    return ass

if __name__ == "__main__":
    output = os.path.join(AUDIO_DIR, f"subtitles_{int(DURATION)}s.ass")
    with open(output, 'w', encoding='utf-8') as f:
        f.write(generate_ass())
    print(f"✅ 字幕已保存: {output}")
    print(f"📊 总时长: {DURATION:.3f}秒")
    print(f"📊 字幕规范: Fontsize=72, PingFang SC, 黄色, Margin=30")
