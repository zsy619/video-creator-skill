#!/usr/bin/env node
/**
 * generate_docs.js
 * 生成视频项目所需的全部文档（11个文件）
 *
 * 输入:
 *   docs/article.md   — 原始文章/内容（必填，由 baoyu-url-to-markdown 或用户手动生成）
 *   video-config.json — 项目配置（必填，包含 platform/duration/fps/theme/voice 等）
 *
 * 输出（写入 ${PROJECT_DIR}/docs/）:
 *   article.md          — 原始内容（拷贝）
 *   video-script.md     — 分镜脚本（6-8场景，含时长分配）
 *   narration.txt      — 配音文本（从 video-script.md 提取，⌊duration × 6.45⌋ 字上限）
 *   copy.md            — 小红书营销文案（3条）
 *   wechat-copy.md     — 公众号文案
 *   posting-guide.md   — 多平台发布指南
 *   session-log.md     — 本次会话日志
 *   report.json        — 执行报告
 *   landing-page.html  — 落地页
 *   article-page.html — 文章阅读页
 *   wechat-page.html  — 公众号图文页
 *
 * 依赖: 无外部依赖，纯 Node.js
 */

const fs = require("fs");
const path = require("path");

// ─────────────────────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** 从 Markdown 提取纯文本（去掉 frontmatter、代码块、链接等） */
function stripMarkdown(content) {
  return content
    .replace(/^---[\s\S]*?---\n/, "")          // 去掉 frontmatter
    .replace(/```[\s\S]*?```/g, "")               // 去掉代码块
    .replace(/`[^`]*`/g, "")                      // 去掉行内代码
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")     // [文字](url) → 文字
    .replace(/[*_~>#|]/g, "")                    // 去掉 Markdown 标记
    .replace(/\n{3,}/g, "\n\n")                  // 压缩多余空行
    .trim();
}

/** 估算阅读/朗读时长（中文约 400字/分钟） */
function estimateDuration(text) {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  return Math.ceil(chineseChars / 400 * 60); // 秒
}

// ─────────────────────────────────────────────────────────────────────────────
// 文档生成器
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 从原始文章生成视频分镜脚本
 * @param {string} articleContent — article.md 原始内容
 * @param {object} config — video-config.json
 * @returns {string} video-script.md
 */
function generateVideoScript(articleContent, config) {
  const platform = config.platform || "微信视频号";
  const duration = config.duration || 52;
  const theme = config.theme || "cyberpunk";
  const stripped = stripMarkdown(articleContent);

  // 简单分割为 6-8 个场景
  const paragraphs = stripped.split(/\n\n+/).filter(p => p.trim().length > 20);
  const sceneCount = Math.min(Math.max(paragraphs.length, 6), 8);
  const charsPerScene = Math.floor(stripped.length / sceneCount);

  const scenes = [];
  let remaining = stripped;
  for (let i = 0; i < sceneCount; i++) {
    const isLast = i === sceneCount - 1;
    let sceneText;
    if (isLast) {
      sceneText = remaining;
    } else {
      // 在自然断点（句号、换行）处分割
      const chunk = remaining.slice(0, charsPerScene);
      const breakPoint = Math.max(
        chunk.lastIndexOf("。"),
        chunk.lastIndexOf("！"),
        chunk.lastIndexOf("？"),
        chunk.lastIndexOf("\n")
      );
      sceneText = breakPoint > 100 ? chunk.slice(0, breakPoint + 1) : chunk;
    }
    remaining = remaining.slice(sceneText.length);

    const sceneDuration = isLast
      ? Math.max(4, Math.ceil(duration - scenes.reduce((s, sc) => s + sc.duration, 0)))
      : Math.ceil(duration * 0.15);

    const sceneNames = ["开场", "痛点", "方案", "特性", "上手", "结尾"];
    const name = sceneNames[Math.min(i, sceneNames.length - 1)];
    scenes.push({
      id: i + 1,
      name: `${name}（${sceneDuration}s）`,
      content: sceneText.trim().slice(0, 200),
    });
  }

  let script = `# 视频分镜脚本\n\n`;
  script += `> **平台**: ${platform}  |  **时长**: ${duration}s  |  **主题**: ${theme}\n\n`;
  script += `> ⚠️ 本文件由 AI 自动生成，实际配音以 narration.txt 为准\n\n`;

  scenes.forEach((s, i) => {
    script += `## 场景 ${i + 1}：${s.name}\n\n`;
    script += `**时长**: ${s.duration}s\n\n`;
    script += `${s.content}\n\n`;
  });

  script += `---\n\n`;
  script += `*本脚本由 generate_docs.js 自动生成 | 日期: ${new Date().toLocaleDateString("zh-CN")}*\n`;
  return script;
}

