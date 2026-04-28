#!/usr/bin/env python3
"""
字幕生成脚本模板
规范（与 rules/FONTS.md、rules/SUBTITLES.md 一致）：
- Fontsize=72
- Font: PingFang SC
- PrimaryColour: &H00FFFF（黄色）
- Alignment: 2（底部居中）
- MarginL/MarginR/MarginV: 30/30/30
- Outline: 1（1px黑色描边）
- \N 换行，每行约10个字符（中文约5-8字）
- PlayResX: 1080, PlayResY: 1920

⚠️ 【致命Bug修复 2026-04-28】
Format 行必须声明 10 个字段，Dialogue 行也必须写入 10 个字段值：
  Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
  Dialogue: 0,{start},{end},Default,,{MarginL},{MarginR},{MarginV},,{text}

错误的 5 字段 Format 会导致 ffmpeg 解析时把 "Default,0,0,0,," 当作文本烧入画面！
"""
import os
import sys

PROJECT_DIR = os.getcwd()
AUDIO_DIR = os.path.join(PROJECT_DIR, "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

FPS = 60
DURATION = float(sys.argv[1]) if len(sys.argv) > 1 else 60.0
TOTAL_FRAMES = int(DURATION * FPS)

# ⚠️ 【必须填写的内容】
# 格式：(start_frame, end_frame, "字幕文本")
# 注意：文本中如有逗号会自动替换为中文逗号，\N 用于换行
SCENES = [
    # (0, 180, "封面标题"),
    # (180, 720, "第2个场景的字幕"),
]

def frame_to_time(frame):
    """帧号 → ASS时间戳 H:MM:SS.cc"""
    total = frame / FPS
    h = int(total // 3600)
    m = int((total % 3600) // 60)
    s = int(total % 60)
    cs = int((total % 1) * 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

def smart_split(text, max_chars=10):
    """按语义智能分段，每行最多max_chars个字符（中文约5-8字）"""
    if not text:
        return [text]
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
    """生成 ASS 字幕文件（修正 Format/Dialogue 10字段匹配问题）"""
    ass = "[Script Info]\n"
    ass += "Title: Video Creator Subtitles\n"
    ass += "ScriptType: v4.00+\n"
    ass += "WrapStyle: 0\n"
    ass += "ScaledBorderAndShadow: yes\n"
    ass += "PlayResX: 1080\n"
    ass += "PlayResY: 1920\n\n"

    ass += "[V4+ Styles]\n"
    # ⚠️ Format 必须声明 10 个字段
    ass += "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
    # ⚠️ Style 后面必须有 23 个值（与 Format 23 个字段对应）
    ass += "Style: Default,PingFang SC,72,&H00FFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,30,30,30,1\n\n"

    ass += "[Events]\n"
    # ⚠️ Format 必须声明 10 个字段：Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
    ass += "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"

    for start, end, text in SCENES:
        start_str = frame_to_time(start)
        end_str = frame_to_time(end)
        # 智能分段
        lines = smart_split(text)
        content = "\\N".join(lines)
        # Escape
        content = content.replace("\\", "\\\\").replace(",", "，")
        # ⚠️ Dialogue 写入 10 个字段值，Name=空, MarginL=30, MarginR=30, MarginV=30, Effect=空
        ass += f"Dialogue: 0,{start_str},{end_str},Default,,30,30,30,,{content}\n"

    return ass

if __name__ == "__main__":
    output = os.path.join(AUDIO_DIR, f"subtitles_{int(DURATION)}s.ass")
    with open(output, 'w', encoding='utf-8') as f:
        f.write(generate_ass())
    print(f"✅ 字幕已保存: {output}")
    print(f"📊 总时长: {DURATION:.3f}秒, 总帧数: {TOTAL_FRAMES}")
    print(f"📊 字幕规范: Fontsize=72, PingFang SC, 黄色, Margin=30, 10字段Format/Dialogue")
    if not SCENES:
        print("⚠️ 警告: SCENES 列表为空，请先填充字幕内容！")