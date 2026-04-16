# 🎬 Video Creator 示例项目

这是一个展示 Video Creator 技能功能的示例项目。

## 项目结构

```
demo/
├── README.md                    # 项目说明
├── input-content.md            # 输入内容示例
├── output/                     # 生成的文件
│   ├── content/               # 内容文件
│   │   ├── original.md        # 原始内容
│   │   ├── processed.md       # 处理后的内容
│   │   └── metadata.json      # 内容元数据
│   ├── images/                # 生成的图片
│   │   ├── cover.webp         # 封面图
│   │   ├── illustration-1.webp # 插图1
│   │   ├── illustration-2.webp # 插图2
│   │   └── infographic.webp   # 信息图
│   ├── html/                  # HTML页面
│   │   └── article-summary.html # 响应式HTML页面
│   ├── video/                 # 生成的视频
│   │   ├── xhs-video.mp4      # 小红书优化视频
│   │   ├── wechat-video.mp4   # 视频号优化视频
│   │   └── landscape-video.mp4 # 横屏视频
│   └── report.md              # 生成报告
└── scripts/                   # 示例脚本
    ├── run-demo.js            # 运行示例
    └── config.json            # 配置文件
```

## 快速开始

### 1. 安装依赖
```bash
cd ~/.agents/skills/video-creator
npm install
```

### 2. 运行示例
```bash
node examples/demo/scripts/run-demo.js
```

### 3. 查看结果
打开生成的文件查看结果：
```bash
# 查看HTML页面
open examples/demo/output/html/article-summary.html

# 查看生成报告
cat examples/demo/output/report.md
```

## 输入内容示例

### 通过链接
```bash
/video-creator --url https://tech.163.com/2024/ai-trends.html
```

### 通过主题
```bash
/video-creator --topic "量子计算最新进展"
```

### 通过内容
```bash
/video-creator --content "# 人工智能的未来\n\n人工智能正在改变世界..."
```

## 配置选项

### 基本配置
```json
{
  "input": {
    "type": "topic",
    "value": "人工智能发展趋势"
  },
  "output": {
    "dir": "./output",
    "quality": "high",
    "platforms": ["xhs", "wechat"]
  },
  "video": {
    "duration": 30,
    "fps": 60,
    "width": 1080,
    "height": 1920,
    "style": "tech-modern"
  },
  "images": {
    "generateCover": true,
    "generateIllustrations": true,
    "generateInfographic": true,
    "format": "webp",
    "quality": 85
  }
}
```

### 主题风格
- `tech-modern` - 现代科技风（默认）
- `cyberpunk` - 赛博朋克风
- `neon-future` - 霓虹未来风
- `minimal-tech` - 极简科技风
- `gradient-wave` - 渐变波纹风
- `particle-tech` - 粒子科技风
- `glass-morphism` - 玻璃拟态风
- `holographic` - 全息投影风
- `data-stream` - 数据流风
- `quantum-tech` - 量子科技风

## 生成的文件说明

### 1. 内容文件
- `original.md` - 原始输入内容
- `processed.md` - 处理后的Markdown内容，包含平台优化建议
- `metadata.json` - 内容分析元数据

### 2. 图片文件
- `cover.webp` - 封面图，使用 baoyu-cover-image 生成
- `illustration-*.webp` - 内容插图，使用 baoyu-article-illustrator 生成
- `infographic.webp` - 信息图，使用 baoyu-infographic 生成

### 3. HTML页面
- `article-summary.html` - 响应式HTML页面，使用Tailwind CSS构建
- 兼容移动端和多端显示
- 使用国内CDN资源
- 包含动画和交互效果

### 4. 视频文件
- `xhs-video.mp4` - 小红书优化视频（1080x1920, 60fps）
- `wechat-video.mp4` - 视频号优化视频（1080x1920, 60fps）
- `landscape-video.mp4` - 横屏视频（1920x1080, 60fps）

### 5. 生成报告
- 内容摘要和统计
- 生成的文件列表
- 使用的技能和工具
- 性能统计和优化建议

## 技术架构

### 核心组件
1. **内容处理器** - 处理三种输入来源
2. **图片生成器** - 调用宝玉技能生成视觉内容
3. **HTML构建器** - 使用Tailwind CSS构建响应式页面
4. **视频合成器** - 基于Remotion生成视频

### 集成技能
- `baoyu-url-to-markdown` - 网页转Markdown
- `baoyu-cover-image` - 封面图生成
- `baoyu-article-illustrator` - 文章插图生成
- `baoyu-infographic` - 信息图生成
- `baoyu-format-markdown` - Markdown格式化
- `baoyu-markdown-to-html` - Markdown转HTML

### 外部依赖
- Remotion - 视频生成框架
- Tailwind CSS - 样式框架
- 国内CDN - 字体和资源加速

## 最佳实践

### 内容优化
1. **内容长度**：500-2000字最适合视频生成
2. **结构清晰**：使用标题和段落分隔
3. **关键词丰富**：有助于生成更好的标签和摘要
4. **图片引用**：在内容中标注需要插图的位置

### 性能优化
1. **图片压缩**：使用WebP格式，质量85%
2. **视频编码**：使用H.264高效编码
3. **缓存利用**：重复内容使用缓存结果
4. **并行处理**：图片生成并行化

### 平台优化
1. **小红书**：竖屏，15-60秒，高饱和度
2. **视频号**：竖屏，10-60秒，文字清晰
3. **通用**：响应式设计，多端兼容

## 故障排除

### 常见问题
1. **内容获取失败**：检查网络连接和URL有效性
2. **图片生成失败**：检查宝玉技能配置和API密钥
3. **视频渲染失败**：检查Remotion配置和依赖
4. **CDN资源加载慢**：切换到国内CDN或使用本地资源

### 调试模式
```bash
# 启用详细日志
VIDEO_CREATOR_DEBUG=true node run-demo.js

# 跳过图片生成
SKIP_IMAGES=true node run-demo.js

# 跳过视频渲染
SKIP_VIDEO=true node run-demo.js
```

## 扩展开发

### 添加新主题
1. 在 `video-composer.js` 中添加主题定义
2. 在 `html-builder.js` 中添加对应的样式
3. 更新配置文件和文档

### 集成新技能
1. 在 `tool-proxy.js` 中添加技能调用
2. 在相应处理器中集成调用逻辑
3. 更新技能依赖和文档

### 优化性能
1. 实现缓存机制
2. 添加并行处理
3. 优化资源加载

## 许可证

MIT License

## 贡献指南

欢迎提交Issue和Pull Request来改进这个技能！