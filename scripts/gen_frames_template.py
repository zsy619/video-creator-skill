#!/usr/bin/env python3
"""
gen_frames.py - 多场景帧序列生成器
基于PIL生成60fps竖屏视频帧序列，配合ffmpeg单次混流输出最终视频

用法:
    python3 gen_frames.py <project-dir> [--theme THEME]

输入:
    <project-dir>/video-project/video-config.json  (主题/场景/内容配置)
    <project-dir>/audio/neural_1_2x.m4a           (音频，用于计算总帧数)
    <project-dir>/docs/narration.txt               (配音文本，用于场景边界参考)

输出:
    <project-dir>/video-project/frames/frame_%04d.png  (严格连续编号)

关键规范:
    - TOTAL_FRAMES = ceil(音频时长 × 60)  ← 强制60fps
    - 每场景帧数从0开始计算（局部帧），不使用全局帧混用
    - 帧编号严格连续: frame_0000.png - frame_NNNN.png
    - 所有场景帧数之和 = TOTAL_FRAMES (禁止少一帧导致黑屏)

remotion-best-practices 规范应用:
    - Sequencing局部帧: 每个场景内部帧从0开始
    - calculateMetadata动态时长: 从音频动态计算帧数
    - Audio外部注入: 音频不内嵌到帧生成
"""

