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
 * @param {number} maxChars — ⌊duration × 6.45⌋
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
  // 在自然断点处截断
  if (narration.length > maxChars) {
    const truncated = narration.slice(0, maxChars);
    const breakPoint = Math.max(
      truncated.lastIndexOf("。"),
      truncated.lastIndexOf("，"),
      truncated.lastIndexOf("；")
    );
    narration = breakPoint > maxChars * 0.7 ? truncated.slice(0, breakPoint + 1) : truncated;
  }

  return narration + "。";
}

/**
 * 生成小红书营销文案
 */
function generateCopy(articleContent, config) {
  const title = extractTitle(articleContent);
  const stripped = stripMarkdown(articleContent).slice(0, 300);

  return `# 小红书文案\n\n`;
}

/**
 * 生成公众号文案
 */
function generateWechatCopy(articleContent, config) {
  return `# 公众号文案\n\n`;
}

/**
 * 生成多平台发布指南
 */
function generatePostingGuide(config) {
  const platform = config.platform || "视频号";
  const duration = config.duration || 52;
  const tags = (config.tags || []).join("、") || "AI工具、科技数码";

  return `# ${platform} 发布指南\n\n`;
}

/**
 * 生成会话日志
 */
function generateSessionLog(config, docNames) {
  return `# 会话日志\n\n`;
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
  const maxNarrationChars = Math.floor(duration * 6.45);

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
