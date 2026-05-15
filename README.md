# Video Creator - 自动化视频创作技能

**从文章/URL/主题生成竖屏社交媒体视频（小红书/视频号/抖音/YouTube）。集成逐字高亮字幕特效、自动化质量门禁，支持一键生成封面、文档、配音、字幕、Remotion 视频。**

---

## 快速开始

### 1. 初始化项目

```bash
mkdir -p ~/VideoProjects
cd ~/VideoProjects
bash ~/.hermes/skills/video-creator/scripts/launch.sh init my-video
cd my-video
```

### 2. 编辑配置和内容

```bash
vim video-config.json   # 设置 platform/duration/theme/cover/voice
vim docs/article.md     # 粘贴文章内容（工具会自动生成 narration.txt）
```

### 3. 一键生成

```bash
bash ~/.hermes/skills/video-creator/scripts/launch.sh all
```

**输出文件：**

| 文件 | 说明 |
|------|------|
| `docs/assets/cover.png` | 竖屏封面 1080×1920 |
| `docs/assets/cover-wechat.png` | 公众号封面 900×383 |
| `docs/assets/cover-xhs.png` | 小红书封面 1440×1920 |
| `docs/narration.txt` | 精简后的配音文本 |
| `audio/neural_1_2x.m4a` | 处理后音频（约 52 秒） |
| `audio/subtitles.ass` | ASS 字幕（含逐字高亮） |
| `video-project/out/final.mp4` | 最终视频（53 秒 / 1080×1920 / 60fps） |

---

## 命令参考

```bash
bash launch.sh <命令>

命令:
  init <项目名>   初始化项目结构（创建 video-config.json + article.md）
  all             完整流程（封面 → 文档 → 配音 → 字幕 → 渲染）
  audio           仅生成音频（edge-tts + ffmpeg 后处理）
  subtitle        仅生成字幕（ASS）
  render          仅渲染视频（Remotion 或 PIL fallback）
  gate [节点]     运行质量门禁（audio / subtitle / render / final）
  help            显示帮助
```

---

## 技术规格

### 视频规格

| 参数 | 值 |
|------|-----|
| 分辨率 | 1080×1920（竖屏 9:16） |
| 帧率 | 60fps |
| 时长 | 52-53 秒 |
| 编码 | H.264 / AAC 256k |
| 主渲染 | Remotion Native（音频内嵌 + 字幕烧录） |
| Fallback | PIL 帧序列 + ffmpeg 混流（不含字幕） |

### 音频规格

| 参数 | 值 |
|------|-----|
| 生成工具 | edge-tts（zh-CN-YunjianNeural） |
| 原始速率 | `--rate +0%`（禁止叠速） |
| 后处理 | `atempo 1.2x` + AAC 256k |
| 配音字数 | 上限 = ⌊目标时长 × 6.45⌋ 字符 |

### 字幕规格

| 参数 | 值 |
|------|-----|
| 格式 | ASS（Advanced SubStation Alpha） |
| 字体 | STHeiti Medium（macOS） |
| ASS Fontsize | 72（视觉约 40px） |
| 颜色 | 白色 `&H00FFFFFF` |
| 逐字高亮 | 当前读字 `#39E508`（荧光绿），已读字半透明白 |
| 特效 | 入场弹入（scale 0.85→1 + opacity 0→1）+ 退场淡出 |

---

## 目录结构

```
video-creator/
├── README.md                      # 本文件
├── SKILL.md                       # 技能主文档
│
├── scripts/                       # 核心脚本（24 个）
│   ├── launch.sh                  # 主入口（一键生成 / 分步命令）
│   ├── generate_docs.js           # 生成 11 个文档
│   ├── generate_cover.py          # PIL 封面图生成
│   ├── subtitle-generator.js      # ASS 字幕生成器
│   ├── pre-subtitle-check.js      # 字幕预检查
│   ├── pre-render-check.js        # 渲染前检查
│   ├── create-remotion-project.js # Remotion 项目生成器
│   ├── video-quality-gate.js      # 质量门禁（A/B/C/D 四节点）
│   ├── video-check.js             # CLI 字幕检查工具
│   ├── synthesize-voice.sh        # edge-tts 封装脚本
│   ├── crop-images.py             # 图片裁剪工具
│   └── [其他工具脚本]
│
├── rules/                         # 规范文档（25 个）
│   ├── WORKFLOW.md               # 工作流规范（10 步）
│   ├── ONEPASS_WORKFLOW.md       # 一键生成工作流
│   ├── VOICE.md                  # edge-tts 配音规范
│   ├── SUBTITLES.md              # ASS 字幕规范（含 re.split 陷阱警告）
│   ├── PATHS.md                  # 输出路径规范
│   ├── THEMES.md                 # 主题风格规范（21 种）
│   ├── REMOTION.md               # Remotion 组件规范
│   ├── REMOTION_NATIVE.md        # Remotion Native 字幕渲染方案
│   ├── FONTS.md                  # 字体规范
│   ├── COVER_GENERATE.md         # 封面图生成规范
│   ├── QUALITY.md               # 质量检查规范
│   ├── UNIFIED_RULES.md          # 统一规则汇总
│   └── [其他规范]
│
└── references/                    # 参考文档（34 个）
    ├── subtitle-tiktok-highlight.md  # TikTokCaptionOverlay 逐字高亮实现
    ├── ass-subtitle-gen.md           # ASS 生成规则（split bug 警告）
    ├── ONEPASS_WORKFLOW.md           # 同上，一键工作流
    ├── video-one-shot-checks.md      # 一次性检查清单
    └── [其他参考]
```