import os
import sys
import json
import math
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# ─────────────────────────────────────────────────────────────────────────────
# 配色常量（同步 themes.js 21个主题）
# ─────────────────────────────────────────────────────────────────────────────
THEME_COLORS = {
    # 科技类
    'cyberpunk': {
        'bg': (13, 2, 33), 'bg2': (19, 0, 40),
        'neon_cyan': (0, 255, 255), 'neon_magenta': (255, 0, 255),
        'neon_purple': (157, 0, 255), 'neon_green': (0, 255, 136),
        'yellow': (255, 255, 0), 'muted': (85, 102, 119),
        'white': (255, 255, 255), 'grid_line': (26, 26, 58),
    },
    'tech-modern': {
        'bg': (15, 23, 42), 'bg2': (30, 41, 59),
        'primary': (37, 99, 235), 'secondary': (124, 58, 237),
        'accent': (16, 185, 129), 'muted': (100, 116, 139),
        'white': (255, 255, 255), 'grid_line': (30, 41, 59),
    },
    'minimal-tech': {
        'bg': (2, 6, 23), 'bg2': (8, 15, 38),
        'primary': (30, 41, 59), 'secondary': (71, 85, 105),
        'accent': (248, 250, 252), 'muted': (100, 116, 139),
        'white': (255, 255, 255), 'grid_line': (15, 23, 42),
    },
    'neon-future': {
        'bg': (0, 0, 34), 'bg2': (10, 0, 50),
        'neon_green': (0, 255, 136), 'neon_pink': (255, 0, 136),
        'neon_purple': (136, 0, 255), 'muted': (85, 102, 119),
        'white': (255, 255, 255), 'grid_line': (20, 20, 60),
    },
    'particle-tech': {
        'bg': (15, 15, 35), 'bg2': (25, 20, 60),
        'primary': (0, 255, 204), 'secondary': (255, 204, 0),
        'accent': (204, 0, 255), 'muted': (85, 102, 119),
        'white': (255, 255, 255), 'grid_line': (30, 30, 70),
    },
    'quantum-tech': {
        'bg': (17, 0, 17), 'bg2': (30, 0, 30),
        'primary': (255, 0, 204), 'secondary': (0, 255, 204),
        'accent': (204, 255, 0), 'muted': (85, 102, 119),
        'white': (255, 255, 255), 'grid_line': (40, 0, 40),
    },
    'data-stream': {
        'bg': (0, 17, 34), 'bg2': (0, 10, 30),
        'primary': (0, 255, 0), 'secondary': (0, 204, 255),
        'accent': (255, 0, 255), 'muted': (85, 102, 119),
        'white': (255, 255, 255), 'grid_line': (0, 40, 40),
    },
    'holographic': {
        'bg': (0, 0, 0), 'bg2': (10, 10, 30),
        'primary': (0, 255, 204), 'secondary': (0, 153, 255),
        'accent': (204, 0, 255), 'muted': (85, 102, 119),
        'white': (255, 255, 255), 'grid_line': (20, 20, 60),
    },
    'deep-ocean': {
        'bg': (3, 7, 18), 'bg2': (5, 15, 30),
        'primary': (8, 145, 178), 'secondary': (79, 70, 229),
        'accent': (6, 182, 212), 'muted': (100, 116, 139),
        'white': (255, 255, 255), 'grid_line': (15, 30, 50),
    },
    # 创意/生活方式类
    'gradient-wave': {
        'bg': (2, 6, 23), 'bg2': (10, 5, 30),
        'primary': (6, 182, 212), 'secondary': (139, 92, 246),
        'accent': (236, 72, 153), 'muted': (100, 116, 139),
        'white': (255, 255, 255), 'grid_line': (20, 15, 50),
    },
    'aurora-gradient': {
        'bg': (2, 6, 23), 'bg2': (10, 5, 30),
        'primary': (6, 182, 212), 'secondary': (139, 92, 246),
        'accent': (236, 72, 153), 'muted': (100, 116, 139),
        'white': (255, 255, 255), 'grid_line': (20, 15, 50),
    },
    'vibrant-gradient': {
        'bg': (28, 25, 23), 'bg2': (40, 30, 20),
        'primary': (249, 115, 22), 'secondary': (234, 179, 8),
        'accent': (34, 197, 94), 'muted': (161, 98, 70),
        'white': (255, 255, 255), 'grid_line': (50, 40, 30),
    },
    'glass-morphism': {
        'bg': (10, 10, 15), 'bg2': (20, 20, 30),
        'primary': (200, 200, 220), 'secondary': (0, 255, 204),
        'accent': (0, 153, 255), 'muted': (100, 116, 139),
        'white': (255, 255, 255), 'grid_line': (30, 30, 50),
    },
    # 自然类
    'forest-nature': {
        'bg': (6, 78, 59), 'bg2': (5, 60, 40),
        'primary': (5, 150, 105), 'secondary': (16, 185, 129),
        'accent': (245, 158, 11), 'muted': (100, 116, 139),
        'white': (255, 255, 255), 'grid_line': (15, 40, 25),
    },
    'arctic-ice': {
        'bg': (12, 18, 34), 'bg2': (20, 25, 50),
        'primary': (56, 189, 248), 'secondary': (129, 140, 248),
        'accent': (52, 211, 153), 'muted': (100, 116, 139),
        'white': (255, 255, 255), 'grid_line': (30, 40, 70),
    },
    # 专业类
    'dark-minimal': {
        'bg': (2, 6, 23), 'bg2': (8, 15, 38),
        'primary': (30, 41, 59), 'secondary': (71, 85, 105),
        'accent': (248, 250, 252), 'muted': (100, 116, 139),
        'white': (255, 255, 255), 'grid_line': (15, 23, 42),
    },
    'neon-city': {
        'bg': (24, 24, 27), 'bg2': (35, 20, 40),
        'primary': (244, 63, 94), 'secondary': (139, 92, 246),
        'accent': (251, 191, 36), 'muted': (85, 85, 90),
        'white': (255, 255, 255), 'grid_line': (50, 20, 40),
    },
    'fintech': {
        'bg': (5, 46, 22), 'bg2': (10, 60, 30),
        'primary': (5, 150, 105), 'secondary': (16, 185, 129),
        'accent': (251, 191, 36), 'muted': (100, 116, 139),
        'white': (255, 255, 255), 'grid_line': (15, 50, 25),
    },
    'pure-medical': {
        'bg': (240, 249, 255), 'bg2': (200, 235, 255),
        'primary': (14, 165, 233), 'secondary': (20, 184, 166),
        'accent': (255, 255, 255), 'muted': (100, 116, 139),
        'white': (15, 23, 42), 'grid_line': (200, 230, 250),
    },
    'autumn-vintage': {
        'bg': (28, 25, 23), 'bg2': (50, 30, 20),
        'primary': (220, 38, 38), 'secondary': (245, 158, 11),
        'accent': (37, 99, 235), 'muted': (120, 80, 60),
        'white': (255, 255, 255), 'grid_line': (60, 40, 30),
    },
    'game-elite': {
        'bg': (15, 10, 31), 'bg2': (25, 10, 50),
        'primary': (139, 92, 246), 'secondary': (6, 182, 212),
        'accent': (250, 204, 21), 'muted': (85, 70, 120),
        'white': (255, 255, 255), 'grid_line': (40, 20, 70),
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# 字体工具
# ─────────────────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
# 字体缓存（避免每帧重复加载字体文件，2160帧视频可节省 100+ 次磁盘读取）
# ─────────────────────────────────────────────────────────────────────────────
_FONT_CACHE = {}  # {(size, path): ImageFont}

def get_font(size, font_paths=None):
    """字体兜底链 + 缓存。同一尺寸字体只加载一次。"""
    if font_paths is None:
        font_paths = [
            "/System/Library/Fonts/STHeiti Light.ttc",
            "/System/Library/Fonts/STHeiti Medium.ttc",
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/Courier.ttc",
        ]
    for path in font_paths:
        cache_key = (size, path)
        if cache_key in _FONT_CACHE:
            return _FONT_CACHE[cache_key]
        try:
            font = ImageFont.truetype(path, size)
            _FONT_CACHE[cache_key] = font
            return font
        except (OSError, IOError):
            continue
    return ImageFont.load_default()

def h2rgb(h):
    """hex颜色 → RGB元组，支持3位和6位hex"""
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c*2 for c in h)
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def alpha_col(color, alpha):
    """为RGB元组添加alpha通道"""
    return color[:3] + (alpha,)

def get_theme_color(colors, *keys):
    """安全获取主题颜色，依次尝试多个键名"""
    for key in keys:
        if key in colors:
            return colors[key]
    # 最终降级到白色
    return (255, 255, 255)

# ─────────────────────────────────────────────────────────────────────────────
# 绘图工具
# ─────────────────────────────────────────────────────────────────────────────
def draw_grid(draw, w, h, color, spacing=60, speed=0):
    """绘制滚动网格背景"""
    offset = int(speed) % spacing
    for y in range(-spacing + offset, h + spacing, spacing):
        draw.line([(0, y), (w, y)], fill=color, width=1)
    for x in range(0, w + spacing, spacing):
        draw.line([(x, 0), (x, h)], fill=color, width=1)

def draw_hud_corners(draw, w, h, color, arm=40, offset=30):
    """绘制HUD四角装饰"""
    width = 3
    # Top-left
    draw.line([(offset, offset), (offset+arm, offset)], fill=color, width=width)
    draw.line([(offset, offset), (offset, offset+arm)], fill=color, width=width)
    # Top-right
    draw.line([(w-offset-arm, offset), (w-offset, offset)], fill=color, width=width)
    draw.line([(w-offset, offset), (w-offset, offset+arm)], fill=color, width=width)
    # Bottom-left
    draw.line([(offset, h-offset), (offset+arm, h-offset)], fill=color, width=width)
    draw.line([(offset, h-offset-arm), (offset, h-offset)], fill=color, width=width)
    # Bottom-right
    draw.line([(w-offset-arm, h-offset), (w-offset, h-offset)], fill=color, width=width)
    draw.line([(w-offset, h-offset-arm), (w-offset, h-offset)], fill=color, width=width)

def txt_center(draw, text, font, x, y, color):
    """在(x,y)点居中绘制文字，y是中心点"""
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw.text((x - w // 2, y - h // 2), text, font=font, fill=color)

# ─────────────────────────────────────────────────────────────────────────────
# 场景绘制函数（每个场景一个函数）
# ─────────────────────────────────────────────────────────────────────────────
W, H = 1080, 1920  # 竖屏9:16

def scene_cover(fn, total_frames, config, colors):
    """场景1: 封面 - 标题+副标题+标签入场动画"""
    C = colors
    img = Image.new('RGBA', (W, H), C['bg'])
    draw = ImageDraw.Draw(img)

    # 双层网格背景（随帧滚动）
    c_cyan = get_theme_color(C, 'neon_cyan', 'primary', 'bg2')
    c_magenta = get_theme_color(C, 'neon_magenta', 'secondary', 'accent')
    draw_grid(draw, W, H, alpha_col(c_cyan, 15), spacing=60, speed=fn*0.3)
    draw_grid(draw, W, H, alpha_col(c_magenta, 8), spacing=90, speed=fn*0.2)

    # HUD四角
    draw_hud_corners(draw, W, H, c_cyan)

    # 计算入场动画（0-60帧淡入）
    fade = min(1.0, fn / 30.0)
    title_y = int(H * 0.32)

    # 主标题（从config读取）
    title = config.get('title', '视频标题')
    subtitle = config.get('subtitle', '')

    # 多层发光效果
    font_title = get_font(120)
    for glow_size, glow_color in [
        (10, (0, 40, 40)),
        (6, (0, 60, 60)),
        (3, (0, 100, 100)),
    ]:
        for dx, dy in [(0, -glow_size), (0, glow_size), (-glow_size, 0), (glow_size, 0)]:
            alpha = int(60 * fade)
            draw.text((W//2 + dx, title_y + dy), title,
                      fill=alpha_col(glow_color, alpha), font=font_title, anchor='mm')

    draw.text((W//2, title_y), title, fill=(255, 255, 255, int(255*fade)), font=font_title, anchor='mm')

    # 副标题
    if subtitle:
        font_sub = get_font(42)
        sub_y = title_y + 80
        draw.text((W//2, sub_y), subtitle,
                  fill=alpha_col(c_cyan, int(200*fade)),
                  font=font_sub, anchor='mm')

    # 底部标签
    font_tag = get_font(28)
    tags = config.get('tags', ['AI', '自动化', '工作流'])
    tag_y = int(H * 0.85)
    spacing = 180
    start_x = W//2 - (len(tags)-1)*spacing//2
    for i, tag in enumerate(tags):
        tx = start_x + i * spacing
        draw.text((tx, tag_y), f"#{tag}", fill=(255, 255, 255, int(180*fade)), font=font_tag, anchor='mm')

    return img.convert('RGB')


def scene_concept(fn, total_frames, config, colors):
    """场景2: 核心理念 - 标语渐入"""
    C = colors
    img = Image.new('RGBA', (W, H), C['bg'])
    draw = ImageDraw.Draw(img)

    # 背景动画：扫描线
    scan_y = int((fn / total_frames) * H)
    c_cyan = get_theme_color(C, 'neon_cyan', 'primary', 'accent')
    draw.rectangle([(0, scan_y-2), (W, scan_y+2)], fill=alpha_col(c_cyan, 30))

    # 标语文字
    font_quote = get_font(80)
    fade = min(1.0, fn / 40.0)
    quote_y = H // 2
    draw.text((W//2, quote_y), config.get('tagline', '核心理念'),
              fill=alpha_col(c_cyan, int(255*fade)),
              font=font_quote, anchor='mm')

    # 装饰线
    c_magenta = get_theme_color(C, 'neon_magenta', 'secondary', 'bg2')
    line_y = quote_y + 100
    line_w = 400
    draw.line([(W//2 - line_w//2, line_y), (W//2 + line_w//2, line_y)],
              fill=alpha_col(c_magenta, int(200*fade)), width=2)

    return img.convert('RGB')


def scene_systems(fn, total_frames, config, colors):
    """场景3: 三系统架构 - 卡片错开入场"""
    C = colors
    img = Image.new('RGBA', (W, H), C['bg'])
    draw = ImageDraw.Draw(img)

    systems = config.get('systems', [
        {'name': '系统A', 'desc': '描述A'},
        {'name': '系统B', 'desc': '描述B'},
        {'name': '系统C', 'desc': '描述C'},
    ])

    # 三列卡片
    card_w, card_h = 300, 400
    gap = 60
    total_w = card_w * 3 + gap * 2
    start_x = (W - total_w) // 2
    card_y = (H - card_h) // 2

    c_accent = get_theme_color(C, 'neon_cyan', 'primary', 'accent')
    c_muted = get_theme_color(C, 'muted', 'secondary', 'bg2')

    for i, sys in enumerate(systems):
        # 每张卡片入场时机错开
        stagger = i * 15
        if fn < stagger:
            continue
        card_fade = min(1.0, (fn - stagger) / 20.0)
        cx = start_x + i * (card_w + gap)

        # 卡片背景
        card_color = alpha_col(c_accent, int(20*card_fade))
        draw.rounded_rectangle([cx, card_y, cx+card_w, card_y+card_h],
                                radius=15, fill=card_color)

        # 卡片边框
        outline_color = alpha_col(c_accent, int(150*card_fade))
        draw.rounded_rectangle([cx, card_y, cx+card_w, card_y+card_h],
                                radius=15, outline=outline_color, width=2)

        # 系统名称
        font_name = get_font(52)
        draw.text((cx + card_w//2, card_y + 80), sys.get('name', ''),
                  fill=(255,255,255,int(255*card_fade)), font=font_name, anchor='mm')

        # 描述
        font_desc = get_font(28)
        draw.text((cx + card_w//2, card_y + 200), sys.get('desc', ''),
                  fill=alpha_col(c_muted, int(180*card_fade)),
                  font=font_desc, anchor='mm')

    return img.convert('RGB')


def scene_features(fn, total_frames, config, colors):
    """场景4: 核心特性 - 2×2数据网格"""
    C = colors
    img = Image.new('RGBA', (W, H), C['bg'])
    draw = ImageDraw.Draw(img)

    features = config.get('features', [
        {'value': '10x', 'label': '速度提升'},
        {'value': '99.9%', 'label': '可用性'},
        {'value': '50+', 'label': '集成数'},
        {'value': '24/7', 'label': '支持'},
    ])

    cell_w, cell_h = 400, 300
    hgap, vgap = 80, 60
    cols = 2
    grid_w = cell_w * cols + hgap * (cols - 1)
    grid_h = cell_h * 2 + vgap
    grid_top_y = (H - grid_h) // 2
    start_x = (W - grid_w) // 2

    c_primary = get_theme_color(C, 'primary', 'neon_cyan', 'accent')
    c_muted = get_theme_color(C, 'muted', 'secondary', 'bg2')

    for idx, feat in enumerate(features):
        col = idx % cols
        row = idx // cols
        cx = start_x + col * (cell_w + hgap)
        cy = grid_top_y + row * (cell_h + vgap)

        # 单元格入场（错开）
        stagger = idx * 10
        cell_fade = min(1.0, max(0, fn - stagger) / 15.0) if fn >= stagger else 0

        # 背景
        bg_color = alpha_col(c_primary, int(30*cell_fade))
        draw.rounded_rectangle([cx, cy, cx+cell_w, cy+cell_h],
                               radius=12, fill=bg_color)

        # 数值
        font_val = get_font(80)
        draw.text((cx + cell_w//2, cy + 100), feat.get('value', ''),
                  fill=(255,255,255,int(255*cell_fade)), font=font_val, anchor='mm')

        # 标签
        font_lbl = get_font(28)
        draw.text((cx + cell_w//2, cy + 200), feat.get('label', ''),
                  fill=alpha_col(c_muted, int(180*cell_fade)),
                  font=font_lbl, anchor='mm')

    return img.convert('RGB')


def scene_code(fn, total_frames, config, colors):
    """场景5: 快速开始 - 终端窗口打字机"""
    C = colors
    img = Image.new('RGBA', (W, H), C['bg'])
    draw = ImageDraw.Draw(img)

    # 终端窗口
    term_w, term_h = 800, 400
    tx, ty = (W - term_w)//2, (H - term_h)//2

    # 窗口背景
    draw.rounded_rectangle([tx, ty, tx+term_w, ty+term_h],
                            radius=10, fill=(20, 25, 40))

    # 标题栏
    title_bar_h = 40
    draw.rectangle([tx, ty, tx+term_w, ty+title_bar_h], fill=(40, 50, 70))
    # 三个圆点
    for i, color in enumerate([(255, 80, 80), (255, 190, 50), (50, 200, 100)]):
        dot_x = tx + 20 + i * 30
        draw.ellipse([dot_x-6, ty+title_bar_h//2-6, dot_x+6, ty+title_bar_h//2+6], fill=color)

    # 代码行
    code_lines = config.get('code_lines', [
        '$ npm install ai-workflow',
        '$ ai init --template video',
        '$ ai render --scene cover',
    ])
    font_code = get_font(28)
    line_h = 50
    code_top_y = ty + title_bar_h + 40
    total_code_h = len(code_lines) * line_h
    first_line_y = code_top_y + (term_h - title_bar_h - 40 - total_code_h) // 2

    c_green = get_theme_color(C, 'neon_green', 'accent', 'primary')

    for i, line in enumerate(code_lines):
        # 打字机效果：每行依次出现
        type_delay = i * 20
        if fn < type_delay:
            continue
        visible_chars = min(len(line), fn - type_delay)
        visible_line = line[:visible_chars]

        line_y = first_line_y + i * line_h
        draw.text((tx + 40, line_y), visible_line,
                  fill=c_green, font=font_code, anchor='mm')

    return img.convert('RGB')


def scene_cta(fn, total_frames, config, colors):
    """场景6: CTA - 行动号召"""
    C = colors
    img = Image.new('RGBA', (W, H), C['bg'])
    draw = ImageDraw.Draw(img)

    fade = min(1.0, fn / 20.0)
    cta_y = H // 2

    # 主CTA
    font_cta = get_font(90)
    draw.text((W//2, cta_y), config.get('cta', '立即开始'),
              fill=(255,255,255,int(255*fade)), font=font_cta, anchor='mm')

    # 副文本
    c_cyan = get_theme_color(C, 'neon_cyan', 'primary', 'accent')
    c_muted = get_theme_color(C, 'muted', 'secondary', 'bg2')
    font_sub = get_font(36)
    draw.text((W//2, cta_y + 100), config.get('cta_sub', '开始使用AI工作流'),
              fill=alpha_col(c_cyan, int(200*fade)),
              font=font_sub, anchor='mm')

    # 底部提示
    font_hint = get_font(24)
    draw.text((W//2, int(H*0.88)), config.get('hint', '点击获取更多信息'),
              fill=alpha_col(c_muted, int(150*fade)),
              font=font_hint, anchor='mm')

    return img.convert('RGB')


# ─────────────────────────────────────────────────────────────────────────────
# 场景帧边界计算（基于 video-config.json 动态分配）
# ─────────────────────────────────────────────────────────────────────────────
def compute_scene_boundaries(total_frames, config):
    """基于 config 动态计算场景边界。

    优先读取 video-config.json 的 sceneFractions（比例数组）。
    若未定义，则使用默认 6 场景比例（封面→理念→系统→特性→代码→CTA）。
    每个场景内部帧从 0 开始（sequencing 局部帧规范）。
    """
    # 默认 6 场景比例（保证总和=1.0）
    DEFAULT_FRACTIONS = [0.05, 0.25, 0.25, 0.20, 0.13, 0.12]

    fractions = config.get('sceneFractions', DEFAULT_FRACTIONS)
    n_scenes = len(fractions)

    # 归一化确保总和=1.0
    total = sum(fractions)
    if abs(total - 1.0) > 0.001:
        fractions = [f / total for f in fractions]

    # 按比例计算帧边界（局部帧，每个场景从0开始）
    boundaries = []
    cumsum = 0.0
    for i, frac in enumerate(fractions):
        scene_start_global = int(cumsum * total_frames)
        scene_end_global = int((cumsum + frac) * total_frames)
        # 最后一场景延伸到 total_frames
        if i == n_scenes - 1:
            scene_end_global = total_frames
        boundaries.append((scene_start_global, scene_end_global))
        cumsum += frac

    return boundaries


# ─────────────────────────────────────────────────────────────────────────────
# 并行帧绘制 worker（导入时锁定，确保多进程安全）
# ─────────────────────────────────────────────────────────────────────────────
def _draw_frame_worker(args):
    """单帧绘制（供 ProcessPoolExecutor 调用）。
    返回 (frame_idx, output_path) 而非 PIL Image，避免 pickle 大对象。
    所有颜色/配置数据通过参数传入，避免全局状态竞争。"""
    fn, total_local, scene_config, colors, output_path, scene_func, bg_color = args
    try:
        img = scene_func(fn, total_local, scene_config, colors)
        # 直接 save 到目标路径（绕过返回值 pickle）
        img.save(output_path, 'PNG')
        return (fn, True, None)
    except Exception as e:
        return (fn, False, str(e))


# ─────────────────────────────────────────────────────────────────────────────
# 主流程
# ─────────────────────────────────────────────────────────────────────────────
def get_audio_duration(m4a_path):
    """用ffprobe读取音频时长（秒）"""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'csv=p=0', m4a_path],
            capture_output=True, text=True, timeout=10
        )
        return float(result.stdout.strip())
    except Exception as e:
        print(f"⚠️ 无法读取音频时长: {e}", file=sys.stderr)
        return 60.0  # 默认60秒


def get_scene_config(project_dir):
    """从video-config.json读取场景配置"""
    config_path = os.path.join(project_dir, 'video-project', 'video-config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def main():
    import multiprocessing
    from concurrent.futures import ProcessPoolExecutor, as_completed

    if len(sys.argv) < 2:
        print("用法: python3 gen_frames.py <project-dir> [--theme THEME]")
        sys.exit(1)

    project_dir = sys.argv[1]
    theme_name = 'cyberpunk'  # 默认主题

    # 解析命令行参数
    for arg in sys.argv[2:]:
        if arg == '--theme' and sys.argv.index(arg) + 1 < len(sys.argv):
            theme_name = sys.argv[sys.argv.index(arg) + 1]

    # 设置路径
    project_dir = os.path.abspath(project_dir)
    frames_dir = os.path.join(project_dir, 'video-project', 'frames')
    audio_file = os.path.join(project_dir, 'video-project', 'audio', 'neural_1_2x.m4a')

    # 确保frames目录存在
    os.makedirs(frames_dir, exist_ok=True)

    # 获取音频时长计算总帧数
    audio_duration = get_audio_duration(audio_file)
    TOTAL_FRAMES = round(audio_duration * 60)  # 强制60fps（与Remotion内部round()一致）
    print(f"🎬 音频时长: {audio_duration:.2f}s → 总帧数: {TOTAL_FRAMES} (@60fps)")

    # 读取场景配置
    config = get_scene_config(project_dir)
    theme = config.get('theme', theme_name)
    colors = THEME_COLORS.get(theme, THEME_COLORS['cyberpunk'])

    print(f"🎨 主题: {theme}")
    print(f"📁 输出: {frames_dir}/frame_%04d.png")

    # 动态计算场景帧边界（基于 config.sceneFractions 或默认比例）
    SCENE_BOUNDARIES = compute_scene_boundaries(TOTAL_FRAMES, config)
    n_scenes = len(SCENE_BOUNDARIES)
    print(f"🎞️  场景数: {n_scenes}")
    for i, (s, e) in enumerate(SCENE_BOUNDARIES):
        print(f"   场景{i+1}: 帧 {s}-{e} ({(e-s)}帧, 占比 {((e-s)/TOTAL_FRAMES)*100:.1f}%)")

    scene_funcs = [
        scene_cover,
        scene_concept,
        scene_systems,
        scene_features,
        scene_code,
        scene_cta,
    ]
    n_funcs = len(scene_funcs)

    # ── 构建全帧任务列表（序列化所有参数，避免全局状态）─────────────
    print(f"🖼️  开始生成 {TOTAL_FRAMES} 帧（并行 {multiprocessing.cpu_count()} 进程）...")
    tasks = []
    for fn in range(TOTAL_FRAMES):
        frame_img = None
        selected_scene_func = None
        local_fn = 0
        scene_end = 0
        scene_cfg = config

        for i, (start, end) in enumerate(SCENE_BOUNDARIES):
            if start <= fn < end:
                local_fn = fn - start
                scene_end = end - start
                scene_cfg = config.get('scenes', [{}]*n_funcs)[i] if config.get('scenes') else config
                selected_scene_func = scene_funcs[i % n_funcs]
                break

        if selected_scene_func is None:
            func_idx = (len(SCENE_BOUNDARIES) - 1) % n_funcs
            selected_scene_func = scene_funcs[func_idx]
            local_fn = TOTAL_FRAMES - SCENE_BOUNDARIES[-1][0]
            scene_end = SCENE_BOUNDARIES[-1][1] - SCENE_BOUNDARIES[-1][0]
            scene_cfg = config

        output_path = os.path.join(frames_dir, f"frame_{fn:04d}.png")
        tasks.append((local_fn, scene_end, scene_cfg, colors,
                       output_path, selected_scene_func))

    # ── 并行绘制（ProcessPoolExecutor，跳过首帧已知cover）─────────
    # 首帧 cover 是静态的，先单独快速处理
    first_output = os.path.join(frames_dir, "frame_0000.png")
    if not os.path.exists(first_output):
        # 生成首帧（cover 静态场景）
        cover_img = scene_funcs[0](0, SCENE_BOUNDARIES[0][1] - SCENE_BOUNDARIES[0][0],
                                    config, colors)
        cover_img.save(first_output, 'PNG')

    # 其余帧并行处理
    done_count = 1  # 首帧已完成
    failed = []

    with ProcessPoolExecutor(max_workers=multiprocessing.cpu_count()) as executor:
        futures = {}
        for fn, task in enumerate(tasks):
            if fn == 0:
                continue  # 首帧已处理
            local_fn, scene_end, scene_cfg, colors_arg, output_path, sfunc = task
            # 直接传 scene_func 对象不行（lambda），用 module-level 函数
            futures[executor.submit(_draw_frame_worker,
                                     (fn, scene_end, scene_cfg, colors_arg,
                                      output_path, sfunc))] = fn

        for future in as_completed(futures):
            fn = futures[future]
            ok, _, err = future.result()
            done_count += 1
            if not ok:
                failed.append((fn, err))
            if done_count > 0 and done_count % 500 == 0:
                print(f"  进度: {done_count}/{TOTAL_FRAMES} ({(done_count/TOTAL_FRAMES)*100:.1f}%)")

    print(f"✅ 帧生成完成: {done_count}/{TOTAL_FRAMES} 帧 → {frames_dir}")

    if failed:
        print(f"❌ {len(failed)} 帧生成失败:", file=sys.stderr)
        for fn, err in failed[:5]:
            print(f"   frame_{fn:04d}: {err}", file=sys.stderr)
        sys.exit(1)

    # 验证帧数
    actual = len([f for f in os.listdir(frames_dir) if f.endswith('.png')])
    print(f"🔍 验证: 实际帧数={actual}, 期望={TOTAL_FRAMES}")
    if actual != TOTAL_FRAMES:
        print(f"❌ 帧数不匹配! actual={actual}, expected={TOTAL_FRAMES}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
