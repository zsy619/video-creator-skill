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
// 关键词提取 & 主题推断
// ─────────────────────────────────────────────────────────────────────────────

/** 停用词列表（常见无意义词） */
const STOP_WORDS = new Set([
  '的', '了', '是', '在', '和', '与', '或', '以及', '等', '之', '于', '被',
  '了', '着', '过', '把', '给', '让', '对', '为', '以', '从', '到', '由',
  '这', '那', '这个', '那个', '它', '他', '她', '我', '你', '我们', '你们',
  '他们', '她们', '自己', '自己', '本身', '其实', '当然', '然后', '但是',
  '因为', '所以', '如果', '虽然', '只是', '不过', '而且', '并且', '或者',
  '可以', '能够', '应该', '必须', '需要', '进行', '使用', '通过', '进行',
  '一个', '一些', '什么', '怎样', '怎么', '如何', '为什么', '有没有',
  '有没有', '是否', '不是', '不会', '可能', '已经', '正在', '现在',
  '今天', '昨天', '明天', '这里', '那里', '这么', '那么', '非常', '特别',
  '更', '最', '很', '都', '还', '也', '又', '再', '就', '才', '要', '会',
  '能', '可', '将', '曾', '刚', '即将', '一直', '一下', '一点',
]);

/**
 * 从文章内容提取核心关键词（Top N）
 * 策略：统计正文高频词（TF），优先取标题词，去重过滤
 * @param {string} content — article.md 原始内容
 * @param {number} count — 返回数量（默认5）
 * @returns {string[]} 关键词数组
 */
function extractKeywords(content, count = 5) {
  // 预处理：去掉 frontmatter / 代码块 / 链接
  const plain = content
    .replace(/^---[\s\S]*?---\n/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~>#|]/g, '')
    .replace(/\n{3,}/g, '\n');

  // 提取标题词（H1-H3，增强权重）
  const headingWords = [];
  const headingRegex = /^#{1,3}\s+(.+)/gm;
  let m;
  while ((m = headingRegex.exec(plain)) !== null) {
    const words = m[1].match(/[\u4e00-\u9fa5]{2,}/g) || [];
    headingWords.push(...words);
  }

  // 分词（简单按 2-4 字词切分）
  const wordCount = {};
  const tokenRegex = /[\u4e00-\u9fa5]{2,4}/g;
  let tokenMatch;
  while ((tokenMatch = tokenRegex.exec(plain)) !== null) {
    const word = tokenMatch[0];
    if (STOP_WORDS.has(word)) continue;
    // 标题词权重 ×2
    const weight = headingWords.includes(word) ? 2 : 1;
    wordCount[word] = (wordCount[word] || 0) + weight;
  }

  // 排序取 Top N
  const sorted = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count * 3)  // 取多一些再过滤相似
    .map(([w]) => w);

  // 简单去重：过滤包含已选词子串的词（保留更长的）
  const result = [];
  for (const w of sorted) {
    if (result.some(r => r.includes(w) || w.includes(r))) continue;
    result.push(w);
    if (result.length >= count) break;
  }

  return result.length > 0 ? result : ['视频工具'];
}

/**
 * 根据关键词推断主题配色方案
 * @param {string[]} keywords
 * @returns {string} theme key
 */
