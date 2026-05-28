# Remotion `durationInFrames={0}` 致命错误

## 错误信息

```
TypeError: The "durationInFrames" prop in <Composition id="VerticalVideo"> must be positive, but got 0.
    at validateDurationInFrames (http://localhost:3000/bundle.js:2689:11)
```

## 根因

Remotion 在 **bundle 阶段**校验 `durationInFrames` 是否 >0，而不是等 `calculateMetadata` 执行完再判断。

以下代码会立刻崩溃（bundle 阶段即失败）：

```tsx
export const RemotionRoot = () => {
  return (
    <Composition
      id="VerticalVideo"
      component={VerticalVideo}
      durationInFrames={0}  // ❌ 必须为正数
      calculateMetadata={async ({ props }) => {
        const dur = await getAudioDuration(staticFile(props.audioFile));
        return { durationInFrames: Math.ceil(dur * 60), props };
      }}
    />
  );
};
```

## 正确方案

### 方案 A（推荐）：直接硬编码帧数 ✅

```tsx
import { Composition } from "remotion";
import { VerticalVideo } from "./Video";

export const RemotionRoot = () => {
  return (
    <Composition
      id="VerticalVideo"
      component={VerticalVideo}
      durationInFrames={3120}   // 用 ffprobe 查出音频时长 × 60fps，直接写死
      fps={60}
      width={1080}
      height={1920}
      defaultProps={{ ... }}
    />
  );
};
```

**如何获取帧数**：
```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 audio/neural_1_2x.m4a
# 输出：52.002
# 帧数 = 52.002 * 60 = 3120
```

### 方案 B：保留 calculateMetadata + 正数初始值

```tsx
durationInFrames={1}  // 必须 ≥1，bundle 阶段通过校验
calculateMetadata={async ({ props }) => {
  const dur = await getAudioDuration(staticFile(props.audioFile));
  return { durationInFrames: Math.ceil(dur * 60), props };
}}
```

> ⚠️ `@remotion/media-utils` 的 `getAudioDuration` 在某些 Remotion 版本中不存在（`is not a function`），导致方案 B 不稳定。**方案 A 更可靠**。

## 检测命令（渲染前必做）

```bash
grep "durationInFrames={0}" video-project/src/Root.tsx && echo "❌" || echo "✅"
```

## kooky 项目修复实录

| 项目 | 值 |
|------|-----|
| 音频时长 | 52.002s |
| 帧数 | 52.002 × 60 = **3120** |
| 修复前 | `durationInFrames={0}` → bundle TypeError |
| 修复后 | `durationInFrames={3120}` → 渲染成功 |

修复命令：
```bash
python3 -c "import subprocess; dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','/Volumes/OpenClawDrive/.hermes/workspace/kooky/audio/neural_1_2x.m4a'], text=True).strip()); print(int(dur*60))"
# 输出：3120
```