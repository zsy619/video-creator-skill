# 一键视频生成工作流

> **最后更新**：2026-05-10
> **适用范围**：所有 video-creator 技能项目
> **目标**：从内容输入到最终视频，一键完成，所有节点自动门禁。

---

## 核心原则

1. **配置驱动**：`video-config.json` 是唯一配置源，所有步骤读取同一份配置
2. **时长基准**：`video-config.json` 中的目标时长是基准，后续步骤不依赖测量值
3. **门禁退出码**：A/B/C/D 四个节点，退出码≠0 则终止
4. **音频隔离**：Remotion 渲染无音频，音频通过 ffmpeg 外部注入

---

## 一键启动命令

```bash
cd {WORKSPACE_DIR}/<项目名>
bash {SKILL_DIR}/scripts/launch.sh all
```

或分步执行：

```bash
bash {SKILL_DIR}/scripts/launch.sh init    # Step 1
bash {SKILL_DIR}/scripts/launch.sh audio    # Step 2-3
bash {SKILL_DIR}/scripts/launch.sh gate-a   # Step 4  门禁A
bash {SKILL_DIR}/scripts/launch.sh subtitle # Step 5-6
bash {SKILL_DIR}/scripts/launch.sh gate-b   # Step 6  门禁B
bash {SKILL_DIR}/scripts/launch.sh render    # Step 7-8
bash {SKILL_DIR}/scripts/launch.sh gate-c    # Step 8  门禁C
bash {SKILL_DIR}/scripts/launch.sh final    # Step 9-10
bash {SKILL_DIR}/scripts/launch.sh gate-d    # Step 10 门禁D
```

---

## 完整流程（Step 1 → Step 10）

### Step 1：初始化

```bash
mkdir -p video-project/audio video-project/frames
cp video-config.json video-project/
```

**输入**：`video-config.json`（platform / duration / fps / resolution / cover / subtitle / voice 等字段）

---

### Step 2：edge-tts 配音（方案A：直接生成）

```bash
edge-tts \
  --voice zh-CN-YunjianNeural \
  --rate "+20%" \
  --text "$(cat video-project/docs/narration.txt)" \
  --output video-project/audio/neural_1_2x.m4a
```

**关键**：rate 参数用百分比（`+20%`），不是倍数（`1.2`）
**edge-tts 已按目标语速生成，不需要 atempo 后处理**

---

### Step 3：重编码为 m4a（固定比特率）

```bash
ffmpeg -y -i video-project/audio/neural_1_2x.m4a \
  -c:a aac -b:a 256k video-project/audio/neural_1_2x.m4a
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
const gen = new SubtitleGenerator({ maxCharsPerLine: 25 });
const text = fs.readFileSync('video-project/docs/narration.txt', 'utf8');
const config = JSON.parse(fs.readFileSync('video-project/video-config.json', 'utf8'));
const totalDuration = config.duration;
gen.generateFromText(text, totalDuration).then(subs => {
  return gen.generateASS(subs, 'video-project/audio/subtitles.ass');
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

### Step 7：渲染（Remotion CLI vs ffmpeg 兜底）

```bash
cd video-project

# 先测试 Remotion CLI 是否可用
timeout 30 npx remotion compositions --entry-point src/index.ts 2>&1 | grep -q "VerticalVideo"

if [ $? -eq 0 ]; then
  # ✅ Remotion CLI 可用：标准渲染路径
  npx remotion render VerticalVideo out/video_noaudio.mp4 \
    --concurrency=8 --fps=60 --duration-in-frames=3540
else
  # ❌ headless 环境：ffmpeg 兜底（一步到位：封面+音频+字幕烧录）
  ffmpeg -y -loop 1 \
    -i "{WORKSPACE_DIR}/docs/assets/cover.png" \
    -i "{WORKSPACE_DIR}/audio/neural_1_2x.m4a" \
    -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,subtitles='{WORKSPACE_DIR}/audio/subtitles.ass':fontsdir='/System/Library/Fonts/Supplemental':force_style='Fontsize=72,MarginV=50,Outline=2'" \
    -shortest -c:v libx264 -preset fast -crf 23 \
    -c:a aac -b:a 192k \
    "{WORKSPACE_DIR}/video-project/out/final_with_subs.mp4"

  # ffmpeg 兜底直接输出最终视频，跳到门禁 D
  node {SKILL_DIR}/scripts/video-quality-gate.js "{WORKSPACE_DIR}" final
  exit $?
fi
```

**关键**：
- `video-config.json` 中的 `duration` 和 `fps` 是唯一配置源
- Remotion 渲染**无音频**（AudioContext 问题）
- ffmpeg 兜底方案**一步到位**（音频 + 字幕直接烧录进 MP4）
- 使用 `remotion` 包（不是 `@remotion/core`），版本 4.0.459

**⚠️ 如果 Video.tsx 使用了 `<Text>` 组件（不存在），先修复**：

```bash
node {SKILL_DIR}/scripts/fix-text-component.js video-project/src
```

> **完整 headless 渲染问题分析**：见 [references/remotion-headless-rendering.md](references/remotion-headless-rendering.md)

---

### Step 8：门禁 C（渲染）

```bash
node {SKILL_DIR}/scripts/video-quality-gate.js render
```

**检查项**：
- `package.json` 使用 `remotion` 包（不是 `@remotion/core`）
- 无 `<Text>` 组件（已替换为 `<div>`）
- `node_modules/remotion` 存在

**退出码**：0=通过，1=失败

---

### Step 9：混流（音频注入）+ 字幕烧录

```bash
# 混流：视频 + 音频
ffmpeg -y \
  -i video-project/video-project/out/video_noaudio.mp4 \
  -i video-project/audio/neural_1_2x.m4a \
  -map 0:v -map 1:a \
  -c:v libx264 -crf 18 -preset fast \
  -c:a aac -b:a 128k \
  video-project/final.mp4

# 烧录字幕
ffmpeg -y \
  -i video-project/final.mp4 \
  -vf "ass=video-project/audio/subtitles.ass" \
  -c:v libx264 -crf 18 -preset fast \
  -c:a copy \
  video-project/final_with_subs.mp4
```

---

### Step 10：门禁 D（最终视频）

```bash
node {SKILL_DIR}/scripts/video-quality-gate.js final
```

**检查项**：
- 文件存在：`final_with_subs.mp4`
- codec：h264 + aac
- 尺寸：1080×1920
- 时长：匹配目标时长（偏差 ≤ 5%）
- 音频流：非空

**退出码**：0=通过，1=失败

---

## 关键门禁节点总览

| 节点 | 脚本 | 检查内容 | 失败后果 |
|------|------|----------|----------|
| A | `video-quality-gate.js audio` | 音频存在/静音/命名/5%偏差 | 停止，不生成字幕 |
| B | `video-quality-gate.js subtitle` | ASS格式/Fontsize/MarginV/Outline/\N | 停止，不渲染 |
| C | `video-quality-gate.js render` | package.json/remotion包/无\<Text\> | 停止，不混流 |
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
| atempo 反模式 | `references/atempo-crop-anti-pattern.md` |
| 音频验证协议 | `references/audio-validation-protocol.md` |