/**
 * 从 video-script.md 提取配音文本
 * @param {string} scriptContent
 * @param {number} maxChars — ⌊duration × 3.37⌋（实测安全上限）
 * @returns {string} narration.txt
 */
function extractNarration(scriptContent, maxChars) {
  // 从脚本中提取场景内容（去掉标题、时长标注等）
  const lines = scriptContent.split("\n");
  const narrationLines = [];
  let capture = false;

  for (const line of lines) {
    if (line.startsWith("## 场景")) {
      capture = true;
      continue;
    }
    if (capture && line.startsWith("#")) break;
    if (capture && line.match(/^\*\*时长\*\*/)) continue;
    if (capture && line.trim()) {
      narrationLines.push(line.trim());
    }
  }

  let narration = narrationLines.join("。");
  // 截断逻辑：统计中文字符数（与验证逻辑一致），在自然断点处截断
  const chineseChars = (narration.match(/[\u4e00-\u9fa5]/g) || []).length;
  if (chineseChars > maxChars) {
    let acc = 0, breakIdx = narration.length;
    for (let i = 0; i < narration.length; i++) {
      if (/[\u4e00-\u9fa5]/.test(narration[i])) acc++;
      if (acc > maxChars && /[。！？]/.test(narration[i])) {
        breakIdx = i + 1; break;
      }
    }
    narration = narration.slice(0, breakIdx) || narration.slice(0, Math.floor(maxChars * 1.5));
  }

  return narration + "。";
}

/**
 * 生成小红书营销文案
 */
function generateCopy(articleContent, config) {
  const title = extractTitle(articleContent);
  const stripped = stripMarkdown(articleContent);
  const theme = config.theme || "cyberpunk";

  const hashtags = [
    "#科技工具", "#开源项目", "#网络加速", "#GitHub",
    "#数码科技", "#效率神器", "#种草推荐", "#好物分享",
  ].slice(0, 6).join(" ");

  const teaser = stripped.slice(0, 150).trim();

  return `# 小红书文案

## 标题候选

### 方案A
我宣布！这可能是最优雅的开源代理方案 🚀

### 方案B
告别卡顿！这个开源工具让网络加速变得如此简单 ⚡

### 方案C
GitHub热榜！这个项目让网络延迟直接消失 🔥

## 正文

${teaser}...

👉 点击下方视频了解详情
👉 关注我，获取更多科技工具推荐

## 标签
${hashtags}

## 发布建议
- 发布时间：晚上8-10点（流量高峰）
- 封面文字要大，30字以内
- 前3秒要有吸引力（痛点或结果）
`;
}

/**
 * 生成公众号文案
 */
function generateWechatCopy(articleContent, config) {
  const title = extractTitle(articleContent);
  const stripped = stripMarkdown(articleContent);
  const platform = config.platform || "微信公众号";

  return `# ${platform}图文文案

## 标题
${title}

## 摘要（必填，200字以内）
本文介绍一款革命性的开源网络代理工具，帮助你告别卡顿，享受流畅的网络体验。

## 正文

${stripped.slice(0, 500)}

阅读原文，了解完整内容和使用教程。

## 封面图建议
尺寸：900×383px（横向）
风格：深色科技风，标题醒目

## 标签（最多选3个）
#开源项目 #网络工具 #效率提升 #科技数码 #工具推荐
`;
}

/**
 * 生成多平台发布指南
 */
