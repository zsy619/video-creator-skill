# Remotion 渲染失败修复笔记

> 来源：ai-psychology-video 项目调试，2026-05-09
> 关联：video-creator SKILL.md / rules/REMOTION.md / rules/TROUBLESHOOTING.md

---

## 1. "No entry point specified" + useCurrentFrame 错误

**症状**：
```
npx remotion render src/Root.tsx Video out/video.mp4
→ No entry point specified

npx remotion render src/Video.tsx Video out/video.mp4
→ useCurrentFrame() can only be called inside a component that was registered as a composition
```

**根因**：Remotion 4.x 对入口点检测有版本敏感性，简单的 `registerRoot(Video)` 模式无法被正确识别。

**验证命令**：
```bash
npx remotion versions
# 查看是否有版本不一致（如 4.0.448 vs 4.0.449 vs 4.0.450）
```

**修复方案（已验证可行）**：

```tsx
// src/entry.tsx — 渲染入口文件（独立文件，非 Root.tsx）
import React from "react";
import { Composition, registerRoot } from "remotion";
import { Video } from "./Video";

const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Video"              // ← render 命令的第二个参数
      component={Video}       // ← Video 是使用 useCurrentFrame() 的组件
      durationInFrames={2400}
      fps={60}
      width={1080}
      height={1920}
    />
  );
};

registerRoot(RemotionRoot);
```

```tsx
// src/Video.tsx — 视频组件（含所有场景和字幕）
// 注意：Video.tsx 不调用 registerRoot()
import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FAFC" }}>
      {frame < 300 && <CoverScene frame={frame} />}
      {frame >= 300 && <ConceptScene frame={frame - 300} />}
      {/* ... 其他场景 ... */}
    </AbsoluteFill>
  );
};
export const fps = 60;
export const durationInFrames = 2400;
export const width = 1080;
export const height = 1920;
```

**渲染命令**：
```bash
npx remotion render src/entry.tsx Video /tmp/out.mp4
#                     ↑           ↑
#               entry文件      composition ID
```

**版本冲突时的快速修复**：
```bash
npx remotion upgrade  # 统一到最新版本（最有效的修复）
```

---

## 调试实录：如何发现 `Composition` 是 React 组件（而非工厂函数）

> 本节来自 react-doctor-video 项目，2026-05-13

**问题**：尝试 `Composition.fromRoot()`、`Composition.register()`、`Composition({ id, component })` 等各种写法均失败，最终发现 `useCurrentFrame()` 报错 "can only be called inside a component that was registered as a composition"。

**调试步骤**（在 `node -e` REPL 中逐步验证）：

```bash
cd video-project
node -e "const {Composition, registerRoot} = require('remotion'); console.log(typeof Composition);"
# 输出: function

# 检查 Composition 的实际性质
node -e "
const {Composition} = require('remotion');
const React = require('react');
// 尝试作为组件创建 element
const el = React.createElement(Composition, {
  id: 'test', fps: 30, durationInFrames: 30, height: 100, width: 100,
  component: () => React.createElement('div', null, 'test')
});
console.log('Element type:', el.type.name || el.type.toString().substring(0,80));
// 输出: Composition（即它是一个 React 组件）
"

# 关键验证：Composition 可以直接作为 React 组件调用
node -e "
const {Composition} = require('remotion');
const React = require('react');
// Composition.call() 尝试以函数方式调用 → 抛出 "Invalid hook call"
const result = Composition({ id: 'test', fps: 30, durationInFrames: 30, height: 100, width: 100, component: () => null });
"
# 错误: Invalid hook call (因为 hooks 需要在 React 组件树内调用)
# 这证明 Composition 是组件，不是工厂函数

# 检查 registerRoot 的签名
node -e "const {registerRoot} = require('remotion'); console.log(registerRoot.length);"
// 输出: 1（接收一个参数：React 组件）
```

**结论**：
- `Composition` 是 React 组件，必须作为 JSX `<Composition id="..." component={...} />` 使用
- `registerRoot` 接收一个返回 `<Composition .../>` 的 React 函数组件
- 错误 "useCurrentFrame() can only be called inside a component that was registered as a composition" 的根因：**直接对含 `useCurrentFrame()` 的内部组件调用 `registerRoot(innerComponent)`**，而没有通过 `<Composition>` 包装

**正确结构（经本次验证）**：

```tsx
// src/index.tsx
import React from "react";
import {registerRoot, Composition} from "remotion";
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from "remotion";

// 业务组件：可以使用 useCurrentFrame()
function VideoInner(props) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: "#0D0D1A"}}>
      <Sequence from={0} durationInFrames={180}>
        <CoverScene frame={frame} />
      </Sequence>
      {/* ... 更多场景 ... */}
    </AbsoluteFill>
  );
}

// Remotion Root：必须用 <Composition> 包装
function Root() {
  return (
    <Composition
      id="VerticalVideo"         // render 命令的 composition ID
      fps={59.94}
      height={1920}
      width={1080}
      durationInFrames={3024}
      component={VideoInner}
    />
  );
}

registerRoot(Root);
```

**渲染命令**：
```bash
npx remotion render VerticalVideo out/final.mp4 --log=error
#                   ↑
#          与 <Composition id="VerticalVideo"> 匹配
```

---

## 2. 旧模式（有问题的模式）

以下模式在 Remotion 4.x 中会失败：

