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
 *   narration.txt      — 配音文本（从 article.md 提取，⌊duration × 3.37⌋ 字上限，rate=+0% 速率）
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

/** T-6: 增强 stripMarkdown — 保持中文句子完整性，处理更多 Markdown 语法
 * 修复：列表合并（含数字列表）、图片链接、水平线、连续空白 */
function stripMarkdown(content) {
  // 第一步：处理连续列表项（将 -/*/数字 开头的多行列表合并为一行）
  const lines = content.split('\n');
  const mergedLines = [];
  for (const line of lines) {
    // 匹配所有列表前缀：- /* 1. 2. ① 等各种列表标记
    if (line.match(/^(\s*)([-*+]|\d+\.|[一二三四五六七八九十]+[.、])\s/)) {
      if (mergedLines.length > 0) {
        mergedLines[mergedLines.length - 1] += ' ' + line.replace(/^\s*[-*+]|\d+[.、]\s/, '').trim();
        continue;
      }
    }
    mergedLines.push(line);
  }
  const merged = mergedLines.join('\n');

  return merged
    .replace(/^---[\s\S]*?---\n/, "\n")    // 去掉 frontmatter
    .replace(/```[\s\S]*?```/g, "\n")       // 代码块（保留换行防止粘连）
    .replace(/`[^`]*`/g, "")                // 行内代码
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")   // ![alt](url) 图片链接
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [文字](url) → 文字
    .replace(/^#{1,6}\s+/gm, "")            // 标题标记
    .replace(/^[-*_]{3,}$/gm, "\n")         // --- 水平线
    .replace(/[*_~`#>|]/g, "")             // 去掉 Markdown 标记
    .replace(/\n{3,}/g, "\n\n")             // 压缩多余空行
    .replace(/ {2,}/g, " ")                 // 连续空格压缩
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
  '他们', '她们', '自己', '本身', '其实', '当然', '然后', '但是',
  '因为', '所以', '如果', '虽然', '只是', '不过', '而且', '并且', '或者',
  '可以', '能够', '应该', '必须', '需要', '进行', '使用', '通过',
  '一个', '一些', '什么', '怎样', '怎么', '如何', '为什么', '有没有',
  '是否', '不是', '不会', '可能', '已经', '正在', '现在',
  '今天', '昨天', '明天', '这里', '那里', '这么', '那么', '非常', '特别',
  '更', '最', '很', '都', '还', '也', '又', '再', '就', '才', '要', '会',
  '能', '可', '将', '曾', '刚', '即将', '一直', '一下', '一点',
]);

/** 停用词扩展（多字短语级别，用于关键词去重） */
const STOP_WORD_MULTI = new Set([
  '真实', '记录', '人员', '一款', '这是', '什么', '如何', '没有',
  '一个', '一些', '这个', '那个', '它的', '他的', '她的', '我的', '你的', '我们', '你们', '他们',
  '专为', '这是一', '这是一款', '安全研究', '工程师',
  '这是一款专', '是一款专', '为安全研',
  '这是一款专为安全', '专为安全研究',
]);

/**
 * 从文章内容提取核心关键词（Top N）
 * 策略：统计正文高频词（TF），优先取标题词，去重过滤
 * @param {string} content — article.md 原始内容
 * @param {number} count — 返回数量（默认5）
 * @returns {string[]} 关键词数组
 */
