# Video Creator 快速入门

> 本技能帮助从文章/URL/主题生成竖屏社交媒体视频（小红书/视频号/抖音）。

---

## 快速开始

### 方式一：直接调用（推荐）

```
🎬 制作视频：https://github.com/xxx/yyy
```

### 方式二：指定内容

```
🎬 制作视频：大语言模型的发展历史
```

---

## 执行模式

> ⚠️ **主要执行方式**：`bash scripts/launch.sh all <项目目录>`（launch.sh 统一管理全流程）

| 模式 | 命令 | 说明 |
|------|------|------|
| 一键（推荐） | `bash scripts/launch.sh all <项目目录>` | launch.sh 全流程（文档→音频→字幕→渲染） |
| 分步 | `bash scripts/launch.sh <step> <项目目录>` | 按 Step 执行（Step 0-11，见 WORKFLOW.md） |
| 质量门禁 | `node scripts/video-quality-gate.js <项目目录>` | 渲染后最终质量验证 |

---

## 视频规格

- **分辨率**: 1080×1920（竖屏 9:16）
- **帧率**: 60fps
- **编码**: H.264 + AAC
- **字幕**: ASS 格式，Fontsize=72，黄色（&H00FFFF）

---

## 封面图（必填）

| 平台 | 文件名 | 尺寸 |
|------|--------|------|
| 视频号/抖音 | `cover.png` | 1080×1920 |
| 微信公众号 | `cover-wechat.png` | 900×383 |
| 小红书 | `cover-xhs.png` | 1440×2560 |

---

## 完整流程（12步）

```
Step 0  → 创建文档（11个文件）
Step 1  → 获取内容
Step 2  → 分析内容
Step 3  → 构建项目
Step 4  → 生成文案
Step 5  → 构建HTML
Step 6  → 生成封面（强制）
Step 7  → 生成音频
Step 8  → 生成字幕
Step 9  → 质量检查
Step 10 → 渲染视频
Step 11 → 生成报告
```

---

## 音频规范

- **文件名**: `audio/neural_1_2x.m4a`
- **格式**: AAC，128kbps
- **推荐引擎**: edge-tts（YunxiNeural）
- **语速**: 1.2x

---

## 输出目录结构

```
<项目目录>/
├── docs/
│   ├── README.md
│   ├── article.md
│   ├── video-script.md
│   ├── copy.md
│   ├── wechat-copy.md
│   ├── posting-guide.md
│   ├── landing-page.html
│   ├── article-page.html
│   ├── wechat-page.html
│   ├── session-log.md
│   └── assets/
│       ├── cover.png (1080×1920)
│       ├── cover-wechat.png (900×383)
│       └── cover-xhs.png (1440×2560)
├── audio/
│   ├── neural_full.mp3     # edge-tts 原始（--rate +0%）
│   ├── neural_1_2x.m4a     # atempo 后处理
│   └── captions.json
└── video-project/
    └── out/
        └── final.mp4
```

---

## 常见问题

**Q: 视频没有声音？**  
→ 检查音频文件是否命名为 `neural_1_2x.m4a`，并确认在 `audio/` 目录

**Q: 字幕没有显示？**
→ 确认字幕文件为 `audio/captions.json`，每段 `{startMs, endMs, text}` 结构正确，末段 endMs 等于视频实际时长

**Q: 封面生成失败？**  
→ 按顺序重试：baoyu-imagine → Remotion单帧 → PIL兜底

---

## 相关文档

- [SKILL.md](../SKILL.md) - 完整技能说明
- [rules/CHECKLIST.md](CHECKLIST.md) - 步骤检查清单
- [rules/FONTS.md](FONTS.md) - 字体规范
- [rules/SUBTITLES.md](SUBTITLES.md) - 字幕规范
- [scripts/video-quality-gate.js](../scripts/video-quality-gate.js) - 项目质量验证脚本（渲染后验证）
