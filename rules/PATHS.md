# 文件存储路径规范

> 所属模块：video-creator / SKILL.md → 工作流基础规范

## 标准化目录结构

项目命名规范（project_name）：

### 核心原则
- **描述性**：名称应准确反映项目内容和主题
- **简洁性**：长度适中，避免过长或过于复杂
- **一致性**：遵循统一的命名格式
- **可识别性**：便于快速理解项目性质
- **避免歧义**：使用清晰、无歧义的词汇，避免包含 video-project 等通用词汇

### 命名格式
```
{主题}-{类型}-{年份/版本} 或 {主题}-{年份/版本}
```

### 命名规则
1. **字符限制**：只使用小写字母、数字和连字符（-）
2. **长度限制**：建议 1-3 个单词，不超过 30 个字符
3. **避免使用**：空格、下划线、特殊字符和中文
4. **优先使用**：简洁的英文词汇，行业通用术语
5. **时间标识**：可在末尾添加年份（如 2024）或版本号（如 v1）

### 示例
- **主题型**：`ai-trends-2024`（人工智能趋势 2024）
- **活动型**：`product-launch-2026`（产品发布会 2026）
- **内容型**：`tech-review-series`（科技评测系列）
- **品牌型**：`company-brand-campaign`（公司品牌活动）
- **教程型**：`react-tutorial-basics`（React 基础教程）

### 项目目录结构
- 项目根目录：`workspace/{project_name}`
- 示例：`workspace/ai-trends-2024`

### 命名建议
1. **使用关键词**：包含项目核心关键词，便于搜索和识别
2. **保持一致性**：同一类型项目使用相似的命名模式
3. **避免歧义**：使用清晰、无歧义的词汇
4. **考虑 SEO**：如果项目涉及在线内容，可包含相关搜索关键词

### 非好的命名
- **使用中文**：避免使用中文命名项目，如 `项目名称-2024`
- **使用特殊字符**：如使用 `!@#$%^&*()_+` 等特殊字符
- **空格**：避免使用空格命名项目，如 `项目名称 2024`
- **示例**：wechat-video-project、new-video-project、wechat-video、toutiao-video等都不是好的命名


## 文档路径
所有生成的文件必须存储到以下路径，并生成对应的文档文件，不要有遗漏：

```
{workspace}/
└── {project-name}/              # 项目根目录
    └── docs/                    # 文档目录 (所有文档存储于此)
        ├── README.md           # 文档首页
        ├── video-script.md     # 视频脚本
        ├── copy.md             # 营销文案集
        ├── wechat-copy.md      # 公众号文案
        ├── posting-guide.md     # 多平台发布指南
        ├── landing-page.html    # 宣传落地页
        ├── article-page.html    # 文章阅读页
        ├── wechat-page.html    # 公众号适配页
        ├── session-log.md      # Session 日志（token 消耗追踪）
        └── assets/             # 视觉素材
            ├── cover.png       # 封面图（9:16竖屏）
            ├── imgs/           # 链接下载的原始图片
            └── illustrations/  # AI生成的插图/信息图
    └── video-project/         # 视频项目
        ├── src/
        ├── out/
        └── assets/
```

## 文件命名规范

| 文件类型 | 命名格式 | 示例 |
|----------|----------|------|
| 文档 | `{topic}-{type}.md` | `baoyu-skills-copy.md` |
| 公众号文案 | `wechat-copy.md` | `baoyu-skills-wechat-copy.md` |
| 视频脚本 | `video-script.md` | `baoyu-skills-video-script.md` |
| HTML 页面 | `{topic}-{page}.html` | `baoyu-skills-landing.html` |
| 公众号网页 | `wechat-page.html` | `baoyu-skills-wechat.html` |
| 封面图 | `cover.png` | `docs/assets/cover.png` |

要求一键生成 文档路径 中的所有文件，包括但不限于文件。
