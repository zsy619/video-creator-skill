# Remotion 问题排查与故障修复

> **最后更新**：2026-05-18（合并 remotion-compilation-errors + remotion-rendering-issues + remotion-project-creation）
> **配套文档**：`subtitle-production.md`（字幕生成）、`audio-tts.md`（音频生产）

---

## 1. 入口点与 Composition ID 错误

### "No entry point specified" + useCurrentFrame 错误

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
```

### Composition ID 与 registerRoot 不匹配

**症状**：
```
Could not find composition with ID RemotionRoot. Available compositions: VerticalVideo
```

Remotion CLI 查找的是 **Composition ID**（`id` 属性），不是 React 组件名。

**正确诊断步骤**：
```bash
# 1. 查看实际可用的 Composition ID 列表
npx remotion ls

# 输出示例：
# ┌─────────────┬──────────────────┬──────────┐
# │ ID          │ Component        │ Duration │
# ├─────────────┼──────────────────┼──────────┤
# │ VerticalVideo │ RemotionRoot    │ 52s      │
# └─────────────┴──────────────────┴──────────┘
```

**修复方法**：
```bash
# ❌ 错误
npx remotion render RemotionRoot out/final.mp4 ...

# ✅ 正确（使用 Composition id 属性值）
npx remotion render VerticalVideo out/final.mp4 ...
```

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

---

## 2. esbuild 语法错误

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

## 3. 项目创建与路径 Bug

### create-remotion-project.js 生成空目录结构

**症状**：运行 `node create-remotion-project.js --dir video-project` 后，video-project 目录存在但所有 src 文件都不存在。

**根因**：脚本只打印了结构说明，但没有实际创建任何文件。

**修复**：手动创建完整 Remotion 项目结构：

```bash
cd video-project
mkdir -p src/scenes src/components src/themes public/audio

