# 🚀 Video Creator 技能安装与配置指南

## 系统要求

### 基础要求
- **Node.js**: v14.0.0 或更高版本
- **npm**: v6.0.0 或更高版本
- **操作系统**: macOS, Linux, Windows (WSL2推荐)
- **内存**: 至少 4GB RAM
- **磁盘空间**: 至少 2GB 可用空间

### 推荐配置
- **Node.js**: v18.0.0+
- **内存**: 8GB RAM 或更高
- **网络**: 稳定的互联网连接
- **GPU**: 支持CUDA的GPU（可选，用于加速图片生成）

## 安装步骤

### 1. 克隆技能到本地
```bash
# 如果技能目录不存在，创建它
mkdir -p ~/.agents/skills

# 克隆video-creator技能
# 注意：技能已经在 ~/.agents/skills/video-creator/ 目录中
# 如果是从GitHub克隆：
# git clone https://github.com/your-org/video-creator-skill.git ~/.agents/skills/video-creator
```

### 2. 安装依赖
```bash
cd ~/.agents/skills/video-creator
npm install
```

### 3. 设置可执行权限
```bash
chmod +x cli.js
```

### 4. 验证安装
```bash
# 查看技能文档
cat SKILL.md | head -20

# 运行示例
node examples/demo/scripts/run-demo.js

# 查看帮助
node cli.js --help
```

## 宝玉技能配置

### 1. 确保宝玉技能已安装
Video Creator 依赖以下宝玉技能，请确保它们已安装在 `~/.agents/skills/` 目录中：

```bash
ls ~/.agents/skills/ | grep baoyu
```

**必需技能：**
- `baoyu-url-to-markdown` - 网页转Markdown
- `baoyu-cover-image` - 封面图生成
- `baoyu-article-illustrator` - 文章插图生成
- `baoyu-infographic` - 信息图生成
- `baoyu-format-markdown` - Markdown格式化
- `baoyu-markdown-to-html` - Markdown转HTML

### 2. 配置API密钥（可选但推荐）

创建配置文件：
```bash
cd ~/.agents/skills/video-creator
cp references/baoyu-config.json baoyu-config.local.json
```

编辑 `baoyu-config.local.json`，添加你的API密钥：
```json
{
  "configuration": {
    "apiKeys": {
      "openai": "sk-your-openai-api-key-here",
      "stability": "your-stability-api-key-here",
      "deepseek": "your-deepseek-api-key-here"
    }
  }
}
```

### 3. 测试宝玉技能集成
```bash
# 测试内容获取
node -e "const BaoyuIntegration = require('./scripts/baoyu-integration'); const baoyu = new BaoyuIntegration(); console.log('宝玉技能集成测试...');"

# 测试完整流程
node examples/demo/scripts/run-demo.js
```

## Remotion 配置（视频生成）

### 1. 安装 Remotion
```bash
# 在视频生成时自动安装，也可以手动安装
npm install remotion @remotion/cli
```

### 2. 配置 Remotion 项目
Video Creator 会自动创建 Remotion 项目，但你可以自定义配置：

创建 `remotion.config.js`：
```javascript
module.exports = {
  maxTimelineTracks: 20,
  enableFolderExpansion: true,
  webpackOverride: (config) => {
    return {
      ...config,
      module: {
        ...config.module,
        rules: [
          ...config.module.rules,
          {
            test: /\.(mp3|wav|ogg)$/,
            use: [
              {
                loader: 'file-loader',
                options: {
                  name: '[name].[ext]',
                  outputPath: 'audio/'
                }
              }
            ]
          }
        ]
      }
    };
  }
};
```

### 3. 视频渲染配置
在 `references/baoyu-config.json` 中配置视频参数：
```json
{
  "videoCreatorSpecific": {
    "renderSettings": {
      "codec": "h264",
      "quality": 100,
      "concurrency": 4,
      "timeout": 300000
    }
  }
}
```

## 环境变量配置

### 基本环境变量
```bash
# 在 ~/.bashrc 或 ~/.zshrc 中添加
export VIDEO_CREATOR_HOME="$HOME/.agents/skills/video-creator"
export VIDEO_CREATOR_OUTPUT="$HOME/Videos/video-creator"
export VIDEO_CREATOR_CACHE="$HOME/.cache/video-creator"

# 启用调试模式
export VIDEO_CREATOR_DEBUG=true

# 设置代理（如果需要）
export HTTP_PROXY="http://your-proxy:port"
export HTTPS_PROXY="http://your-proxy:port"
```

### 平台特定优化
```bash
# 小红书优化
export XIAOHONGSHU_OPTIMIZE=true
export XHS_TITLE_PREFIX="🔥 "

# 视频号优化  
export WECHAT_VIDEO_OPTIMIZE=true
export WECHAT_TITLE_PREFIX="【科技】"
```

