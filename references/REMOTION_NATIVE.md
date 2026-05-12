# Remotion Native 渲染规范

> **最后更新**：2026-05-12
> **适用范围**：video-creator 技能 Remotion Native 渲染路径
> **目标**：Remotion 直接输出 MP4（音频内嵌 + 字幕烧录），无需 ffmpeg 后处理

---

## 渲染架构

```
┌──────────────────────────────────────────────────────────────────────┐
│                         video-config.json                             │
│  (theme / duration / fps:60 / width:1080 / height:1920 / voice)      │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
              create-remotion-project.js
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
    src/Root.tsx          src/Video.tsx         src/components/
    (Composition +         (<Audio> +            CaptionOverlay.tsx
     calculateMetadata)     6×<Sequence> +       (@remotion/captions)
                             <CaptionOverlay>)
           │                     │                     │
           └─────────────────────┼─────────────────────┘
                                 │
                                 ▼
        npx remotion render VerticalVideo out/final.mp4
                    --concurrency=4 --fps=60
                    --duration-in-frames=N --disable-gpu
                                 │
                                 ▼
                    ┌─────────────────────────────────┐
                    │   out/final.mp4                 │
                    │   60fps / H.264 / 1080×1920    │
                    │   音频内嵌（无需 ffmpeg 混流）  │
                    │   字幕烧录（无需 ffmpeg ASS）   │
                    └─────────────────────────────────┘
```

---

## 三同步机制

### 画面同步
- Remotion composition 直接渲染，每帧画面精确对应 `frame / fps`
- `Sequence.from` + `durationInFrames` 控制每个场景的起止帧
- **严禁黑屏**：`AbsoluteFill` 全覆盖背景，`premountFor=1fps` 防止首帧透明

### 音频同步
- `<Audio src={staticFile("audio/neural_1_2x.m4a")} />` 内嵌于 composition
- 音频时长决定 totalFrames：`totalFrames = ceil(audioDuration * fps)`
- Remotion 自动将音频时长作为 MP4 时长

### 字幕同步
- `@remotion/captions` 解析 `captions.json`
- `useCurrentFrame()` 获取当前帧，`frame / fps * 1000` 转换为毫秒
- 与音频共用同一 fps 时间基准，天然三同步

---

## 项目生成器：create-remotion-project.js

### 输入
- `projectDir/video-config.json` — 主题/时长/分辨率配置
- `projectDir/audio/neural_1_2x.m4a` — 配音文件
- `projectDir/audio/subtitles.ass` — ASS 字幕（由 subtitle-generator.js 生成）

### 输出
```
video-project/
├── package.json           # remotion@4.0.459 / @remotion/captions@4.0.459 / zod@4.3.6
├── remotion.config.ts     # Config.setVideoImageFormat("jpeg") / concurrency=4
├── tsconfig.json          # ESNext / bundler / noEmit
├── src/
│   ├── index.ts           # registerRoot(RemotionRoot)
│   ├── Root.tsx           # <Composition VerticalVideo ... />
│   ├── Video.tsx          # <Audio> + 6×<Sequence> + <CaptionOverlay>
│   ├── components/
│   │   └── CaptionOverlay.tsx   # @remotion/captions TikTok 风格字幕
│   ├── scenes/
│   │   ├── Scene1_Cover.tsx
│   │   ├── Scene2_PainPoint.tsx
│   │   ├── Scene3_Solution.tsx
│   │   ├── Scene4_Features.tsx
│   │   ├── Scene5_Start.tsx
│   │   ├── Scene6_Ending.tsx
│   │   └── index.ts
│   └── themes/
│       └── index.ts       # 30 主题配置（ThemeConfig 接口）
└── public/
    └── audio/
        ├── neural_1_2x.m4a      # 音频（从 projectDir/audio/ 复制）
        └── captions.json         # 字幕 JSON（从 ASS 转换）
```

---

## 字幕格式：sentence-level captions.json + TikTokCaptionOverlay

> ⚠️ **重要**：Remotion Native 字幕渲染**不使用** `createTikTokStyleCaptions`（它需要 word-level timing，ASS 只有 sentence-level）。正确方案见 `subtitle-tiktok-highlight.md`。

### 字幕方案对比

