## 封面图生成（PIL 唯一方案）

> **⚠️ 2026-05-14 更新**：封面图统一使用 `generate_cover.py` PIL 脚本生成，不再使用 Remotion still。
> 原因：视频渲染后才能拿到帧，封面无法作为强制前置步骤；PIL 可独立先出封面。

### 使用方式

```bash
python3 {SKILL_DIR}/scripts/generate_cover.py "主标题" "副标题" output_dir [canvas_type]
```

### 三平台封面同时生成

```bash
SKILL_DIR="{SKILL_DIR}"
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"

# 视频号封面 1080×1920
python3 "$SKILL_DIR/scripts/generate_cover.py" \
  "主标题文字" "副标题可选" \
  "$PROJECT_DIR/docs/assets" vertical

# 公众号封面 900×383
python3 "$SKILL_DIR/scripts/generate_cover.py" \
  "主标题文字" "副标题可选" \
  "$PROJECT_DIR/docs/assets" wechat

# 小红书封面 1440×2560
python3 "$SKILL_DIR/scripts/generate_cover.py" \
  "主标题文字" "副标题可选" \
  "$PROJECT_DIR/docs/assets" xhs
```

### 画布类型

| 类型 | 分辨率 | 比例 | 文件名 |
|------|--------|------|--------|
| `vertical` | 1080×1920 | 9:16 | `cover.png` |
| `wechat` | 900×383 | ≈2.35:1 | `cover-wechat.png` |
| `xhs` | 1440×2560 | 9:16 | `cover-xhs.png` |

### 输出路径

所有封面统一输出到 `docs/assets/` 目录：
- `docs/assets/cover.png` — 视频号封面（1080×1920）
- `docs/assets/cover-wechat.png` — 公众号封面（900×383）
- `docs/assets/cover-xhs.png` — 小红书封面（1440×2560）

### generate_cover.py 核心特性

| 特性 | 说明 |
|------|------|
| smart_resize_text() | 标题超宽自动缩字号（从安全上限开始，每轮-4px，最低36px） |
| CJK 乱码检测 | textbbox 检测宽高比，方块字 aspect≈1.0 触发报错 |
| 多层霓虹发光 | 4层渐变叠加，赛博朋克风格 |
| 动态字体探测 | 优先用户目录 → PingFang → Hiragino → Heiti |

### 字号安全上限

| 类型 | vertical | wechat | xhs |
|------|----------|--------|-----|
| 主标题 | 130px | 100px | 180px |
| 副标题 | 60px | 48px | 80px |
| 标签 | 42px | 36px | 56px |

### 验证命令

```bash
python3 -c "
from PIL import Image
import os

def verify(path, w, h, platform):
    img = Image.open(path)
    ok = img.size == (w, h)
    sz = os.path.getsize(path) / 1024
    print(f'{platform}: {img.size} {\"✅\" if ok else \"❌\"} {sz:.0f}KB')

p = '{WORKSPACE_DIR}/{project-name}/docs/assets'
verify(f'{p}/cover.png',      1080, 1920, '视频号')
verify(f'{p}/cover-wechat.png', 900,  383, '公众号')
verify(f'{p}/cover-xhs.png',  1440, 2560, '小红书')
"

---

## 封面图校验清单

生成后必须校验以下项目：

| 检查项 | 标准 | 方法 |
|--------|------|------|
| 尺寸 | 1080×1920 / 900×383 / 1440×2560 | PIL Image.size |
| 比例 | 0.562:1 / 2.350:1 / 0.562:1 | w / h |
| 字体 | Hiragino Sans GB 无乱码 | 系统字体验证 |
| 格式 | PNG | PIL Image.format |
| 文件大小 | > 20KB | os.path.getsize |

### 校验脚本

```python
from PIL import Image
import os

def verify_cover(path, expected_w, expected_h, platform):
    img = Image.open(path)
    w, h = img.size
    size_mb = os.path.getsize(path) / 1024 / 1024
    
    print(f"\n【{platform}】{os.path.basename(path)}")
    print(f"  尺寸: {w}x{h} {'✅' if w == expected_w and h == expected_h else '❌'}")
    print(f"  大小: {size_mb:.2f} MB")
    print(f"  格式: {img.format}")
    return w == expected_w and h == expected_h

# 校验
verify_cover('docs/assets/cover.png', 1080, 1920, '视频号')
verify_cover('docs/assets/cover-wechat.png', 900, 383, '公众号')
verify_cover('docs/assets/cover-xhs.png', 1440, 2560, '小红书')
```

---

## 主题配色参考

| 主题 ID | 名称 | backgroundColor | primaryColor | textColor |
|---------|------|-----------------|--------------|-----------|
| tech-modern | 科技现代风 | #0F172A | #2563EB | #F8FAFC |
| particle-tech | 粒子科技风 | #0A0E27 | #00D4FF | #FFFFFF |
| cyber-punk | 赛博朋克风 | #0D0221 | #FF00FF | #00FFFF |
| nature | 自然清新风 | #F0FDF4 | #10B981 | #166534 |
| warm | 温暖治愈风 | #FFFBEB | #F59E0B | #78350F |

---

## 常见问题

### Q: 字体乱码
A: 必须使用 `Hiragino Sans GB.ttc`（macOS 中文显示最佳）

### Q: AI 生成封面字体乱码
A: 降级使用 PIL 直接生成，避免 AI 生成中文字体

### Q: 比例不对
A: 先按 16:9 生成，然后 PIL 裁剪为目标比例

---

## 相关文件

| 文件 | 说明 |
|------|------|
| `docs/assets/cover.png` | 视频号封面 |
| `docs/assets/cover-wechat.png` | 公众号封面 |
| `docs/assets/cover-xhs.png` | 小红书封面 |
