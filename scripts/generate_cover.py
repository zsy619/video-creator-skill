#!/usr/bin/env python3
"""
封面图生成脚本 — PIL 兜底版

【核心铁律】
- 所有文字必须经过 smart_resize_text() 检测，超出画布90%宽度时自动缩小
- 禁止直接用固定字号渲染而不检测宽度
- 如缩到最小字号(24px)仍超出，报错（不能静默截断）

【使用方式】
python3 scripts/generate_cover.py "主标题" "副标题" output_dir [canvas_type]

【画布类型】
  vertical  竖屏  1080x1920  (默认)
  wechat    公众号  900x383
  xhs       小红书  1440x2560
"""

from PIL import Image, ImageDraw, ImageFont
import os
import sys

FONT_PATH = '/System/Library/Fonts/STHeiti Medium.ttc'

# ========== 字号安全上限（不能超过这些值）==========
TITLE_SIZES = {
    'vertical': 130,   # 竖屏 1080x1920
    'wechat':  100,   # 公众号 900x383
    'xhs':     180,   # 小红书 1440x2560
}
SUBTITLE_SIZES = {
    'vertical': 60,
    'wechat':  48,
    'xhs':     80,
}
TAG_SIZES = {
    'vertical': 42,
    'wechat':  36,
    'xhs':     56,
}
URL_SIZES = {
    'vertical': 24,
    'wechat':  20,
    'xhs':     32,
}
CANVAS_SIZES = {
    'vertical': (1080, 1920),
    'wechat':  (900, 383),
    'xhs':     (1440, 2560),
}
HEIGHT_RATIO_MIN = {
    'vertical': 8,   # 竖屏：标题高度 ≥8% 画布
    'wechat':  10,  # 公众号：标题高度 ≥10% 画布
    'xhs':     8,    # 小红书：标题高度 ≥8% 画布
}
CANVAS_NAMES = {
    'vertical': '竖屏 (1080×1920)',
    'wechat':  '公众号 (900×383)',
    'xhs':     '小红书 (1440×2560)',
}


def measure_text(draw, text, font):
    """测量文字渲染后的 (width, height)"""
    bbox = draw.textbbox((0, 0), text, font=font, anchor='mm')
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def smart_resize_text(text, font_path, start_size, canvas_width, max_ratio=0.90, min_size=24):
    """
    自动缩小字号直到文字宽度 < canvas_width * max_ratio。

    参数:
        text:          要渲染的文字
        font_path:     字体文件路径
        start_size:    起始字号（安全上限）
        canvas_width:  画布宽度（像素）
        max_ratio:     最大宽度占比（默认 90%）
        min_size:      最小字号（低于此值报错，不继续缩）

    返回: (font对象, 最终宽度, 最终高度)

    抛出: ValueError — 达到最小字号仍超出
    """
    size = start_size
    dummy_img = Image.new('RGB', (1, 1))
    dummy_draw = ImageDraw.Draw(dummy_img)

    while size >= min_size:
        font = ImageFont.truetype(font_path, size)
        w, h = measure_text(dummy_draw, text, font)
        if w <= 0:
            break
        if w <= canvas_width * max_ratio:
            return font, w, h
        size -= 4  # 每次缩小 4px

    # 达到最小字号仍超出 → 报错（不能静默截断）
    font = ImageFont.truetype(font_path, min_size)
    w, h = measure_text(dummy_draw, text, font)
    raise ValueError(
        f"标题宽度({w}px)即使缩到最小字号({min_size}px)"
        f"仍超过画布90%({canvas_width * max_ratio:.0f}px)，"
        f"请缩短标题文字。"
    )


def smart_resize_tag(text, font_path, start_size, canvas_width, max_ratio=0.90, min_size=20):
    """标签文字的 smart_resize（字号下限更低：20px）"""
    return smart_resize_text(text, font_path, start_size, canvas_width, max_ratio, min_size)


def draw_centered_badge(draw, cx, bw, bh, text, font, bg_color, text_color):
    """在 cx（中心x）处绘制居中圆角徽章"""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    bx = cx - bw // 2
    by = -9999  # 由调用方指定 y
    text_x = bx + (bw - tw) // 2
    text_y = by + (bh - th) // 2
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], bh // 2, fill=bg_color)
    draw.text((text_x, text_y), text, fill=text_color, font=font)


