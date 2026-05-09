# 封面图生成规范（2026-05-10 修订版）

> 本文件是 `rules/COVER_GENERATE.md` 的修订版内容，已整合固定字号 + 强制宽度校验。

## 固定字号速查表

| 画布类型 | 画布尺寸 | 主标题 | 副标题1 | 副标题2 |
|---------|---------|--------|--------|--------|
| 竖屏视频号 | 1080×1920 | **130px** | **52px** | **36px** |
| 公众号 | 900×383 | **108px** | **44px** | — |
| 小红书 | 1440×2560 | **180px** | **72px** | **48px** |

> ✅ 以上字号已实测验证：12字符内中文副标题均 < 90% 画布宽。

## 字体路径
`/System/Library/Fonts/STHeiti Medium.ttc`（禁止 Hiragino Sans GB）

## 核心原则
1. 固定字号，不用比例计算
2. 每段文字必须 `assert width < canvas_width * 0.90`
3. 使用 `anchor='mm'` 居中

## 宽度自校验函数
```python
def measure_text(draw, text, font, anchor='mm'):
    bbox = draw.textbbox((0, 0), text, font=font, anchor=anchor)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]

def smart_resize_text(text, font_path, start_size, canvas_width, max_ratio=0.90):
    size = start_size
    while size >= 24:
        font = ImageFont.truetype(font_path, size)
        dummy = ImageDraw(Image.new('RGB', (1, 1)))
        w, h = measure_text(dummy, text, font)
        if w <= 0: break
        if w < canvas_width * max_ratio:
            return font, w, h
        size -= 4
    return ImageFont.truetype(font_path, 24), w, h
```

## 常见问题
**Q: 文字超出画布** — assert 只验证了英文主标题，未验证中文副标题，每段文字都要 assert。
**Q: 封面字号与视频不一致** — 以 Video.tsx 为准（130px），PIL 必须同步。
