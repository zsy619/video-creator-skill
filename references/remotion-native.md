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
        └── captions.json         # 字幕 JSON（launch.sh Step 3 直接生成 startMs/endMs，非 ASS 转换）
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

> ⚠️ **launch.sh Step 3 直接生成 captions.json**，不是从 ASS 转换。

```python
# launch.sh Step 3 字幕生成逻辑
# captions.json 由 launch.sh Step 3 直接生成，采用比例分配算法：
# 总时长 = ffprobe 实测音频时长，每句按句子数等比划分时间槽
# startMs/endMs 精确对应音频实际时间轴，字幕与音频完全同步
```

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

## 5. CaptionOverlay 烧录机制（补充）

> **来源**：remotion-native-subtitles.md（2026-05-15 新发现）

> **核心结论**：**CaptionOverlay 组件确实将字幕烧录进最终 MP4。**

CaptionOverlay 是 React 组件，通过 `staticFile` 读取 `captions.json`，在 Remotion 渲染**每一帧**时用 `<Sequence>` + 绝对定位 `<div>` 将字幕绘制进画面。最终输出的 MP4 包含烧录后的可见字幕。

### 组件代码

```typescript
// TikTokCaptionLine：逐字高亮行
const TikTokCaptionLine = ({ text, startFrame, durationInFrames, fps }) => {
  const tokens = useMemo(() => tokenize(text), [text]);
  const msPerToken = (durationInFrames / tokens.length / fps) * 1000;
  const localFrame = frame - startFrame;
  const currentMs = localFrame * (1000 / fps);

  return (
    <div style={{ position: "absolute", bottom: 56, left: 0, right: 0, display: "flex", justifyContent: "center", flexWrap: "wrap", paddingHorizontal: 40 }}>
      {tokens.map((token, i) => {
        const tokenEndMs = (i + 1) * msPerToken;
        const isPast = currentMs > tokenEndMs;
        return (
          <span key={i} style={{
            color: isPast ? "rgba(255,255,255,0.45)" : "#FFFFFF",
            fontSize: 32,
            fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
            fontWeight: 700,
            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            marginHorizontal: 2,
            transition: "color 0.3s",
          }}>
            {token}
          </span>
        );
      })}
    </div>
  );
};

// CaptionOverlay：读取 JSON + 按时间戳切分
export const CaptionOverlay = ({ captionsFile = "audio/captions.json" }) => {
  const [captions, setCaptions] = useState([]);
  useEffect(() => {
    fetch(staticFile(captionsFile)).then(r => r.json()).then(d => setCaptions(d));
  }, [captionsFile]);

  return (
    <AbsoluteFill>
      {captions.map((caption, index) => {
        const nextCaption = captions[index + 1] || null;
        const startFrame = Math.floor((caption.startMs / 1000) * fps);
        const endFrame = nextCaption
          ? Math.floor((nextCaption.startMs / 1000) * fps)
          : Math.floor((caption.endMs / 1000) * fps);
        return (
          <Sequence key={index} from={startFrame} durationInFrames={endFrame - startFrame}>
            <TikTokCaptionLine text={caption.text} startFrame={0} durationInFrames={endFrame - startFrame} fps={fps} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

---

## 6. captions.json 404 根因与解决方案

> **来源**：remotion-native-subtitles.md（2026-05-15 新发现）

### 问题现象

```
[http://localhost:3000/public/audio/captions.json] Failed to load resource: the server responded with a status of 404 (Not Found)
TypeError: captions.map is not a function
```

### 根因

`create-remotion-project.js` 创建项目时生成空的 `public/audio/captions.json`。即使后续手动生成正确的 captions.json 并复制到 `public/audio/`，Remotion bundle 在服务启动时已经编译了这些路径。**Remotion 的 bundle 是预编译的，服务启动后不再重新读取文件系统中的 audio 目录。**

### 正确流程

音频和字幕**必须在创建 Remotion 项目之前生成**，并放置在 `audio/` 目录中。`create-remotion-project.js` 会在创建项目时从 `audio/` 复制到 `public/audio/`。

```bash
# 1. 先生成音频和字幕（在创建 Remotion 项目之前）
edge-tts --voice "zh-CN-YunjianNeural" --rate "+0%" --write-media audio/neural_full.mp3 --text "$(cat docs/narration.txt)"
ffmpeg -y -i audio/neural_full.mp3 -af "atempo=1.2" -c:a aac -b:a 256k audio/neural_1_2x.m4a

# 2. 生成 captions.json
python3 -e "...caption generation..." > audio/captions.json

# 3. 然后再创建 Remotion 项目
node {SKILL_DIR}/scripts/create-remotion-project.js {PROJECT_DIR}

# 4. 渲染
cd video-project && npm install && npx remotion render VerticalVideo out/final.mp4 --concurrency=4 --fps=60 --disable-gpu --log=error
```

### 如果已经 404，执行以下命令重新复制

```bash
cp "$PROJECT_DIR/audio/captions.json" "$PROJECT_DIR/video-project/public/audio/"
cp "$PROJECT_DIR/audio/neural_1_2x.m4a" "$PROJECT_DIR/video-project/public/audio/"
```

---

## 7. 字幕时间轴精度：末段 endMs 必须与视频时长同步

> **来源**：remotion-native-subtitles.md（2026-05-15 教训）

**典型错误**：
- 视频 42.65s，但 captions.json 末段 `endMs: 38064`（= 音频时长 38.064s）
- 导致最后 4.6s 没有字幕覆盖

**正确值**：
- 视频时长 42.65s → 末段 endMs = **42645**
- 音频时长 38.06s → 末段 endMs = **42645**（不是 38064）

**计算公式**：`endMs = Math.round(视频时长秒数 * 1000)`

**同步检查命令**：
```bash
VIDEO_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 out/final.mp4)
LAST_ENDMS=$(python3 -c "import json; c=json.load(open('audio/captions.json')); print(c[-1]['endMs'])")
EXPECTED=$(python3 -c "print(int(round($VIDEO_DUR * 1000)))")
if [ "$LAST_ENDMS" != "$EXPECTED" ]; then
  echo "❌ 末段字幕未同步: endMs=$LAST_ENDMS, 应为 $EXPECTED"
fi
```

---

## 8. 双字幕问题：Subtitles 组件 + ASS 烧录

> **来源**：remotion-native-subtitles.md

**症状**：同一位置显示两行字幕。

**根因**：Remotion 视频组件中使用了 `<Subtitles />` 组件（渲染到视频帧内），再执行 ASS 字幕烧录，产生双层字幕。

**解决方案**：渲染 Remotion 视频之前，必须先移除所有场景的 `<Subtitles />` 组件调用。

```bash
# 移除所有 <Subtitles /> 行
sed -i '' 's/<Subtitles \/>//g' src/Video-{project}.tsx
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
