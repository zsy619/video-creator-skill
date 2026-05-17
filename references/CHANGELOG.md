# CHANGELOG — video-creator Skill

## [已发布] 2026-05-17 晚间更新

### 新增参考文档
- `references/generate-docs-html-table-bug.md` — 新增 ShadowBroker 实测案例（10字 narration → 116字手动重写），补充动态 atempo 计算（0.642x）和 Python captions.json heredoc-safe 生成方式。

### 已知问题确认
- GitHub README 含 HTML 标签/表格时 `stripMarkdown()` 近乎 100% 失败，Skill 文档已记录此为已知高风险场景。

---

## 2026-05-17 上午批次（已废弃旧版）

- ⚠️ `references/feishu-base-batch-workflow.md` 已废弃（描述的错误流程导致RuView-video后全部11个项目无文档/无封面/音频混乱）
- 新增 Feishu Base 批量处理门禁规则（最高优先级入口规则）

---

## 2026-05-15 v5.x 大修订

- TTS 实测修正：3.37 字/秒安全上限
- Remotion Native 成功：音频内嵌+字幕烧录+60fps/1080×1920；三同步机制；CaptionOverlay代码；末段endMs同步；404根因
- 批量处理门禁新增：必须完整执行 Step 0-11，禁止"快速路径"