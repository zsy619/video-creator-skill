# 内容输入模式

> 所属模块：video-creator / SKILL.md → 工作流入口

## 模式1：链接输入

```bash
# 自动获取链接内容并分析，同时下载与主题相关的图片
请帮我根据这个链接制作视频：https://zhuanlan.zhihu.com/p/xxxxx
```

**处理流程：**
1. 使用 `baoyu-url-to-markdown --download-media` 获取链接内容**并下载图片**
   ```bash
   bun $SKILL_DIR/scripts/vendor/baoyu-fetch/src/cli.ts <url> \
     --output docs/article.md \
     --download-media \
     --media-dir docs/assets/imgs/
   ```
2. 解析 Markdown 提取标题、正文、关键信息
3. 联网搜索相关内容，补充信息和背景知识
4. 根据上述信息进行合并、提取关键信息和结构化内容
5. 自动生成视频脚本

> **📷 图片下载说明**：使用 `--download-media` 后，baoyu-fetch 会自动下载页面中与内容相关的图片到 `docs/assets/imgs/` 目录，Markdown 中的图片链接也会被替换为本地路径。这些图片可用于：
> - Step 6 生成视频视觉素材
> - 作为 Remotion 视频组件的背景图或插图
> - 微信公众号文章配图

## 模式2：主题输入

```bash
# 根据主题搜索并获取相关内容
请帮我制作一个关于"AI编程工具"主题的视频
```

**处理流程：**
1. 使用 `web_search` 搜索主题相关内容
2. 整合搜索结果构建内容摘要
3. 生成视频脚本

## 模式3：详细内容输入

```bash
# 直接输入详细内容制作视频
请帮我把这个内容制作成视频：[粘贴详细内容]
```

**处理流程：**
1. 直接解析用户提供的内容
2. 提取关键信息和结构
3. 联网搜索相关内容，补充信息和背景知识
4. 根据上述信息进行合并、提取关键信息和结构化内容
5. 生成视频脚本

## 模式4：GitHub项目链接

```bash
# 分析GitHub项目，提取项目亮点和技术特性
请帮我制作一个介绍这个GitHub项目的视频：https://github.com/username/repo
```

**处理流程：**

1. 使用 `baoyu-url-to-markdown --download-media` 获取仓库README内容并下载相关图片

2. 提取关键信息：
   - 项目名称、star数、fork数
   - 核心技术/框架
   - 独特功能和创新点
   - 适用场景和目标用户
   - 快速安装/使用方式

3. 使用 `web_search` 搜索项目相关评价、使用案例、对比分析

4. 生成视频脚本，重点突出项目亮点

```bash
# GitHub项目视频脚本结构建议
# 1. 开场：项目名称 + 一句话描述
# 2. 痛点：解决什么问题
# 3. 核心特性：主要功能和亮点
# 4. 技术细节：使用的技术栈
# 5. 使用示例：快速上手
# 6. 结尾：适合谁用 + 如何开始
```

**GitHub项目特殊处理说明：**
- README中的代码块建议用信息图替代展示
- 项目Logo和截图放在封面和开头场景
- star/fork数可作为量化数据展示
- 相关技术标签作为关键词展示
