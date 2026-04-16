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
- "创建视频" / "生成视频" / "视频创作" / "竖屏视频" / "创作视频"
- "把这篇文章做成视频"
- "制作竖屏视频" / "小红书视频" / "抖音视频"
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

参考 THEMES.md 规范，根据内容选择合适的主题风格。

## 目标平台

- `xhs` - 小红书优化 (1080×1920, 60fps, 15-60秒)
- `wechat` - 视频号优化 (1080×1920, 30/60fps, 10-60秒)
- `all` - 所有平台 (默认)

## 工作流程

## 完整工作流程

### 🎯 概述
video-creator 采用模块化、可扩展的工作流设计，每个步骤都有明确的输入输出和质量检查点。工作流支持从多种来源创建视频，并集成了完整的质量保障体系。

### 📋 工作流步骤详解

#### 1. **获取内容** - 内容输入与预处理
**输入**: URL / 主题 / 文件 / 直接内容  
**输出**: 原始文本内容  
**工具**: `content-processor.js`  
**质量检查**: 内容完整性、可读性

```javascript
// 支持多种输入方式
- URL: https://example.com/article
- 主题: "人工智能发展趋势"
- 文件: ./article.md
- 直接内容: "# 标题\n\n内容..."
```

#### 2. **分析内容** - 内容理解与结构化
**输入**: 原始文本内容  
**输出**: 结构化数据（关键词、时长、摘要）  
**工具**: `content-processor.js`  
**质量检查**: 关键词提取准确性、时长计算合理性

```javascript
// 分析结果
{
  "keywords": ["AI", "机器学习", "深度学习"],
  "duration": 45, // 秒
  "summary": "文章介绍了AI技术的发展趋势...",
  "sections": 6 // 内容分段数
}
```

#### 3. **生成文案** - 平台优化文案创作
**参考**: 要生成的文案，参考 PATHS.md 规范.
**输入**: 结构化内容  
**输出**: 平台优化文案（标题、标签、摘要）  
**工具**: `content-processor.js` + 平台适配逻辑  
**质量检查**: 文案吸引力、平台合规性、SEO优化

```javascript
// 多平台文案适配
- 小红书: "🔥 AI技术爆发！2026年最值得关注的5大趋势"
- 视频号: "AI技术发展趋势解读"
- 公众号: "深度解析：AI技术的未来发展方向"
```

#### 4. **构建HTML** - 响应式页面构建
**参考**: 要生成的文案，参考 PATHS.md 规范.
**输入**: 结构化内容 + 文案  
**输出**: Tailwind CSS HTML页面  
**工具**: `html-builder.js`  
**质量检查**: 响应式设计、加载性能、浏览器兼容性

```html
<!-- 生成的HTML结构 -->
<div class="min-h-screen bg-gradient-to-b from-gray-900 to-black">
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-4xl font-bold text-white mb-4">标题</h1>
    <!-- 内容区域 -->
  </div>
</div>
```

#### 5. **生成视觉** - 视觉素材创建
**输入**: 结构化内容  
**输出**: 封面图、插图、信息图  
**工具**: `baoyu-integration.js` + `svg-generator.js`  
**质量检查**: 视觉质量、风格一致性、文件大小

```javascript
// 视觉生成策略
1. 优先调用宝玉技能（如已安装）
2. 备用方案：生成SVG矢量图
3. 质量检查：分辨率、色彩、构图
```

#### 6. **生成音频** - 语音合成与处理
**输入**: 文案内容  
**输出**: 配音音频文件  
**工具**: edge-tts + `tool-proxy.js`  
**质量检查**: 语音清晰度、语速适中、无杂音

```bash
# 使用edge-tts生成自然人声
edge-tts --voice zh-CN-YunjianNeural --text "$CONTENT" --write-media audio/narration.mp3
```

#### 7. **生成字幕** - 智能字幕创建 ⭐ **新增**
**输入**: 配音文本 + 音频时长  
**输出**: ASS格式字幕文件  
**工具**: `subtitle-generator.js`  
**质量检查**: 字体兼容性、时间轴同步、格式正确性

```javascript
const generator = new SubtitleGenerator();
const subtitles = await generator.generateFromText(text, audioDuration);
await generator.generateASS(subtitles, 'audio/subtitles.ass');
```

#### 8. **质量检查** - 全面质量保障 ⭐ **新增**
**输入**: 所有中间文件  
**输出**: 质量检查报告 + 自动修复  
**工具**: `quality-checker.js`  
**质量检查**: 字体、音频、字幕、视频、项目结构

```javascript
const checker = new QualityChecker({
  projectDir: './my-video',
  fixIssues: true // 自动修复
});
const report = await checker.runFullCheck();
```

#### 9. **生成视频** - 视频合成与渲染
**输入**: HTML + 视觉素材 + 音频 + 字幕  
**输出**: 最终视频文件  
**工具**: `video-composer.js` + Remotion  
**质量检查**: 分辨率、帧率、时长、文件大小

