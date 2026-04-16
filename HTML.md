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

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{标题} - 公众号</title>
  <link href="https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
           background: #fafafa; color: #333; line-height: 1.8; }
    .article-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                       color: white; padding: 48px 24px; }
    .article-content { background: white; padding: 32px 20px;
                       box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .code-block { background: #1a1a2e; color: #10B981; padding: 16px 20px;
                  border-radius: 8px; font-family: monospace; }
  </style>
</head>
<body>
  <header class="article-header text-center">
    <h1 class="display-5 fw-bold mb-3">{公众号标题}</h1>
    <p class="lead opacity-75">{摘要}</p>
  </header>
  <main class="container py-4">
    <article style="max-width: 680px; margin: 0 auto;">
      <!-- 正文内容 -->
      <blockquote class="bg-light p-4 border-start border-4 border-dark rounded">
        <p class="mb-0"><strong>{hook开场白}</strong></p>
      </blockquote>
      <!-- 代码块 -->
      <div class="my-4">
        <p class="text-center text-muted">复制以下命令：</p>
        <div class="code-block text-center">npx skills add xxx</div>
      </div>
    </article>
  </main>
  <footer class="text-center py-4 border-top">
    <a href="{url}" class="text-secondary">原文链接</a>
  </footer>
  <script src="https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
</body>
</html>
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
