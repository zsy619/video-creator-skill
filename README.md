# Video Creator - 自动化视频创作技能

**从文章/URL/主题生成竖屏社交媒体视频（小红书/视频号/抖音）。集成逐字高亮字幕特效、自动化质量门禁，支持一键生成封面、文档、配音、字幕、Remotion 视频。**

---

## 快速开始

### 1. 初始化项目

```bash
# 创建项目目录骨架 + video-config.json
bash ~/.hermes/skills/video-creator/scripts/launch.sh init <项目名>

# 编辑配置文件（必填）
cd <项目名>
vim video-config.json   # 设置 platform / duration / theme / voice 等
vim docs/article.md     # 粘贴原始文章内容
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
| `docs/assets/cover-xhs.png` | 小红书封面 1440×2560 |
| `docs/narration.txt` | 配音文本（**需手动验证并重写**） |
| `audio/neural_1_2x.m4a` | 处理后音频 |
| `audio/captions.json` | 字幕时间轴（sentence-level） |
| `video-project/out/final.mp4` | 最终视频（60fps / 1080×1920 / H.264+AAC） |

---

## launch.sh 命令

```bash
bash launch.sh <命令>

命令:
  init <项目名>   创建项目目录骨架（不含 Remotion 代码）
  docs            生成12个文档（Step 0，调用 generate_docs.js）
  audio           生成音频（edge-tts + atempo）
  subtitle        生成字幕（captions.json）
  render          渲染视频（Remotion Native）
  gate [节点]     运行质量门禁检查
  all             完整流程（docs → audio → subtitle → render）
  help            显示帮助
```

> ⚠️ **`init` 不生成 Remotion 项目代码**：仅创建目录骨架。Remotion 代码由 `launch.sh all` 中的 `create-remotion-project.js` 在渲染前自动生成。

---

## ⚠️ narration.txt 强制重写

> `generate_docs.js` 输出的 `narration.txt` **每次都需要手动重写**，无一例外。

**原因**：`extractNarration()` 使用 `stripMarkdown()`，对中文内容解析能力极弱，生成字数不足或含 markdown 残留字符的版本。

**字数上限**：`⌊目标时长 × 3.37⌋` 中文字符（实测 3.73 字/秒 × 0.9 安全系数）。

**验证脚本**：

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

---

## 完整流程（launch.sh all）

```
Step -1    PIL 封面图生成（3个尺寸）
Step 1     edge-tts 配音（--rate +0%，禁止叠速）
Step 2     ffmpeg 去静音 + atempo + AAC 256k
Step 3     captions.json 生成（sentence-level 等比分配）
Gate A     音频有效性验证（ffprobe）
Step 4     create-remotion-project.js 生成 Remotion 项目
Step 4b    fix-remotion-project.js 修复（themes key 双引号等）
Step 5     npm install
Step 6     pre-render-check.js 渲染前检查
Step 7     Remotion 渲染（VerticalVideo / 60fps / --props）
Step 7.5   captions.json 末段 endMs 同步为视频实际时长
Gate D     最终视频验证
Step 8     PIL 三平台正式封面（覆盖 Step -1）
```

---

## 技术规格

### 视频规格

| 参数 | 值 |
|------|-----|
| 分辨率 | 1080×1920（竖屏 9:16） |
| 帧率 | 60fps |
| 编码 | H.264 / AAC 256k |
| 渲染方案 | Remotion Native（音频内嵌 MP4 + CaptionOverlay 字幕） |

### 音频规格

| 参数 | 值 |
|------|-----|
| 生成工具 | edge-tts（默认 zh-CN-YunjianNeural） |
| 原始速率 | `--rate +0%`（禁止叠速） |
| atempo | 来自 `video-config.json` 的 `voice.atempo` 配置值 |
| **配音字数上限** | `⌊目标时长 × 3.37⌋` 中文字符 |

### 字幕规格

| 参数 | 值 |
|------|-----|
| 格式 | `captions.json`（sentence-level） + TikTokCaptionOverlay |
| ASS Fontsize | 72（视觉约 40px） |
| 逐字高亮 | interpolate 插值模拟 |
| 末段 endMs | 同步为视频实际时长（不是音频时长） |

---

## 目录结构

```
video-creator/
├── SKILL.md                       # 技能主文档（铁律 / 规则索引 / references 分类）
│
├── scripts/                       # 核心脚本
│   ├── launch.sh                  # 主入口（一键 / 分步命令）
│   ├── generate_docs.js           # 生成12个文档
│   ├── create-remotion-project.js # Remotion 项目生成器
│   ├── fix-remotion-project.js    # 项目修复（themes key 双引号等）
│   ├── subtitle-generator.js      # 字幕生成
│   ├── pre-render-check.js        # 渲染前检查
│   ├── generate_cover.py          # PIL 封面图生成
│   └── video-quality-gate.js      # 质量门禁
│
├── rules/                         # 规范文档（15个）
│   ├── UNIFIED_RULES.md           # ⚠️ 最高优先级：视频创作铁律清单
│   ├── VOICE.md                  # 语音规范（YunjianNeural/YunxiNeural）
│   ├── SUBTITLES.md              # 字幕规范（Fontsize=72 / MarginV=50）
│   ├── WORKFLOW.md               # 完整工作流程
│   ├── THEMES.md                 # 30种主题风格
│   ├── PLATFORM.md               # 平台规格（小红书/视频号/抖音）
│   ├── QUALITY.md                # 质量标准
│   ├── CHECKLIST.md              # 检查清单
│   ├── SESSION_LOG.md            # Session 追踪规范
│   ├── TROUBLESHOOTING.md        # 问题排查
│   ├── SCRIPTS.md                # 脚本说明
│   ├── INTEGRATION.md            # 集成说明
│   ├── LAYOUT.md                 # 布局规范
│   ├── FONTS.md                  # 字体规范
│   └── COVER_GENERATE.md         # 封面生成规范
│
└── references/                    # 参考文档（8个子目录，37个文件）
    ├── A-ARCHIVED/               # 已废弃（请勿使用）
    ├── B-REMOTION/               # Remotion 渲染核心（9文件）
    ├── C-CONTENT/                # 内容获取与音频字幕（6文件）
    ├── D-SUBAGENT/               # Subagent 管理（2文件）
    ├── E-VISUAL/                 # 视觉设计与封面图（6文件）
    ├── F-GENDOCS/                # generate_docs.js 分析（2文件）
    ├── G-WORKFLOW/               # 工作流与集成（5文件）
    ├── H-CONFIG/                 # 配置文件（3文件）
    └── README.md                 # 总索引（含快速查询 + 完整文件清单）
