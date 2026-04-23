# HTML 页面模板

> 所属模块：video-creator / SKILL.md → 页面输出

## 国内 CDN 资源引用规范

⚠️ **必须使用国内 CDN 资源**，禁止使用 Google Fonts 等国外资源。

### CSS 库 CDN

| 库名 | 国内 CDN | 用途 |
|------|----------|------|
| Tailwind CSS | `https://cdn.tailwindcss.com` | Utility-first CSS |
| Bootstrap | `https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.3.0/css/bootstrap.min.css` | 响应式布局 |
| Font Awesome | `https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css` | 图标 |
| Animate.css | `https://cdn.bootcdn.net/ajax/libs/animate.css/4.1.1/animate.min.css` | CSS 动画 |

### 字体使用

⚠️ **字体使用原则**：
1. 优先使用系统字体栈（无需加载外部字体）
2. 如需中文字体，优先使用阿里云/字节跳动 CDN

```css
/* 推荐：系统字体栈（零加载、兼容性最好） */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC',
               'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
}
```

### JavaScript CDN

| 库名 | 国内 CDN |
|------|---------|
| Bootstrap | `https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.3.0/js/bootstrap.bundle.min.js` |
| jQuery | `https://cdn.bootcdn.net/ajax/libs/jquery/3.7.1/jquery.min.js` |

---

## 落地页模板 (`landing-page.html`)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{标题}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; }
    .gradient-text {
      background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  </style>
</head>
<body class="bg-gray-900 text-white min-h-screen">
  <section class="min-h-screen flex flex-col justify-center items-center text-center px-6">
    <h1 class="text-4xl md:text-6xl font-bold mb-6 gradient-text">
      {标题}
    </h1>
    <p class="text-xl text-gray-400 mb-8">{副标题}</p>
    <a href="#install" class="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl font-semibold">
      立即安装
    </a>
  </section>
  <section id="install" class="py-16 px-6 bg-gray-800">
    <code class="block bg-gray-900 text-green-400 px-6 py-4 rounded-lg font-mono">
      npx skills add jimliu/baoyu-skills
    </code>
  </section>
</body>
</html>
```

---

## 公众号适配页模板 (`wechat-page.html`)

> ⚠️ **企业级微信适配页规范**：
> - 禁止使用 Google Fonts（国内不可访问）
> - 使用系统字体栈（零加载、兼容性最好）
> - 微信外链转换为底部引用
> - 结构化 HTML + 内联 CSS
> - 适配 baoyu-post-to-wechat 发布工具

### 系统字体栈（必须使用）

```css
font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
```

### 微信友好 Meta 标签
```html
<meta property="og:title" content="标题">
<meta property="og:description" content="摘要">
<meta property="og:type" content="article">
<meta name="author" content="作者">
```

### 企业级模板结构
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="标题">
  <meta property="og:description" content="摘要">
  <meta property="og:type" content="article">
  <meta name="author" content="作者">
  <title>标题</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 
                   'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
      font-size: 17px;
      line-height: 1.8;
      color: #333333;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
    }
    .container { max-width: 677px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 30px 0 20px; border-bottom: 1px solid #E5E5E5; }
    .hook { background: #EFF6FF; border-left: 4px solid #3B82F6; 
            padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .section { margin: 24px 0; }
    .section-title { font-size: 20px; font-weight: 700; color: #1a1a1a; 
                    margin: 0 0 12px; padding-bottom: 8px; 
                    border-bottom: 2px solid #3B82F6; display: inline-block; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #3B82F6; color: #FFFFFF; padding: 12px 16px; text-align: left; }
    td { padding: 12px 16px; border-bottom: 1px solid #E5E5E5; }
    code { background: #EEF2FF; padding: 2px 6px; border-radius: 4px; 
           font-family: 'SF Mono', Monaco, monospace; font-size: 14px; color: #3B82F6; }
    .cta { background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); 
            color: #FFFFFF; text-align: center; padding: 24px 20px; 
            border-radius: 12px; margin: 30px 0; }
    .footer { text-align: center; padding: 24px 0; border-top: 1px solid #E5E5E5; 
              color: #999999; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>标题</h1>
    </header>
    <div class="hook">
      <p>Hook 开场白</p>
    </div>
    <section class="section">
      <h2 class="section-title">章节标题</h2>
      <!-- 正文内容 -->
    </section>
    <div class="cta">
      <div>CTA 行动号召</div>
    </div>
    <footer class="footer">
      <p>视频号：作者</p>
    </footer>
  </div>
</body>
</html>
```

### 色彩系统推荐
| 用途 | 色值 | CSS |
|------|------|-----|
| 主色 | #3B82F6 | blue-600 |
| 强调 | #10B981 | green-500 |
| 背景 | #FFFFFF | white |
| 文字 | #333333 | gray-700 |
| 边框 | #E5E5E5 | gray-200 |
```

---

## 文章阅读页模板 (`article-page.html`)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{标题}</title>
  <link href="https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background: #0F172A; color: #F8FAFC;
           font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif; }
    .article-card { background: #1E293B; border-radius: 16px; padding: 32px; margin: 24px 0; }
    .highlight-box { background: linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(124,58,237,0.2) 100%);
                     border: 1px solid #2563EB; border-radius: 16px; padding: 24px; }
  </style>
</head>
<body class="min-vh-100">
  <main class="container py-5" style="max-width: 800px;">
    <article class="article-card">
      <h1 class="display-5 fw-bold mb-4">{文章标题}</h1>
      <div class="highlight-box text-center mb-4">
        <span class="display-4 fw-bold text-success">{核心数字}</span>
        <p class="mb-0 text-muted">{核心描述}</p>
      </div>
      <div class="content">{正文内容}</div>
    </article>
  </main>
</body>
</html>
```