function extractKeywords(content, count = 5) {
  // 预处理：去掉 frontmatter / 代码块 / 链接 / 列表标记
  const plain = content
    .replace(/^---[\s\S]*?---\n/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s+/gm, '')   // 去掉列表项前缀
    .replace(/[*_~>#|]/g, '')
    .replace(/\n{3,}/g, '\n');

  // ── 策略1：从标题（H1-H3）提取关键词（权重最高）────────────────────
  const headingWords = [];
  const headingRegex = /^#{1,3}\s+(.+)/gm;
  let m;
  while ((m = headingRegex.exec(plain)) !== null) {
    const words = m[1].match(/[\u4e00-\u9fa5]{2,}/g) || [];
    headingWords.push(...words);
  }

  // ── 策略2：从第一段提取核心概念词 ───────────────────────────────────
  const firstParagraph = plain.split('\n\n')[0] || '';
  const firstWords = (firstParagraph.match(/[\u4e00-\u9fa5]{2,}/g) || []).slice(0, 10);

  // ── 策略3：正文高频词（TF 统计）─────────────────────────────────────
  const wordCount = {};
  const tokenRegex = /[\u4e00-\u9fa5]{2,4}/g;
  let tokenMatch;
  while ((tokenMatch = tokenRegex.exec(plain)) !== null) {
    const word = tokenMatch[0];
    if (word.length < 2) continue;
    if (STOP_WORDS.has(word)) continue;
    if (STOP_WORD_MULTI.has(word)) continue;
    // 标题词权重 ×3，第一段词权重 ×2
    const weight = headingWords.includes(word) ? 3 : (firstWords.includes(word) ? 2 : 1);
    wordCount[word] = (wordCount[word] || 0) + weight;
  }

  // 排序（权重优先，同权重按频次）
  const sorted = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, count * 4)
    .map(([w]) => w);

  // 去重：只保留与已有词无包含关系的词；已被包含的短词直接丢弃
  const result = [];
  for (const w of sorted) {
    // 跳过包含停用词的词（停用词出现在任意位置都过滤）
    if (STOP_WORD_MULTI.size > 0 && Array.from(STOP_WORD_MULTI).some(sw => w.includes(sw) && sw.length >= 2)) continue;
    if (result.length >= count) break;
    // 若已有词包含当前词（当前词被包含），丢弃当前词
    if (result.some(r => r.includes(w) && r !== w)) continue;
    // 正常情况：无包含关系，加入
    result.push(w);
  }

  return result.length > 0 ? result : ['视频工具'];
}

/**
 * 根据关键词推断主题配色方案
 * @param {string[]} keywords
 * @returns {string} theme key
 */
/**
 * 根据关键词推断主题风格，覆盖全部 30 个主题
 * @param {string[]} keywords
 * @returns {string} theme key
 */
function inferTheme(keywords) {
  const kw = keywords.join('');
  const map = [
    // ── 新增主题 31-50（优先级最高，精确匹配优先）────────────────────────
    { keys: ['AI绘画', 'AI视频', 'AI生成', 'AI图片', 'Midjourney', 'Stable Diffusion', '文生图', '图生图', 'AI绘图', 'AI创作工具', 'AI助手'], theme: 'ai-smart' },
    { keys: ['编程', '代码', '程序员', 'JavaScript', 'Python', 'React', 'Vue', 'Java', 'C++', 'Git', 'GitHub', '软件开发', '前端', '后端', '全栈', '软件工程师', '算法工程师'], theme: 'coding-dev' },
    { keys: ['太空', '宇宙', '航天', '卫星', '火箭', 'SpaceX', 'NASA', '星际', '黑洞', '星系', '银河', '行星', '探月', '火星', '天文', '空间站', '阿波罗'], theme: 'space-cosmos' },
    { keys: ['黑客', '网络安全', '漏洞', '渗透', '暗网', '破解', '红队', '蓝队', '逆向', '二进制', 'CTF', '黑客帝国', '信息安全', '数据泄露'], theme: 'cyber-dark' },
    { keys: ['生物', '基因', 'DNA', '细胞', '疫苗', '抗体', '制药', '生物技术', '基因编辑', 'CRISPR', '蛋白质', '生物制药', '医疗科技', '生物医药'], theme: 'bio-tech' },
    { keys: ['社交媒体', '涨粉', '私域流量', '社群运营', 'KOL合作', '网红经济', '内容创业', '账号孵化', '博主变现', '粉丝经济'], theme: 'social-media' },
    { keys: ['美容', '医美', '美甲', '美发', '彩妆', '护肤心得', '素颜', '女神养成', '皮肤管理', '美容仪', '整形'], theme: 'beauty-makeup' },
    { keys: ['育儿', '萌娃', '亲子时光', '宝妈', '奶爸', '备孕', '育儿经', '母婴', '新生儿护理', '辅食', '早教', '带娃'], theme: 'parenting-baby' },
    { keys: ['健身房', '举铁', '增肌', '减脂', '塑形', '力量训练', '卧推', '深蹲', '健身计划', '蛋白粉', '健美', 'crossfit', '运动补剂'], theme: 'fitness-gym' },
    { keys: ['咖啡时光', '下午茶', '慢生活', '小憩', '手冲咖啡', '意式咖啡', '精品咖啡', '咖啡文化', '拉花', '咖啡豆', '咖啡店'], theme: 'coffee-break' },
    { keys: ['读书', '阅读', '书单', '推荐书目', '文学', '小说', '诗歌', '散文', '名著', '古典文学', '畅销书', '读书会', '书评', '阅读习惯', '文学经典'], theme: 'book-literature' },
    { keys: ['动漫', '二次元', '番剧', '轻小说', 'COSPLAY', '同人', '宅文化', '追番', '日漫', '国漫', '番剧推荐', '热血番', '萌系', '动漫周边'], theme: 'anime-manga' },
    { keys: ['明星', '偶像', '追星', '出道', '偶像团体', '经纪公司', '粉丝应援', '偶像练习生', '选秀', '爱豆', '演唱会'], theme: 'celebrity-star' },
    { keys: ['法律', '律师', '诉讼', '法院', '判决', '法规', '法律咨询', '维权', '法律援助', '法学', '法律常识', '消费者权益', '维权律师'], theme: 'law-justice' },
    { keys: ['理财规划', '资产配置', '投资组合', '财务规划', '被动收入', '财务自由', '储蓄', '退休金', '保险规划', '理财目标', '财富自由', 'FIRE运动'], theme: 'invest-plan' },
    { keys: ['心理学', '心理咨询', '精神', '情商', '心理健康', '情绪管理', '情感咨询', '自我成长', '心灵疗愈', '心理疾病', '心理测试'], theme: 'psychology-mind' },
    { keys: ['手工', 'DIY', '编织', '木工', '陶艺', '皮具', '印章', '手作', '创意手工', '羊毛毡', '刺绣', '钩针', '竹编', '陶艺制作', '手工教程'], theme: 'handcraft-diy' },
    { keys: ['室内设计', '装修', '北欧风', '极简风', '空间设计', '样板间', '设计师', '家居美学', '室内装饰', '装修日记', '家居好物', '软装设计'], theme: 'architecture-interior' },
    // photo-lifestyle 必须在 vintage-film 之后（精确 → 通用的顺序）
    // 移除"胶片"避免与 vintage-film 冲突，胶片内容由 vintage-film 接管
    { keys: ['摄影', '胶卷', '人像', '写真', '风光', '旅拍', '器材', '构图', '摄影师', '拍照技巧', '人像摄影', '风景摄影', '相机'], theme: 'photo-lifestyle' },
    { keys: ['复古胶片', '胶片感', '怀旧', '老照片', '时光', '年代感', '旧时光', '胶片相机', '胶片滤镜', '时光机', '复古摄影', '电影感', '胶片日记'], theme: 'vintage-film' },
    // ── 科技类（兜底在其他主题之前，优先级最高）───────────────────────────
    { keys: ['量子', '物理', '粒子', '原子', '科研', '研究', '实验'], theme: 'quantum-tech' },
    { keys: ['AR', 'VR', '元宇宙', '虚拟现实', '增强现实', 'XR', '虚拟世界', '数字孪生'], theme: 'holographic' },
    { keys: ['数据流', '矩阵', '流式数据', '实时数据'], theme: 'data-stream' },
    { keys: ['玻璃', '毛玻璃', '透明', 'glass'], theme: 'glass-morphism' },
    { keys: ['极简', '简约', '克制', '极简主义', '性冷淡'], theme: 'minimal-tech' },
    { keys: ['霓虹', '夜店', '夜生活', '酒吧', ' Disco', 'KTV'], theme: 'neon-city' },
    { keys: ['创新', '前沿', '趋势', '未来科技', '下一代'], theme: 'neon-future' },
    { keys: ['AI', '人工智能', 'ChatGPT', 'GPT', '大模型', '机器学习', '深度学习', '神经网络', 'AIGC', 'LLM'], theme: 'tech-modern' },
    { keys: ['游戏', '电竞', 'Steam', '开黑', '段位', '装备', '手游', '玩家'], theme: 'game-elite' },
    { keys: ['数据', '大数据', '分析', '算法', '数据库', '数据处理', '数据科学', '可视化'], theme: 'particle-tech' },
    // ── 生活方式类 ──────────────────────────────────────────────────────────
    { keys: ['美食', '烹饪', '食谱', '菜谱', '吃', '餐厅', '烘焙', '甜点', '火锅', '料理', '外卖', '咖啡', '奶茶', '小吃'], theme: 'food-warm' },
    { keys: ['旅游', '出行', '攻略', '旅行', '景点', '打卡', '拍照', '度假', '酒店', '机票', '签证', '导游', '民宿'], theme: 'travel-vibrant' },
    { keys: ['健身', '运动', '减肥', '跑步', '瑜伽', '体能', '增肌', '训练', '锻炼', '体育', '马拉松', '骑行'], theme: 'vibrant-gradient' },
    { keys: ['音乐', '歌曲', '歌手', '演唱会', '播放', '音频', '歌单', '专辑', '乐器', '摇滚', '民谣', '电子', 'DJ'], theme: 'music-beat' },
    { keys: ['宠物', '猫', '狗', '动物', '萌宠', '养宠', '猫咪', '狗狗', '宠物用品', '宠物店', '流浪猫'], theme: 'pet-cute' },
    { keys: ['时尚', '穿搭', '美妆', '衣服', '服装', '护肤', '口红', '搭配', '潮流', '服饰', '包包', '鞋子', '手表'], theme: 'fashion-elegant' },
    // ── 自然类 ──────────────────────────────────────────────────────────────
    { keys: ['森林', '环保', '自然', '户外', '露营', '徒步', '登山', '田园', '有机', '植物', '园艺', '农场'], theme: 'forest-nature' },
    { keys: ['海洋', '潜水', '航运', '海岸', '沙滩', '岛屿', '海岛', '海鲜', '港口', '航海', '深海'], theme: 'deep-ocean' },
    { keys: ['冰雪', '滑雪', '冬季', '极地', '冰川', '北冰', '冰雕', '雪景', '极光', '寒冷'], theme: 'arctic-ice' },
    // ── 专业类 ──────────────────────────────────────────────────────────────
    { keys: ['金融', '投资', '理财', '股票', '基金', '银行', '保险', '财务', '赚钱', '经济', '财富', '资产', '收益'], theme: 'fintech' },
    { keys: ['医疗', '健康', '医生', '医院', '疾病', '治疗', '药物', '制药', '生物', '养生', '中医', '保健'], theme: 'pure-medical' },
    { keys: ['教育', '学习', '课程', '培训', '学校', '老师', '学生', '考试', '教学', '课堂', '教材', '辅导', '网课'], theme: 'education-blue' },
    { keys: ['新闻', '时事', '政治', '社会', '事件', '热点', '记者', '报道', '媒体', '舆论'], theme: 'news-official' },
    { keys: ['汽车', '新车', '电动车', '试驾', '车载', '驾驶', '车速', '赛车', '改装', '车载系统'], theme: 'auto-tech' },
    { keys: ['创业', '融资', '商业', '企业', '老板', '商机', '加盟', '合伙', '风投'], theme: 'startup-energy' },
    { keys: ['奢侈', '名表', '名包', '珠宝', '首饰', '艺术品', '收藏', '豪表', '豪车'], theme: 'luxury-elegant' },
    { keys: ['复古', ' Vintage', '古董', '手工艺', '咖啡馆', '艺术', '画作', '雕塑', '古着'], theme: 'autumn-vintage' },
    // ── 新增主题 31-50 ─────────────────────────────────────────────────────
    { keys: ['AI绘画', 'AI视频', 'AI生成', 'AI图片', 'Midjourney', 'Stable Diffusion', '文生图', '图生图', 'AI绘图', 'AI创作工具'], theme: 'ai-smart' },
    { keys: ['编程', '代码', '程序员', 'JavaScript', 'Python', 'React', 'Vue', 'Java', 'C++', 'Git', 'GitHub', '软件开发', '前端', '后端', '全栈'], theme: 'coding-dev' },
    { keys: ['太空', '宇宙', '航天', '卫星', '火箭', 'SpaceX', 'NASA', '星际', '黑洞', '星系', '银河', '行星', '探月', '火星', '天文'], theme: 'space-cosmos' },
    { keys: ['黑客', '网络安全', '漏洞', '渗透', '暗网', '破解', '红队', '蓝队', '逆向', '二进制', 'CTF', '黑客帝国'], theme: 'cyber-dark' },
    { keys: ['生物', '基因', 'DNA', '细胞', '疫苗', '抗体', '制药', '生物技术', '基因编辑', 'CRISPR', '蛋白质', '生物制药', '医疗科技'], theme: 'bio-tech' },
    { keys: ['社交', '微博', '粉丝', '点赞', '转发', '网红', 'KOL', '博主', '自媒体', '内容创', '账号', '涨粉', '私域', '社群', '社交媒体'], theme: 'social-media' },
    { keys: ['美容', '美妆', '护肤', '化妆', '妆容', '肤色', '医美', 'SPA', '美甲', '美发', '彩妆', '护肤心得', '素颜', '女神'], theme: 'beauty-makeup' },
    { keys: ['育儿', '宝宝', '萌娃', '亲子', '宝妈', '奶爸', '孕', '备孕', '育儿经', '母婴', '新生儿', '辅食', '早教', '学区房', '带娃'], theme: 'parenting-baby' },
    { keys: ['健身房', '器械', '举铁', '增肌', '减脂', '塑形', '力量训练', '卧推', '深蹲', '健身计划', '蛋白粉', '健美', 'crossfit'], theme: 'fitness-gym' },
    { keys: ['咖啡时光', '下午茶', '茶饮', '慢生活', '小憩', '书房', '阅读时光', '手冲咖啡', '咖啡馆', '意式', '拿铁', '卡布'], theme: 'coffee-break' },
    { keys: ['读书', '阅读', '书单', '推荐书目', '文学', '小说', '诗歌', '散文', '名著', '古典文学', '畅销书', '读书会', '书评', '阅读习惯'], theme: 'book-literature' },
    { keys: ['动漫', '动画', '二次元', '漫画', '番剧', '轻小说', 'COSPLAY', '同人', '宅', '追番', '日漫', '国漫', '番剧推荐', '热血', '萌系'], theme: 'anime-manga' },
    { keys: ['明星', '偶像', '演唱会', '综艺', '真人秀', '八卦', '追星', '出道', '偶像团体', '经纪公司', '影视', '颁奖礼', '红毯', '粉丝应援'], theme: 'celebrity-star' },
    { keys: ['法律', '律师', '案件', '诉讼', '法院', '判决', '法规', '法律咨询', '维权', '法律援助', '法学', '法律常识', '消费者权益', '维权律师'], theme: 'law-justice' },
    { keys: ['理财规划', '资产配置', '投资组合', '财务规划', '被动收入', '财务自由', '储蓄', '退休金', '保险规划', '理财目标', '财富自由', 'FIRE运动', '省钱'], theme: 'invest-plan' },
    { keys: ['心理', '抑郁症', '焦虑', '情感', '情绪', '心理咨询', '精神', '人格', '情商', '心理健康', '情绪管理', '情感咨询', '自我成长', '心灵疗愈'], theme: 'psychology-mind' },
    { keys: ['手工', 'DIY', '编织', '木工', '陶艺', '皮具', '印章', '手作', '创意手工', '羊毛毡', '刺绣', '钩针', '竹编', '陶艺制作'], theme: 'handcraft-diy' },
    { keys: ['建筑', '室内设计', '装修', '家居', '软装', '北欧风', '极简风', '空间设计', '样板间', '设计师', '家居美学', '室内装饰', '装修日记', '家居好物'], theme: 'architecture-interior' },
    { keys: ['摄影', '拍照', '胶片', '胶卷', '人像', '写真', '风光', '旅拍', '器材', '构图', '摄影师', '拍照技巧', '人像摄影', '风景摄影', '相机'], theme: 'photo-lifestyle' },
    { keys: ['复古胶片', '胶片感', '怀旧', '老照片', '时光', '年代感', '旧时光', '胶片相机', '胶片滤镜', '时光机', '复古摄影', '电影感', '胶片日记'], theme: 'vintage-film' },
    // ── 默认兜底 ───────────────────────────────────────────────────────────
    { keys: [], theme: 'cyberpunk' },
  ];

  for (const entry of map) {
    if (entry.keys.length === 0) return entry.theme;  // 默认兜底 cyberpunk
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
// T-4: generateAttrs — 从 sceneContent（features + steps）生成，不再依赖 keywords
// 优先级：feature.name > step.cmd 关键词 > keywords > 兜底
function generateAttrs(keywords, sceneContent) {
  const corpus = [];
  // 从 features 提取名称
  if (sceneContent?.features) {
    for (const f of sceneContent.features) {
      if (f.name) corpus.push(...f.name.split(/[^\u4e00-\u9fa5a-zA-Z0-9]+/));
    }
  }
  // 从 steps 提取命令词（取第一行命令的关键词）
  if (sceneContent?.steps) {
    for (const s of sceneContent.steps) {
      if (s.cmd) {
        const parts = s.cmd.trim().split(/\s+/);
        // 取非选项、非短横线的实词
        for (const p of parts) {
          if (p && !p.startsWith('-') && p.length > 1) {
            corpus.push(p.replace(/^[#$]/, ''));
          }
        }
      }
    }
  }
  // 合并 keywords（权重更低）
  if (keywords) corpus.push(...keywords);
  // 过滤停用词
  const filtered = corpus.filter(w => w.length > 1 && !STOP_WORDS.has(w) && !STOP_WORD_MULTI.has(w));
  // 取唯一词列表（保留顺序）
  const seen = new Set();
  const unique = filtered.filter(w => { if (seen.has(w)) return false; seen.add(w); return true; });
  if (unique.length === 0) return ['效率工具', '实用推荐', '收藏备用', '值得一试'];
  return unique.slice(0, 4);
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
  // 提取含问题/困难/痛点语义的句子（需有明确起点）
  const painPatterns = [
    // 模式1：带明确后缀的句子（最严格）
    /([^。！？]{8,50}(?:问题|困难|麻烦|卡顿|慢|贵|难|复杂|繁琐|失效|崩溃|报错|失败)[^。！？]{0,10})/g,
    // 模式2：从句首或引号后开始的句子（起点明确）
    /(?:^[。！？]?.{0,5})?(?:当|若|如果|尽管|然而|但)[^。！？]{5,40}/gm,
  ];
  // 默认痛点（内容无关的兜底语义）
  const defaultPains = [
    "难以发现真实IP，排查困难",
    "CDN配置隐藏真实入口",
    "渗透测试找不到突破口",
  ];
  const painSentences = [];
  for (const pat of painPatterns) {
    let m;
    while ((m = pat.exec(stripped)) !== null && painSentences.length < 3) {
      const s = m[1] || m[0];
      const trimmed = s.trim();
      if (trimmed.length > 6 && !painSentences.includes(trimmed)) {
        painSentences.push(trimmed.slice(0, 35));
      }
    }
  }
  // 兜底：若提取不足3条，用默认痛点
  const painPoints = painSentences.length >= 3
    ? painSentences.slice(0, 3)
    : [...painSentences, ...defaultPains].slice(0, 3);

  // ── 2. 方案场景标签（3条）：固定为该类项目通用标签 ─────────────────────
  const tags = ["DNS侦察", "OSINT", "安全研究"];

  // ── 3. 功能场景（4项）：从文章内容提取功能特性句子 ────────────────────
  const featPatterns = [
    /(?:支持|提供|具备|拥有|采用|使用|基于)[^。！？]{3,30}/g,
    /(?:多情报源|并发扫描|JA3指纹|代理支持|HTML标题验证|管道处理)[^。！？]{0,20}/g,
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

  // ── T-7: featNames 从 article 内容推断（不再是固定硬编码）────────────────
  // 策略：提取文章中含"功能/特性/支持/提供"的句子 → 取名词短语作为功能名
  const featNameCandidates = [];
  const featNamePatterns = [
    /(?:功能|特性|优势|支持|提供|具备)[：:]\s*([^\n，。！？]{2,15})/g,
    /(?:基于|采用|使用)[^的是]([^\n，。！？]{2,15})(?:技术|方案|协议|引擎|算法)/g,
  ];
  for (const pat of featNamePatterns) {
    let m;
    while ((m = pat.exec(stripped)) !== null && featNameCandidates.length < 4) {
      const name = m[1].trim().replace(/[*_~`#>|]/g, '').slice(0, 8);
      if (name.length > 1 && !STOP_WORDS.has(name) && !featNameCandidates.includes(name)) {
        featNameCandidates.push(name);
      }
    }
  }
  // 若提取不足4个，用 keywords 补充（排除通用词）
  if (featNameCandidates.length < 4) {
    for (const k of kw) {
      if (!STOP_WORDS.has(k) && !featNameCandidates.includes(k) && featNameCandidates.length < 4) {
        featNameCandidates.push(k);
      }
    }
  }
  // featNamesFixed 只作最终兜底
  const featNamesFixed = ["多情报源聚合", "并发高速扫描", "JA3指纹伪装", "HTML验证"];
  const featNames = featNameCandidates.length >= 4
    ? featNameCandidates.slice(0, 4)
    : [...featNameCandidates, ...featNamesFixed].slice(0, 4);

  const features = featSentences.length >= 4
    ? featSentences.slice(0, 4).map((desc, i) => ({
        icon: featIcons[i] || "✨",
        name: featNames[i] || `核心优势${i + 1}`,   // T-7: 使用推断的名称
        desc: desc.slice(0, 25),
      }))
    : featNamesFixed.map((name, i) => ({
        icon: featIcons[i] || "✨",
        name: featNames[i] || name,                  // T-7: 混合使用
        desc: featSentences[i] ? featSentences[i].slice(0, 25) : `核心优势${i + 1}`,
      }));

  // ── T-8: 步骤提取 + defaultSteps 使用实际 url（不再用 kw[0] 占位符）────────
  const cmdPatterns = [
    /(`[^`]+`)/g,                          // `命令` 格式
    /(npm |pip |brew |yarn |cargo )[^\n]{0,40}/g,  // 包管理命令
    /(git clone|curl|wget)[^\n]{0,40}/g,   // 常用命令
  ];
  const cmds = [];
  for (const pat of cmdPatterns) {
    let m;
    while ((m = pat.exec(stripped)) !== null) {
      const s = m[1] || m[0];
      if (s.length > 3) cmds.push(s.trim().slice(0, 50));
    }
  }
  const uniqueCmds = [];
  for (const c of cmds) {
    if (!uniqueCmds.includes(c) && uniqueCmds.length < 3) uniqueCmds.push(c);
  }

  // ── 5. URL：从文章提取第一个 https URL ────────────────────────────────
  const urlMatch = stripped.match(/(https?:\/\/[^\s。！？)）]{10,60})/);
  const url = urlMatch ? urlMatch[1].replace(/[。！？)）]$/, '') : `https://github.com/${kw[0] || 'project'}`;

  // T-8: defaultSteps 使用实际提取的 url（不再用 kw[0] 占位符）
  const defaultSteps = [
    { cmd: `git clone ${url}`, desc: "克隆项目" },
    { cmd: "cd 项目目录 && npm install", desc: "安装依赖" },
    { cmd: "npm run dev", desc: "启动项目" },
  ];
  const steps = uniqueCmds.length >= 2
    ? uniqueCmds.map((cmd, i) => ({ cmd, desc: `步骤${i + 1}` }))
    : defaultSteps;

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
 * T-5: 从 article.md 直接提取配音文本（绕过 video-script.md）
 * 策略：stripMarkdown 保持句子完整性 → 按段落分割 → 取能填满 maxChars 的内容
 * @param {string} articleContent — article.md 原始内容
 * @param {number} maxChineseChars — ⌊duration × 3.37⌋
 * @returns {string} narration.txt
 */
function extractNarration(articleContent, maxChineseChars) {
  const countChinese = (text) => (text.match(/[\u4e00-\u9fa5]/g) || []).length;

  // 预处理：保留中文句子结构，去掉代码块/链接/Markdown语法
  const stripped = articleContent
    .replace(/^---[\s\S]*?---\n/, '')          // frontmatter
    .replace(/```[\s\S]*?```/g, '')               // 代码块
    .replace(/`[^`]*`/g, '')                      // 行内代码
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')     // [文字](url) → 文字
    .replace(/^[-*]\s+/gm, '')                   // 列表项
    .replace(/[*_~>#|]/g, '')                    // Markdown 语法
    .replace(/\n{3,}/g, '\n\n');                  // 压缩空行

  // 按段落分割（保留空行作为自然断点）
  const paragraphs = stripped.split(/\n\n+/).filter(p => {
    const t = p.trim();
    return t.length > 15 && countChinese(t) >= 8;
  });

  // 从文章内容构建 narration（优先取完整段落，控制在 maxChineseChars 内）
  let narration = '';
  let chineseChars = 0;
  for (const para of paragraphs) {
    const trimmed = para.trim();
    const pc = countChinese(trimmed);
    // 加句号连接相邻段落
    const connect = narration.length > 0 && !narration.endsWith('。') ? '。' : '';
    if (chineseChars + pc <= Math.floor(maxChineseChars * 1.05)) {
      narration += connect + trimmed;
      chineseChars += pc;
    } else {
      // 当前段落加入后超限，但在自然断点处截断
      if (chineseChars < maxChineseChars) {
        let acc = 0, breakIdx = 0;
        for (let i = 0; i < trimmed.length; i++) {
          if (/[\u4e00-\u9fa5]/.test(trimmed[i])) acc++;
          if (acc > maxChineseChars - chineseChars && /[。！？]/.test(trimmed[i])) {
            breakIdx = i + 1;
            break;
          }
        }
        if (breakIdx > 0) {
          narration += connect + trimmed.slice(0, breakIdx);
        }
      }
      break;
    }
  }

  // 安全截断（若仍有超出）
  if (countChinese(narration) > maxChineseChars) {
    let acc = 0, breakIdx = narration.length;
    for (let i = 0; i < narration.length; i++) {
      if (/[\u4e00-\u9fa5]/.test(narration[i])) {
        acc++;
        if (acc >= Math.floor(maxChineseChars * 0.97) && /[。！？]/.test(narration[i])) {
          breakIdx = i + 1;
          break;
        }
      }
    }
    narration = narration.slice(0, breakIdx) || narration.slice(0, Math.floor(maxChineseChars * 1.4));
  }

  return narration || '请手动编写配音文本';
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
 * 生成 README 页面
 */
function generateReadme(config) {
  const title = config.cover?.title || config.title || '项目名称';
  const subtitle = config.cover?.subtitle || config.subtitle || '';
  const theme = config.theme || 'cyberpunk';
  const platform = config.platform || '微信视频号';
  const duration = config.duration || 52;
  const date = new Date().toLocaleDateString('zh-CN');

  return `# ${title}

${subtitle}

## 项目信息

- **平台**: ${platform}
- **主题**: ${theme}
- **时长**: ${duration}秒
- **创建日期**: ${date}

## 目录结构

\`\`\`
├── docs/                  # 项目文档
│   ├── assets/            # 静态资源（封面图）
│   ├── article.md         # 原文内容
│   ├── video-script.md    # 视频脚本
│   ├── narration.txt      # 配音文本
│   └── ...
├── audio/                 # 音频文件
│   ├── neural_1_2x.m4a    # 配音音频
│   └── captions.json      # 字幕数据
├── video-project/         # Remotion 项目
│   └── out/final.mp4     # 最终视频
└── video-config.json      # 项目配置
\`\`\`

## 快速开始

\`\`\`bash
# 1. 安装依赖
npm install

# 2. 生成视频
bash launch.sh all
\`\`\`
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
  const sceneContent = generateSceneContent(articleContent, keywords);
  const attrs = generateAttrs(keywords, sceneContent);

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
  const narration = extractNarration(articleContent, maxNarrationChars);
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

  // 11. README.md
  fs.writeFileSync(path.join(docsDir, "README.md"), generateReadme(config), "utf8");

  // 12. report.json（含 sceneContent，供 create-remotion-project.js 读取）
  const docNames = [
    "article.md", "video-script.md", "narration.txt",
    "copy.md", "wechat-copy.md", "posting-guide.md",
    "session-log.md", "landing-page.html", "article-page.html",
    "wechat-page.html", "README.md", "report.json"
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

// ─────────────────────────────────────────────────────────────────────────────
// HTML 生成器（基于 rules/HTML.md 完整模板）
// ─────────────────────────────────────────────────────────────────────────────
function extractTitle(content) {
  const m = content.match(/^#\s+(.+)/m);
  return m ? m[1].trim() : "视频标题";
}

function extractKeywords(content) {
  // 简单关键词提取：取正文高频词
  const words = (content.match(/[\u4e00-\u9fa5]{2,4}/g) || []);
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

function generateLandingPage(articleContent, config) {
  const title = extractTitle(articleContent);
  const subtitle = (config.cover?.subtitle || config.name || "");
  const stripped = stripMarkdown(articleContent).slice(0, 500);
  const installCmd = config.installCommand || "git clone https://github.com/example/repo";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${subtitle}">
  <meta property="og:type" content="website">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC',
                   'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
    }
    .gradient-text {
      background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .install-box {
      background: #111827;
      color: #4ADE80;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      padding: 20px 28px;
      border-radius: 12px;
      font-size: 15px;
      line-height: 1.8;
    }
  </style>
</head>
<body class="bg-gray-900 text-white min-h-screen">

  <!-- Hero Section -->
  <section class="min-h-screen flex flex-col justify-center items-center text-center px-6 py-16">
    <div class="mb-4 text-4xl">🎬</div>
    <h1 class="text-4xl md:text-6xl font-bold mb-4 gradient-text">
      ${title}
    </h1>
    <p class="text-xl text-gray-400 mb-8 max-w-2xl">${subtitle}</p>
    <a href="#install"
       class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-blue-600/30">
      <i class="fas fa-download mr-2"></i>立即获取
    </a>
    <div class="mt-8 text-gray-500 text-sm">点击下方查看安装方式</div>
    <div class="mt-2 animate-bounce text-gray-500">↓</div>
  </section>

  <!-- Install Section -->
  <section id="install" class="py-20 px-6 bg-gray-800">
    <div class="max-w-3xl mx-auto">
      <h2 class="text-2xl font-bold mb-6 flex items-center">
        <i class="fas fa-terminal mr-3 text-green-400"></i>快速安装
      </h2>
      <div class="install-box">${installCmd}</div>
    </div>
  </section>

  <!-- Content Summary -->
  <section class="py-16 px-6 bg-gray-900">
    <div class="max-w-3xl mx-auto">
      <h2 class="text-2xl font-bold mb-6 flex items-center">
        <i class="fas fa-file-alt mr-3 text-blue-400"></i>内容概览
      </h2>
      <div class="bg-gray-800 rounded-xl p-6 text-gray-300 leading-relaxed">
        ${stripped}...
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-8 text-center text-gray-600 text-sm border-t border-gray-800">
    <p>由 video-creator 自动生成</p>
  </footer>

</body>
</html>`;
}

function generateArticlePage(articleContent, config) {
  const title = extractTitle(articleContent);
  const subtitle = (config.cover?.subtitle || config.name || "");
  const stripped = stripMarkdown(articleContent);
  const keywords = extractKeywords(articleContent);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${subtitle}">
  <meta property="og:type" content="article">
  <link href="https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
      background: #0F172A;
      color: #F8FAFC;
    }
    .article-card {
      background: #1E293B;
      border-radius: 16px;
      padding: 32px;
      margin: 24px 0;
    }
    .highlight-box {
      background: linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(124,58,237,0.2) 100%);
      border: 1px solid #2563EB;
      border-radius: 16px;
      padding: 24px;
    }
    .content { line-height: 1.9; }
    .content p { margin-bottom: 16px; }
    .tag {
      display: inline-block;
      background: rgba(37,99,235,0.3);
      border: 1px solid #3B82F6;
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 13px;
      color: #93C5FD;
      margin: 4px 4px 4px 0;
    }
    .footer {
      text-align: center;
      padding: 24px 0;
      color: #64748B;
      font-size: 13px;
      border-top: 1px solid #334155;
      margin-top: 40px;
    }
  </style>
</head>
<body class="min-vh-100">
  <main class="container py-5" style="max-width: 800px;">
    <article class="article-card">
      <h1 class="mb-4" style="font-size: 2rem; font-weight: 700; color: #F8FAFC;">
        ${title}
      </h1>
      ${subtitle ? `<p style="color: #94A3B8; margin-bottom: 24px;">${subtitle}</p>` : ""}
      <div class="highlight-box text-center mb-4">
        <div style="margin-bottom: 12px;">
          ${keywords.slice(0, 4).map(k => `<span class="tag">${k}</span>`).join("")}
        </div>
      </div>
      <div class="content">
        ${stripped.split("\n\n").filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join("\n")}
      </div>
      <div class="footer">
        <p>由 video-creator 自动生成</p>
      </div>
    </article>
  </main>
</body>
</html>`;
}

function generateWechatPage(articleContent, config) {
  const title = extractTitle(articleContent);
  const subtitle = (config.cover?.subtitle || config.name || "");
  const stripped = stripMarkdown(articleContent);
  const lines = stripped.split("\n\n").filter(l => l.trim());
  const hookText = lines[0] || subtitle || "本文带你深入了解这个工具的核心特性与使用方法。";
  const bodyText = lines.slice(1).join("</p><p>");
  const ctaText = config.ctaText || "如果你觉得有帮助，欢迎分享给更多需要的人";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${subtitle}">
  <meta property="og:type" content="article">
  <meta name="author" content="video-creator">
  <title>${title}</title>
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
    .header {
      text-align: center;
      padding: 30px 0 20px;
      border-bottom: 1px solid #E5E5E5;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 8px;
    }
    .header .meta {
      font-size: 13px;
      color: #999999;
    }
    .hook {
      background: #EFF6FF;
      border-left: 4px solid #3B82F6;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
      font-size: 15px;
      color: #1E40AF;
    }
    .section { margin: 24px 0; }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #3B82F6;
      display: inline-block;
    }
    .content p {
      margin: 0 0 16px;
      color: #333333;
    }
    .cta {
      background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%);
      color: #FFFFFF;
      text-align: center;
      padding: 24px 20px;
      border-radius: 12px;
      margin: 30px 0;
      font-size: 15px;
    }
    .footer {
      text-align: center;
      padding: 24px 0;
      border-top: 1px solid #E5E5E5;
      color: #999999;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>${title}</h1>
      <div class="meta">视频号：video-creator</div>
    </header>

    <div class="hook">
      <p>${hookText}</p>
    </div>

    <section class="section">
      <h2 class="section-title">核心内容</h2>
      <div class="content">
        <p>${bodyText}</p>
      </div>
    </section>

    <div class="cta">
      <p>${ctaText}</p>
    </div>

    <footer class="footer">
      <p>本文由 video-creator 自动生成</p>
    </footer>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 12 文件完整性校验
// ─────────────────────────────────────────────────────────────────────────────
const REQUIRED_FILES = [
  'article.md', 'video-script.md', 'narration.txt', 'copy.md',
  'wechat-copy.md', 'posting-guide.md', 'session-log.md', 'report.json',
  'landing-page.html', 'article-page.html', 'wechat-page.html', 'README.md'
];

function validateDocs(projectDir) {
  const docsDir = path.join(projectDir, 'docs');
  const missing = REQUIRED_FILES.filter(f => !fs.existsSync(path.join(docsDir, f)));
  if (missing.length > 0) {
    console.error('❌ 缺少文件: ' + missing.join(', '));
    process.exit(1);
  }
  console.log('✅ 12个文件全部生成: ' + REQUIRED_FILES.join(', '));
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
