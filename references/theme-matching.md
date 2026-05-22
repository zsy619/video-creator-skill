# 主题匹配系统 — sceneContent 动态化

> 封面图、Remotion 场景内容与文章主题完全匹配，不再使用 Hysteria 代理的硬编码。

## 核心铁律

**所有视频内容必须与当前文章主题匹配**。封面图配色、场景文案、标签、功能点、步骤命令全部从文章关键词动态生成。

---

## 数据流

```
article.md
    ↓ extractKeywords()（提取5个关键词）
    ↓ inferTheme()（推断主题风格）
    ↓ generateAttrs()（生成封面属性标签）
    ↓ generateSceneContent()（生成场景内容）
    ↓
├── video-config.json（Step0后自动写入）
│   ├── keywords: [...]
│   ├── inferredTheme: "cyberpunk" | "food-warm" | ...
│   └── cover.attrs: [...]
│
├── docs/report.json（sceneContent 字段）
│   ├── painPoints: [...]     ← Scene2 痛点
│   ├── tags: [...]           ← Scene3 标签
│   ├── features: [...]       ← Scene4 功能
│   ├── steps: [...]         ← Scene5 命令
│   ├── url: "https://github.com/..."  ← Scene5 URL
│   └── license: "..."        ← Scene6 许可证
│
├── generate_cover.py（封面图）
│   ├── theme ← config.inferredTheme（配色方案）
│   ├── attrs ← config.cover.attrs（标签）
│   └── title/subtitle ← config.cover.title/subtitle
│
└── create-remotion-project.js
    ├── PAIN_POINTS ← report.sceneContent.painPoints
    ├── TAGS        ← report.sceneContent.tags
    ├── FEATURES   ← report.sceneContent.features
    ├── STEPS      ← report.sceneContent.steps
    ├── SCENE_URL  ← report.sceneContent.url
    └── SCENE_LICENSE ← report.sceneContent.license
```

---

## inferredTheme 主题风格（50 套）

> **命名规范**：`inferredTheme` 值必须与 `rules/THEMES.md` 的 Remotion 动画风格 ID 完全一致，与 `generate_cover.py` `THEME_STYLES` 键名一一对应。
> ⚠️ 颜色数据来源：`scripts/theme-colors.js`（单一数据源）

||| inferredTheme | 名称 | 配色方案 | 适用场景 |
|||--------------|------|---------|---------|
||| `tech-modern` | 科技现代风 | 科技蓝+紫 | 科技产品、AI工具 |
||| `cyberpunk` | 赛博朋克风 | 深紫+霓虹 | 科技/开源/工具 |
||| `neon-future` | 霓虹未来风 | 绿+粉霓虹 | 创新、前沿 |
||| `minimal-tech` | 极简科技风 | 墨灰+纯白 | 高端品牌、金融 |
||| `particle-tech` | 粒子科技风 | 青+金+紫 | 数据、科学 |
||| `gradient-wave` | 渐变波纹风 | 青绿+紫+粉 | 设计、创意 |
||| `glass-morphism` | 玻璃拟态风 | 半透明白 | 时尚、品牌 |
||| `holographic` | 全息投影风 | 青+蓝+紫 | AR/VR、元宇宙 |
||| `data-stream` | 数据流风 | 绿色矩阵 | 大数据、金融 |
||| `quantum-tech` | 量子科技风 | 粉+青+黄绿 | 量子、物理 |
||| `vibrant-gradient` | 活力渐变风 | 橙+金+绿 | 生活方式、健身 |
||| `aurora-gradient` | 极光渐变风 | 青+紫+粉 | 视觉艺术 |
||| `forest-nature` | 森林自然风 | 森林绿+金 | 环保、户外 |
||| `deep-ocean` | 深海科技风 | 深海青+靛蓝 | 海洋、环保 |
||| `arctic-ice` | 极地冰晶风 | 冰蓝+淡紫 | 冰雪、能源 |
||| `dark-minimal` | 暗夜极简风 | 墨灰+纯白 | 专业服务 |
||| `neon-city` | 霓虹都市风 | 玫红+紫+金 | 夜生活、音乐 |
||| `fintech` | 金融科技风 | 深绿+金 | 金融、投资 |
||| `pure-medical` | 纯净医疗风 | 天空蓝+青绿 | 医疗、生物 |
||| `autumn-vintage` | 暖秋复古风 | 枫红+橙黄 | 复古、艺术 |
||| `game-elite` | 电竞游戏风 | 紫色+玫红 | 游戏、电竞 |
||| `education-blue` | 学术教育风 | 深蓝+浅蓝 | 课程、教育 |
||| `food-warm` | 美食温暖风 | 暖橙+金色 | 美食、探店 |
||| `travel-vibrant` | 旅行冒险风 | 天蓝+橙色 | 旅行、冒险 |
||| `music-beat` | 音乐节拍风 | 粉+金 | 音乐、音频 |
||| `news-official` | 新闻权威风 | 深蓝主调 | 新闻、时事 |
||| `pet-cute` | 萌宠可爱风 | 粉色系 | 宠物、萌宠 |
||| `auto-tech` | 汽车科技风 | 青+绿+橙 | 汽车、科技 |
||| `startup-energy` | 创业活力风 | 深绿+金 | 创业、投资 |
||| `luxury-elegant` | 奢华优雅风 | 黑金配色 | 奢侈品、品牌 |
||| `ai-smart` | AI 智能风 | 紫+靛青 | AI绘画、AI生成 |
||| `coding-dev` | 编程开发风 | 青+蓝+绿 | 编程、代码 |
||| `space-cosmos` | 太空宇宙风 | 紫+粉 | 太空、宇宙 |
||| `cyber-dark` | 暗黑黑客风 | 绿色矩阵 | 网络安全 |
||| `bio-tech` | 生物科技风 | 青+绿 | 生物技术、基因 |
||| `social-media` | 社交媒体风 | 粉+紫 | 网红、涨粉 |
||| `beauty-makeup` | 美容美妆风 | 粉+金 | 美容、医美 |
||| `parenting-baby` | 育儿萌娃风 | 粉+绿 | 育儿、亲子 |
||| `fitness-gym` | 健身塑形风 | 橙+红+金 | 健身、减脂 |
||| `coffee-break` | 咖啡慢生活风 | 棕+金 | 咖啡、慢生活 |
||| `book-literature` | 读书文学风 | 棕+琥珀 | 读书、文学 |
||| `anime-manga` | 二次元动漫风 | 紫+粉+青 | 动漫、二次元 |
||| `celebrity-star` | 明星偶像风 | 红+金+紫 | 明星、偶像 |
||| `law-justice` | 法律正义风 | 蓝主调 | 法律、维权 |
||| `invest-plan` | 财富规划风 | 绿主调 | 理财、财务自由 |
||| `psychology-mind` | 心理心灵风 | 靛紫主调 | 心理学、情绪 |
||| `handcraft-diy` | 手工 DIY 风 | 棕+金 | 手工、DIY |
||| `architecture-interior` | 家居设计风 | 灰白主调 | 室内设计 |
||| `photo-lifestyle` | 摄影生活风 | 灰调主调 | 摄影、人像 |
||| `vintage-film` | 复古胶片风 | 棕+红+金 | 复古胶片、怀旧 |