## 使用 OpenClaw 集成

### 1. 注册技能到 OpenClaw
确保技能目录在 OpenClaw 的技能扫描路径中：

检查 OpenClaw 配置：
```bash
openclaw config get skills.path
```

如果不在路径中，添加：
```bash
openclaw config set skills.path += "$HOME/.agents/skills"
```

### 2. 验证技能识别
```bash
# 重启 OpenClaw
openclaw restart

# 查看已加载的技能
openclaw skills list | grep video-creator
```

### 3. 使用技能命令
```bash
# 通过 OpenClaw 使用
/video-creator --topic "人工智能发展趋势"

# 查看技能帮助
/video-creator --help
```

## 故障排除

### 常见问题

#### 1. 宝玉技能未找到
```
错误: 宝玉技能 baoyu-url-to-markdown 不存在或未安装
```
**解决方案：**
```bash
# 检查技能目录
ls -la ~/.agents/skills/

# 如果缺失，安装宝玉技能
# 参考: https://github.com/JimLiu/baoyu-skills
```

#### 2. API 密钥错误
```
错误: 认证失败，请检查API密钥
```
**解决方案：**
```bash
# 检查配置文件
cat ~/.agents/skills/video-creator/baoyu-config.local.json

# 测试API密钥
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.openai.com/v1/models
```

#### 3. Remotion 渲染失败
```
错误: Remotion 渲染超时
```
**解决方案：**
```bash
# 增加超时时间
export REMOTION_TIMEOUT=600000

# 降低并发数
export REMOTION_CONCURRENCY=2

# 检查Chrome安装
which chrome
```

#### 4. 内存不足
```
错误: JavaScript heap out of memory
```
**解决方案：**
```bash
# 增加Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 减少并发处理
export VIDEO_CREATOR_CONCURRENCY=1
```

### 调试模式

启用详细日志：
```bash
# 设置环境变量
export VIDEO_CREATOR_DEBUG=true
export NODE_DEBUG=video-creator

# 运行技能
/video-creator --topic "测试" --debug
```

查看日志文件：
```bash
tail -f ~/.agents/skills/video-creator/video-creator.log
```

## 性能优化

### 1. 缓存配置
```bash
# 启用缓存
export VIDEO_CREATOR_CACHE_ENABLED=true
export VIDEO_CREATOR_CACHE_TTL=86400000  # 24小时

# 清理缓存
rm -rf ~/.cache/video-creator/*
```

### 2. 并行处理
```bash
# 根据CPU核心数设置
export VIDEO_CREATOR_CONCURRENCY=$(nproc)

# 图片生成并行数
export IMAGE_GENERATION_CONCURRENCY=2
```

### 3. 网络优化
```bash
# 使用国内CDN
export USE_CHINA_CDN=true

# 设置超时
export REQUEST_TIMEOUT=30000
export DOWNLOAD_TIMEOUT=60000
```

## 更新与维护

### 1. 更新技能
```bash
cd ~/.agents/skills/video-creator
git pull origin main
npm install
```

### 2. 更新依赖
```bash
cd ~/.agents/skills/video-creator
npm update
```

### 3. 清理临时文件
```bash
# 清理输出目录
rm -rf ./video-output/*

# 清理临时文件
rm -rf ./temp/*

# 清理日志
echo "" > video-creator.log
```

## 安全注意事项

### 1. API密钥安全
- 不要将API密钥提交到版本控制
- 使用环境变量或配置文件
- 定期轮换密钥

### 2. 内容安全
- 技能会访问外部URL，确保URL可信
- 生成的内容可能包含用户数据，妥善处理
- 遵守相关平台的内容政策

### 3. 系统安全
- 定期更新依赖包
- 监控技能运行状态
- 设置适当的权限

## 获取帮助

### 文档
- 技能文档: `cat SKILL.md`
- 配置参考: `cat references/baoyu-config.json`
- 示例: `cat examples/demo/README.md`

### 社区支持
- GitHub Issues: https://github.com/your-org/video-creator-skill/issues
- Discord: https://discord.gg/openclaw
- 邮件列表: video-creator@example.com

### 报告问题
```bash
# 收集调试信息
cd ~/.agents/skills/video-creator
./scripts/debug-info.sh > debug-info.txt

# 包含以下信息：
# 1. 系统信息
# 2. 错误日志
# 3. 配置信息
# 4. 复现步骤
```

---

**安装完成！** 现在你可以开始使用 Video Creator 技能了：

```bash
# 快速开始
/video-creator --topic "科技发展趋势" --style tech-modern

# 查看生成结果
open ./video-output/html/article-summary.html
```

如果有任何问题，请参考本文档或联系支持团队。