```

---

## 质量门禁

| 门禁 | 检查内容 | 失败行为 |
|------|---------|---------|
| **Gate A** | 音频有效性（ffprobe 验证 m4a） | 终止 |
| **Gate B** | 字幕质量（captions.json 格式 / 末段 endMs） | 终止 |
| **Gate C** | 渲染前检查（pre-render-check.js） | 警告继续 |
| **Gate D** | 最终视频（ffprobe 验证 mp4 属性） | 警告继续 |

---

## 重要规范（必读）

### ⚠️ 字幕分割禁止使用 ASCII 句点

`re.split(r'[.,。；、]+', text)` 中的 ASCII `.` 会把 `Claude4.5` 切断为 `Claude4` + `5`。**只用中文标点** `。，；、` 作为分割符。

详见：`references/C-CONTENT/subtitle-production.md`（第4节 ASS 规范）

### ⚠️ video-config.json 必须在项目根目录

`generate_docs.js` 读取 `{项目根目录}/video-config.json`，不是 `{项目根目录}/docs/video-config.json`。

---

## 文档索引

| 文档 | 内容 |
|------|------|
| **SKILL.md** | 技能完整说明（铁律 / 规则索引 / references 分类索引） |
| **rules/UNIFIED_RULES.md** | ⚠️ 最高优先级：视频创作铁律清单 |
| **rules/VOICE.md** | 语音规范（YunjianNeural/YunxiNeural/YunyangNeural） |
| **rules/SUBTITLES.md** | 字幕规范（Fontsize=72 / MarginV=50 / Outline=2） |
| **C-CONTENT/audio-tts.md** | 音频/TTS 生产完整流程 |
| **C-CONTENT/subtitle-production.md** | 字幕生产 + TikTokCaptionOverlay 完整实现 |
| **B-REMOTION/remotion-troubleshoot.md** | Remotion 问题排查（compilation/rendering/Sequence） |
| **C-CONTENT/content-document-generation.md** | 内容获取 + generate_docs.js 问题 + narration 重写 |
| **G-WORKFLOW/feishu-base-batch.md** | Feishu Base 批量处理（record_id 查询/更新） |
| **D-SUBAGENT/subagent-timeout.md** | Subagent 超时恢复指南 |
| **G-WORKFLOW/video-optimization.md** | 4项预检（narration质量/英文句点/叠速/CaptionOverlay） |

---

**最后更新**: 2026-05-24