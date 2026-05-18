# CHANGELOG — video-creator Skill

## [已发布] 2026-05-18 References 文档优化

### 合并与归档

- **5大合并**：将30个参考文档优化为18个主文件 + archived/ 目录
  - `subagent-timeout-recovery.md` ← `launch-sh-reference` + `subagent-timeout-recovery` + `feishu-base-补全流程` + `remotion-render-output-filename`
  - `audio-tts.md` ← `tts-production` + `audio-production`
  - `remotion-troubleshoot.md` ← `remotion-compilation-errors` + `remotion-rendering-issues` + `remotion-project-creation` + `remotion-composition-id`
  - `subtitle-production.md` ← `remotion-native` + `ass-subtitle-production`
  - `content-document-generation.md` ← `content-workflow` + `generate-docs-html-table-bug` + `generate-docs-known-issues`
- **归档**：`archived/` 目录存放废弃文件（feishu-base-batch-workflow.md、one-pass-workflow.md、remotion-render-output-filename.md、feishu-base-补全流程.md、launch-sh.md）
- **重命名**：`feishu-base-api.md` → `feishu-base-api-reference.md`
- **精简**：`openhuman-narration-template.md`（从62行压缩至示例+教训两部分）

### 删除的冗余文件

- `tts-production.md`（已合并至 audio-tts.md）
- `audio-production.md`（已合并至 audio-tts.md）
- `remotion-compilation-errors.md`（已合并至 remotion-troubleshoot.md）
- `remotion-rendering-issues.md`（已合并至 remotion-troubleshoot.md）
- `remotion-project-creation.md`（已合并至 remotion-troubleshoot.md）
- `remotion-composition-id.md`（已合并至 remotion-troubleshoot.md）
- `remotion-native.md`（已合并至 subtitle-production.md）
- `ass-subtitle-production.md`（已合并至 subtitle-production.md）
- `content-workflow.md`（已合并至 content-document-generation.md）
- `generate-docs-html-table-bug.md`（已合并至 content-document-generation.md）
- `generate-docs-known-issues.md`（已合并至 content-document-generation.md）
- `captions-json-python-generation.md`（已合并至 content-document-generation.md）
- `feishu-base-batch-workflow.md`（已归档至 archived/）
- `one-pass-workflow.md`（已归档至 archived/）
- `remotion-render-output-filename.md`（已归档至 archived/）
- `feishu-base-补全流程.md`（已归档至 archived/）
- `launch-sh.md`（已归档至 archived/）

---

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
