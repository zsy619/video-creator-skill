# PIL Frame Generation Pitfalls (2026-05-11)

## 1. 3-digit hex colors crash Pillow

**Bug**: `h2r('#0FF')` → `ValueError: invalid literal for int() with base 16: ''`

**Cause**: `#0FF` is 3 digits, `int('F', 16)` works but `int('', 16)` fails when loop expands incorrectly.

**Fix**: Expand 3-digit hex to 6-digit:
```python
def h2rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:  # e.g. '#0FF' → '#00FFFF'
        h = ''.join(c*2 for c in h)
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
```

**Never use**: `'#0FF'`, `'#F0F'`, `'#0F8'` directly — always expand or use 6-digit `'#00FFFF'`.

---

## 2. `rounded_rectangle()` parameter name: `radius=` not `r=`

**Bug**: `d.rounded_rectangle([...], r=20, outline=COLOR)` → `TypeError: got an unexpected keyword argument 'r'`

**Fix**: Use `radius=` keyword:
```python
# ❌ Wrong
d.rounded_rectangle([x, y, x+w, y+h], r=20, outline=COLOR)

# ✅ Correct
d.rounded_rectangle([x, y, x+w, y+h], radius=20, outline=COLOR)
```

**Verification**:
```bash
python3 -c "from PIL import ImageDraw; help(ImageDraw.ImageDraw.rounded_rectangle)"
```

---

## 3. Frame numbering must be continuous — no step=N

**Bug**: Generating every 3rd frame (`frame_0000.png`, `frame_0003.png`, ...) then feeding to `ffmpeg -i frame_%04d.png` causes ffmpeg to read only frame 0 and stop.

**Root cause**: `frame_%04d.png` pattern with non-sequential files — ffmpeg sees `frame_0003.png` after `frame_0000.png` and expects `frame_0001.png` next, fails, terminates.

**Fix**: Always generate 1 frame per `frame_N.png`:
```python
# ❌ Wrong — skip frames
for f in range(0, 180, 3):
    img.save(f"frame_{f:04d}.png")

# ✅ Correct — every frame, continuous numbering
for fn in range(180):
    img.save(f"frame_{fn:04d}.png")  # 0000, 0001, 0002, ... 0179
```

**If frames are already misnumbered**, fix with:
```bash
cd "$FRAMES_DIR"
i=1
for f in frame_*.png; do
  new=$(printf "frame_%04d.png" $i)
  [ "$f" != "$new" ] && mv "$f" "$new"
  i=$((i + 1))
done
```

**Frame count math**:
- 60fps × target_seconds = total_frames_needed
- Example: 60.85s × 60 = 3651 frames (round up)

---

## 4. `ellipse()` for particle effects

For floating particles, use `ellipse` not `point`:
```python
# ✅ Particle dots
draw.ellipse([x-3, y-3, x+3, y+3], fill=(0, 255, 255, alpha))

# ❌ point() doesn't exist in ImageDraw
# draw.point([x, y], fill=COLOR)
```

---

## 5. Alpha channel handling

PIL RGBA operations require careful alpha management:
```python
# ✅ Create RGBA image
img = Image.new('RGBA', (W, H), (10, 10, 20, 255))

# ✅ Convert to RGB for save (ffmpeg needs RGB)
img.convert('RGB').save(f"frame_{fn:04d}.png")

# ✅ Alpha color helper
def ac(color_tuple, alpha):
    return color_tuple[:3] + (alpha,)
draw.ellipse([...], fill=ac((0, 255, 255), 150))
```

---

## 6. Font fallback chain

Always try multiple font paths:
```python
def get_font(size):
    for path in [
        "/System/Library/Fonts/STHeiti Light.ttc",   # macOS Chinese
        "/System/Library/Fonts/Helvetica.ttc",        # macOS fallback
        "/System/Library/Fonts Supplemental/Calvetica.ttc",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except:
            pass
    return ImageFont.load_default()  # last resort
```

**Font size reference** (1080×1920竖屏):
- Main title: 120px (肉眼约72px)
- Subtitle: 42px
- Section header: 36px
- Body/labels: 22-28px
- Small text: 14-18px

---

## 7. Performance: ~60 frames/second generation

Measured on Mac M-series:
- Scene 1 (180 frames): ~3 seconds
- Scene 2 (720 frames): ~12 seconds  
- Scene 3 (900 frames): ~15 seconds
- Scene 4 (1080 frames): ~18 seconds
- Scene 5 (480 frames): ~8 seconds
- Scene 6 (291 frames): ~5 seconds
- **Total 3651 frames: ~60 seconds**

Use `terminal(background=true)` with `notify_on_complete=true` for generation >30s:
```python
terminal(
    command='python3 scripts/gen_frames.py',
    background=True,
    notify_on_complete=True,
    timeout=600
)
```

---

## 8. Grid drawing with scrolling effect

```python
def draw_grid(draw, w, h, color, spacing=60, speed=0):
    offset = int(speed) % spacing  # scrolling offset
    # Horizontal lines
    for y in range(-spacing + offset, h + spacing, spacing):
        draw.line([(0, y), (w, y)], fill=color, width=1)
    # Vertical lines
    for x in range(0, w + spacing, spacing):
        draw.line([(x, 0), (x, h)], fill=color, width=1)
```

