# 音频合成最佳实践（Voice Synthesis Best Practices）

> 所属模块：video-creator / SKILL.md → 音频合成 ⭐ 重要更新
>
> ## ⚠️ 强制执行：违反以下任何一条将导致音画不同步或音质问题
>
> 1. **禁止分段拼接** — 必须整段连续生成配音
> 2. **禁止跳过音频后处理** — 必须去静音 + 1.2x 语速
> 3. **禁止在 Remotion 内嵌音频** — 必须 Remotion 无音频 → ffmpeg 混流
> 4. **音频文件必须命名** `neural_1_2x.m4a`

---

## ⚠️ 重要提醒

**macOS 原生 TTS（如 Eddy、Rocko、Daniel 等中文男声）均为机械音**，有明显合成感，不适合正式视频发布。如需自然人声，**必须使用微软 Azure Neural TTS**。

---

## 方案对比

| 方案 | 自然度 | 成本 | 推荐度 |
|------|--------|------|--------|
| macOS say (Eddy/Rocko/Daniel) | ⭐ 机械 | 免费 | ❌ 不推荐 |
| **微软 Azure Neural TTS** | ⭐⭐⭐⭐⭐ 极度自然 | 免费额度 | ✅ **强烈推荐** |
| ElevenLabs | ⭐⭐⭐⭐ 非常自然 | 付费 | ✅ 推荐（需API Key） |
| Bark (本地) | ⭐⭐⭐⭐ 自然 | 免费 | ✅ 备选（安装复杂） |

---

## ✅ 推荐方案：微软 Azure Neural TTS

### 前置条件

**修复 certifi 问题**（Python 3.13 + macOS）：

```bash
# 复制 CA 证书
cp /opt/homebrew/Cellar/ca-certificates/2025-05-20/share/ca-certificates/cacert.pem \
   /opt/homebrew/lib/python3.13/site-packages/certifi/cacert.pem

# 安装 edge-tts
/opt/homebrew/bin/python3.13 -m pip install --user edge-tts
```

### 推荐中文男声

| 语音 | 说明 | 场景 |
|------|------|------|
| `zh-CN-YunjianNeural` | 温和男声，自然流畅 | **通用推荐** |
| `zh-CN-YunxiNeural` | 年轻男声，清晰有力 | 科技/工具类 |
| `zh-CN-YunxiaNeural` | 少年男声，活泼 | 年轻受众 |
| `zh-CN-YunyangNeural` | 新闻男声，稳重 | 新闻/资讯类 |

### 推荐中文女声

| 语音 | 说明 | 场景 |
|------|------|------|
| `zh-CN-XiaoxiaoNeural` | 温柔女声 | **通用推荐** |
| `zh-CN-XiaoyiNeural` | 活泼女声 | 生活/娱乐 |

### 可用语音查询

```python
/opt/homebrew/bin/python3.13 << 'EOF'
import asyncio, edge_tts

async def list():
    voices = await edge_tts.list_voices()
    zh = [v for v in voices if 'zh' in v['Locale'].lower()]
    for v in zh:
        print(f"{v['ShortName']} ({v['Gender']}) - {v['Locale']}")

asyncio.run(list())
EOF
```

---

## 完整工作流

### Step 1: 整段连续生成（关键！）

⚠️ **必须将完整配音文本一次性生成**，禁止分段拼接。

```python
/opt/homebrew/bin/python3.13 << 'EOF'
import asyncio, edge_tts

VOICE = "zh-CN-YunjianNeural"  # 推荐男声
OUTPUT = "audio/neural_full.mp3"

async def main():
    with open("audio/full_narration.txt") as f:
        text = f.read()
    await edge_tts.Communicate(text, VOICE).save(OUTPUT)
    print(f"Generated: {OUTPUT}")

asyncio.run(main())
EOF
```

### Step 2: 音频后处理

```bash
# 去首尾静音 + 1.2x 语速 + AAC 256kbps 48kHz 立体声
ffmpeg -y -i audio/neural_full.mp3 \
  -af "silenceremove=start_periods=1:start_duration=0.2:start_threshold=-50dB:detection=peak,\
      silenceremove=stop_periods=-1:stop_duration=0.2:stop_threshold=-50dB:detection=peak,\
      atempo=1.2" \
  -c:a aac -b:a 256k -ar 48000 -ac 2 \
  audio/neural_1_2x.m4a

# 检查时长
ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1 audio/neural_1_2x.m4a

# ⚠️ 重要：音频文件必须重命名为 neural_1_2x.m4a
# 这是 video-creator 技能的标准命名规范，用于后续验证
```

### Step 3: 计算场景帧边界

