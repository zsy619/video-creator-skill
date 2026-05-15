# Remotion 编译与入口点错误

> **最后更新**：2026-05-15
> **配套文档**：`remotion-project-creation.md`（项目创建）、`remotion-rendering-issues.md`（渲染问题）

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
npx remotion upgrade  # 统一到最新版本
```

### 调试实录：Composition 是 React 组件

```bash
cd video-project
node -e "const {Composition, registerRoot} = require('remotion'); console.log(typeof Composition);"
# 输出: function

node -e "
const {Composition} = require('remotion');
const React = require('react');
const el = React.createElement(Composition, {
  id: 'test', fps: 30, durationInFrames: 30, height: 100, width: 100,
  component: () => React.createElement('div', null, 'test')
});
console.log('Element type:', el.type.name || el.type.toString().substring(0,80));
"
```

**结论**：
- `Composition` 是 React 组件，必须作为 JSX `<Composition id="..." component={...} />` 使用
- `registerRoot` 接收一个返回 `<Composition .../>` 的 React 函数组件
- 错误 "useCurrentFrame() can only be called inside a component that was registered as a composition" 的根因：**直接对含 `useCurrentFrame()` 的内部组件调用 `registerRoot(innerComponent)`**，而没有通过 `<Composition>` 包装

### 正确结构（经本次验证）

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
      fps={60}
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

### 旧模式（有问题的模式）

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

## 2. esbuild 语法错误（2026-05-13）

> create-remotion-project.js 生成的代码在 esbuild bundling 时暴露的语法错误。
> TypeScript 编译（`tsc`）静默通过，但 esbuild bundling 失败。
> **必须每次创建项目后检查并修复这些问题。**

### 错误1：themes/index.ts 连字符 key 无引号

**症状**：
```
ERROR: Expected "}" but found "-"
src/themes/index.ts:12:6: ERROR
```

**根因**：JavaScript 对象 key 包含连字符时必须加引号：
```ts
// ❌ 错误：esbuild 解析失败
export const THEMES: Record<string, ThemeConfig> = {
  tech-modern: {    // 连字符 key 无引号
    primary: "#2563EB"
  }
};

// ✅ 正确：所有 key 加引号
export const THEMES: Record<string, ThemeConfig> = {
  "tech-modern": {
    primary: "#2563EB"
  }
};
```

**自动修复**：
```python
import re
content = open('src/themes/index.ts').read()
fixed = re.sub(
    r'(\s+)([a-z][a-z0-9]*-[a-z0-9-]+):(\s*\{)',
    r'\1"\2":\3',
    content
)
open('src/themes/index.ts', 'w').write(fixed)
```

### 错误2：JSX 属性值后多余右花括号

**症状**：
```
ERROR: Expected ">" but found "}"
Scene4_Features.tsx:194:134: ERROR
```

**根因**：属性值后多写了一个 `}`：
```tsx
// ❌ 错误
<FeatureCard color="#00FF88"} delay={30} ... />
//                                     ^ 多余的 }
```

```tsx
// ✅ 正确
<FeatureCard color="#00FF88" delay={30} ... />
```

**搜索模式**：
```bash
grep -rn '} delay=' src/scenes/
grep -rn '} index=' src/scenes/
grep -rn '} frame=' src/scenes/
```

### 错误3：组件 prop 缺少必需参数

**症状**：
```
Type error: Property 'delay' is missing in type
```

**搜索模式**：
```bash
grep -rn '<ProtocolBadge' src/scenes/
grep -rn '<FeatureCard' src/scenes/
grep -rn '<PulseRing' src/scenes/
```

### 错误4：未使用的 import 导致 TypeScript 编译警告

**修复**：
```tsx
// ❌ Video.tsx 中多余
import { spring, interpolate, AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';

// ✅ 正确
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
```

### 自动修复脚本

```python
#!/usr/bin/env python3
"""fix-remotion-esbuild.py — 修复 create-remotion-project.js 生成的 esbuild 错误"""
import re, sys, os

def fix_themes_index(path):
    content = open(path).read()
    fixed = re.sub(
        r'(\s+)([a-z][a-z0-9]*-[a-z0-9-]+):(\s*\{)',
        r'\1"\2":\3',
        content
    )
    if fixed != content:
        open(path, 'w').write(fixed)
        print(f"Fixed: {path}")

def fix_jsx_syntax(path):
    content = open(path).read()
    fixed = re.sub(r'(color="[^"]*")\}(\s+(delay|frame|index)x=)', r'\1 \2', content)
    if fixed != content:
        open(path, 'w').write(fixed)
        print(f"Fixed JSX syntax: {path}")

def main():
    base = sys.argv[1] if len(sys.argv) > 1 else '.'
    themes = os.path.join(base, 'src', 'themes', 'index.ts')
    if os.path.exists(themes):
        fix_themes_index(themes)
    for root, _, files in os.walk(os.path.join(base, 'src')):
        for f in files:
            if f.endswith('.tsx'):
                fix_jsx_syntax(os.path.join(root, f))

if __name__ == '__main__':
    main()
```

### 验证命令（渲染前必须执行）

```bash
# 1. themes/index.ts 所有 key 有引号
grep -E '^\s+[a-z][a-z0-9]*-[a-z0-9-]+:' src/themes/index.ts && echo "❌ 有未加引号的 key" || echo "✅ 全部加引号"

# 2. JSX 属性无多余 }
grep -rn '} delay=\|} frame=\|} index=' src/scenes/ && echo "❌ 有多余 }" || echo "✅ 无多余 }"

# 3. 渲染前最终验证
cd video-project && npm install && npx remotion render VerticalVideo out/test.mp4 --concurrency=4 --fps=60 --disable-gpu
```

---

## 3. 字幕缺失 — SubtitleOverlay 未集成

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

## 4. ffmpeg ASS 字幕烧录 — `force_style` 选项不存在

**症状**：
```
[fc#-1] Error applying option 'force_style' to filter 'ass': Option not found
Error opening output file final_with_subtitles.mp4.
```

**根因**：ffmpeg 的 `-vf "ass=file.ass:force_style='FontSize=72'"` 语法在标准 libass 构建中不支持 `force_style` 参数。

**正确做法**：将所有样式写入 `.ass` 文件，不依赖 ffmpeg 的 `force_style` 覆盖。

**工作流程**：
```
1. 生成 ASS 文件时指定完整 Style（含 Fontsize、PrimaryColour、Alignment 等）
2. 烧录时使用 filter_complex 显式语法：
   ffmpeg -i video.mp4 -i audio/neural_1_2x.m4a \
     -filter_complex "[0:v]ass=subs.ass[v]" \
     -map "[v]" -map 1:a \
     -c:v libx264 -crf 18 -preset fast \
     -c:a aac -b:a 256k \
     -r 60 -s 1080x1920 \
     out/final.mp4
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
- `Outline=2, Shadow=2`（2px描边+阴影）

---

## 5. 封面标题字体过大超出画面

**症状**：封面主标题（如"AI心理学"，四字）在 96px + letterSpacing:8 时超出 1080px 宽度。

**安全字号表（竖屏 1080×1920）**：

| 位置 | 最大安全字号 | 推荐字号 |
|------|-------------|---------|
| 封面主标题（四字） | ≤72px | 56-72px |
| 封面副标题 | ≤36px | 24-32px |
| 正文内容 | ≤56px | 40-56px |
| 结尾"谢谢观看" | ≤88px | 56-64px |
| 字幕（底部） | ≤32px | 24-28px |

**原则**：竖屏视频宽度仅 1080px，主标题超过 80px 就有溢出风险。优先减小字号而非压缩字间距。
