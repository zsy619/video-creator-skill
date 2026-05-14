# ffmpeg ASS 字幕烧录字体修复（实测）

## 核心问题

ASS 字幕用 `Fontname=PingFang SC` 或 `Fontname=Arial` 时，ffmpeg 烧录后中文字符全部丢失（显示为方块或空白）。

**实测结论**：
- `Arial` → ffmpeg 烧录时字体查找失败，中文全丢失
- `PingFang SC` → 同上
- `STHeiti Medium` → ✅ 实测可用，中文正常显示

## 修复方案

### 方案一：在 ASS 文件中替换字体（推荐）

```bash
# 将 ASS 文件中的 Arial/PingFang SC 替换为 STHeiti Medium
sed 's/Arial/STHeiti Medium/g' subtitles.ass > subtitles_stheiti.ass
sed 's/PingFang SC/STHeiti Medium/g' subtitles_stheiti.ass > subtitles_stheiti_tmp.ass
mv subtitles_stheiti_tmp.ass subtitles_stheiti.ass

# 烧录命令（无需额外 fontsdir 参数）
ffmpeg -y -i video.mp4 -i audio.m4a \
  -filter_complex "[0:v]subtitles='subtitles_stheiti.ass'[outv]" \
  -map "[outv]" -map 1:a \
  -c:a aac -b:a 192k \
  -shortest out.mp4
```

### 方案二：ffmpeg 字幕烧录错误日志解读

```
[Parsed_subtitles_0 @ xxx] Glyph 0x4F60 not found, selecting one more font for (Arial, 400, 0)
[Parsed_subtitles_0 @ xxx] Error opening font: '/System/Library/PrivateFrameworks/FontServices.framework/Resources/Reserved/PingFangUI.ttc'
```

这表示 Arial 找不到中文字符，fallback 到 PingFangUI.ttc 也失败。最终 fallback 到某个字体但 glyph 仍然缺失 → 中文显示为方块或空白。

### 方案三：使用 fontsdir 参数（无效）

测试证明 ffmpeg 的 `fontsdir` 参数在 macOS 上基本无效，正确方案是直接在 ASS 文件中指定可用的中文字体。

## macOS 可用中文字体

| 字体名 | 中文名 | 可用性 |
|--------|--------|--------|
| `STHeiti Medium` | 黑体-简 | ✅ ffmpeg 烧录实测可用 |
| `STHeiti Light` | 黑体-简 细体 | ✅ 可用 |
| `Songti SC` | 宋体-简 | ✅ 可用（衬线体） |
| `PingFang SC` | 苹方-简 | ❌ ffmpeg 找不到 |

## 验证命令

```bash
# 检查 ASS 文件字体
grep "Style:" subtitles.ass

# 检查字幕是否烧录成功（截取一帧）
ffmpeg -y -ss 0:00:05 -i final.mp4 -frames:v 1 /tmp/check.png

# 如果中文字符在截图中正常显示，说明烧录成功
```

## 关联文档

- `rules/SUBTITLES.md` — 字幕规范（Fontsize=72, PlayResX=1080, PlayResY=1920）
- `references/ass-subtitle-spec-2026-05-10.md` — ASS 格式规范