> 旧版 `inferredTheme` 别名兼容性：
> - `health-fresh` → `particle-tech`
> - `education-calm` → `aurora-gradient`
> - `gaming-neon` → `game-elite`
> - `finance-professional` → `fintech`
> - `fashion-elegant` → `luxury-elegant`（保留）

---

## generateSceneContent() 生成的字段

### painPoints（场景2：痛点）

从文章提取3个真实痛点关键词。例如：
- 文章主题：AI 代码编辑器 → `["编码效率低，重复劳动多", "调试困难，Bug难定位", "文档分散，查找费时"]`
- 文章主题：开源代理 → `["网络延迟高，游戏卡顿", "视频缓冲，转圈圈", "访问缓慢，工作效率低"]`

### tags（场景3：标签）

与 `attrs` 相同，取前3个关键词作为场景标签。

### features（场景4：功能）

从关键词推断4个功能（icon + name + desc）。推断规则：
- 含"AI/智能"→ `{ icon: "🤖", name: "AI 智能", desc: "智能识别优化" }`
- 含"快速/加速"→ `{ icon: "⚡", name: "极速响应", desc: "毫秒级处理" }`
- 含"安全/加密"→ `{ icon: "🛡️", name: "安全加密", desc: "端到端传输加密" }`
- 含"开源"→ `{ icon: "💻", name: "开源免费", desc: "社区驱动开发" }`

### steps（场景5：安装命令）

从文章内容提取实际命令，无法提取时使用智能推断：
- 含"brew install"→ 提取实际包名
- 含"pip install"→ 提取实际包名
- 无法提取→ `["下载安装包", "配置环境", "启动使用"]`

### url（Scene5 GitHub 链接）

`video-config.json` 的 `repo` 字段，去掉 `https://` 前缀。

### license（Scene6 许可证文案）

从文章关键词推断：
- 含"开源"→ `"Open Source · Free Forever"`
- 含"免费/free"→ `"Free to Use"`
- 含"商业/pro"→ `"Pro Edition Available"`
- 默认→ `"Open Source · Free Forever"`

---

## 回退机制

如果 `report.json` 不存在或 `sceneContent` 字段为空，create-remotion-project.js 使用硬编码兜底（Hysteria 代理内容）。封面图使用 `cyberpunk` 默认配色。

---

## 验证

Step 0 完成后，检查控制台输出：

```
关键词: AI代码编辑器, 智能补全, GitHub Copilot, 效率提升, 自动化
推断主题: cyberpunk
属性标签: AI代码编辑器, 智能补全, GitHub Copilot
痛点: 编码效率低重复劳动多, 调试困难Bug难定位, 文档分散查找费时
功能: AI智能补全, 极速响应, 安全加密, 开源免费
步骤: git clone ..., npm install ..., code .
[create-remotion] 读取 sceneContent:
  painPoints: 编码效率低重复劳动多, 调试困难Bug难定位, 文档分散查找费时
  tags: AI代码编辑器, 智能补全, GitHub Copilot
  features: AI智能补全, 极速响应, 安全加密, 开源免费
  steps: git clone ..., npm install ..., code .
  url: github.com/xxx/yyy
  license: Open Source · Free Forever
```

---

## 关键代码位置

| 文件 | 函数/行 | 说明 |
|-----|---------|-----|
| `generate_docs.js` | `extractKeywords()` L159 | 提取5个关键词 |
| `generate_docs.js` | `inferTheme()` L170 | 推断主题风格 |
| `generate_docs.js` | `generateAttrs()` L187 | 生成封面属性标签 |
| `generate_docs.js` | `generateSceneContent()` L249 | **生成动态场景内容** |
| `generate_docs.js` | Step0 主流程 L680 | 回写 video-config.json |
| `generate_docs.js` | `generateReport()` L631 | 写入 sceneContent 到 report.json |
| `launch.sh` | Step -1 L383 | 读取 `inferredTheme` 用于封面配色 |
| `create-remotion-project.js` | createProject() L82 | 读取 report.json sceneContent |
| `generate_cover.py` | `create_cover()` L391 | theme 参数控制配色方案 |
