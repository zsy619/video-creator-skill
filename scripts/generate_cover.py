from PIL import Image, ImageDraw, ImageFont
import math

W, H = 1080, 1920
fp = "/System/Library/Fonts/STHeiti Medium.ttc"

img = Image.new('RGB', (W, H), '#0F172A')
d = ImageDraw.Draw(img)

# 渐变背景
for y in range(H):
    t = y / H
    r = int(15 + t * 20)
    g = int(23 + t * 15)
    b = int(42 + t * 30)
    d.line([(0, y), (W, y)], fill=(r, g, b))

X = W // 2

def draw_centered_badge(draw, bx, by, bw, bh, text, font, bg_color, text_color):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    text_x = bx + (bw - tw) // 2
    text_y = by + (bh - th) // 2
    draw.rounded_rectangle([bx, by, bx+bw, by+bh], bh//2, fill=bg_color)
    draw.text((text_x, text_y), text, fill=text_color, font=font)

F = {
    'title': ImageFont.truetype(fp, 140),
    'sub':   ImageFont.truetype(fp, 60),
    'tag':   ImageFont.truetype(fp, 42),
    'bdg':   ImageFont.truetype(fp, 38),
    'url':   ImageFont.truetype(fp, 22),
}

# ========== 垂直居中布局 ==========
# 计算总高度
badge_h      = 80
title_h      = 160
sub_h        = 80
line_h       = 30
tag_h        = 100
tag_gap_y    = 50
tag_rows     = 2
tag_cols     = 2
tag_w        = 360
tag_gap_x    = 100
bottom_bdg_h = 80
url_h        = 40

total_h = (
    badge_h + 50 + title_h + 25 + sub_h + 25 + line_h + 40 +
    (tag_h * tag_rows) + (tag_gap_y * (tag_rows - 1)) + 50 +
    bottom_bdg_h + 70 + url_h
)

Y = (H - total_h) // 2

# 1. 顶部徽章
t = "⏰ 日历管理"
bbox = d.textbbox((0, 0), t, font=F['bdg'])
bw = (bbox[2]-bbox[0]) + 90
bh = badge_h
draw_centered_badge(d, X-bw//2, Y, bw, bh, t, F['bdg'], (37, 99, 235), (255,255,255))
Y += badge_h + 50

# 2. 主标题
t = "CalDAV Calendar"
bbox = d.textbbox((0, 0), t, font=F['title'])
d.text((X-bbox[2]//2, Y), t, fill=(255,255,255), font=F['title'])
Y += title_h + 25

# 3. 副标题
t = "多平台日历同步管理"
bbox = d.textbbox((0, 0), t, font=F['sub'])
d.text((X-bbox[2]//2, Y), t, fill=(16,185,129), font=F['sub'])
Y += sub_h + 25

# 4. 分割线
d.line([(X-180, Y+15), (X+180, Y+15)], fill=(16,185,129), width=3)
Y += line_h + 40

# 5. 标签网格
tags = [
    ("📅", "统一管理"),
    ("🔄", "多平台同步"),
    ("🔍", "智能查询"),
    ("🔔", "日程提醒"),
]
grid_w = tag_w * tag_cols + tag_gap_x * (tag_cols - 1)
gx = X - grid_w // 2
tag_y_start = Y

for i, (e, txt) in enumerate(tags):
    row = i // tag_cols
    col = i % tag_cols
    full = e + " " + txt
    bbox = d.textbbox((0, 0), full, font=F['tag'])
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    tx = gx + col * (tag_w + tag_gap_x)
    ty = tag_y_start + row * (tag_h + tag_gap_y)
    text_x = tx + (tag_w - tw)//2
    text_y = ty + (tag_h - th)//2
    d.rounded_rectangle([tx, ty, tx+tag_w, ty+tag_h], 18, outline=(16,185,129), width=2)
    d.text((text_x, text_y), full, fill=(255,255,255), font=F['tag'])

grid_h = tag_h * tag_rows + tag_gap_y * (tag_rows - 1)
Y = tag_y_start + grid_h + 50

# 6. 底部徽章
t = "ClawHub 开源免费"
bbox = d.textbbox((0, 0), t, font=F['bdg'])
bw = (bbox[2]-bbox[0]) + 90
bh = bottom_bdg_h
draw_centered_badge(d, X-bw//2, Y, bw, bh, t, F['bdg'], (124, 58, 237), (255,255,255))
Y += bottom_bdg_h + 70

# 7. URL
t = "cn.clawhub-mirror.com/asleep123/caldav-calendar"
bbox = d.textbbox((0, 0), t, font=F['url'])
d.text((X-bbox[2]//2, H-50), t, fill=(100,116,139), font=F['url'])

img.save('/Users/zhushuyan/.openclaw/workspace/caldav-calendar-video/docs/assets/cover.png')
print("Cover saved!")
