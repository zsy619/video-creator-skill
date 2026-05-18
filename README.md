# Video Creator - 自动化视频创作技能

**从文章/URL/主题生成竖屏社交媒体视频（小红书/视频号/抖音）。集成逐字高亮字幕特效、自动化质量门禁，支持一键生成封面、文档、配音、字幕、Remotion 视频。**

---

## 快速开始

### 1. 初始化项目

```bash
cd "{WORKSPACE_DIR}"
node ~/.hermes/skills/video-creator/scripts/generate_docs.js <项目名>
cd <项目名>
# 编辑 video-config.json 和 docs/narration.txt（需手动重写，见下方警告）
```

### 2. 一键生成

```bash
cd <项目名>
bash ~/.hermes/skills/video-creator/scripts/launch.sh all
```

**输出文件：**

| 文件 | 说明 |
|------|------|
| `docs/assets/cover.png` | 竖屏封面 1080×1920 |
| `docs/assets/cover-wechat.png` | 公众号封面 900×383 |
| `docs/assets/cover-xhs.png` | 小红书封面 1440×1920 |
| `docs/narration.txt` | 配音文本（**需手动验证并重写**） |
| `audio/neural_1_2x.m4a` | 处理后音频（约 52 秒） |
| `audio/captions.json` | 字幕时间轴（sentence-level） |
| `video-project/out/final.mp4` | 最终视频（52-53 秒 / 1080×1920 / 60fps） |

---

## ⚠️ generate_docs.js 警告（必读）

> `generate_docs.js` 输出的 `narration.txt` **几乎每次都需要手动重写**，无一例外。

**原因**：`extractNarration()` 使用 `stripMarkdown()`，对中文内容解析能力极弱，几乎每次都生成字数不足或含 markdown 残留字符的版本。

**Step 0 后自动检查 + 智能修复**（不再硬终止）：
```bash
python3 -c "
text = open('docs/narration.txt').read()
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
max_chars = int(52 * 3.37)  # 3.37 = 3.73 × 0.9 安全系数
print(f'中文字数: {chinese_chars} / 上限: {max_chars}')
if chinese_chars < 10:
    print('⚠️ 严重提取失败，调用 AI 重写')
elif chinese_chars < 20:
    print('⚠️ 内容偏少，建议补充')
elif chinese_chars > max_chars:
    print('⚠️ 超出上限，自动截断处理')
else:
    print('✅ 检查通过')
"
```

**自动修复逻辑**（launch.sh `cmd_all` 中内嵌）：
1. **markdown 残留清理** — `\|`、`---`、`![]()` 等自动过滤
2. **超长截断** — 超过 `max_chars` 字自动截断至上限
3. **严重失败重写** — < 10 字时调用 `generate_docs.js` 重新生成

**警告条件**（不终止，仅提示）：
- 10~20 字：内容偏少，建议补充至 100 字以上
- > `max_chars` 字：可能会超出目标时长

---

## 命令参考

```bash
bash launch.sh <命令>

命令:
  init <项目名>   初始化项目结构
  all             完整流程（Step 0-11）
  audio           仅生成音频（edge-tts + ffmpeg 后处理）
  subtitle        仅生成字幕（captions.json）
  render          仅渲染视频（Remotion）
  gate [节点]     运行质量门禁
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
| 渲染方案 | Remotion Native（captions.json + TikTokCaptionOverlay） |

### 音频规格

| 参数 | 值 |
|------|-----|
| 生成工具 | edge-tts（zh-CN-YunjianNeural） |
| 原始速率 | `--rate +0%`（禁止叠速） |
| 后处理 | `atempo` 动态计算（source_duration / target_duration）+ AAC 256k |
| **配音字数** | **上限 = ⌊目标时长 × 3.37⌋ 中文字符**（实测 3.73 字/秒 × 0.9 安全系数） |

### 字幕规格

| 参数 | 值 |
|------|-----|
| 格式 | `captions.json`（sentence-level）+ TikTokCaptionOverlay 渲染 |
| ASS Fontsize | 72（视觉约 40px） |
| 逐字高亮 | interpolate 插值模拟（无需 word-level timing） |
| 末段 endMs | 必须与**视频实际时长**同步（不是音频时长） |

---

## 目录结构

```
video-creator/
├── README.md                      # 本文件
├── SKILL.md                       # 技能主文档（30+ 参考文档索引）
│
├── scripts/                       # 核心脚本
│   ├── launch.sh                  # 主入口（一键 / 分步命令）
│   ├── generate_docs.js           # 生成 11 个文档
│   ├── generate_cover.py          # PIL 封面图生成（首选）
│   ├── subtitle-generator.js      # 字幕生成
│   ├── pre-render-check.js       # 渲染前检查
│   ├── create-remotion-project.js # Remotion 项目生成器
│   ├── video-quality-gate.js      # 质量门禁
│   └── [其他工具脚本]
│
├── rules/                         # 规范文档（8 个）
│   ├── UNIFIED_RULES.md           # ⚠️ 最高优先级：视频创作铁律清单
│   ├── VOICE.md                  # 语音规范（YunjianNeural/YunxiNeural）
│   ├── SUBTITLES.md              # 字幕规范（Fontsize=72）
│   ├── WORKFLOW.md               # 11 步完整工作流程
│   ├── THEMES.md                 # 20 种主题风格
│   ├── PLATFORM.md              # 平台规格（小红书/视频号/抖音）
│   └── TROUBLESHOOTING.md       # 常见问题解决方案
│
└── references/                    # 参考文档（18 个主文件 + archived/）
    ├── content-document-generation.md  # 内容获取 + generate_docs.js 问题
    ├── audio-tts.md         # 音频/TTS 生产完整流程
    ├── subtitle-production.md         # 字幕生产 + TikTokCaptionOverlay
    ├── remotion-troubleshoot.md     # Remotion 问题排查
    ├── subagent-timeout.md   # Subagent 超时恢复
    ├── CHANGELOG.md                   # 演进历史
    └── archived/                       # 废弃文件（仅供历史参考）
