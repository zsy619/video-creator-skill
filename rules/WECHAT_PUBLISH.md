# 微信公众号发布规范

> 所属模块：video-creator / SKILL.md → Step 12.5 公众号发布

## 何时使用

当用户要求以下操作时触发：
- "发布公众号"
- "post to wechat"
- "微信公众号"
- "微信文章"
- "发到公众号"

## 前置条件检查

### Step 1: 检查 baoyu-post-to-wechat 配置
```bash
# 检查 EXTEND.md 是否存在
cat ~/.baoyu-skills/baoyu-post-to-wechat/EXTEND.md
```

### Step 2: 验证配置文件格式
EXTEND.md 必须包含：
```yaml
default_author: 元曜科技
need_open_comment: 1
only_fans_can_comment: 0
chrome_profile_path: ~/Library/Application Support/Google/Chrome
```

## 发布前验证

### wechat-copy.md 验证清单
- [ ] 有 YAML frontmatter
- [ ] title 字段存在且 ≤32 字
- [ ] summary 字段存在且 ≤44 字
- [ ] tags 不少于 5 个
- [ ] platform: wechat

### wechat-page.html 验证清单
- [ ] 无 Google Fonts
- [ ] 使用系统字体栈
- [ ] 有 og:title / og:description Meta
- [ ] 无外部 CSS/JS 依赖
- [ ] 结构化 HTML + 内联 CSS

### 封面图验证清单
- [ ] 分辨率 900×383 (≈2.35:1)
- [ ] 文件存在 `docs/assets/cover-wechat.png`

## 发布方式

### Browser 模式（推荐）

#### Step 1: 准备发布
```bash
PROJECT="/Users/zhushuyan/VideoProjects/{project-name}"
cd ~/.baoyu-skills/baoyu-post-to-wechat
```

#### Step 2: 执行发布
```bash
bun scripts/wechat-article.ts \
  --title "标题" \
  --html "$PROJECT/docs/wechat-page.html" \
  --author "作者" \
  --summary "摘要"
```

#### Step 3: 手动确认
在 Chrome 窗口中：
1. 上传封面图
2. 检查内容显示
3. 点击「保存草稿」或「群发」

## 内容优化规范

### wechat-copy.md 企业级格式
```yaml
---
title: 工具推荐 | 让你的 AI 成为知识管家
author: 元曜科技
summary: LLM 每次回答都在重复工作？Obsidian LLM Wiki 让 LLM 构建持久化 wiki，知识编译一次保持最新。
tags:
  - AI工具
  - 知识管理
  - Obsidian
  - Claude Code
  - 效率提升
platform: wechat
date: 2026-04-22
---

# 标题

> Hook 开场白

## 你是否也有这样的困扰？

- 问题列表

## 解决方案

**工具名称** 采用了 XXX 理念

## 核心功能/特点

| 功能 | 说明 |
|------|------|

## 安装使用

1. 步骤1
2. 步骤2

## 号召行动

GitHub 搜索 **xxx**
```

### wechat-page.html 企业级格式
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="标题">
  <meta property="og:description" content="摘要">
  <meta property="og:type" content="article">
  <title>标题</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC',
                   'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
      font-size: 17px;
      line-height: 1.8;
      color: #333333;
    }
    .container { max-width: 677px; margin: 0 auto; padding: 20px; }
    .hook { background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px 20px; }
    .cta { background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); color: #FFFFFF; text-align: center; padding: 24px; border-radius: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header>
      <h1>标题</h1>
      <div>作者 · 日期</div>
    </header>
    <!-- Hook -->
    <div class="hook">
      <p>Hook 开场白</p>
    </div>
    <!-- Sections -->
    <section>
      <h2>章节标题</h2>
      <!-- 正文 -->
    </section>
    <!-- CTA -->
    <div class="cta">
      <div>行动号召</div>
    </div>
    <!-- Footer -->
    <footer>
      <p>视频号：作者</p>
    </footer>
  </div>
</body>
</html>
```

## 质量检查

发布前检查：
- [ ] 标题符合规范（8-32字）
- [ ] 摘要符合规范（≤44字）
- [ ] 正文排版正确
- [ ] 封面图清晰
- [ ] 外链转底部引用

## 常见问题

### Q: baoyu-post-to-wechat EXTEND.md 不存在
A: 创建配置文件：
```bash
cat > ~/.baoyu-skills/baoyu-post-to-wechat/EXTEND.md << 'EOF'
default_author: 你的名字
need_open_comment: 1
only_fans_can_comment: 0
chrome_profile_path: ~/Library/Application Support/Google/Chrome
EOF
```

### Q: Chrome 登录失败
A: 确保微信公众平台已登录，手动打开 https://mp.weixin.qq.com

### Q: 内容粘贴失败
A: 检查 HTML 文件格式，确保无外部资源依赖

## 相关文件

| 文件 | 说明 |
|------|------|
| `~/.baoyu-skills/baoyu-post-to-wechat/EXTEND.md` | 配置文件 |
| `~/.baoyu-skills/baoyu-post-to-wechat/scripts/wechat-article.ts` | 发布脚本 |
| `rules/WECHAT_COVER.md` | 封面图规范 |
| `rules/COPY.md` | 文案规范 |
| `rules/HTML.md` | 页面规范 |