function inferTheme(keywords) {
  const kw = keywords.join('');
  const map = [
    { keys: ['美食', '烹饪', '食谱', '菜谱', '吃', '餐厅', '烘焙', '甜点', '火锅', '料理'], theme: 'food-warm' },
    { keys: ['旅游', '出行', '攻略', '旅行', '景点', '打卡', '拍照', '度假', '酒店', '机票'], theme: 'travel-vibrant' },
    { keys: ['教育', '学习', '课程', '培训', '学校', '老师', '学生', '考试', '教学', '课堂'], theme: 'education-calm' },
    { keys: ['健康', '健身', '养生', '运动', '减肥', '身体', '医生', '医疗', '疾病', '饮食'], theme: 'health-fresh' },
    { keys: ['时尚', '穿搭', '美妆', '衣服', '服装', '护肤', '口红', '搭配', '潮流', '品牌'], theme: 'fashion-elegant' },
    { keys: ['金融', '投资', '理财', '股票', '基金', '银行', '保险', '财务', '赚钱', '经济'], theme: 'finance-professional' },
    { keys: ['游戏', '电竞', 'Steam', '游戏', '开黑', '段位', '装备', '攻略', '手游', '玩家'], theme: 'gaming-neon' },
    // 默认：科技/开源
    { keys: [], theme: 'cyberpunk' },
  ];

  for (const entry of map) {
    if (entry.keys.length === 0) return entry.theme;  // 默认兜底
    if (entry.keys.some(k => kw.includes(k))) return entry.theme;
  }
  return 'cyberpunk';
}

/**
 * 根据关键词生成封面属性标签（4个）
 * 标签完全来自关键词，不用通用填充词
 * @param {string[]} keywords
 * @returns {string[]}
 */
