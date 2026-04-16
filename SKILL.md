---
name: video-creator
description: "自动化视频创作技能：从文章/URL/主题生成竖屏社交媒体视频（小红书/视频号/抖音）。整合宝玉技能生态进行内容获取、图片生成、HTML构建和Remotion视频渲染。集成字幕生成、质量检查、自动修复功能，支持批量处理多个视频项目。触发词：'创建视频'、'生成视频'、'视频创作'、'竖屏视频'、'make video'、'create video'、'检查视频质量'、'修复字幕字体'、'批量处理视频'。"
homepage: https://github.com/zsy619/video-creator-skill
metadata: {"clawdbot":{"emoji":"🎬","requires":{"bins":["node"],"env":[]}}}
---

# Video Creator

自动化视频创作工具，从文章/URL/主题生成竖屏社交媒体视频。集成字幕生成、质量检查、自动修复功能，支持批量处理多个视频项目。

## 何时使用

当用户要求以下操作时立即使用本技能：
- "创建视频" / "生成视频" / "视频创作"
- "把这篇文章做成视频"
- "制作竖屏视频" / "小红书视频"
- "make video" / "create video" / "video creator"
- "检查视频质量" / "修复字幕字体" / "批量处理视频"

## 快速开始

### 基础使用
```bash
# 从URL创建视频
node {baseDir}/cli.js --url "https://example.com/article" --style tech-modern

# 从主题创建视频
node {baseDir}/cli.js --topic "人工智能发展趋势" --style cyberpunk

# 从内容创建视频
node {baseDir}/cli.js --content "# 标题\n\n内容..." --style neon-future

# 从文件创建视频
node {baseDir}/cli.js --file ./article.md --style glass-morphism
```

### 字幕与质量检查（新增功能）
```bash
# 检查项目质量并自动修复
video-creator check --project ./my-video --fix

# 修复字体兼容性问题
video-creator subtitles --fix --project ./my-video

# 批量处理多个项目
video-creator batch --directory ./workspace --fix

# 生成字幕文件
node {baseDir}/scripts/video-check.js generate-subtitles \
  --input audio/full_narration.txt \
  --output audio/subtitles.ass \
  --duration 60
```

## 目录结构

```
video-creator/
├── SKILL.md                    # 本文件 - 技能主文档
├── cli.js                      # 命令行接口
├── package.json                # Node.js依赖配置
├── test-subtitle-system.js     # 字幕系统测试脚本
├── scripts/                    # 核心脚本目录
│   ├── main.js                 # 主程序入口
│   ├── video-composer.js       # 视频合成器
│   ├── subtitle-generator.js   # 字幕生成器（新增）
│   ├── quality-checker.js      # 质量检查器（新增）
│   ├── video-check.js          # 集成CLI工具（新增）
│   ├── html-builder.js         # HTML页面构建器
│   ├── baoyu-integration.js    # 宝玉技能集成
│   ├── content-processor.js    # 内容处理器
│   ├── themes.js               # 主题样式管理
│   ├── svg-generator.js        # SVG备用图生成
│   └── tool-proxy.js           # 工具代理
├── references/                 # 配置文件目录
│   ├── baoyu-config.json       # 宝玉技能配置
│   ├── cdn-mapping.json        # CDN映射配置
│   └── tailwind-config.json    # Tailwind配置
├── templates/                  # 模板文件目录
└── examples/                   # 示例项目
    └── demo/                   # 演示项目
```

## 输出结构

参考 PATHS.md 规范。

## 主题风格

| 风格 | 说明 | 适用场景 |
|------|------|----------|
| tech-modern | 现代科技风 (默认) | 科技/AI/互联网 |
| cyberpunk | 赛博朋克风 | 游戏/未来/数字 |
| neon-future | 霓虹未来风 | 创新/前沿/趋势 |
| minimal-tech | 极简科技风 | 专业/商务/数据 |
| gradient-wave | 渐变波纹风 | 生活方式/设计 |
| particle-tech | 粒子科技风 | 数据/科学/研究 |
| glass-morphism | 玻璃拟态风 | 时尚/品牌/高端 |
| holographic | 全息投影风 | AR/VR/元宇宙 |
| data-stream | 数据流风 | 大数据/金融/分析 |
| quantum-tech | 量子科技风 | 量子/物理/前沿 |

## 目标平台

- `xhs` - 小红书优化 (1080×1920, 60fps, 15-60秒)
- `wechat` - 视频号优化 (1080×1920, 30/60fps, 10-60秒)
- `all` - 所有平台 (默认)

## 工作流程

