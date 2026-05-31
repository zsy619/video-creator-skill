# Remotion v4 API 不兼容问题

> **最后更新**：2026-05-30
> **来源**：goose 项目实战

## 致命问题：`getAudioDuration` 不存在于 Remotion v4

**症状**：
```
TypeError: (0 , esm.getAudioDuration) is not a function
at src/Root.tsx:4
const TOTAL_FRAMES = Math.round(getAudioDuration(staticFile(audioFile)) * 60);
```

**根因**：Remotion v4 已移除 `getAudioDuration` API，旧版代码无法编译。

**修复**：硬编码帧数（57.184s × 60fps = 3431f）：
```tsx
import { Composition, staticFile } from "remotion";
import { VerticalVideo } from "./Video";

const TOTAL_FRAMES = 3431;  // 57.184s × 60fps

export const RemotionRoot = () => {
  return (
    <Composition
      id="VerticalVideo"
      component={VerticalVideo}
      durationInFrames={TOTAL_FRAMES}
      ...
    />
  );
};
```

**验证**：Remotion v4 无 `getAudioDuration` 和 `useAudioData`，音频时长只能通过：
1. `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 audio/neural_1_2x.m4a` 获取后手动计算
2. 或在 `video-config.json` 中维护 `totalMs` 字段

**触发条件**：
- `import { getAudioDuration } from "remotion"` → 编译失败
- `Composition` 的 `durationInFrames` 参数必须为正数常量

## 关联 Bug

| Bug | 文件 | 说明 |
|-----|------|------|
| `Root.tsx durationInFrames={0}` | `video-creator-deep-lessons.md` 9.2 | 必须正数初始值 |
| `video-optimization.md` | 渲染前 4 项预检 | 含帧数验证 |

## 验证命令

```bash
# 验证帧数硬编码正确
cd video-project && npx tsc --noEmit 2>&1 | grep -i "getAudioDuration"

# 验证视频实际帧数
ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 out/final.mp4
```