```tsx
// ❌ 错误：Root.tsx 中直接 registerRoot(Video)
// 这会导致 "useCurrentFrame() can only be called inside a component that was registered as a composition"
import { registerRoot } from "remotion";
import { Video } from "./Video";
registerRoot(Video);

// ❌ 错误：Video.tsx 导出后被 entry 文件用 registerRoot 注册
// 但 entry 文件本身没有 Composition 包装
```

---

## 3. 视频拼接后黑屏 / 封面场景首帧黑

**症状**：最终拼接视频前几秒画面全黑

**根因**：封面场景组件（如 CoverScene）在帧 0-20 之间只有装饰线条的 opacity 动画渐变，无实质性视觉内容。

**修复**：在封面场景根部添加不透明背景层，确保帧 0 已有内容：
```tsx
<AbsoluteFill style={{ backgroundColor: '#F8FAFC' }} />
```

---

## 4. 字幕缺失 — 所有场景无字幕叠加

**根因**：各场景组件（CoverScene、ConceptScene 等）内部没有渲染字幕代码，SubtitleOverlay 组件未集成到视频中。

**正确模式**：在主 Video.tsx 中定义 SubtitleOverlay 组件，用 frame 判断当前字幕，所有场景共享：

```tsx
const SUBTITLES = [
  { start: 30, end: 150, text: "欢迎走进AI心理学" },
  { start: 150, end: 270, text: "当人工智能遇见人类心灵" },
  // ...
];

const SubtitleOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const current = SUBTITLES.find(s => frame >= s.start && frame < s.end);
  if (!current) return null;

  const progress = (frame - current.start) / (current.end - current.start);
  const fadeIn = interpolate(progress, [0, 0.1], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(progress, [0.8, 1], [1, 0], { extrapolateRight: "clamp" });
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div style={{
      position: "absolute",
      bottom: 120,
      left: 0, right: 0,
      display: "flex",
      justifyContent: "center",
    }}>
      <div style={{
        backgroundColor: "rgba(0,0,0,0.75)",
        paddingHorizontal: 28, paddingVertical: 14,
        borderRadius: 8, maxWidth: 960,
      }}>
        <span style={{
          fontFamily: FONT, fontSize: 28, color: "#FFFFFF",
          textAlign: "center", opacity,
        }}>
          {current.text}
        </span>
      </div>
    </div>
  );
};

// 在 Video 组件中使用
export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#F8FAFC" }}>
      {frame < 300 && <CoverScene frame={frame} />}
      {/* ... */}
      <SubtitleOverlay frame={frame} />
    </AbsoluteFill>
  );
};
```

---

## 5. 封面标题字体过大超出画面

**症状**：封面主标题（如"AI心理学"，四字）在 96px + letterSpacing:8 时超出 1080px 宽度，导致文字被截断。

**安全字号表（竖屏 1080×1920）**：

| 位置 | 最大安全字号 | 推荐字号 |
|------|-------------|---------|
| 封面主标题（四字） | ≤72px | 56-72px |
| 封面副标题 | ≤36px | 24-32px |
| 正文内容 | ≤56px | 40-56px |
| 结尾"谢谢观看" | ≤88px | 56-64px |
| 字幕（底部） | ≤32px | 24-28px |

**计算方式**：中文字符约等于 1em，4字 × 72px = 288px，加上 letterSpacing（8px × 3 = 24px），总约 312px。竖屏可用宽度约 1000px，72px 安全。96px 则 4 × 96 + 8 × 3 = 408px，可能溢出。

**原则**：竖屏视频宽度仅 1080px，主标题超过 80px 就有溢出风险。优先减小字号而非压缩字间距（字间距太紧影响可读性）。

## 6. ffmpeg ASS 字幕烧录 — `force_style` 选项不存在

**症状**：
```
[fc#-1] Error applying option 'force_style' to filter 'ass': Option not found
Error opening output file final_with_subtitles.mp4.
```

**根因**：ffmpeg 的 `-vf "ass=file.ass:force_style='FontSize=72'"` 语法在标准 libass 构建中不支持 `force_style` 参数。

**正确做法**：将所有样式（字号、颜色、字体、位置）直接写入 `.ass` 文件，不依赖 ffmpeg 的 `force_style` 覆盖。

**工作流程**：
```
1. 生成 ASS 文件时指定完整 Style（含 Fontsize、PrimaryColour、Alignment 等）
2. 烧录时使用 filter_complex 显式语法（推荐）：
   ffmpeg -i video.mp4 -i audio/neural_1_2x.m4a \
     -filter_complex "[0:v]ass=subs.ass[v]" \
     -map "[v]" -map 1:a \
     -c:v libx264 -crf 18 -preset fast \
     -c:a aac -b:a 256k \
     -r 60 -s 1080x1920 \
     out/final_with_subs.mp4

   （注意：ASS 滤镜只有视频输入端口，音频通过 -map 1:a 单独处理，不进滤镜链）
```

**ASS Style 正确模板**：
```ass
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,72,&H00FFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,2,2,30,30,30,1
```
- `Fontsize=72`（竖屏视频最佳阅读尺寸）
- `PrimaryColour=&H00FFFF`（青色）
- `Alignment=2`（底部居中）
- `Bold=-1`（加粗）
- `Outline=2, Shadow=2`（2px描边+阴影，可见性保障）
