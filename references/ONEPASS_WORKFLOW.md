# 一键视频生成工作流

> **最后更新**：2026-05-12 15:30
> **适用范围**：所有 video-creator 技能项目
> **目标**：从内容输入到最终视频，一键完成，所有节点自动门禁。

---

## 核心原则

1. **配置驱动**：`video-config.json` 是唯一配置源，所有步骤读取同一份配置
2. **时长基准**：`video-config.json` 中的目标时长是基准，后续步骤不依赖测量值
3. **门禁退出码**：A/B/D 三个节点，退出码≠0 则终止（C 节点已内联）
4. **音频内嵌**：Remotion `<Audio>` 组件直接嵌入 MP4，无需 ffmpeg 外部注入
5. **字幕烧录**：Remotion Native 路径通过 `@remotion/captions` 在渲染时烧录到帧，无需 ffmpeg ASS 滤镜
6. **Remotion Native 为主**：主渲染路径走 Remotion（含音频内嵌+字幕烧录），PIL 帧序列为 fallback（fallback 不烧录 ASS，仅混音频轨）

---

## 一键启动命令

```bash
cd {WORKSPACE_DIR}/<项目名>
bash {SKILL_DIR}/scripts/launch.sh all
```

分步命令（仅供参考，`all` 已内联所有步骤）：

```bash
bash {SKILL_DIR}/scripts/launch.sh init      # Step 1 初始化
bash {SKILL_DIR}/scripts/launch.sh audio     # Step 2-3 配音+门禁A+字幕生成
bash {SKILL_DIR}/scripts/launch.sh subtitle  # Step 4 门禁B
bash {SKILL_DIR}/scripts/launch.sh final     # Step 5 门禁D
```

---

## 完整流程（`launch.sh all` 一键执行）

### Step 1：初始化

```bash
mkdir -p video-project/audio video-project/frames
cp video-config.json video-project/
```

**输入**：`video-config.json`（platform / duration / fps / resolution / cover / subtitle / voice 等字段）

---

### Step 2：edge-tts 配音

**先写 narration.txt（配音文本），再生成音频。**

```bash
# 配音文本：字数上限 = ⌊目标时长 × 6.45⌋ 字（不用 --rate +20%，会导致叠速）
# 音频处理：edge-tts --rate +0% → atempo 1.2x → AAC 256k
# 禁止叠速：--rate +20% + atempo 1.2x 会导致音频过度加速

edge-tts \
  --voice zh-CN-YunjianNeural \
  --rate "+0%" \
  --text "$(cat docs/narration.txt)" \
  --write-media audio/neural_full.mp3
```

**配音文本字数公式（实测验证）：**
- 上限 = ⌊目标时长 × 6.45⌋ 字
- 52秒目标 → 最多 335 字（zh-CN-YunjianNeural --rate +0% 测得）
- 旧公式 ⌊目标时长 ÷ 1.2 × 4.5⌋ 严重偏低（52秒仅195字），已废弃

**禁止叠速规则（二选一）：**
- 方案A：`--rate +0%` + `atempo 1.2x`（推荐，音频质量最高）
- 方案B：`--rate +20%` + `atempo 1.0x`（也可以）
- **禁止**：`--rate +20%` + `atempo 1.2x`（双重加速，音频严重失真）

---

### Step 3：ffmpeg 音频后处理（atempo 1.2x + AAC 256k）

```bash
# 去静音 + 1.2x 加速 + AAC 256k
ffmpeg -y -i audio/neural_full.mp3 \
  -af "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.3,atempo=1.2" \
  -c:a aac -b:a 256k \
  audio/neural_1_2x.m4a
```

---

### Step 4：门禁 A（音频）

```bash
node {SKILL_DIR}/scripts/video-quality-gate.js audio
```

**检查项**：
- 文件存在：`audio/neural_1_2x.m4a`
- 非静音：RMS > -40 dB
- 命名规范：必须是 `neural_1_2x.m4a`
- 时长偏差：≤ 5%（基于 `video-config.json` 的目标时长）

**退出码**：0=通过，1=失败

---

### Step 5：字幕生成（SubtitleGenerator 方案A）

```bash
node -e "
const { SubtitleGenerator } = require('{SKILL_DIR}/scripts/subtitle-generator.js');
const fs = require('fs');
const gen = new SubtitleGenerator({ maxCharsPerLine: 50 });
const text = fs.readFileSync('docs/narration.txt', 'utf8');
const config = JSON.parse(fs.readFileSync('video-config.json', 'utf8'));
const totalDuration = config.duration;
gen.generateFromText(text, totalDuration).then(subs => {
  return gen.generateASS(subs, 'audio/subtitles.ass');
}).then(() => console.log('ASS generated')).catch(e => { console.error(e); process.exit(1); });
"
```

**字幕规范（强制）**：
- Fontsize=72（PlayResY=1920时约40px视觉）
- MarginV=50（距底边），MarginL/MarginR=30
- Outline=2px
- 换行符：`\N`（不是 `\n`）
- 时间戳：2位厘秒（CC），如 `0:00:04.50`

---

### Step 6：门禁 B（字幕）

```bash
node {SKILL_DIR}/scripts/video-quality-gate.js subtitle
```

**检查项**：
- 文件存在：`audio/subtitles.ass`
- Format：10字段 Dialogue（Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text）
- Fontsize=72
- MarginV=50
- Outline=2
- 换行符：`\N`

**退出码**：0=通过，1=失败

---

### Step 7：Remotion Native 渲染（主路径）

**前置条件**：`create-remotion-project.js` 已生成完整 Remotion 项目（含 `src/`、`public/`、`package.json`）

