# 🎬 Video Creator - 自动化视频创作技能

**自动化视频创作工具，从文章/URL/主题生成竖屏社交媒体视频。集成字幕生成、质量检查、自动修复功能，支持批量处理多个视频项目。**

[![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-blue)](https://openclaw.ai)
[![Version](https://img.shields.io/badge/version-3.0.0-green)](https://github.com/zsy619/video-creator-skill)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)

## ✨ 特性亮点

### 🎯 **核心功能**
- **多源输入**: 支持URL、主题、文件、直接内容
- **智能分析**: 自动提取关键词、计算时长、生成摘要
- **平台适配**: 小红书、视频号、抖音、YouTube多平台优化
- **主题丰富**: 10+种现代科技风格主题

### ✅ **质量保障（新增）**
- **字幕生成**: 智能生成ASS字幕，自动修复字体兼容性
- **质量检查**: 全面检查字体、音频、字幕、视频质量
- **自动修复**: 一键修复常见技术问题
- **批量处理**: 支持处理多个视频项目，效率提升10倍+

### 🚀 **技术优势**
- **Remotion渲染**: React代码写视频，60fps流畅体验
- **宝玉技能集成**: 封面图、插图、信息图自动生成
- **模块化设计**: 可扩展、可定制的工作流
- **详细报告**: 完整的执行报告和优化建议

## 🚀 快速开始

### 安装
```bash
# 确保已安装OpenClaw
openclaw --version

# 安装video-creator技能
# （通常通过OpenClaw技能市场安装）
```

### 基础使用
```bash
# 从URL创建视频
video-creator --url "https://example.com/article" --style tech-modern

# 从主题创建视频
video-creator --topic "人工智能发展趋势" --style cyberpunk

# 从内容创建视频
video-creator --content "# 标题\n\n内容..." --style neon-future

# 从文件创建视频
video-creator --file ./article.md --style glass-morphism
```

### 质量检查（新增功能）
```bash
# 检查项目质量并自动修复
video-creator check --project ./my-video --fix

# 修复字体兼容性问题
video-creator subtitles --fix --project ./my-video

# 批量处理多个项目
video-creator batch --directory ./workspace --fix

# 生成字幕文件
node scripts/video-check.js generate-subtitles \
  --input audio/full_narration.txt \
  --output audio/subtitles.ass \
  --duration 60
```

## 📁 目录结构

```
video-creator/
├── README.md                    # 本文件
├── SKILL.md                     # 技能主文档
├── cli.js                       # 命令行接口
├── package.json                 # Node.js依赖配置
├── test-subtitle-system.js      # 字幕系统测试脚本
├── scripts/                     # 核心脚本目录
│   ├── main.js                  # 主程序入口
│   ├── video-composer.js        # 视频合成器
│   ├── subtitle-generator.js    # 字幕生成器
│   ├── quality-checker.js        # 质量检查器
│   ├── video-check.js           # 集成CLI工具
│   ├── html-builder.js           # HTML页面构建器
│   ├── baoyu-integration.js     # 宝玉技能集成
│   ├── content-processor.js      # 内容处理器
│   ├── themes.js                 # 主题样式管理
│   ├── svg-generator.js          # SVG备用图生成
│   └── tool-proxy.js             # 工具代理
├── rules/                       # 规范文档目录
│   ├── WORKFLOW.md              # 工作流规范
│   ├── REMOTION.md              # Remotion组件规范
│   ├── VOICE.md                 # 语音生成规范
│   ├── HTML.md                  # HTML页面规范
│   ├── FONTS.md                 # 字体规范
│   ├── COPY.md                  # 文案生成规范
│   ├── SUBTITLES.md             # 字幕生成规范
│   ├── QUALITY.md               # 质量检查规范
│   ├── INPUT.md                 # 输入处理规范
│   ├── THEMES.md                # 主题风格规范
│   ├── PLATFORM.md              # 平台适配规范
│   ├── PATHS.md                 # 输出结构规范
│   ├── SCRIPTS.md               # 脚本说明
│   ├── TROUBLESHOOTING.md       # 故障排除指南
│   └── INTEGRATION.md           # 集成指南
├── references/                   # 配置文件目录
│   ├── baoyu-config.json        # 宝玉技能配置
│   ├── cdn-mapping.json         # CDN映射配置
│   └── tailwind-config.json     # Tailwind配置
├── templates/                    # 模板文件目录
└── examples/                    # 示例项目
    └── demo/                    # 演示项目
```

## 📋 完整工作流程

### 🎯 10步工作流
1. **获取内容** - 从URL/主题/文件/直接内容获取原始素材
2. **分析内容** - 提取关键词、计算时长、生成摘要
3. **生成文案** - 平台优化标题、标签、摘要
4. **构建HTML** - Tailwind CSS 响应式页面
5. **生成视觉** - 封面图、插图、信息图
6. **生成音频** - edge-tts自然人声配音
7. **生成字幕** - 智能生成ASS字幕，自动修复字体兼容性 ⭐ **新增**
8. **质量检查** - 检查字体、音频、字幕、视频质量 ⭐ **新增**
9. **生成视频** - Remotion渲染60fps竖屏视频
10. **生成报告** - 完整的执行报告

### 🔄 执行模式
- **完整模式**: 运行1-10全流程
- **检查模式**: 只运行质量检查（步骤8）
- **字幕模式**: 只生成字幕（步骤7）
- **批量模式**: 批量处理多个项目

## 🎨 主题风格

| 风格 | 说明 | 适用场景 | 预览 |
|------|------|----------|------|
| `tech-modern` | 现代科技风 (默认) | 科技/AI/互联网 | 🔵 |
| `cyberpunk` | 赛博朋克风 | 游戏/未来/数字 | 🌌 |
| `neon-future` | 霓虹未来风 | 创新/前沿/趋势 | 🌈 |
| `minimal-tech` | 极简科技风 | 专业/商务/数据 | ⚪ |
| `gradient-wave` | 渐变波纹风 | 生活方式/设计 | 🌊 |
| `particle-tech` | 粒子科技风 | 数据/科学/研究 | ✨ |
| `glass-morphism` | 玻璃拟态风 | 时尚/品牌/高端 | 🪟 |
| `holographic` | 全息投影风 | AR/VR/元宇宙 | 🔮 |
| `data-stream` | 数据流风 | 大数据/金融/分析 | 📊 |
| `quantum-tech` | 量子科技风 | 量子/物理/前沿 | ⚛️ |

## 📱 目标平台

### 小红书 (`xhs`)
- 分辨率: 1080×1920 或 1440×1920
- 帧率: 60fps
- 时长: 15-60秒
- 特点: 标题带emoji，正文干货+情绪，标签不少于5个

### 视频号 (`wechat`)
- 分辨率: 1080×1920
- 帧率: 30/60fps
- 时长: 10-60秒
- 特点: 标题简洁有力，引导点赞评论

### 抖音 (`douyin`)
- 分辨率: 1080×1920
- 帧率: 60fps
- 时长: 15秒到3分钟
- 特点: 前3秒必须抓人，节奏要快

### YouTube (`youtube`)
- 分辨率: 横屏1920×1080 或竖屏1080×1920
- 帧率: 60fps
- 特点: 标题有关键词，描述前两行要抓人

## 🔧 技术规格

### 视频规格
- **分辨率**: 1080×1920（竖屏）
- **帧率**: 60fps
- **时长**: 30-60秒（可配置）
- **格式**: MP4/H.264
- **编码**: High Profile, Level 4.2

### 字幕规格
- **字体**: PingFang SC（macOS兼容），Microsoft YaHei（Windows兼容）
- **大小**: 10-14px（根据视频时长调整）
- **颜色**: 黄色 (&H0000FFFF)，黑色描边
- **位置**: 底部居中，距底边30px
- **格式**: ASS（Advanced SubStation Alpha）

### 音频规格
- **格式**: AAC/MP3
- **码率**: 256kbps
- **语音**: edge-tts自然人声（推荐）
- **语速**: 可调节（1.0x-2.0x）

## 📚 文档体系

### 核心文档
- **[SKILL.md](SKILL.md)** - 技能主文档（详细说明）
- **[rules/WORKFLOW.md](rules/WORKFLOW.md)** - 工作流规范
- **[rules/REMOTION.md](rules/REMOTION.md)** - Remotion视频组件规范
- **[rules/VOICE.md](rules/VOICE.md)** - 语音生成规范
- **[rules/HTML.md](rules/HTML.md)** - HTML页面规范

### 质量保障
- **[rules/SUBTITLES.md](rules/SUBTITLES.md)** - 字幕生成与质量检查系统
- **[rules/QUALITY.md](rules/QUALITY.md)** - 质量检查规范
- **[rules/FONTS.md](rules/FONTS.md)** - 字体规范

### 内容规范
- **[rules/PATHS.md](rules/PATHS.md)** - 输出结构规范
- **[rules/INPUT.md](rules/INPUT.md)** - 输入处理规范
- **[rules/THEMES.md](rules/THEMES.md)** - 主题风格规范
- **[rules/PLATFORM.md](rules/PLATFORM.md)** - 平台适配规范
- **[rules/COPY.md](rules/COPY.md)** - 公众号文案生成规范
- **[rules/SCRIPTS.md](rules/SCRIPTS.md)** - 视频脚本说明

### 实用文档
- **[rules/TROUBLESHOOTING.md](rules/TROUBLESHOOTING.md)** - 故障排除指南
- **[rules/INTEGRATION.md](rules/INTEGRATION.md)** - 集成指南
- **[rules/SESSION_LOG.md](rules/SESSION_LOG.md)** - Session 日志追踪（token 消耗）

## 🛠️ 宝玉技能集成

本技能自动集成以下宝玉技能（如已安装）：

| 技能 | 功能 | 是否必需 |
|------|------|----------|
| `baoyu-url-to-markdown` | 网页内容抓取 | 推荐 |
| `baoyu-cover-image` | 封面图生成 | 推荐 |
| `baoyu-article-illustrator` | 文章插图生成 | 可选 |
| `baoyu-infographic` | 信息图生成 | 可选 |
| `baoyu-format-markdown` | Markdown格式化 | 推荐 |
| `baoyu-markdown-to-html` | Markdown转HTML | 推荐 |

**注意**: 如果宝玉技能未安装，系统会自动使用内置备用方案。

## 🧪 测试与验证

### 测试脚本
```bash
# 运行完整的字幕系统测试
node test-subtitle-system.js

# 测试结果
✅ 字幕生成器测试完成
✅ 质量检查器测试完成
✅ CLI工具测试完成
```

### 质量检查示例
```bash
# 运行质量检查
video-creator check --project ./test-project --fix

# 输出示例
📊 质量检查报告
============================================================
项目目录: ./test-project
检查时间: 2026-04-16 09:30:00

❌ 错误: 1
⚠️  警告: 2
🔧 已修复: 1

❌ 严重错误:
  1. FONT_COMPATIBILITY: 使用不兼容字体: STHeiti Medium
     文件: audio/subtitles.ass
     解决方案: 已自动替换为 PingFang SC
```

## 📈 性能指标

### 处理时间（参考）
| 步骤 | 平均时间 | 优化后 |
|------|----------|--------|
| 内容获取 | 2-5秒 | ✅ |
| 视觉生成 | 10-30秒 | ⚡ 并行处理 |
| 音频生成 | 5-15秒 | ⚡ 并行处理 |
| 视频渲染 | 20-60秒 | ✅ |
| **质量检查** | **1-3秒** | ⭐ **新增** |
| **批量处理** | **N×1-3秒** | ⭐ **新增** |

### 资源占用
- **内存**: 200-500MB（视频渲染时）
- **CPU**: 中等（视频渲染时）
- **磁盘**: 每个项目50-200MB

## 🔄 版本历史

### v3.0.0 (2026-04-15) - 重大更新 ⭐
- ✅ **新增字幕生成系统**：智能生成ASS字幕，自动修复字体兼容性
- ✅ **新增质量检查系统**：全面检查字体、音频、字幕、视频质量
- ✅ **新增批量处理功能**：支持处理多个视频项目，效率提升10倍+
- ✅ **集成自动修复**：一键修复常见技术问题
- ✅ **完善文档体系**：新增SUBTITLES.md、QUALITY.md等文档

### v2.0.0 (2026-04-12) - 功能增强
- 集成宝玉技能生态
- 支持10+主题风格
- 多平台适配优化
- 完善工作流设计

### v1.0.0 (2026-03-30) - 初始版本
- 基础视频创作功能
- Remotion视频渲染
- 基本工作流实现
- 核心脚本开发

## 🚨 常见问题

### Q1: 字体兼容性问题
**问题**: 字幕使用`STHeiti Medium`字体，在macOS上不存在  
**解决**: 运行 `video-creator subtitles --fix --project ./my-video`

### Q2: 音频质量差
**问题**: 使用macOS say机械音  
**解决**: 安装edge-tts：`python3 -m pip install --user edge-tts`

### Q3: 视频渲染失败
**问题**: Remotion配置错误  
**解决**: 检查`REMOTION.md`文档，确保依赖正确安装

### Q4: 批量处理慢
**问题**: 处理大量项目时速度慢  
**解决**: 启用并行处理，优化缓存机制

## 📞 支持与贡献

### 问题反馈
- GitHub Issues: [https://github.com/zsy619/video-creator-skill/issues](https://github.com/zsy619/video-creator-skill/issues)
- OpenClaw社区: [https://discord.com/invite/clawd](https://discord.com/invite/clawd)

### 贡献指南
1. Fork项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

### 开发环境
```bash
# 克隆项目
git clone https://github.com/zsy619/video-creator-skill.git

# 安装依赖
cd video-creator-skill
npm install

# 运行测试
npm test
```

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- **OpenClaw团队** - 提供了强大的AI助手平台
- **宝玉技能生态** - 提供了丰富的视觉生成能力
- **Remotion团队** - 优秀的React视频渲染框架
- **所有贡献者** - 感谢你们的代码和反馈

---

**最后更新**: 2026-04-16  
**版本**: v3.0.0  
**作者**: 朱书彦  
**维护者**: OpenClaw Assistant  

> 🎬 **让视频创作变得更简单、更专业、更高效**