```bash
fps=60
dur=75.0  # 从上一步获取的实际时长

# 场景比例（根据配音文稿长度估算）
s1_pct=0.107   # 7.9s
s2_pct=0.144   # 10.8s
s3_pct=0.137   # 10.3s
s4_pct=0.131   # 9.8s
s5_pct=0.217   # 16.3s
s6_pct=0.122   # 9.1s
s7_pct=0.142   # 10.7s

# 计算帧边界
s1_end=$(echo "$fps * $dur * $s1_pct" | bc | awk '{print int($1+0.5)}')
s2_end=$(echo "$fps * $dur * ($s1_pct + $s2_pct)" | bc | awk '{print int($1+0.5)}')
# ...
```

### Step 4: Remotion 代码

⚠️ **关键：整个视频只有 1 个 `<Audio>` 组件。**

```tsx
import { registerRoot, Composition, AbsoluteFill, Img, Audio } from "remotion";

const ASSETS = { cover: ..., scene2: ..., scene3: ..., ... };
const SCENES = [
  { start: 0,    end: 457,  img: "cover"   },
  { start: 457,  end: 1078, img: "scene2"  },
  // ...
];

const makeScene = (config: typeof SCENES[number]) => {
  const { start, end, img } = config;
  const Scene: React.FC = () => {
    const frame = useCurrentFrame();
    if (frame < start || frame >= end) return null;
    return (
      <AbsoluteFill>
        <Img src={ASSETS[img]} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
    );
  };
  return Scene;
};

const App = () => (
  <Composition id="VerticalVideo" durationInFrames={4500} fps={60} width={1080} height={1920}
    component={() => (
      <>
        {/* ✅ 整段音频，无拼接 */}
        <Audio src={require("../../audio/neural_1_2x.m4a")} />
        <Scene1 /> <Scene2 /> <Scene3 /> ...
      </>
    )}
  />
);
```

### Step 5: ffmpeg 混流（绕过 Remotion 编码杂音）

```bash
# Remotion 渲染无音频视频，然后用 ffmpeg 混流
ffmpeg -y \
  -i out/video_noaudio.mp4 \
  -i audio/neural_1_2x.m4a \
  -c:v copy \
  -c:a copy \
  -map 0:v -map 1:a \
  -shortest \
  out/final_video.mp4
```

---

## ❌ 不推荐：macOS say

```bash
# ❌ 机械音、拼接导致回音
say -v "Eddy (Chinese (China mainland))" -o audio.aiff -- "文本"

# ❌ 分段拼接会导致拼接点有明显痕迹
for i in 1 2 3; do
  say -v "Eddy" -o part${i}.aiff -- "第${i}段文本"
done
```

---

## 一键合成脚本

```bash
#!/bin/bash
# synthesize-voice.sh

PROJECT_DIR="$(pwd)"
VOICE="zh-CN-YunjianNeural"   # 可选: YunxiNeural, XiaoxiaoNeural 等
SPEED="1.2"

cd "$PROJECT_DIR"

# Step 1: 整段生成
/opt/homebrew/bin/python3.13 << EOF
import asyncio, edge_tts
async def main():
    with open("audio/full_narration.txt") as f:
        text = f.read()
    await edge_tts.Communicate(text, "$VOICE").save("audio/neural_full.mp3")
asyncio.run(main())
EOF

# Step 2: 后处理
ffmpeg -y -i audio/neural_full.mp3 \
  -af "silenceremove=start_periods=1:start_duration=0.2:start_threshold=-50dB:detection=peak,\
      silenceremove=stop_periods=-1:stop_duration=0.2:stop_threshold=-50dB:detection=peak,\
      atempo=$SPEED" \
  -c:a aac -b:a 256k -ar 48000 -ac 2 \
  audio/neural_1_2x.m4a

echo "Done: $(ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1 audio/neural_1_2x.m4a)s"
```

---

## 故障排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 回音/重叠 | 多个 `<Audio>` 同时播放 | 只用 1 个 `<Audio>` |
| 拼接感 | 分段生成后拼接 | 整段连续生成 |
| 开头静音 | TTS 首尾静音 | `silenceremove` 过滤 |
| 语速不稳 | atempo 压缩比过高 | 控制在 1.0-1.3x |
| 音质差 | 低码率编码 | 256kbps AAC + 48kHz |
| 音画不同步 | 帧边界计算错误 | 用 `ffprobe` 精确测量 |

---

## Remotion 音频渲染问题

⚠️ Remotion 渲染的视频，音频可能有编码层面的杂音。推荐做法：

1. 用 Remotion 渲染**无音频**的视频
2. 用 ffmpeg 将处理好的音频与视频合并（stream copy）

```bash
# 用 ffmpeg 混流（视频 + 音频均为 stream copy，不重编码）
ffmpeg -y \
  -i out/video_noaudio.mp4 \
  -i audio/neural_1_2x.m4a \
  -c:v copy -c:a copy \
  -map 0:v -map 1:a \
  -shortest \
  out/final_video.mp4
```
