# 字幕生产与 TikTokCaptionOverlay 完整方案

> **最后更新**：2026-05-18（合并 remotion-native + ass-subtitle-production）
> **配套文档**：`remotion-troubleshoot.md`（渲染问题）、`audio-tts.md`（音频生产）

---

## 目录

1. [字幕方案概览](#1-字幕方案概览)
2. [captions.json 格式与生成](#2-captionsjson-格式与生成)
3. [TikTokCaptionOverlay 完整实现](#3-tiktokcaptionoverlay-完整实现)
4. [ASS 字幕规范](#4-ass-字幕规范)
5. [字幕时间轴计算](#5-字幕时间轴计算)
6. [404 根因与正确流程](#6-404-根因与正确流程)
7. [双字幕问题](#7-双字幕问题)
8. [subtitle-generator.js 已知问题](#8-subtitle-generatorjs-已知问题)

---

## 1. 字幕方案概览

| 方案 | 字幕来源 | 是否需要 word-level timing | 适用场景 |
|------|---------|---------------------------|---------|
| **TikTokCaptionOverlay** | `captions.json`（sentence-level） | ❌ 不需要，interpolate 模拟 | ✅ **Remotion Native 主方案** |
| `createTikTokStyleCaptions` | 必须提供 `words[]` 数组 | ✅ 需要 | ❌ 不适用于 ASS 转换数据 |
| ffmpeg ASS 烧录 | `subtitles.ass` | ❌ 不需要 | ffmpeg 兜底渲染路径 |

> ⚠️ **重要**：Remotion Native 字幕渲染**不使用** `createTikTokStyleCaptions`（它需要 word-level timing，ASS 只有 sentence-level）。正确方案见本文件的 TikTokCaptionOverlay 实现。

---

## 2. captions.json 格式与生成

### captions.json 格式（sentence-level，用于 TikTokCaptionOverlay）

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

### 末段 endMs 必须与视频时长同步

> **⚠️ 教训（seomachine-video 2026-05-15）**：captions.json 末段字幕 endMs 必须等于**视频实际时长（毫秒）**，而非音频时长。

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

### Python 生成 captions.json（推荐）

> **核心问题**：Node.js -e 模板字符串在含中文/反引号的 narration.txt 场景下有致命缺陷。
> **解决方案**：Python heredoc（100% 可靠）。

```python
python3 << 'PYEOF'
import json, subprocess, re

PROJECT_DIR = '{WORKSPACE_DIR}/workspace/<项目>-video'

with open(f'{PROJECT_DIR}/docs/narration.txt', 'r') as f:
    text = f.read()

# 按中文标点分割句子
sentences = re.split(r'(?<=[。！？])', text)
sentences = [s.strip() for s in sentences if s.strip()]
total = len(sentences)

# 获取音频时长
result = subprocess.run(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
     '-of', 'csv=p=0', f'{PROJECT_DIR}/audio/neural_1_2x.m4a'],
    capture_output=True, text=True
)
duration = float(result.stdout.strip())
slot = duration / total

# 生成 captions.json
captions = []
for i, s in enumerate(sentences):
    start_ms = round(i * slot * 1000)
    end_ms = round((i + 1) * slot * 1000)
    captions.append({'text': s, 'startMs': start_ms, 'endMs': end_ms})

# 末段 endMs 必须与视频时长同步（不是音频时长）
video_dur = float(subprocess.run(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
     '-of', 'csv=p=0', f'{PROJECT_DIR}/video-project/out/final.mp4'],
    capture_output=True, text=True
).stdout.strip())
captions[-1]['endMs'] = int(round(video_dur * 1000))

with open(f'{PROJECT_DIR}/audio/captions.json', 'w') as f:
    json.dump(captions, f, ensure_ascii=False, indent=2)

print(f'✅ captions.json: {total}条')
PYEOF
```

---

## 3. TikTokCaptionOverlay 完整实现

> ⚠️ **致命警告**：`createTikTokStyleCaptions` 做法是错的。
> `createTikTokStyleCaptions` 需要 word-level timing（每个单词的起始/结束时间），但 ASS 格式只提供**句子级别**的 timing。强行使用会导致整句一起出现（无逐字动画）或把中文句子切成单字。

**正确方案**：使用 `interpolate` 插值实现逐字高亮，无需 word-level timing。

### 完整代码

```typescript
import React, { useState, useEffect, useMemo } from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  staticFile,
} from 'remotion';

const fps = 60;

// 分词函数：中文按字符，英文按单词
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let current = '';
  for (const char of text) {
    if (/[\u4e00-\u9fff]/.test(char)) {
      if (current) { tokens.push(current); current = ''; }
      tokens.push(char);
    } else if (/[a-zA-Z0-9]/.test(char)) {
      current += char;
    } else {
      if (current) { tokens.push(current); current = ''; }
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

const TikTokCaptionLine: React.FC<{
  text: string;
  startFrame: number;
  durationInFrames: number;
}> = ({ text, startFrame, durationInFrames }) => {
  const frame = useCurrentFrame();
  const tokens = useMemo(() => tokenize(text), [text]);

  if (tokens.length === 0) return null;

  // 均匀分配每字时长
  const msPerToken = (durationInFrames / tokens.length / fps) * 1000;
  const localFrame = frame - startFrame;  // 从0开始
  const currentMs = localFrame * (1000 / fps);

  return (
    <div style={{
      position: 'absolute',
      bottom: 56,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap',
      paddingHorizontal: 40,
    }}>
      {tokens.map((token, i) => {
        const tokenEndMs = (i + 1) * msPerToken;
        const isPast = currentMs > tokenEndMs;

        return (
          <span
            key={i}
            style={{
              color: isPast ? 'rgba(255,255,255,0.45)' : '#FFFFFF',
              fontSize: 32,
              fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
              fontWeight: 700,
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              marginHorizontal: 2,
              transition: 'color 0.3s',
            }}
          >
            {token}
          </span>
        );
      })}
    </div>
  );
};

export const CaptionOverlay: React.FC<{
  captionsFile?: string;
}> = ({ captionsFile = 'audio/captions.json' }) => {
  const [captions, setCaptions] = useState<Array<{
    text: string;
    startMs: number;
    endMs: number;
  }>>([]);

  useEffect(() => {
    fetch(staticFile(captionsFile))
      .then(r => r.json())
      .then(d => setCaptions(d))
      .catch(() => {});
  }, [captionsFile]);

  if (captions.length === 0) return null;

  return (
    <AbsoluteFill>
      {captions.map((caption, index) => {
        const nextCaption = captions[index + 1] || null;
        const startFrame = Math.round((caption.startMs / 1000) * fps);
        const endFrame = nextCaption
          ? Math.round((nextCaption.startMs / 1000) * fps)
          : Math.round((caption.endMs / 1000) * fps);

        return (
          <Sequence
            key={index}
            from={startFrame}
            durationInFrames={endFrame - startFrame}
          >
            <TikTokCaptionLine
              text={caption.text}
              startFrame={0}
              durationInFrames={endFrame - startFrame}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

---

## 4. ASS 字幕规范

> **注**：ASS 字幕主要用于 ffmpeg 烧录路径，Remotion Native 使用 `captions.json` + `TikTokCaptionOverlay`。

### ASS 字幕参数（已验证标准）

| 参数 | 值 | 说明 |
|------|---|------|
| Fontsize | 72 | 竖屏视频最佳阅读尺寸（视觉约40px） |
| PlayResX | 1080 | 竖屏宽度 |
| PlayResY | 1920 | 竖屏高度 |
| Alignment | 2 | 底部居中 |
| MarginV | 50 | 距底部50像素 |
| Outline | 2 | 2px描边 |
| PrimaryColour | &H00FFFF | 青色（竖屏可见度高） |
| Bold | -1 | 加粗 |

### ASS Style 正确模板

```ass
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,72,&H00FFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,2,2,30,30,50,1
```

### 规则一：只用中文标点分割，绝不混入 ASCII `.` 或 `,`

> ⚠️ **致命错误**：`re.split(r'[。，、；。；]+', text)` 混入 ASCII `.` 或 `,`，会导致 `Claude4.5`（含句点）被错误切成 `Claude4` 和 `5`。

```python
# ❌ 错误：混入英文句点
re.split(r'[.,。、；]+', text)  # 会把 "Claude4.5" 切成两段

# ✅ 正确：只用中文标点
re.split(r'[。；、]+', text)

# ✅ 更严格：包括中文冒号和问号
re.split(r'[。；、：？]+', text)
```

### 规则二：ASS 不支持自动换行，必须手动控制

ASS 渲染器在 `[V4+ Styles]` 中使用 `WrapStyle: 0`（不自动换行），长字幕会溢出屏幕。

**解决**：在 Python 生成器中，长句子预先截断或添加 `\n`：
```python
MAX_CHARS_PER_LINE = 20  # 竖屏安全字数
lines = []
current_line = ""
for word in sentence:
    if len(current_line) >= MAX_CHARS_PER_LINE:
        lines.append(current_line)
        current_line = word
    else:
        current_line += word
if current_line:
    lines.append(current_line)
text = "\\n".join(lines)
```

---

## 5. 字幕时间轴计算

### 比例分配算法

总时长 = ffprobe 实测音频时长，每句按句子数等比划分：

```python
import json, subprocess

# 实测音频时长
dur = float(subprocess.check_output(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
     '-of', 'csv=p=0', 'audio/neural_1_2x.m4a'], text=True).strip())

# 读取句子
with open('docs/narration.txt') as f:
    text = f.read().strip()
sentences = [s.strip() for s in text.split('。') if s.strip()]

# 等比分段
total_ms = dur * 1000
ms_per_sentence = total_ms / len(sentences)

captions = []
for i, s in enumerate(sentences):
    start = int(i * ms_per_sentence)
    end = int((i + 1) * ms_per_sentence)
    captions.append({
        "startMs": start,
        "endMs": end,
        "text": s
    })

# 末段 endMs 必须与视频时长同步（不是音频时长）
captions[-1]["endMs"] = int(round(42.65 * 1000))  # 视频实际时长
```

---

## 6. 404 根因与正确流程

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
python3 -e "..." > audio/captions.json

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

## 7. 双字幕问题

**症状**：同一位置显示两行字幕。

**根因**：Remotion 视频组件中使用了 `<Subtitles />` 组件（渲染到视频帧内），再执行 ASS 字幕烧录，产生双层字幕。

**解决方案**：渲染 Remotion 视频之前，必须先移除所有场景的 `<Subtitles />` 组件调用。

```bash
# 移除所有 <Subtitles /> 行
sed -i '' 's/<Subtitles \/>//g' src/Video-{project}.tsx
```

---

## 8. subtitle-generator.js 已知问题

### 问题1：video-config.json 路径

**现象**：`subtitle-generator.js` 报错 "缺少配置文件: video-config.json"，但文件存在于 `{project}/docs/video-config.json`。

**根因**：脚本读取 `{project-root}/video-config.json`，而非 `{project-root}/docs/video-config.json`。

**正确位置**：
```
{workspace}/{project-name}/         ← video-config.json 在这里（项目根目录）
├── docs/
│   └── video-config.json           ← ❌ 不在这里
└── video-project/
```

### 问题2：音频文件依赖 ffprobe

**根因**：subtitle-generator.js 需要读取音频文件获取时长，如果音频不存在则无法生成。

**解决**：先生成音频，再运行 subtitle-generator.js。

### 问题3：split pattern 问题

**根因**：旧版 subtitle-generator.js 使用 `split(/[.,。；]+/)` 混入 ASCII 句点，会导致英文被错误切分。

**解决**：使用 Python 版本（见本文件的 generate_ass_captions 函数），只用中文标点分割。

---

## 9. 字幕制作检查清单

```bash
# 1. 检查 split pattern 不含 ASCII 句点
grep "split.*\." subtitle-generator.py && echo "❌ 含ASCII句点" || echo "✅ 纯中文标点"

# 2. 检查 Fontsize=72
grep "Fontsize" subtitles.ass

# 3. 检查末段 endMs 同步
python3 << 'PYEOF'
import json
c = json.load(open('audio/captions.json'))
video_dur_ms = int(round(42.65 * 1000))
if c[-1]['endMs'] < video_dur_ms:
    print(f"❌ 末段未覆盖完整视频")
else:
    print(f"✅ 末段 endMs={c[-1]['endMs']}, 视频={video_dur_ms}ms")
PYEOF
```

---

## 附录 F：内联 captions 方案（TikTokCaptionOverlay 替代）

> **来源**：`C-CONTENT/inline-captions.md`（合并）
> **最后更新**：2026-05-29

### F.1 背景

CaptionOverlay.tsx 在 Remotion bundler 启动后通过 `fetch(staticFile("audio/captions.json"))` 访问 `public/` 下的 JSON 文件时会 404，即使该文件在渲染前已正确复制到 `public/audio/`。

根因：Remotion bundler 在服务启动时预编译 `public/` 目录内容，服务启动后不再重新读取文件系统。

### F.2 解决方案

将 captions 数据以内联 JS 常量形式嵌入 CaptionOverlay.tsx，彻底消除网络依赖：

```typescript
// CaptionOverlay.tsx 顶部添加
const INLINE_CAPTIONS: Array<{text: string; startMs: number; endMs: number}> = [
  { text: "第一句字幕文本", startMs: 0, endMs: 2960 },
  { text: "第二句字幕文本", startMs: 2960, endMs: 5833 },
  // ... 全部 captions，末段 endMs = 视频实际总时长（毫秒）
];

export const CaptionOverlay: React.FC = () => {
  // 删除所有 fetch 逻辑，直接使用常量
  const captions = INLINE_CAPTIONS;
  // ... 后续逻辑不变
};
```

### F.3 验证

```bash
grep -c "INLINE_CAPTIONS" video-project/src/components/CaptionOverlay.tsx
# 返回 >0 表示已使用内联方案
```

### F.4 返回值语义

返回 >0 表示已使用内联方案。

### F.5 使用场景

- captions.json 已生成（Step 8 完成），渲染前检测到 CaptionOverlay 使用 `fetch(staticFile(...))`
- 渲染时字幕不显示（404）或 `captions.map is not a function`
- 任何 subagent 返回后字幕异常的情况

### F.6 末段 endMs 同步

内联时注意：末段 `endMs` 必须等于**视频实际总时长（毫秒）**，不是音频时长。

```typescript
// 视频实际 35.24s
const VIDEO_MS = 35240;
// 内联 captions 末段
{ text: "最后一帧字幕文本", startMs: 31406, endMs: 35240 }
```

### F.7 相关 SKILL.md 段落

此文件是 `references/C-CONTENT/subtitle-production.md` 第6节"404 根因与正确流程"的补充。