function generatePostingGuide(config) {
  const platform = config.platform || "视频号";
  const duration = config.duration || 52;
  const theme = config.theme || "科技";
  const tags = (config.tags || ["AI工具", "科技数码"]).join("、");

  return `# ${platform} 多平台发布指南

## 平台配置

| 平台 | 封面尺寸 | 视频尺寸 | 建议时长 | 标签 |
|------|----------|----------|----------|------|
| 微信视频号 | 1080×1920 | 1080×1920 | ${duration}秒 | ${tags} |
| 抖音 | 1080×1920 | 1080×1920 | ≤60秒 | #科技 #工具 |
| 小红书 | 1440×2560 | 1080×1920 | ${duration}秒 | ${tags} |
| YouTube | 1280×720 | 1920×1080 | ≥60秒 | ${tags} |

## 发布步骤

### 微信视频号
1. 打开微信视频号 App
2. 点击右上角「+」发布视频
3. 填写标题（30字以内）和描述
4. 添加话题标签：${tags}
5. 选择「完整视频」发布

### 抖音
1. 打开抖音 App，点击「+」
2. 上传视频文件（不要直接拍摄）
3. 文案模板：「${theme}工具推荐｜第${duration}秒有惊喜」
4. 添加话题：#科技 #工具推荐 #效率神器
5. @抖音小助手 获取流量扶持

### 小红书
1. 打开小红书 App
2. 点击「+」→「相册」选择视频
3. 封面选视频内帧（不要选白屏/黑帧）
4. 标题模板：「救命！这个${theme}工具也太好用了」
5. 正文：开头要有获得感，中段介绍功能，结尾引导互动

## 标题模板

| 平台 | 模板 | 示例 |
|------|------|------|
| 视频号 | 【工具名】使用教程｜一看就会 | 【Hysteria】使用教程｜一看就会 |
| 抖音 | 这个工具绝了！秒变${theme}达人 | 这个工具绝了！秒变科技达人 |
| 小红书 | ${theme}工具分享｜打工人必备 | 科技工具分享｜打工人必备 |

## 评论区引导
- 置顶：「有问题评论区问我」
- 二条：「你们最想要什么工具的教程？」
`;
}

/**
 * 生成会话日志
 */
function generateSessionLog(config, docNames) {
  const now = new Date();
  const date = now.toLocaleDateString("zh-CN");
  const time = now.toLocaleTimeString("zh-CN");
  const project = config.name || "video-project";
  const duration = config.duration || 52;
  const theme = config.theme || "cyberpunk";
  const platform = config.platform || "微信视频号";

  return `# 会话日志

> **项目**: ${project}
> **平台**: ${platform}
> **目标时长**: ${duration}秒
> **主题风格**: ${theme}
> **日期**: ${date} ${time}

## 会话阶段记录

### 初始化
- [ ] 确认项目需求
- [ ] 创建 video-config.json
- [ ] 确认平台和主题风格

### 内容获取
- [ ] 原始文章已保存至 docs/article.md
- [ ] 文章内容已分析

### 文档生成
- [ ] 分镜脚本已生成
- [ ] 配音文本已生成（字数上限：⌊${duration} × 3.37⌋ = ${Math.floor(duration * 3.37)}字）
- [ ] 营销文案已生成
- [ ] 发布指南已生成

### 音频生成
- [ ] edge-tts 配音（zh-CN-YunjianNeural，rate=+0%）
- [ ] atempo 1.2x 加速
- [ ] ffprobe 时长验证

### 字幕生成
- [ ] ASS字幕已生成（Fontsize=72）
- [ ] 逐字高亮特效已配置

### 视频渲染
- [ ] Remotion 项目已生成
- [ ] 项目修复检查已执行
- [ ] npm install 已完成
- [ ] pre-render-check.js 检查通过
- [ ] Remotion 渲染完成（60fps）
- [ ] ffmpeg 混流完成

### 最终输出
- [ ] 视频文件：video-project/out/final.mp4
- [ ] 封面图：docs/assets/cover.png
- [ ] 文档齐全

---
*本日志由 generate_docs.js 自动生成*
`;
}

/**
 * 生成执行报告
 */