```bash
# 1. 生成 Remotion 项目
node {SKILL_DIR}/scripts/create-remotion-project.js .

# 2. npm install
cd video-project && npm install 2>&1 | tail -3

# 3. 计算帧数
AUDIO_DURATION=$(ffprobe -v error -show_entries format=duration \
  -of csv=p=0 audio/neural_1_2x.m4a)
TOTAL_FRAMES=$(python3 -c "import math; print(math.ceil(${AUDIO_DURATION} * 60))")

# 4. Remotion 渲染 → MP4（音频内嵌 + 字幕烧录，60fps / 1080×1920）
npx remotion render VerticalVideo \
  out/final.mp4 \
  --concurrency=4 \
  --fps=60 \
  --duration-in-frames=${TOTAL_FRAMES} \
  --disable-gpu

# 输出: video-project/out/final.mp4
#       60fps / H.264 / 1080×1920 / MP4
#       音频直接嵌入（无需 ffmpeg 混流）
#       字幕通过 @remotion/captions 烧录到帧（无需 ffmpeg ASS）
```

**Remotion Native 渲染架构**：
- 音频：`<Audio src={staticFile("audio/neural_1_2x.m4a")} />` 内嵌 MP4
- 字幕：`CaptionOverlay` 组件 + `@remotion/captions` 直接烧录到每一帧
- 同步：三同步（画面/Audio/字幕）基于同一 composition fps 时间基准
- 严禁黑屏：`Sequence premountFor=1fps` + `AbsoluteFill` 全覆盖背景

**Remotion 并发数**：`concurrency=4`（M1 MAX 实测最优）

**fallback**：Remotion 渲染失败自动回退到 PIL 帧序列 + ffmpeg 混音频轨（不烧录 ASS）

> **多主题模式**：`video-config.json.theme` 字段选择主题（cyberpunk / neon-future / tech-modern 等30个主题），`create-remotion-project.js` 自动注入主题配置到 Remotion 组件。

### Step 7b：PIL fallback（Remotion 渲染失败时）

```bash
# 仅在 Remotion 渲染失败时触发
python3 {SKILL_DIR}/scripts/gen_frames_template.py . --theme "$THEME"

# ffmpeg 混流（不烧录 ASS，仅混音频轨）
AUDIO_DURATION=$(ffprobe -v error -show_entries format=duration \
  -of csv=p=0 audio/neural_1_2x.m4a)

ffmpeg -y \
  -framerate 60 \
  -i "out/frames/frame_%04d.png" \
  -i "audio/neural_1_2x.m4a" \
  -map 0:v -map 1:a \
  -t "${AUDIO_DURATION}" \
  -c:v libx264 -preset ultrafast -crf 22 -pix_fmt yuv420p \
  -c:a aac -b:a 256k \
  -r 60 -s 1080x1920 \
  "out/final_with_subs.mp4"

rm -rf out/frames
```

---

### Step 8：门禁 C（Remotion 渲染）

```bash
node {SKILL_DIR}/scripts/video-quality-gate.js render
```

**检查项**：
- `package.json` 使用 `remotion` 包（不是 `@remotion/core`）
- 无 `<Text>` 组件（已替换为 `<div>`）
- `node_modules/remotion` 存在
- `@remotion/captions` 包存在（Remotion Native 字幕必需）
- Video.tsx 使用 `@remotion/captions` API

**退出码**：0=通过，1=失败

---

### Step 9：门禁 D（最终视频）

```bash
node {SKILL_DIR}/scripts/video-quality-gate.js final
```

**检查项**：
- 文件存在：`out/final.mp4`（Remotion Native）或 `out/final_with_subs.mp4`（PIL fallback）
- 帧率：60fps
- 编码：H.264
- 分辨率：1080×1920
- 音频流：非空（AAC）
- captions.json：Remotion Native 路径存在（PIL fallback 不需要）

**退出码**：0=通过，1=失败

---

## 关键门禁节点总览

| 节点 | 脚本 | 检查内容 | 失败后果 |
|------|------|----------|----------|
| A | `video-quality-gate.js audio` | 音频存在/静音/命名/5%偏差 | 停止，不生成字幕 |
| B | `video-quality-gate.js subtitle` | ASS格式/Fontsize/MarginV/Outline/\N | 停止，不渲染 |
| C | `video-quality-gate.js render` | Remotion包/无\<Text\>/node_modules; 或frames/帧序列验证(60fps/连续编号/无跳号) | 停止，不输出最终视频 |
| D | `video-quality-gate.js final` | codec/尺寸/时长/音频流 | 终止，报告错误 |

---

## 常见错误速查

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| React Error #130 | `<Text>` 组件不存在 | `node fix-text-component.js Video.tsx` |
| 音频静音 | edge-tts rate 参数错误 | 用 `+20%` 而非 `1.2` |
| 字幕显示为黑块 | Fontname 不是系统字体 | 改用 `PingFang SC` |
| 时长偏差 > 5% | 用了 atempo 裁剪反模式 | edge-tts 直接按目标语速生成 |
| 门禁退出码=1 | 任一节点未通过 | 查看脚本输出的具体失败原因 |

---

## 规范权威来源

| 规范项 | 权威文件 |
|--------|----------|
| ASS 字幕格式 | `rules/SUBTITLES.md` |
| 配音参数 | `rules/VOICE.md` |
| Remotion 规范 | `rules/REMOTION.md` |
| 字体规范 | `rules/FONTS.md` |
| 综合规则 | `rules/UNIFIED_RULES.md` |
| 音频验证协议 | `references/audio-validation-protocol.md` |