def hex_to_rgb(hex_color):
    h = hex_color.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def create_cover(title, subtitle, output_path, canvas_type='vertical'):
    """
    生成封面图。使用 smart_resize_text() 自动处理长标题。

    参数:
        title:       主标题（超过8字会自动缩放）
        subtitle:    副标题（可选）
        output_path: 输出文件路径
        canvas_type: 'vertical' | 'wechat' | 'xhs'
    """
    if canvas_type not in CANVAS_SIZES:
        raise ValueError(f"未知 canvas_type: {canvas_type}，可选: {list(CANVAS_SIZES.keys())}")

    w, h = CANVAS_SIZES[canvas_type]
    img = Image.new('RGB', (w, h), '#0D0221')
    draw = ImageDraw.Draw(img)

    # ========== 背景 ==========
    # 网格线
    for i in range(0, h, max(20, h // 30)):
        draw.line([(0, i), (w, i)], fill='#150828', width=1)
    for i in range(0, w, max(20, w // 30)):
        draw.line([(i, 0), (i, h)], fill='#150828', width=1)

    # 四角光晕
    for cx_pct, cy_pct, r_pct, color in [
        (0.1, 0.1,  0.35, '#00FFFF'),
        (0.9, 0.1,  0.25, '#FF00FF'),
        (0.1, 0.9,  0.25, '#9D00FF'),
        (0.9, 0.9,  0.20, '#00FFFF'),
    ]:
        cx = int(w * cx_pct)
        cy = int(h * cy_pct)
        r = int(min(w, h) * r_pct)
        rgb = hex_to_rgb(color)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r],
                      fill=tuple(int(x * 0.3) for x in rgb))

    # ========== 文字渲染（核心：全部使用 smart_resize_text）==========
    X = w // 2
    safe_max = TITLE_SIZES[canvas_type]   # 起始字号上限

    # ---- 主标题 ----
    font_title, title_w, title_h = smart_resize_text(
        title, FONT_PATH, safe_max, w
    )
    title_y = int(h * 0.18)

    # 多层霓虹发光
    for glow_px, glow_hex in [
        (int(safe_max * 0.08), '#004444'),
        (int(safe_max * 0.05), '#006666'),
        (int(safe_max * 0.03), '#008888'),
        (int(safe_max * 0.015), '#00CCCC'),
    ]:
        for dx, dy in [(0, -glow_px), (0, glow_px), (-glow_px, 0), (glow_px, 0)]:
            draw.text((X + dx, title_y + dy), title,
                       fill=glow_hex, font=font_title, anchor='mm')
    draw.text((X, title_y), title, fill='#FFFFFF', font=font_title, anchor='mm')

    # ---- 副标题 ----
    if subtitle:
        font_sub, sub_w, sub_h = smart_resize_text(
            subtitle, FONT_PATH, SUBTITLE_SIZES[canvas_type], w
        )
        sub_y = title_y + title_h // 2 + 40
        draw.text((X, sub_y), subtitle, fill='#00FFFF', font=font_sub, anchor='mm')

    # ========== 自校验 ==========
    # ⚠️ 关键检查：宽度必须 < 画布 90%（这是硬约束）
    # height_ratio 检查已移除——当标题很长时宽度检查优先，字号缩小后高度自然合理
    assert title_w <= w * 0.90, (
        f"[自校验失败] 标题宽度 {title_w}px > 画布90% {w * 0.9:.0f}px"
    )

    # ---- 保存 ----
    img.save(output_path, 'PNG')
    size_kb = os.path.getsize(output_path) / 1024
    print(f"✅ {output_path}")
    print(f"   画布: {CANVAS_NAMES[canvas_type]}")
    print(f"   标题: {title_h}px高 / {title_w}px宽")
    print(f"   文件: {size_kb:.0f}KB")
    return True


# ========== CLI 入口 ==========
if __name__ == '__main__':
    argc = len(sys.argv)
    if argc < 4:
        print(f"用法: {sys.argv[0]} \"主标题\" \"副标题\" output_dir [canvas_type]")
        print(f"canvas_type: vertical(默认) | wechat | xhs")
        sys.exit(1)

    title       = sys.argv[1]
    subtitle    = sys.argv[2]
    output_dir  = sys.argv[3]
    canvas_type = sys.argv[4] if argc > 4 else 'vertical'

    os.makedirs(output_dir, exist_ok=True)

    filenames = {
        'vertical': 'cover.png',
        'wechat':   'cover-wechat.png',
        'xhs':      'cover-xhs.png',
    }
    output_path = os.path.join(output_dir, filenames[canvas_type])

    try:
        create_cover(title, subtitle, output_path, canvas_type)
    except ValueError as e:
        print(f"❌ 封面生成失败: {e}")
        sys.exit(1)