cat > package.json << 'EOF'
{
  "name": "video-project",
  "private": true,
  "dependencies": {
    "remotion": "4.0.459",
    "@remotion/cli": "4.0.459",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
EOF

npm install
```

### remotion.config.ts 导致 CLI 崩溃

**症状**：
```
TypeError: Cannot read properties of undefined (reading 'setVideoImageFormat')
```

**根因**：Remotion 4.x 中 `Config.setVideoImageFormat` API 已变更或移除。

**修复**：**删除 remotion.config.ts**，Remotion 使用合理默认值，不需要配置文件。

```bash
rm -f remotion.config.ts
npx remotion render VerticalVideo out/final.mp4 --fps=60 --disable-gpu --log=error
```

### package.json 缺少 @remotion/cli

**症状**：`npm install` 只安装 6 个包，没有 remotion CLI。

**根因**：`remotion` 包不包含 CLI，必须单独安装 `@remotion/cli`。

**正确 package.json**：
```json
{
  "dependencies": {
    "remotion": "4.0.459",
    "@remotion/cli": "4.0.459",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

**验证**：`ls node_modules/.bin/ | grep remotion` 应显示 remotion 可执行文件。

### --dir 路径解析 Bug

**现象**：
```
node create-remotion-project.js --dir /full/path/to/project --name my-project
# 项目实际创建在 {cwd}/video-project，而非 /full/path/to/project/video-project
```

**根因**：脚本内部路径解析问题。

**Workaround（推荐）**：
```bash
# ✅ 从项目根目录执行
cd "{WORKSPACE_DIR}/my-project-video"
node $SKILL_DIR/scripts/create-remotion-project.js --name my-project --dir .

# ✅ 从项目父目录执行
cd "{WORKSPACE_DIR}"
node $SKILL_DIR/scripts/create-remotion-project.js --name my-project --dir .
```

**方案B**：直接复制已知正常的 Remotion 项目结构
```bash
cp -r "{WORKSPACE_DIR}/gallery-video/video-project" \
       "{WORKSPACE_DIR}/my-project-video/video-project"
```

---

## 4. 渲染问题与 Sequence 黑屏

### Sequence 黑屏修复（核心铁律）

> **⚠️ 核心铁律（必须遵守，违反必黑屏）**：
> 在 Sequence 内部，禁止使用全局帧值（FRAMES.scene.start + X）。必须使用局部帧（从0开始）。

**问题描述**：Remotion `<Sequence>` 组件内部使用 `useCurrentFrame()` 时，帧数从 0 开始（局部帧），而非全局帧。

**根因分析**：
```tsx
const FRAMES = {
  pain: { start: 176, end: 528 },
};

<Sequence from={176} durationInFrames={352}>
  <PainScene />
</Sequence>
```

在 PainScene 组件内：
- `useCurrentFrame()` 返回 **0-351**（局部帧）
- 但代码中使用了 `FRAMES.pain.start + 50 = 226`
- `interpolate(0-351, [226, 266], [0, 1])` **永远不触发** → 黑屏

### ✅ 正确方案：局部帧模式（强制）

**步骤1**：FRAMES 定义场景的【局部帧范围】
```tsx
const SCENE_FRAMES = {
  cover:    { start: 0,   duration: 176  },  // 0-175
  pain:     { start: 0,   duration: 352  },  // 0-351（注意不是176！）
  monetize: { start: 0,   duration: 470  },  // 0-469
};
```

**步骤2**：Sequence 传入 from 参数
```tsx
export const Video: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={176}>
        <CoverScene />
      </Sequence>
      <Sequence from={176} durationInFrames={352}>
        <PainScene />
      </Sequence>
      <Sequence from={528} durationInFrames={470}>
        <MonetizeScene />
      </Sequence>
    </AbsoluteFill>
  );
};
```

**步骤3**：场景组件使用局部帧（从0开始）
```tsx
const PainScene: React.FC = () => {
  const frame = useCurrentFrame(); // 0-351（不是176-527！）

  // ✅ 正确：使用局部帧
  const fadeIn = interpolate(frame, [0, 40], [0, 1]);
  const slideIn = interpolate(frame, [50, 120], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <div style={{ opacity: fadeIn }}>内容</div>
    </AbsoluteFill>
  );
};
```

### ❌ 错误示例（必黑屏）

```tsx
// 错误1：Sequence内使用全局帧
<Sequence from={176} durationInFrames={352}>
  <PainScene />
</Sequence>

// PainScene中：
const { start } = FRAMES.pain; // start = 176
const fadeIn = interpolate(frame, [start, start + 40], ...);
// ❌ frame永远到不了176！

// 错误2：混用局部帧和全局帧
const fadeIn = interpolate(frame, [FRAMES.pain.start, FRAMES.pain.start + 40], ...);
// ❌ 同上，frame是局部帧(0-351)，FRAMES.pain.start=176，永远不触发
```

### 帧数计算验证

```
总帧数 = 3465
场景分布：
  cover:    from=0,    duration=176   → 结束帧176
  pain:     from=176,  duration=352   → 结束帧528
  monetize: from=528,  duration=470   → 结束帧998
  publish:  from=998,  duration=588   → 结束帧1586
  engage:   from=1586, duration=587   → 结束帧2173
  create:   from=2173, duration=587   → 结束帧2760
  usage:    from=2760, duration=353   → 结束帧3113
  platforms:from=3113, duration=235   → 结束帧3348
  cta:      from=3348, duration=117   → 结束帧3465 ✅

验证：3465 - 3348 = 117 ✅
```

### 验证方法

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of default=noprint_wrappers=1 video.mp4

mpv video.mp4 --start=2 --end=5  # 检查pain场景(176帧=2.9秒)
```

> **关键教训**：`useCurrentFrame()` 在 Sequence 内部返回**局部帧（0-N）**，在 Sequence 外部返回**全局帧**。

---

## 5. 非致命错误模式

### npx remotion still ProtocolError

**现象**：执行 `npx remotion still` 时，Chrome Headless Shell 下载完成后报错：
```
Was not able to close puppeteer page ProtocolError: Protocol error (Target.closeTarget): No target found for targetId
```
但帧文件仍然成功生成。

**根因**：Remotion 4.x 的 Puppeteer 清理逻辑在页面关闭时抛出非致命异常，不影响实际渲染结果。

**判断方法**：检查 out 目录是否有对应的帧文件或 MP4 输出：
```bash
ls out/*.png out/*.mp4 2>/dev/null
```

**结论**：如果文件成功生成，忽略 ProtocolError 即可。

### Background Render 进程存活但无输出

**现象**：`npx remotion render` 在后台运行时，进程持续存活（数百秒 uptime），但 out/ 目录的输出文件大小和时间戳不再变化。

**处理**：
1. 检查 out/ 是否有完整输出（用 ffprobe 验证 duration）
2. 如果视频时长符合预期，杀死后台进程并使用已有输出
3. 如果时长不符合预期，需要重新渲染

**验证命令**：
```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 out/final.mp4
stat -f "%Sm %z" out/final.mp4
```

---

## 6. 字幕缺失与 ASS 问题

### 字幕缺失 — SubtitleOverlay 未集成

**根因**：各场景组件（CoverScene、ConceptScene 等）内部没有渲染字幕代码，SubtitleOverlay 组件未集成到视频中。

**正确模式**：在主 Video.tsx 中定义 SubtitleOverlay 组件，用 frame 判断当前字幕，所有场景共享。

### ffmpeg ASS 字幕烧录 — `force_style` 选项不存在

**症状**：
```
[fc#-1] Error applying option 'force_style' to filter 'ass': Option not found
Error opening output file final_with_subtitles.mp4.
```

**根因**：ffmpeg 的 `-vf "ass=file.ass:force_style='FontSize=72'"` 语法在标准 libass 构建中不支持 `force_style` 参数。

**正确做法**：将所有样式写入 `.ass` 文件，不依赖 ffmpeg 的 `force_style` 覆盖。

---

## 7. 封面字体与安全字号

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

---

## 8. Remotion 包名验证

> **结论**：Remotion 4.x 的正确包名是 `remotion`（非 `@remotion/core`）。

```bash
# ❌ @remotion/core — HTTP 404，不存在
npm view @remotion/core versions  # Error: not found

# ✅ remotion — 存在，stable 版本丰富
```

### exports 验证（remotion 4.0.459，47个）

```
AbsoluteFill, AnimatedImage, Artifact, Audio, Composition, Config,
Easing, Experimental, Folder, FolderContext, Freeze, Html5Audio,
Html5Video, HtmlInCanvas, IFrame, Img, Internals, Loop,
MediaPlaybackError, OffthreadVideo, Sequence, Series, Still,
VERSION, Video, cancelRender, continueRender, delayRender,
getInputProps, getRemotionEnvironment, getStaticFiles,
interpolate, interpolateColors, isHtmlInCanvasSupported,
measureSpring, prefetch, random, registerRoot, spring,
staticFile, useBufferState, useCurrentFrame, useCurrentScale,
useDelayRender, useRemotionEnvironment, useVideoConfig,
watchStaticFile
```

**关键发现**：`Text` — ❌ 不存在（Remotion 4.x 已移除）

### React Error #130 根因

```tsx
// ❌ 错误：Text 不在 exports 中 → React.createElement(undefined) → Error #130
<Text style={{...}}>Hello</Text>

// ✅ 正确：用 div + inline style
<div style={{ fontFamily: 'PingFang SC', fontSize: 72 }}>Hello</div>
```

---

## 9. node_modules 版本冲突

**症状**：
```
Error: Cannot find module './dist/index'
```
或 Remotion 版本不一致警告：
```
Version mismatch:
- On version: 4.0.461
  - @remotion/bundler node_modules/@remotion/bundler/package.json
- On version: 4.0.459
  - @remotion/cli node_modules/@remotion/cli/package.json
```

**根因**：从备份复制 `node_modules` 时，各 `@remotion/*` 包版本不一致。

**修复**：
```bash
cd video-project
rm -rf node_modules package-lock.json
npm install remotion@4.0.461 @remotion/cli@4.0.461 lucide-react@1.8.0
```

---

## 10. 视频拼接后黑屏 / 封面场景首帧黑

**症状**：最终拼接视频前几秒画面全黑。

**根因**：封面场景组件（如 CoverScene）在帧 0-20 之间只有装饰线条的 opacity 动画渐变，无实质性视觉内容。

**修复**：在封面场景根部添加不透明背景层：
```tsx
<AbsoluteFill style={{ backgroundColor: '#F8FAFC' }} />
```

---

## 11. 已知有效命令组合

```bash
# 渲染视频
npx remotion render VerticalVideo out/final.mp4 \
  --fps=60 --disable-gpu --log=error

# 生成封面
npx remotion still VerticalVideo docs/assets/cover.png \
  --frame=0 --log=error

# 音频处理
edge-tts --voice zh-CN-YunjianNeural --rate +0% \
  --text "$(cat narration.txt)" --write-media neural_full.mp3

ffmpeg -y -i neural_full.mp3 -af "atempo=1.2" \
  -c:a aac -b:a 256k neural_1_2x.m4a
```

### 验证清单（渲染前必查）

```bash
# 1. 检查 node_modules/.bin/remotion 存在
ls node_modules/.bin/remotion

# 2. 检查无 remotion.config.ts
[ ! -f remotion.config.ts ] && echo "✅ no config" || echo "❌ remove config"

# 3. 检查 package.json 包含 @remotion/cli
grep "@remotion/cli" package.json

# 4. 检查音频文件存在
ls public/audio/neural_1_2x.m4a public/audio/captions.json

# 5. 计算总帧数
python3 -c "print(int(40.426 * 60))"  # ≈ 2423 帧
```