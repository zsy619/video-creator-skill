# ASS 字幕 ms() 函数 Bug 与正确参数（2026-05-10 OmniGet项目）

## 核心Bug：ms() 时间戳格式完全错误

**症状**：字幕时间戳 `0:04:00.00` 被解析为 **4分钟**，而不是 4秒！

**根因**：`ms()` 函数将 `total_sec` 直接当作秒数放到 SS 位置，但格式化字符串中实际落到 MM 位置。

ASS 时间格式是 `H:MM:SS.CC`：
- `0:04:00.00` = 0小时 **4分钟** 0秒 = 240秒 ❌
- `0:00:04.00` = 0小时 0分钟 **4秒** = 4秒 ✅

---

## ✅ 正确的 ms() 函数

```python
def ms(seconds):
    """将秒数转换为 ASS 时间格式 H:MM:SS.CC"""
    s = round(seconds, 2)
    total_sec = int(s)
    cs = int(round((s - total_sec) * 100)) % 100
    secs = total_sec % 60       # SS 字段（0-59）
    mins = (total_sec // 60) % 60  # MM 字段（0-59）
    hrs = total_sec // 3600
    return f"{hrs}:{mins:02d}:{secs:02d}.{cs:02d}"
```

### 验证输出

```
0.0s  -> 0:00:00.00
4.0s  -> 0:00:04.00  ← 不是 0:04:00.00！
12.0s -> 0:00:12.00
59.0s -> 0:00:59.00
60.0s -> 0:01:00.00
```

---

## ❌ 错误的 ms() 函数

```python
# 错误：total_sec 直接当 secs 用，secs 实际落到 MM 位置
def ms_wrong(seconds):
    total_sec = int(seconds)
    secs = total_sec % 60
    mins = total_sec // 60
    return f"{mins}:{secs:02d}:00.00"
    # 4秒: mins=0, secs=4 → "0:04:00.00" = 4分钟！
```

---

## ✅ 正确的 ASS 字幕 Style 参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `Fontsize` | **72** | 统一72，不需要根据PlayRes变化 |
| `PlayResX` | **1080** | 竖屏视频宽度 |
| `PlayResY` | **1920** | 竖屏视频高度 |
| `PrimaryColour` | `&H00FFFF` | 黄色（#FFFF00）|
| `Alignment` | **2** | 底部居中 |
| `MarginL` | **30** | 左侧边距 30px |
| `MarginR` | **30** | 右侧边距 30px |
| `MarginV` | **50** | 底部边距 50px |
| `Outline` | **2** | 2px 黑色描边（1px太细） |

---

## 验证命令

```bash
# 检查字幕文件时长
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 subtitles.ass

# 烧录一帧截图验证字幕显示
ffmpeg -y -i video_with_audio.mp4 -vf "ass=subtitles.ass" -frames:v 1 -q:v 2 check.png
```