```javascript
// Remotion视频渲染
const video = await renderVideo({
  composition: "MyVideo",
  props: { content, visuals, audio },
  durationInFrames: 60 * fps,
  fps: 60,
  width: 1080,
  height: 1920
});
```

#### 10. **生成报告** - 执行总结与优化建议
**输入**: 所有处理步骤的结果  
**输出**: 完整执行报告  
**工具**: 报告生成系统  
**质量检查**: 报告完整性、可读性、实用性

```json
{
  "project": "my-video",
  "status": "completed",
  "duration": "45秒",
  "quality": "excellent",
  "issues_fixed": 3,
  "recommendations": ["使用PingFang SC字体", "优化音频码率"]
}
```

### 🔄 工作流执行模式

#### 模式1: **完整工作流**（默认）
```bash
# 从URL创建完整视频
video-creator --url "https://example.com" --output ./my-video

# 执行流程：1→2→3→4→5→6→7→8→9→10
```

#### 模式2: **质量检查模式** ⭐ **新增**
```bash
# 只运行质量检查（不生成新视频）
video-creator check --project ./my-video --fix

# 执行流程：8（质量检查）→ 自动修复
```

#### 模式3: **字幕生成模式** ⭐ **新增**
```bash
# 只生成字幕文件
video-creator subtitles --generate --project ./my-video

# 执行流程：7（字幕生成）
```

#### 模式4: **批量处理模式** ⭐ **新增**
```bash
# 批量处理多个项目
video-creator batch --directory ./workspace --fix

# 执行流程：对每个项目运行模式2
```

### 🎨 主题风格集成

工作流支持10+种主题风格，每种风格都有独特的视觉设计和动画效果：

```javascript
// 主题风格配置
const themes = {
  'tech-modern': { colors: ['#3B82F6', '#10B981'], animations: 'smooth' },
  'cyberpunk': { colors: ['#FF00FF', '#00FFFF'], animations: 'glitch' },
  'neon-future': { colors: ['#FF6B6B', '#4ECDC4'], animations: 'pulse' }
  // ... 更多主题
};
```

### 🔧 错误处理与恢复

#### 错误检测
- **内容获取失败**：自动重试，提供备用方案
- **视觉生成失败**：使用SVG备用图
- **音频生成失败**：提示用户手动处理
- **字体兼容性问题**：自动修复为PingFang SC

#### 恢复机制
```javascript
// 工作流状态保存
{
  "step": 6, // 当前执行到第6步
  "completed": [1, 2, 3, 4, 5], // 已完成步骤
  "errors": [], // 错误记录
  "checkpoint": "audio-generated" // 检查点
}
```

### 📊 性能优化

#### 并行处理
```javascript
// 可并行执行的步骤
parallelSteps: [
  [5, 6], // 视觉生成 + 音频生成可并行
  [7, 8]  // 字幕生成 + 质量检查可并行
]
```

#### 缓存机制
- **内容缓存**：避免重复获取相同URL
- **视觉缓存**：重复使用已生成的图片
- **字体缓存**：缓存系统字体信息

### 🚀 扩展性设计

#### 插件系统
```javascript
// 自定义处理插件
const plugins = {
  'custom-visual': './plugins/custom-visual.js',
  'special-effect': './plugins/special-effect.js'
};
```

#### 钩子函数
```javascript
// 工作流钩子
hooks: {
  'before-video-render': async (context) => {
    // 渲染前自定义处理
  },
  'after-quality-check': async (report) => {
    // 质量检查后处理
  }
}
```

### 📈 监控与日志

#### 详细日志
```bash
# 启用详细日志
video-creator --url "https://example.com" --verbose

# 日志级别：debug, info, warn, error
```

#### 性能监控
```javascript
// 性能数据收集
performance: {
  'content-processing': '1.2s',
  'visual-generation': '4.5s',
  'video-rendering': '12.3s',
  'total': '18.0s'
}
```

### 🎯 最佳实践

#### 工作流配置
```javascript
// 推荐配置
const config = {
  quality: 'high', // 质量优先
  useBaoyu: true,  // 使用宝玉技能
  autoFix: true,   // 自动修复问题
  batchSize: 5     // 批量处理大小
};
```

#### 定期维护
```bash
# 每周批量检查所有项目
0 9 * * 1 video-creator batch --directory ~/VideoProjects --fix

# 每月清理缓存
0 0 1 * * rm -rf ~/.video-creator/cache/*
```

### 🔍 故障排除

常见问题及解决方案：
1. **字体兼容性问题**：运行 `video-creator subtitles --fix`
2. **音频质量问题**：检查edge-tts安装和网络连接
3. **视频渲染失败**：检查Remotion配置和依赖
4. **性能问题**：启用缓存，优化并行处理

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

---

**工作流版本**: v3.0.0 (2026-04-15)  
**主要更新**: 集成字幕生成、质量检查、批量处理功能  
**设计原则**: 模块化、可扩展、质量优先、自动化修复### v3.0.0 (2026-04-15) - 重大更新
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