```

---

## 核心工作流（Step 0-11）

### 完整流程（推荐）

```bash
cd <项目目录>
bash ~/.hermes/skills/video-creator/scripts/launch.sh all
```

`launch.sh all` 执行：

| 步骤 | 内容 | 门禁 |
|------|------|------|
| Step 0 | `generate_docs.js` 生成 11 个文档 | — |
| **Step 0.1** | **手动重写 narration.txt（强制，必须）** | **字数验证** |
| Step 1 | edge-tts 配音（`--rate +0%`） | — |
| Step 2 | ffmpeg（去静音 + **atempo 动态计算** + AAC 256k） | Gate A |
| Step 3 | Python 生成 `captions.json`（heredoc 安全方式） | Gate B |
| Step 4 | `create-remotion-project.js`（Remotion 项目骨架） | — |
| Step 5 | `npm install`（Remotion 依赖） | — |
| Step 6 | PIL 封面图（3 个尺寸） | — |
| Step 7 | `npx remotion render`（60fps / 1080×1920） | Gate D |

### ⚠️ atempo 动态计算（禁止固定 1.2）

```bash
# ✅ 正确（动态计算）
SOURCE_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 audio/neural_full.mp3)
TARGET_DUR=52
ATEMPO=$(python3 -c "print(round($SOURCE_DUR / $TARGET_DUR, 4))")
ffmpeg -y -i audio/neural_full.mp3 -af "atempo=${ATEMPO}" -c:a aac -b:a 256k audio/neural_1_2x.m4a

# ❌ 错误（固定 1.2 仅适用于 source≈40-45s）
ffmpeg ... -af "atempo=1.2" ...
```

---

## 质量门禁

| 门禁 | 检查内容 | 失败行为 |
|------|---------|---------|
| **Gate A** | 音频有效性（ffprobe 验证 m4a） | 终止 |
| **Gate B** | 字幕质量（captions.json / 末段 endMs 同步） | 终止 |
| **Gate C** | 渲染前检查（内联，无退出码） | 警告继续 |
| **Gate D** | 最终视频（ffprobe 验证 mp4 属性） | 警告继续 |

---

## 主题风格（20 种）

`cyberpunk` / `neon-future` / `minimal-tech` / `gradient-wave` / `particle-tech` / `glass-morphism` / `holographic` / `data-stream` / `quantum-tech` / `tech-modern` 等，详见 `rules/THEMES.md`

---

## 目标平台

| 平台 | 分辨率 | 帧率 | 时长 |
|------|--------|------|------|
| 微信视频号 | 1080×1920 | 60fps | 10-60s |
| 小红书 | 1080×1920 / 1440×1920 | 60fps | 15-60s |
| 抖音 | 1080×1920 | 60fps | 15s-3min |
| YouTube Shorts | 1080×1920 | 60fps | 最长 60s |

---

## 重要规范（必读）

### ⚠️ 字幕分割禁止使用 ASCII 句点

`re.split(r'[.,。；、]+', text)` 中的 ASCII `.` 会把 `Claude4.5` 切断为 `Claude4` + `5`。**只用中文标点** `。，；、` 作为分割符。

详见：`references/subtitle-production.md`（第4节 ASS 规范）

### ⚠️ narration.txt 手动重写（100% 失败率）

本 session 9 个项目（claude-hud、tegaki、OpenViking 等）**全部**需要手动重写 narration.txt，无一例外。

详见：`references/content-document-generation.md`（第4-5节）

### ⚠️ video-config.json 必须在项目根目录

`generate_docs.js` 读取 `{项目根目录}/video-config.json`，不是 `{项目根目录}/docs/video-config.json`。

---

## 文档索引

| 文档 | 内容 |
|------|------|
| **SKILL.md** | 技能完整说明（快速启动 / 规则 / 18个参考文档索引） |
| **rules/UNIFIED_RULES.md** | ⚠️ 最高优先级：视频创作铁律清单 |
| **rules/VOICE.md** | 语音规范（YunjianNeural/YunxiNeural/YunyangNeural） |
| **rules/SUBTITLES.md** | 字幕规范（Fontsize=72 / MarginV=50 / Outline=2） |
| **references/audio-tts.md** | 音频/TTS 生产完整流程 |
| **references/subtitle-production.md** | 字幕生产 + TikTokCaptionOverlay 完整实现 |
| **references/remotion-troubleshoot.md** | Remotion 问题排查（compilation/rendering/Sequence） |
| **references/content-document-generation.md** | 内容获取 + generate_docs.js 问题 + narration 重写 |
| **references/CHANGELOG.md** | 演进历史（v5.x 大修订 / 2026-05-18 文档优化） |

---

**最后更新**: 2026-05-18
**版本**: v5.x（References 文档优化版）
