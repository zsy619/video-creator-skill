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