### 完整工作流程
1. **获取内容** - 从URL/主题/文件/直接内容获取原始素材
2. **分析内容** - 提取关键词、计算时长、生成摘要
3. **生成文案** - 平台优化标题、标签、摘要
4. **构建HTML** - Tailwind CSS 响应式页面
5. **生成视觉** - 封面图、插图、信息图（调用宝玉技能或生成SVG备用）
6. **生成音频** - 依据 VOICE.md 要求，生成字幕及语言
7. **生成字幕** - 智能生成ASS字幕，自动修复字体兼容性
8. **质量检查** - 检查字体、音频、字幕、视频质量，自动修复问题
9. **生成视频** - 合成封面及字幕、语音，Remotion 渲染竖屏视频
10. **生成报告** - 完整的执行报告

### 字幕生成与质量检查（新增功能）

#### 字幕生成器 (subtitle-generator.js)
- **智能字体选择**：自动根据操作系统选择兼容字体（macOS: PingFang SC, Windows: Microsoft YaHei）
- **ASS格式支持**：生成标准ASS字幕文件，支持样式控制
- **时间轴同步**：自动计算字幕显示时间，确保与音频同步
- **字体兼容性修复**：自动检测并修复不兼容字体（如STHeiti Medium）

#### 质量检查器 (quality-checker.js)
- **全面检查**：检查字体、音频、字幕、视频、项目结构
- **自动修复**：自动修复常见问题（字体兼容性、格式转换等）
- **批量处理**：支持批量检查多个视频项目
- **详细报告**：生成JSON格式检查报告，包含问题和解决方案

#### 集成CLI工具 (video-check.js)
- `generate-subtitles` - 生成字幕文件
- `check-quality` - 检查项目质量
- `fix-fonts` - 修复字体兼容性
- `batch-process` - 批量处理多个项目

## 宝玉技能集成

本技能依赖宝玉技能（如已安装则自动调用，否则使用内置备用方案）：

- `baoyu-url-to-markdown` - 网页内容抓取
- `baoyu-cover-image` - 封面图生成
- `baoyu-article-illustrator` - 文章插图生成
- `baoyu-infographic` - 信息图生成
- `baoyu-format-markdown` - Markdown格式化
- `baoyu-markdown-to-html` - Markdown转HTML

## 新增功能文档

### SUBTITLES.md - 字幕生成与质量检查系统
完整的使用文档，包括：
- 字幕生成器API使用示例
- 质量检查器配置选项
- 批量处理功能说明
- 常见问题与解决方案

### 测试脚本
- `test-subtitle-system.js` - 完整的系统测试套件

## 参考文档

- `{baseDir}/references/baoyu-config.json` - 宝玉技能配置
- `{baseDir}/references/cdn-mapping.json` - CDN映射配置
- `{baseDir}/references/tailwind-config.json` - Tailwind配置
- `{baseDir}/REMOTION.md` - Remotion视频组件规范
- `{baseDir}/VOICE.md` - 语音生成规范
- `{baseDir}/HTML.md` - HTML页面规范
- `{baseDir}/PATHS.md` - 输出结构规范
- `{baseDir}/FONTS.md` - 字体规范
- `{baseDir}/WORKFLOW.md` - 工作流规范
- `{baseDir}/COPY.md` - 公众号文案生成规范
- `{baseDir}/SUBTITLES.md` - 字幕生成与质量检查文档（新增）
- `{baseDir}/QUALITY.md` - 质量检查规范
- `{baseDir}/INPUT.md` - 输入处理规范
- `{baseDir}/THEMES.md` - 主题风格规范
- `{baseDir}/PLATFORM.md` - 平台适配规范
- `{baseDir}/TROUBLESHOOTING.md` - 故障排除指南
- `{baseDir}/INSTALLATION.md` - 安装指南
- `{baseDir}/INTEGRATION.md` - 集成指南
- `{baseDir}/SCRIPTS.md` - 脚本说明

## 技术规格

### 视频规格
- 分辨率：1080×1920（竖屏）
- 帧率：60fps
- 时长：30-60秒（可配置）
- 格式：MP4/H.264

### 字幕规格
- 字体：PingFang SC（macOS兼容）
- 大小：10-14px（根据视频时长调整）
- 颜色：黄色 (&H0000FFFF)，黑色描边
- 位置：底部居中，距底边30px
- 格式：ASS（Advanced SubStation Alpha）

### 音频规格
- 格式：AAC/MP3
- 码率：256kbps
- 语音：edge-tts自然人声（推荐）

## 版本历史

### v3.0.0 (2026-04-15) - 重大更新
- ✅ 新增字幕生成系统
- ✅ 新增质量检查系统
- ✅ 新增批量处理功能
- ✅ 集成字体兼容性自动修复
- ✅ 完善文档和测试脚本

### v2.0.0 (2026-04-12) - 功能增强
- 集成宝玉技能生态
- 支持10+主题风格
- 多平台适配优化

### v1.0.0 (2026-03-30) - 初始版本
- 基础视频创作功能
- Remotion视频渲染
- 基本工作流实现