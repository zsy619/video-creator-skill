# 视频调试实战经验

> 来源：ian-handdrawn-ppt 项目调试（2026-05-09）
> 适用：Remotion + ffmpeg 工作流

---

## 1. spring() 导致黑屏

**症状**：视频场景封面/开头几帧是纯色黑屏，元素存在但不显示。

**根因**：`remotion` 的 `spring()` 动画在 `frame=0` 时输出值为 `0`，意味着元素初始 scale=0（完全不可见）。弹簧需要几帧才能弹到非零值，这期间画面是黑屏。

**修复**：用 `interpolate` 替代 `spring` 做进入动画，确保最小值 > 0。

```tsx
// ❌ 错误：spring 初始输出 = 0
const scale = spring({ frame: localFrame, fps: 60, config: { damping: 12 } });

// ✅ 正确：interpolate 从 0.85→1，始终可见
const scale = interpolate(Math.min(localFrame, 20), [0, 20], [0.85, 1], { extrapolateRight: "clamp" });
```

**通用原则**：任何进入动画的 `spring()` 或 `interpolate` 都要保证 `frame=0` 时输出值 > 0。

---

## 2. ffmpeg 字幕烧录验证

**症状**：ffmpeg 输出 `subtitle:0KiB`，是否说明字幕没烧进去？

**原因**：ffmpeg 的字幕统计**只计软字幕流**（用 `-c:s ass` 封装的字幕），用 `-vf "ass=..."` 硬烧进视频像素的字幕**不单独统计**。

**验证方法**：比较文件大小

```
原视频: 2.2MB
烧录后: 2.8MB  ← 大 600KB = 字幕烧进去了
```

**不需要担心**：ffmpeg exit code = 0 即成功。

```bash
# 硬烧字幕（推荐，播放器无需支持字幕）
ffmpeg -y -i video.mp4 -i subtitles.ass \
  -c:v libx264 -crf 18 -preset fast \
  -c:a copy \
  -vf "ass=subtitles.ass:fontsdir=/System/Library/Fonts" \
  out_with_subs.mp4
```

---

## 3. nb_frames=N/A 不是问题

**症状**：ffprobe 显示 `nb_frames=N/A`

**解释**：ffprobe 对某些编码的视频流无法确定帧数，显示 N/A，不代表有问题。只要：
- `r_frame_rate=60/1`（帧率正确）
- `duration=58.3`（时长正确）
- 文件大小合理（MB 级别）

就没问题。

---

## 4. 移除未使用的 import 避免 TS 错误

**症状**：`TS6133: 'FPS' is declared but its value is never read`

**原因**：TypeScript 的 `noUnusedLocals` 报错。删除代码后 import 未同步清理。

**修复**：删除未使用的 `spring`、`FPS` 等声明后立即运行 `npx tsc --noEmit` 验证。

---

## 5. Remotion 视频内嵌静音音频轨干扰混流

**症状**：ffmpeg 合并 Remotion raw 视频 + 外部音频后，最终视频音频静默。Remotion 视频音频显示结构正常（codec=aac, 317kbps）但播放无声音。

**根因**：Remotion 渲染的 raw 视频内部含有一个结构正常但实际静音的 AAC 轨道。ffmpeg 默认 stream selection 策略会选择第一个音频流（Remotion 内嵌的静音轨），导致外部音频被忽略。

**诊断**：
```bash
# 检查 volumedetect（-91dB 恒定 = 静音）
ffmpeg -i remotion_raw.mp4 -vn -af "volumedetect" -f null - 2>&1 | grep -E "mean|max"
# 输出: mean_volume: -91.0 dB, max_volume: -91.0 dB → 静音

# astats 确认（全部 -inf = 真静音）
ffmpeg -i remotion_raw.mp4 -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l
# 输出: 0 → 全部静音
```

**修复（两步隔离法）**：
```bash
# Step 1: 提取纯视频轨道，丢弃静音音频
ffmpeg -y -i remotion_raw.mp4 -map 0:v -c:v copy video_only.mp4

# Step 2: 与外部音频合并
ffmpeg -y -i video_only.mp4 -i neural_1_2x.m4a \
  -map 0:v -map 1:a \
  -c:v copy -c:a copy \
  final_with_audio.mp4
```

**关键**：`ffmpeg -c:a copy` 默认选择第一个音频流，必须用 `-map 0:v -map 1:a` 显式指定。