| 方案 | 字幕来源 | 是否需要 word-level timing | 适用场景 |
|------|---------|---------------------------|---------|
| **TikTokCaptionOverlay** | `captions.json`（sentence-level） | ❌ 不需要，interpolate 模拟 | ✅ **Remotion Native 主方案** |
| `createTikTokStyleCaptions` | 必须提供 `words[]` 数组 | ✅ 需要 | ❌ 不适用于 ASS 转换数据 |
| ffmpeg ASS 烧录 | `subtitles.ass` | ❌ 不需要 | ffmpeg 兜底渲染路径 |

### ASS 规范（subtitle-generator.js 输出）
- Fontsize: 72（PlayResY=1920 时约 40px 视觉）
- Fontname: `STHeiti Medium`（实测 ffmpeg 可用）
- MarginV: 50（距底边）
- MarginL/MarginR: 30
- Outline: 2px
- 换行符: `\N`
- 时间戳: 2位厘秒（CC），如 `0:00:04.50`

### captions.json 格式（sentence-level，用于 TikTokCaptionOverlay）

> ⚠️ **不能用 `createTikTokStyleCaptions`**：该 API 需要每个词有独立 timing，ASS 只能导出句子级 timing，会导致字幕不显示。

```json
[
  {
    "text": "今天介绍免费AI路由工具9Router",
    "startMs": 0,
    "endMs": 2960
  },
  {
    "text": "永不停码节省tokens",
    "startMs": 2960,
    "endMs": 4830
  }
]
```

### 转换逻辑

```
ASS Dialogue 行 → Python 正则解析 Start/End 时间 → 文本清洗 → captions.json
```

> 完整转换脚本见 `ass-subtitle-gen.md` 或 `subtitle-tiktok-highlight.md`。

---

## 30 主题配置

| 主题 ID | primary | secondary | accent | bg | font |
|---------|---------|-----------|--------|----|------|
| cyberpunk | #00FFFF | #FF00FF | #FFFF00 | #0D0221 | JetBrains Mono |
| neon-future | #00FF88 | #FF0088 | #8800FF | #000022 | Orbitron |
| tech-modern | #2563EB | #7C3AED | #10B981 | #0F172A | Inter |
| ... | ... | ... | ... | ... | ... |

完整 30 主题见 `src/themes/index.ts`（由 create-remotion-project.js 生成）

---

## 关键约束

### 严禁 import fs
Remotion webpack 无法解析 Node.js 模块。`fs` / `path` / `child_process` 必须在 Node.js 脚本中使用，不能出现在 TSX 组件里。

**正确做法**：
- 时长通过命令行参数传入 `--duration-in-frames=N`
- 音频文件路径通过 `staticFile()` 读取（Remotion API）
- 主题配置内联在 TSX 文件中

### 音频 headless 问题
Remotion `<Audio>` 在 headless 环境下无法播放，但 **音频仍然会嵌入最终 MP4**。这是预期行为，无需额外处理。

### zod 版本锁定
必须使用 `zod@4.3.6`（Remotion 4.0.459 绑定版）。`^3.22.0` 会触发版本冲突警告。

### 严禁黑屏
- 每个场景用 `AbsoluteFill` 全覆盖背景（纯色或渐变）
- `Sequence` 加 `premountFor={fps}` 预加载首帧
- Gate D 用 `blackdetect` 验证无黑帧

---

## 命令速查

```bash
# 生成 Remotion 项目
node ~/.hermes/skills/video-creator/scripts/create-remotion-project.js .

# 进入项目目录
cd video-project

# 安装依赖
npm install

# 渲染（Remotion Native）
npx remotion render VerticalVideo \
  out/final.mp4 \
  --concurrency=4 \
  --fps=60 \
  --duration-in-frames=2340 \
  --disable-gpu

# 一键渲染（launch.sh）
bash ~/.hermes/skills/video-creator/scripts/launch.sh all .
```

---

## 门禁检查

| 节点 | 检查项 |
|------|--------|
| Gate C-C7 | `@remotion/captions` 包存在 |
| Gate C-C8 | Video.tsx 使用 `@remotion/captions` API |
| Gate D-D1 | 帧率 = 60fps |
| Gate D-D2 | 编码 = H.264 |
| Gate D-D3 | 分辨率 = 1080×1920 |
| Gate D-D4 | captions.json 存在（Remotion Native） |