---

## 核心工作流

### 一键生成（推荐）

```bash
cd <项目目录>
bash ~/.hermes/skills/video-creator/scripts/launch.sh all
```

`launch.sh all` 内联执行：

| 步骤 | 内容 | 门禁 |
|------|------|------|
| Step -1 | PIL 生成封面图（3 个尺寸） | — |
| Step 0 | `generate_docs.js` 生成 11 个文档 | — |
| Step 1 | edge-tts 配音（`--rate +0%`） | — |
| Step 2 | ffmpeg（去静音 + atempo 1.2x + AAC 256k） | Gate A |
| Step 3 | `subtitle-generator.js`（ASS，maxCharsPerLine=50） | Gate B |
| Step 4 | `create-remotion-project.js`（Remotion 项目骨架） | — |
| Step 5 | `npm install`（Remotion 依赖） | — |
| Step 6 | `pre-render-check.js` | — |
| Step 7 | `npx remotion render`（60fps / 1080×1920） | Gate D |

### 分步执行

```bash
bash launch.sh init <项目名>    # 初始化项目结构
bash launch.sh audio            # 仅配音
bash launch.sh subtitle         # 仅字幕
bash launch.sh render           # 仅渲染
bash launch.sh gate all         # 仅门禁检查
```

---

## 质量门禁

| 门禁 | 检查内容 | 失败行为 |
|------|---------|---------|
| **Gate A** | 音频有效性（ffprobe 验证 m4a） | 终止 |
| **Gate B** | 字幕质量（ASS 格式 / 字体 / 时长对齐） | 终止 |
| **Gate C** | 渲染前检查（内联，无退出码） | 警告继续 |
| **Gate D** | 最终视频（ffprobe 验证 mp4 属性） | 警告继续 |

---

## 主题风格（21 种）

`cyberpunk` / `neon-future` / `minimal-tech` / `gradient-wave` / `particle-tech` / `glass-morphism` / `holographic` / `data-stream` / `quantum-tech` / `tech-modern` 等

---

## 目标平台

| 平台 | 分辨率 | 帧率 | 时长 |
|------|--------|------|------|
| 微信视频号 | 1080×1920 | 60fps | 10-60s |
| 小红书 | 1080×1920 / 1440×1920 | 60fps | 15-60s |
| 抖音 | 1080×1920 | 60fps | 15s-3min |
| YouTube Shorts | 1080×1920 | 60fps |最长 60s |

---

## 重要规范（必读）

### ⚠️ 字幕分割禁止使用 ASCII 句点

`re.split(r'[\uff0c\u3001\uff1b\u2192\.\\.,;]+', text)` 中的 `\.` 会把 `Claude4.5` 切断为 `Claude4` + `5`。**只用中文标点** `，。；、` 作为分割符。

详见：`references/ass-subtitle-production.md`

### ⚠️ 禁止叠速

- ❌ `--rate +20%` + `atempo 1.2x`（叠加加速，过度加速）
- ✅ `--rate +0%` + `atempo 1.2x`（单速控制）
- ✅ `--rate +20%` + `atempo 1.0x`（单速控制）

详见：`rules/VOICE.md`

### ⚠️ 配音字数上限

`⌊目标时长 × 6.45⌋` 字符（实测值）。52 秒上限 330 字。

详见：`rules/VOICE.md`

---

## 文档索引

| 文档 | 内容 |
|------|------|
| **SKILL.md** | 技能完整说明（快速启动 / 规则 / 参考） |
| **SKILL.md** | 技能完整说明（快速启动 / 规则 / 参考） |
| **rules/WORKFLOW.md** | 10 步工作流规范 |
| **rules/ONEPASS_WORKFLOW.md** | 一键生成工作流（推荐） |
| **rules/VOICE.md** | edge-tts 配音规范（含字数公式） |
| **rules/SUBTITLES.md** | ASS 字幕规范（含 split bug 警告） |
| **references/ass-subtitle-production.md** | TikTokCaptionOverlay 逐字高亮实现 |
| **references/ass-subtitle-production.md** | ASS 生成规则 |
| **references/remotion-native.md** | Remotion Native 字幕渲染方案 |

---

**最后更新**: 2026-05-13
**版本**: v4.9.0
