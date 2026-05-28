# video-creator/references

> **最后更新**：2026-05-28
> **用途**：video-creator 技能的持久化知识库，记录踩坑记录、解决方案和工作流程。

---

## 目录结构

| 目录 | 内容 | 定位 |
|------|------|------|
| **B-REMOTION/** | Remotion 渲染核心 | 必读 · 每次渲染前必查 |
| **C-CONTENT/** | 内容获取与音频字幕 | 必读 · Step 0-3 |
| **D-SUBAGENT/** | Subagent 超时与上下文 | 辅助 · 深度分析后必读 |
| **E-VISUAL/** | 视觉设计与封面图 | 辅助 · 封面/视觉相关 |
| **F-GENDOCS/** | generate_docs.js 分析 | 辅助 · 文档生成问题 |
| **G-WORKFLOW/** | 工作流与集成 | 辅助 · Git / Base / 优化 |
| **A-ARCHIVED/** | 已废弃文档 | **请勿使用** |

---

## 快速查询

**渲染失败 / 黑屏 / 首帧亮度问题**
→ `B-REMOTION/remotion-troubleshoot.md`

**create-remotion-project.js 生成空文件 / 双花括号 / literal `\n`**
→ `B-REMOTION/create-remotion-project-bugs.md`

**DynamicScene.tsx 完整模板（直接复制使用）**
→ `B-REMOTION/dynamic-scene-template.md`

**音频 1.2x / edge-tts 音色 / atempo**
→ `C-CONTENT/audio-tts.md`

**字幕生成（captions.json + @remotion/captions）**
→ `C-CONTENT/subtitle-production.md`

**narration.txt / article.md / README.md 生成规范**
→ `C-CONTENT/content-document-generation.md`

**Subagent 超时恢复 / Base 更新 / 清理**
→ `D-SUBAGENT/subagent-timeout.md`

**封面图方案（AI 生成 / PIL / CSS 渐变）**
→ `E-VISUAL/cover-image-rendering.md`

**主题色匹配 / 50 套配色参考**
→ `E-VISUAL/theme-palette.md`

**generate_docs.js 质量分析 / 失败模式**
→ `F-GENDOCS/generate-docs-failures.md`

**Git 隔离 / launch.sh 路径陷阱**
→ `G-WORKFLOW/git-workflow.md`

**Feishu Base 批量处理 / record_id 查询**
→ `G-WORKFLOW/feishu-base-batch.md`

---

## 修订记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-28 | 目录重组 | 建立模块 README，精简主 index，清理重复文件 |
| 2026-05-28 | 去重合并 | `duration-zero-fix.md` → `remotion-render-gotchas.md`；`pil-cover-usage.md` → `pil-cover.md`；`video-optimization-pitfalls.md` → `video-optimization.md` |
| 2026-05-24 | 目录重组 | 建立8分类结构，废弃文档移入 A-ARCHIVED |