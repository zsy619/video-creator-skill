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

## inferredTheme 主题风格

| inferredTheme | 配色方案 | 适用场景 |
|--------------|---------|---------|
| `cyberpunk` | 深紫+霓虹（青/洋红） | 科技/开源/工具 |
| `food-warm` | 暖橙+金色 | 美食/餐饮 |
| `travel-vibrant` | 天蓝+橙色 | 旅游/出行 |
| `education-calm` | 蓝绿主调 | 教育/学习 |
| `health-fresh` | 绿色清新 | 健康/运动 |
| `fashion-elegant` | 黑金配色 | 时尚/美妆 |
| `finance-professional` | 深蓝金色 | 金融/商业 |
| `gaming-neon` | 暗色霓虹 | 游戏/娱乐 |

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
