# 封面图生成规范

> 所属模块：video-creator / SKILL.md → Step 6 封面图生成

## 封面图生成规则

> ⚠️ **重要**：封面图是强制必选项，生成后才能进入音频和渲染步骤。

### 封面图类型

| 平台 | 分辨率 | 比例 | 文件名 | 输出路径 |
|------|--------|------|--------|----------|
| 视频号 | 1080×1920 | 9:16 | `cover.png` | `docs/assets/` |
| 公众号 | 900×383 | ≈2.35:1 | `cover-wechat.png` | `docs/assets/` |
| 小红书 | 1440×2560 | 9:16 | `cover-xhs.png` | `docs/assets/` |

---

## Remotion 封面生成（唯一方案）

> **⚠️ 2026-05-13 重要更新**：封面图统一使用 `npx remotion still` 从 Remotion 项目渲染，禁止使用 PIL 生成封面。

### 渲染命令

```bash
cd video-project

# 渲染视频号封面 1080×1920
npx remotion still VerticalVideo docs/assets/cover.png --frame=0 --log=error

# 从同一帧截取公众号封面 900×383（居中裁剪）
ffmpeg -y -i docs/assets/cover.png \
  -vf "crop=900:383:(iw-900)/2:(ih-383)/2" \
  docs/assets/cover-wechat.png

# 从同一帧截取小红书封面 1440×2560
ffmpeg -y -i docs/assets/cover.png \
  -vf "scale=1440:2560:force_original_aspect_ratio=decrease,pad=1440:2560:(ow-iw)/2:(oh-ih)/2" \
  docs/assets/cover-xhs.png
```

### 验证

```bash
ffprobe -v error -show_entries stream=width,height -of default=noprint_wrappers=1 \
  docs/assets/cover.png docs/assets/cover-wechat.png docs/assets/cover-xhs.png
# 期望：1080×1920 / 900×383 / 1440×2560
```

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