For dual-layer grid (cyberpunk):
```python
draw_grid(draw, W, H, (0, 255, 255, 20), spacing=60, speed=fn*0.2)   # cyan
draw_grid(draw, W, H, (255, 0, 255, 13), spacing=60, speed=fn*0.15)  # magenta
```

---

## 9. HUD corners decoration

```python
def draw_hud_corners(draw, w, h, color):
    s = 40  # corner arm length
    width = 3
    # Top-left
    draw.line([(30, 30), (30+s, 30)], fill=color, width=width)
    draw.line([(30, 30), (30, 30+s)], fill=color, width=width)
    # Top-right
    draw.line([(w-30-s, 30), (w-30, 30)], fill=color, width=width)
    draw.line([(w-30, 30), (w-30, 30+s)], fill=color, width=width)
    # Bottom-left
    draw.line([(30, h-30), (30+s, h-30)], fill=color, width=width)
    draw.line([(30, h-30-s), (30, h-30)], fill=color, width=width)
    # Bottom-right
    draw.line([(w-30-s, h-30), (w-30, h-30)], fill=color, width=width)
    draw.line([(w-30, h-30-s), (w-30, h-30)], fill=color, width=width)
```

---

## 10. Scene timing reference (60fps)

| Scene | Frame Range | Duration | Content |
|-------|-------------|----------|---------|
| S1 Cover | 0–180 | 3s | Title + subtitle + tags |
| S2 Core Concept | 180–900 | 12s | Quote + dual-line slogan |
| S3 Three Systems | 900–1800 | 15s | 3-column cards staggered entry |
| S4 Features | 1800–2880 | 18s | 2×2 data grid |
| S5 Quick Start | 2880–3360 | 8s | Terminal typewriter |
| S6 CTA | 3360–3651 | 4.85s | GitHub + Discord + tagline |
| **Total** | **3651** | **60.85s** | |

**Formula**: `target_frames = ceil(fps × target_duration)`

## 11. Precise text centering with `txt_center()` — CRITICAL SIGNATURE

Every text element must be horizontally AND vertically centered. The function takes **5 required positional arguments**:

```python
def txt_center(draw, text, font, x, y, color):
    """Draw text centered at point (x, y) - y is the CENTER point."""
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    draw.text((x - w // 2, y - bbox[3] // 2), text, font=font, fill=color)
```

**⚠️ Common mistake**: Calling `txt_center(d, "标题", W//2, 220, C['c'])` — missing the `font` argument. This causes `TypeError: txt_center() missing 1 required positional argument: 'color'`.

```python
# ❌ Wrong — missing font, gets interpreted as: d, text, x, y, font → color gets wrong arg
txt_center(d, "标题", W//2, 220, C['c'])

# ✅ Correct — all 5 args present
tf = gf(80)
txt_center(d, "标题", tf, W//2, 220, C['c'])
```

**⚠️ When patching**: If replacing a block that contains variable definitions (`cards_data=`, `feats=`, `code=`), those definitions must be included in the new block or re-included before the loop. A patch that only replaces the loop header but the loop body references an undefined variable will fail with `NameError`.

```python
# ❌ Dangerous patch — removes cards_data definition
-# S3 900-1800: Three systems
-for fn in range(900,1800):
+# S3 900-1800: Large title
+cards_data=[...]  # ← must also include this
+for fn in range(900,1800):
```

## 12. Font size reference (1080×1920 vertical video)

| Element | Font size | Notes |
|---------|-----------|-------|
| Main title (S1) | 120px | CLAW CODE, centered at y=H*0.32 |
| **Section title (S2-S5)** | **80–90px** | "核心理念" / "三个核心系统" / "核心特性" / "快速开始" — user explicitly requested large centered titles |
| Subtitle | 42px | Tagline below main title |
| Card title | 52px | System/card names |
| Card subtitle | 30px | Card descriptions |
| Card body | 22px | Multi-line descriptions |
| Tags/labels | 24px |  |
| Terminal code | 22px |  |
| HUD hints | 14px |  |

## 12. Vertical centering for complex components

### 2×2 data grid (S4)
- Grid total height: `grid_h = cell_h * 2 + vgap` (e.g., 380×2 + 40 = 800px)
- Top y: `grid_top_y = (H - grid_h) // 2` → centers entire grid vertically in canvas
- Within each card: value at `y + 180` (card middle), unit at `y + 250`, description at `y + 340`
```python
grid_top_y = (H - 800) // 2  # = 560 when H=1920
cell_y = grid_top_y + row * (cell_h + vgap)
```

### Terminal window (S5)
- Terminal window: center vertically → `ty = (H - th) // 2`
- Code lines inside terminal: center in remaining content area
```python
ty = (H - th) // 2  # = 720 for th=480, H=1920
code_top_y = ty + 60  # content area starts below title bar
remaining = th - 60 - code_total_h
first_line_y = code_top_y + remaining // 2  # vertical center in content
```
- Prompt below terminal: `ty + th + 60` (immediately below window, not floating)
