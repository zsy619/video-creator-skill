# F-GENDOCS — generate_docs.js 分析

> 辅助 · 文档生成问题

## 文件索引

| 文件 | 用途 | 关键内容 |
|------|------|---------|
| `generate-docs-failures.md` | **失败模式与强制重写规程** | narration.txt 100% 失败 / 中文字数超限 / markdown 残留 |
| `generate-docs-deep-analysis.md` | 深度知识库 | stripMarkdown 问题 / 质量统计 / 修复方案 |

## 关键约束

`generate_docs.js` 生成的 narration.txt **必须人工重写**，质量门禁：
- 中文字符数 175-337
- 无 markdown 残留（`|`，`:---:`，`![]` 等）
- 每句完整，口语化