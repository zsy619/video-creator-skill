# FFmpeg 音频处理陷阱

## silenceremove filter 参数错误

**症状**: `ffmpeg ... -af "silenceremove=delete_threshold=0dB:window=0.05"` 报错：
```
Error applying option 'delete_threshold' to filter 'silenceremove': Option not found
```

**根因**: 不同 FFmpeg 版本对 `silenceremove` 参数名不同：
- 新版本用 `start_periods`、`start_threshold`、`start_duration`、`start_silence` 等
- 旧版本用 `delete_threshold`、`window` 等

**实测环境**: macOS Homebrew `ffmpeg-full 8.1`，`silenceremove` 参数包括：
- `start_periods` — 开始的静音段数量
- `start_threshold` — 静音阈值（dB）
- `start_duration` — 静音持续多少秒才触发
- `window` — 分析窗口大小（非所有版本支持）
- `threshold` — 旧版参数，新版不支持

**Workaround**: 去掉 `silenceremove`，只用 `atempo`：
```bash
ffmpeg -y -i input.mp3 \
  -af "atempo=1.2" \
  -c:a aac -b:a 256k \
  output.m4a
```

**如果必须去静音**: 用简单的时间裁断方式，不依赖 silenceremove filter。

---

## atempo 超出范围

`atempo` 有效范围是 0.5~2.0。超过 2.0 需要链式调用：
```bash
# 2.4x 加速
-af "atempo=2.0,atempo=1.2"
```

---

## 音频时长与视频帧数不匹配

**问题**: Remotion 渲染的视频实际时长可能与配置的帧数不完全匹配（35秒实际输出 vs 37秒音频）。

**原因**: Remotion 的 durationInFrames 基于 fps×duration 计算，但渲染时可能有帧率微调。

**Workaround**: 用 ffmpeg `-shortest` 裁断到较短者，或重新混流：
```bash
ffmpeg -y -i video.mp4 -i audio.m4a \
  -c:v copy -c:a aac -b:a 256k \
  -shortest \
  output_with_audio.mp4
```
