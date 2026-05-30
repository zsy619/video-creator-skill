# Remotion 渲染阶段三个致命陷阱

> **最后更新**：2026-05-23
> **配套文档**：`remotion-props.md`（`--props` 传递）、`remotion-troubleshoot.md`（Composition ID / Sequence 黑屏）

---

## 陷阱一：`durationInFrames` 硬编码值覆盖 CLI 参数

### 症状

Remotion 渲染时传了 `--duration-in-frames=1558`，但视频输出是 3118 帧（52 秒），不是预期的 1558 帧（26 秒）。

### 根因

```tsx
// ❌ 错误：Root.tsx 中硬编码 durationInFrames
function Root() {
  return (
    <Composition
      id="VerticalVideo"
      durationInFrames={3118}  // 硬编码值优先级高于 CLI --duration-in-frames
      fps={60}
      component={VideoInner}
    />
  );
}
```

Remotion 的 `durationInFrames` 在 JSX 中的值会覆盖 CLI 的 `--duration-in-frames` 参数。

### 正确做法：动态计算帧数

必须用 `calculateMetadata` 从音频文件时长计算帧数：

```tsx
import {Composition, staticFile} from "remotion";
import {getAudioDuration} from "remotion-media-utils";
import React from "react";

// ✅ 正确：动态计算帧数
export const calculateMetadata = async () => {
  const audioDuration = await getAudioDuration(
    staticFile("audio/neural_1_2x.m4a")
  );
  const fps = 60;
  const TOTAL_FRAMES = Math.round(audioDuration * fps);
  return {
    durationInFrames: TOTAL_FRAMES,
    fps,
  };
};

function Root() {
  return (
    <Composition
      id="VerticalVideo"
      durationInFrames={0}  // 0 表示"由 calculateMetadata 决定"
      fps={60}
      component={VideoInner}
    />
  );
}
```

### 验证命令

```bash
# 检查是否还有硬编码帧数
grep "durationInFrames={[0-9]" video-project/src/Root.tsx

# 渲染后检查实际帧数
ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames \
  -of default=noprint_wrappers=1 video-project/out/final.mp4
```bash

---

## 陷阱二：`getAudioDuration` 打包阶段 404

### 症状

```bash
Error: Cannot find file audio/neural_1_2x.m4a
# 或
404 Not Found: audio/neural_1_2x.m4a
```

Remotion 打包阶段（bundling）访问音频文件时路径不正确。

### 根因

`getAudioDuration` 和 `<Audio>` 在 Remotion 打包阶段需要通过 `staticFile()` 引用路径，直接写相对路径会在打包时 404：

```tsx
// ❌ 错误：直接写相对路径
const audioDuration = await getAudioDuration("audio/neural_1_2x.m4a");

// ❌ 错误：在 <Audio> 中用相对路径
<Audio src="audio/neural_1_2x.m4a" />
```

### 正确做法：所有音频路径都用 `staticFile()` 包裹

```tsx
// calculateMetadata 中
const audioDuration = await getAudioDuration(
  staticFile("audio/neural_1_2x.m4a")  // ✅ staticFile 包裹
);

// Video.tsx 中
<Audio src={staticFile("audio/neural_1_2x.m4a")} />  // ✅ staticFile 包裹
```

### Remotion 路径解析规则

| 上下文 | 正确路径写法 |
|--------|-------------|
| `calculateMetadata` 中 `getAudioDuration()` | `staticFile("audio/neural_1_2x.m4a")` |
| `Video.tsx` 中 `<Audio>` | `staticFile("audio/neural_1_2x.m4a")` |
| `video-project/public/audio/` 实际文件 | `audio/neural_1_2x.m4a`（不含 `public/` 前缀） |

**音频文件必须放在 `video-project/public/audio/` 目录**，Remotion 的 `staticFile()` 从 `public/` 根开始解析。

---

## 陷阱三：`voice.atempo` 配置值被动态计算覆盖

### 症状

`video-config.json` 中设置了 `voice.atempo: 1.2`，但渲染出来的视频语音速度不是 1.2x。

### 根因

`launch.sh` 中存在动态 atempo 计算逻辑：

```bash
# ❌ 错误：用 SOURCE_DURATION / TARGET_DURATION 覆盖配置值
ATEMPO=$(python3 -c "print(round($SOURCE_DUR / $TARGET_DUR, 4))")
# 如果 narration.txt 字数偏少 → ATEMPO < 1.0 → 语速变慢
# 例如：31.18s / 52s = 0.6 → 语速变成 0.6x！
```bash

动态计算本意是"让 narration 精确填满目标时长"，但实际上 `narration.txt` 应该已经控制在目标字数内（175 字对应 52 秒），不需要动态压缩。

### 正确做法：使用配置值

```bash
# 从 video-config.json 读取 voice 配置
VOICE_RATE=$(python3 -c "
import json
c=json.load(open('${config_file}'))
v=c.get('voice',{})
print(v.get('rate','+0%'))
")
VOICE_ATEMPO=$(python3 -c "
import json
c=json.load(open('${config_file}'))
v=c.get('voice',{})
print(v.get('atempo','1.0'))
")

# edge-tts 使用 VOICE_RATE
edge-tts \
  --voice zh-CN-YunjianNeural \
  --rate "${VOICE_RATE}" \
  --text "$(cat docs/narration.txt)" \
  --write-media audio/neural_full.mp3

# ffmpeg 使用 VOICE_ATEMPO（不再动态计算）
ffmpeg -y -i audio/neural_full.mp3 \
  -af "atempo=${VOICE_ATEMPO}" \
  -c:a aac -b:a 256k \
  audio/neural_1_2x.m4a
```

### `voice` 配置结构（video-config.json）

```json
{
  "cover": {
    "title": "MiaoYan",
    "subtitle": "macOS轻量级Markdown笔记应用"
  },
  "theme": "cyberpunk",
  "voice": {
    "rate": "+0%",
    "atempo": "1.2"
  }
}
```

---

## 综合验证命令

```bash
# 1. 检查 Root.tsx 是否还有硬编码帧数
grep "durationInFrames={[0-9]" video-project/src/Root.tsx && echo "❌" || echo "✅ 无硬编码"

# 2. 检查 staticFile 包裹
grep -E "getAudioDuration\([^s]|Audio src={[^s]" video-project/src/Root.tsx video-project/src/Video.tsx && echo "❌ 缺少 staticFile" || echo "✅ staticFile 正确"

# 3. 检查 launch.sh 是否用配置值而非动态计算
grep "SOURCE_DUR.*TARGET_DUR" scripts/launch.sh && echo "❌ 动态计算覆盖配置" || echo "✅ 使用配置值"

# 4. 渲染后验证时长
ffprobe -v error -show_entries format=duration -of csv=p=0 video-project/out/final.mp4
# 应等于 audio/neural_1_2x.m4a 的实测时长（±0.1s）
```