function generateAttrs(keywords) {
  if (!keywords || keywords.length === 0) return ['效率工具', '实用推荐', '收藏备用', '值得一试'];
  // 全部来自关键词，最多4个，不足时截断
  return keywords.slice(0, 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// 文档生成器
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 从原始文章生成视频分镜脚本
 * @param {string} articleContent — article.md 原始内容
 * @param {object} config — video-config.json
 * @param {string[]} keywords — 关键词数组
 * @returns {{ markdown: string, scenes: object[] }} 返回结构化数据 + markdown文本
 */
function generateVideoScript(articleContent, config, keywords) {
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

    // 各场景场景名（固定顺序）
    const sceneNames = ["开场", "痛点", "方案", "特性", "上手", "结尾"];
    const sceneSubtitles = [
      "一分钟了解核心内容",
      "目前面临的主要问题",
      "解决方案是这样工作的",
      "核心优势全面解析",
      "快速上手指南",
      "总结与行动号召",
    ];

    scenes.push({
      id: i + 1,
      name: `${sceneNames[Math.min(i, sceneNames.length - 1)]}（${sceneDuration}s）`,
      subtitle: sceneSubtitles[Math.min(i, sceneSubtitles.length - 1)],
      content: sceneText.trim().slice(0, 200),
      // 保存原始内容片段，供 generateSceneContent 提取关键词
      rawContent: sceneText.trim(),
    });
  }

  let script = `# 视频分镜脚本\n\n`;
  script += `> **平台**: ${platform}  |  **时长**: ${duration}s  |  **主题**: ${theme}\n\n`;
  script += `> ⚠️ 本文件由 AI 自动生成，实际配音以 narration.txt 为准\n\n`;

  scenes.forEach((s, i) => {
    script += `## 场景 ${i + 1}：${s.name}\n\n`;
    script += `**时长**: ${s.duration}s  |  **副标题**: ${s.subtitle}\n\n`;
    script += `${s.content}\n\n`;
  });

  script += `---\n\n`;
  script += `*本脚本由 generate_docs.js 自动生成 | 日期: ${new Date().toLocaleDateString("zh-CN")}*`;
  return { markdown: script, scenes };
}

/**
 * 从文章内容 + 关键词生成动态场景内容
 * 替换 Remotion 场景中的硬编码内容（Hysteria 代理专属）
 * @param {string} articleContent — article.md 原始内容
 * @param {string[]} keywords — 关键词数组
 * @returns {{ painPoints: string[], tags: string[], features: object[], steps: object[], url: string, license: string }}
 */
function generateSceneContent(articleContent, keywords) {
  const stripped = stripMarkdown(articleContent);
  const kw = keywords || [];
  const kwStr = kw.join('');

  // ── 1. 痛点场景（3条）：从文章痛点词+关键词推断 ────────────────────────
  // 提取含问题/困难/痛点语义的句子
  const painPatterns = [
    /([^。！？]{8,30}[问题|困难|麻烦|卡顿|慢|贵|难|复杂|繁琐|慢|失效|崩溃|报错|失败][^。！？]{0,20})/g,
    /(性能|速度|延迟|成本|费用|配置|使用|学习|安装|更新|同步|备份|安全|隐私)[^。！？]{0,30}/g,
  ];
  const painSentences = [];
  for (const pat of painPatterns) {
    let m;
    while ((m = pat.exec(stripped)) !== null && painSentences.length < 3) {
      const s = m[1] || m[0];
      if (s.length > 6 && !painSentences.includes(s)) {
        painSentences.push(s.trim().slice(0, 25));
      }
    }
  }
  const defaultPains = [
    "访问缓慢，等待时间长",
    "配置复杂，上手困难",
    "成本高昂，负担不起",
  ];
  // 用关键词合成默认痛点（基于关键词语义）
  const painPoints = painSentences.length >= 3
    ? painSentences.slice(0, 3)
    : kw.slice(0, 3).map((k, i) => defaultPains[i] || `${k}相关问题`);

  // ── 2. 方案场景标签（3条）：来自关键词 ────────────────────────────────
  const tags = kw.length >= 3
    ? kw.slice(0, 3)
    : ["高效便捷", "稳定可靠", "简单易用"];

  // ── 3. 功能场景（4项）：从文章内容提取或关键词推断 ─────────────────────
  // 提取含功能/特性描述的句子
  const featPatterns = [
    /(支持|提供|具备|拥有|采用|使用|基于)[^。！？]{5,30}/g,
    /([^。！？]{5,20}(功能|特性|优势|特点)[^。！？]{0,15})/g,
  ];
  const featSentences = [];
  for (const pat of featPatterns) {
    let m;
    while ((m = pat.exec(stripped)) !== null && featSentences.length < 8) {
      const s = m[1] || m[0];
      if (s.length > 5) featSentences.push(s.trim().slice(0, 30));
    }
  }
  const featIcons = ["🚀", "🛡️", "⚡", "🌐"];
  const featNames = kw.length >= 4
    ? kw.slice(0, 4)
    : ["功能强大", "安全可靠", "简单易用", "高效快速"];
  const features = featSentences.length >= 4
    ? featSentences.slice(0, 4).map((desc, i) => ({
        icon: featIcons[i] || "✨",
        name: featNames[i] || `特性${i + 1}`,
        desc: desc.slice(0, 20),
      }))
    : featNames.map((name, i) => ({
        icon: featIcons[i] || "✨",
        name,
        desc: `基于${kw[0] || '本项目'}的核心优势`,
      }));

  // ── 4. 上手指南步骤：从文章提取安装/使用相关命令 ───────────────────────
  // 提取命令行、URL、配置相关句子
  const cmdPatterns = [
    /(`[^`]+`)/g,                          // `命令` 格式
    /(npm |pip |brew |yarn |cargo )[^\n]{0,40}/g,  // 包管理命令
    /(git clone|curl|wget)[^\n]{0,40}/g,   // 常用命令
    /(https?:\/\/[^\s。！？]{10,50})/g,     // URL
  ];
  const cmds = [];
  for (const pat of cmdPatterns) {
    let m;
    while ((m = pat.exec(stripped)) !== null) {
      const s = m[1] || m[0];
      if (s.length > 3) cmds.push(s.trim().slice(0, 50));
    }
  }
  // 去重并保留前3个
  const uniqueCmds = [];
  for (const c of cmds) {
    if (!uniqueCmds.includes(c) && uniqueCmds.length < 3) uniqueCmds.push(c);
  }
  const defaultSteps = [
    { cmd: `git clone ${kw[0] || '项目地址'}`, desc: "克隆项目" },
    { cmd: "cd 项目目录 && 安装依赖", desc: "安装依赖" },
    { cmd: "运行启动命令", desc: "启动使用" },
  ];
  const steps = uniqueCmds.length >= 2
    ? uniqueCmds.map((cmd, i) => ({ cmd, desc: `步骤${i + 1}` }))
    : defaultSteps;

  // ── 5. URL：从文章提取第一个 https URL ────────────────────────────────
  const urlMatch = stripped.match(/(https?:\/\/[^\s。！？)）]{10,60})/);
  const url = urlMatch ? urlMatch[1].replace(/[。！？)）]$/, '') : `https://github.com/${kw[0] || 'project'}`;

  // ── 6. 许可证：检测开源许可证关键词 ───────────────────────────────────
  const licenseMatch = stripped.match(/(MIT|Apache|GPL|BSD|Mozilla|CC0)[- ]?[Ll]icense/i);
  const license = licenseMatch ? licenseMatch[0] : "Open Source";

  return {
    painPoints,
    tags,
    features,
    steps,
    url,
    license,
  };
}

/**
 * 从 video-script.md 提取配音文本
 * @param {string} scriptContent
 * @param {number} maxChineseChars — ⌊duration × 3.37⌋（实测安全上限，中文字符数）
 * @returns {string} narration.txt
 */
function extractNarration(scriptContent, maxChineseChars) {
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
    // 跳过 markdown 语法噪声行
    const strippedLine = line.replace(/^\*\*时长\*\*\s*\d+s\n?/, "").replace(/[*_~`#|>]/g, "").replace(/\|+/g, "").replace(/^-+$/, "").trim();
    if (capture && strippedLine) {
      narrationLines.push(strippedLine);
    }
  }

  let narration = narrationLines.join("。");

  // 统计中文字符数（与验证逻辑完全一致）
  const countChinese = (text) => (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  let chineseChars = countChinese(narration);

  // ⚠️ 截断逻辑：按中文字符数截断，在自然断点处截断
  if (chineseChars > maxChineseChars) {
    let acc = 0, breakIdx = narration.length;
    for (let i = 0; i < narration.length; i++) {
      if (/[\u4e00-\u9fa5]/.test(narration[i])) acc++;
      if (acc > maxChineseChars && /[。！？]/.test(narration[i])) {
        breakIdx = i + 1;
        break;
      }
    }
    narration = narration.slice(0, breakIdx) || narration.slice(0, Math.floor(maxChineseChars * 1.5));
    chineseChars = countChinese(narration);
  }

  // 最终安全检查：若截断后仍超限，取上限一半强制截断（不抛错，避免阻断流程）
  if (chineseChars > maxChineseChars) {
    let acc = 0, breakIdx = narration.length;
    for (let i = 0; i < narration.length; i++) {
      if (/[\u4e00-\u9fa5]/.test(narration[i])) {
        acc++;
        if (acc >= Math.floor(maxChineseChars * 0.95)) {
          breakIdx = i + 1;
          break;
        }
      }
    }
    narration = narration.slice(0, breakIdx);
  }

  return narration + "。";
}

/**
 * 生成小红书营销文案
 */
function generateCopy(articleContent, config, keywords) {
  const title = extractTitle(articleContent);
  const stripped = stripMarkdown(articleContent);
  const kw = keywords || [];

  // 从关键词生成 hashtag（最多6个）
  const topicHashtags = kw.slice(0, 4).map(k => `#${k}`).join(' ');
  const genericHashtags = '#效率神器 #种草推荐 #好物分享';
  const hashtags = [topicHashtags, genericHashtags].filter(Boolean).join(' ');

  // 从关键词生成摘要语
  const teaser = stripped.slice(0, 120).trim();
  const keywordHighlight = kw.length > 0 ? `本期聚焦：${kw.slice(0, 2).join('、')}。` : '';

  return `# 小红书文案

## 标题候选

### 方案A
我宣布！这可能是最优雅的开源代理方案 🚀

### 方案B
告别卡顿！这个开源工具让网络加速变得如此简单 ⚡

### 方案C
GitHub热榜！这个项目让网络延迟直接消失 🔥

## 正文

${keywordHighlight}${teaser}...

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
 * @param {object} config — video-config.json
 * @param {string[]} docNames — 生成的文件列表
 * @param {object} extra — { keywords, inferredTheme, attrs, sceneContent }
 */
function generateReport(config, docNames, extra = {}) {
  return JSON.stringify({
    project: config.name || "video-project",
    generated: new Date().toISOString(),
    docs: docNames,
    status: "generated",
    keywords: extra.keywords || [],
    inferredTheme: extra.inferredTheme || "cyberpunk",
    attrs: extra.attrs || [],
    sceneContent: extra.sceneContent || null,
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

  // 0.5 关键词提取（用于 attrs 生成、hashtag、主题推断）
  const keywords = extractKeywords(articleContent, 5);
  const inferredTheme = inferTheme(keywords);
  const attrs = generateAttrs(keywords);
  const sceneContent = generateSceneContent(articleContent, keywords);

  // 打印关键词供调试
  console.log(`   关键词: ${keywords.join(', ')}`);
  console.log(`   推断主题: ${inferredTheme}`);
  console.log(`   属性标签: ${attrs.join(', ')}`);
  console.log(`   痛点: ${sceneContent.painPoints.join(', ')}`);
  console.log(`   功能: ${sceneContent.features.map(f => f.name).join(', ')}`);
  console.log(`   步骤: ${sceneContent.steps.map(s => s.cmd).join(', ')}`);

  // 回写 video-config.json（注入 keywords / inferredTheme / cover.attrs）
  const updatedConfig = {
    ...config,
    keywords,
    inferredTheme,
    cover: {
      ...(config.cover || {}),
      attrs,
    },
  };
  fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), "utf8");
  console.log(`   video-config.json 已更新（keywords / inferredTheme / cover.attrs）`);

  // 2. video-script.md（generateVideoScript 返回 { markdown, scenes }）
  const { markdown: scriptContent, scenes } = generateVideoScript(articleContent, config, keywords);
  fs.writeFileSync(path.join(docsDir, "video-script.md"), scriptContent, "utf8");

  // 3. narration.txt（从 video-script.md 提取）
  const narration = extractNarration(scriptContent, maxNarrationChars);
  fs.writeFileSync(path.join(docsDir, "narration.txt"), narration, "utf8");

  // 4. copy.md（传入 keywords 生成 hashtag）
  fs.writeFileSync(path.join(docsDir, "copy.md"), generateCopy(articleContent, config, keywords), "utf8");

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

  // 11. report.json（含 sceneContent，供 create-remotion-project.js 读取）
  const docNames = [
    "article.md", "video-script.md", "narration.txt",
    "copy.md", "wechat-copy.md", "posting-guide.md",
    "session-log.md", "landing-page.html", "article-page.html",
    "wechat-page.html", "report.json"
  ];
  fs.writeFileSync(path.join(docsDir, "report.json"), generateReport(config, docNames, {
    keywords,
    inferredTheme,
    attrs,
    sceneContent,
  }), "utf8");

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
// 11 文件完整性校验
// ─────────────────────────────────────────────────────────────────────────────
const REQUIRED_FILES = [
  'article.md', 'video-script.md', 'narration.txt', 'copy.md',
  'wechat-copy.md', 'posting-guide.md', 'session-log.md', 'report.json',
  'landing-page.html', 'article-page.html', 'wechat-page.html'
];

function validateDocs(projectDir) {
  const docsDir = path.join(projectDir, 'docs');
  const missing = REQUIRED_FILES.filter(f => !fs.existsSync(path.join(docsDir, f)));
  if (missing.length > 0) {
    console.error('❌ 缺少文件: ' + missing.join(', '));
    process.exit(1);
  }
  console.log('✅ 11个文件全部生成: ' + REQUIRED_FILES.join(', '));
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const projectDir = process.argv[2] || process.cwd();
  console.log(`📄 文档生成: ${projectDir}`);
  generateDocs(projectDir);
  validateDocs(projectDir);
}

module.exports = {
  generateDocs,
  stripMarkdown,
  extractNarration,
  generateVideoScript,
  extractKeywords,
  inferTheme,
  generateAttrs,
  generateSceneContent,
};