function generateReport(config, docNames) {
  return JSON.stringify({
    project: config.name || "video-project",
    generated: new Date().toISOString(),
    docs: docNames,
    status: "generated"
  }, null, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────────────────────────────────────
function generateDocs(projectDir) {
  const docsDir = path.join(projectDir, "docs");
  const configPath = path.join(projectDir, "video-config.json");
  const articlePath = path.join(docsDir, "article.md");

  ensureDir(docsDir);
  ensureDir(path.join(docsDir, "assets", "imgs"));
  ensureDir(path.join(docsDir, "assets", "illustrations"));

  // 读取配置
  if (!fs.existsSync(configPath)) {
    console.error(`✗ 缺少配置文件: ${configPath}`);
    console.error("  请先创建 video-config.json（包含 platform/duration/fps/theme 等字段）");
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const duration = config.duration || 52;
  const maxNarrationChars = Math.floor(duration * 3.37);

  // 读取原始文章
  let articleContent = "";
  if (fs.existsSync(articlePath)) {
    articleContent = fs.readFileSync(articlePath, "utf8");
  } else {
    console.warn(`⚠️  未找到 article.md，将生成最小化文档`);
    articleContent = `# ${config.name || "视频项目"}\n\n请在此处粘贴原始文章内容。`;
  }

  // 1. article.md（确认存在）
  if (!fs.existsSync(articlePath)) {
    fs.writeFileSync(articlePath, articleContent);
  }

  // 2. video-script.md
  const scriptContent = generateVideoScript(articleContent, config);
  fs.writeFileSync(path.join(docsDir, "video-script.md"), scriptContent, "utf8");

  // 3. narration.txt
  const narration = extractNarration(scriptContent, maxNarrationChars);
  fs.writeFileSync(path.join(docsDir, "narration.txt"), narration, "utf8");

  // 4. copy.md
  fs.writeFileSync(path.join(docsDir, "copy.md"), generateCopy(articleContent, config), "utf8");

  // 5. wechat-copy.md
  fs.writeFileSync(path.join(docsDir, "wechat-copy.md"), generateWechatCopy(articleContent, config), "utf8");

  // 6. posting-guide.md
  fs.writeFileSync(path.join(docsDir, "posting-guide.md"), generatePostingGuide(config), "utf8");

  // 7. session-log.md
  fs.writeFileSync(path.join(docsDir, "session-log.md"), generateSessionLog(config, []), "utf8");

  // 8. landing-page.html
  fs.writeFileSync(path.join(docsDir, "landing-page.html"), generateLandingPage(articleContent, config), "utf8");

  // 9. article-page.html
  fs.writeFileSync(path.join(docsDir, "article-page.html"), generateArticlePage(articleContent, config), "utf8");

  // 10. wechat-page.html
  fs.writeFileSync(path.join(docsDir, "wechat-page.html"), generateWechatPage(articleContent, config), "utf8");

  // 11. report.json
  const docNames = [
    "article.md", "video-script.md", "narration.txt",
    "copy.md", "wechat-copy.md", "posting-guide.md",
    "session-log.md", "landing-page.html", "article-page.html",
    "wechat-page.html", "report.json"
  ];
  fs.writeFileSync(path.join(docsDir, "report.json"), generateReport(config, docNames), "utf8");

  console.log("✅ 文档生成完成:");
  docNames.forEach(name => {
    const filePath = path.join(docsDir, name);
    const size = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
    console.log(`   ${name.padEnd(22)} ${size > 0 ? "✓" : "○"}`);
  });
  console.log(`\n配音文本: narration.txt（${narration.length}字，上限 ${maxNarrationChars}字）`);
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML 生成器（简化版，需要时可扩展）
// ─────────────────────────────────────────────────────────────────────────────
function extractTitle(content) {
  const m = content.match(/^#\s+(.+)/m);
  return m ? m[1].trim() : "视频标题";
}

function generateLandingPage(articleContent, config) {
  const title = extractTitle(articleContent);
  const stripped = stripMarkdown(articleContent);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:720px;margin:0 auto;padding:20px;background:#0D0221;color:#E0E0E0}
h1{color:#00FFFF;text-align:center;margin-bottom:2rem}
video{max-width:100%;border-radius:12px;box-shadow:0 0 30px rgba(0,255,255,0.3)}
.content{line-height:1.8;margin-top:2rem}
</style>
</head>
<body>
<h1>${title}</h1>
<div style="text-align:center">
  <video controls src="../video-project/out/final.mp4"></video>
</div>
<div class="content"><p>${stripped.slice(0, 300)}...</p></div>
</body>
</html>`;
}

function generateArticlePage(articleContent, config) {
  const title = extractTitle(articleContent);
  const stripped = stripMarkdown(articleContent);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:680px;margin:0 auto;padding:20px;line-height:1.8}
</style>
</head>
<body>
<h1>${title}</h1>
<div>${stripped}</div>
</body>
</html>`;
}

function generateWechatPage(articleContent, config) {
  return generateArticlePage(articleContent, config)
    .replace("<html lang=\"zh-CN\">", "<html lang=\"zh-CN\">\n<!-- 微信公众号适配版 -->");
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const projectDir = process.argv[2] || process.cwd();
  console.log(`📄 文档生成: ${projectDir}`);
  generateDocs(projectDir);
}

module.exports = { generateDocs, stripMarkdown, extractNarration, generateVideoScript };
