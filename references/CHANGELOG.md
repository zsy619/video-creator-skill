# references/ 重组变更日志

> **日期**：2026-06-01
> **操作人**：video-creator 技能维护

---

## 变更摘要

本次重组为第 3 次规范化，保留了现有的 8 分类目录结构（B-REMOTION / C-CONTENT / D-SUBAGENT / E-VISUAL / F-GENDOCS / G-WORKFLOW / H-CONFIG / A-ARCHIVED），仅对内容重复和废弃文件进行清理，未改变整体架构。

---

## 文件变更

### 新增

| 文件 | 位置 | 说明 |
|------|------|------|
| `video-project-sessions.md` | `G-WORKFLOW/` | 由两个 session 实录合并而来 |

### 合并

| 原始文件 → 目标 | 合并内容 |
|----------------|---------|
| `peekdesktop-video-session.md` + `github-repo-video-session.md` → `video-project-sessions.md` | 两个 session 实录合并为一个，含 margelo/react-native-graph 和 shanselman/PeekDesktop 全流程 |
| `launch-sh-post-mortem.md` → `D-SUBAGENT/subagent-takeover.md`（附录 C） | 7 步恢复 checklist 并入 takeover 文档作为附录 C |

### 删除

| 文件 | 位置 | 删除原因 |
|------|------|---------|
| `github-repo-video-session.md` | `G-WORKFLOW/` | 已并入 `video-project-sessions.md` |
| `peekdesktop-video-session.md` | `G-WORKFLOW/` | 已并入 `video-project-sessions.md` |
| `launch-sh-post-mortem.md` | `G-WORKFLOW/` | 已并入 `D-SUBAGENT/subagent-takeover.md` 附录 C |
| `subagent-timeout.md` | `D-SUBAGENT/` | 已并入 `subagent-takeover.md` 附录 D（超时恢复详细版） |
| `one-pass.bak.md` | `A-ARCHIVED/` | 明确标注废弃，内容无保留价值 |

### 引用更新

| 文件 | 更新内容 |
|------|---------|
| `references/README.md` | 更新 A-ARCHIVED 条目；快速查询指向 `subagent-takeover.md`（含附录 B+C+D）；D-SUBAGENT 索引表更新（删除 subagent-timeout.md，新增附录 D） |
| `D-SUBAGENT/README.md` | 文件索引表完全重写（删除 subagent-timeout.md 行） |
| `G-WORKFLOW/README.md` | 更新文件索引表，标注合并历史 |
| `G-WORKFLOW/main-process-takeover.md` | 引用更新：subagent-timeout.md → subagent-takeover.md 附录 D |
| `G-WORKFLOW/feishu-base-batch.md` | 引用更新：subagent-timeout.md → subagent-takeover.md 附录 D |
| `SKILL.md` | 3 处引用更新（快速查询表/D-SUBAGENT索引/规则注释）；G-WORKFLOW 文件索引表更新（删除 subagent-timeout.md）；移除 frame-sync-regex-patterns.md 残留引用 |

---

## 目录结构（未变动）

```
references/
├── A-ARCHIVED/     ← 已清空有效文件
├── B-REMOTION/      ← Remotion 渲染核心
├── C-CONTENT/       ← 内容与音频字幕
├── D-SUBAGENT/      ← Subagent 管理（含新增附录 C + 附录 D）
├── E-VISUAL/        ← 视觉设计
├── F-GENDOCS/       ← generate_docs.js 分析
├── G-WORKFLOW/      ← 工作流与集成（含新增 video-project-sessions.md）
├── H-CONFIG/        ← 配置文件
└── README.md        ← 主索引
```

---

## 决策说明

### 为什么合并 session 实录
两个文件（199行 + 137行）均属于 session-specific 知识银行，内容高度重复（流程章节结构几乎相同），各含独特信息片段。合并后保留全部独特内容（margelo 的 fix-remotion-project.js 失败实录 + PeekDesktop 的 narration split pattern 发现），同时建立统一的通用流程模板和验证命令库。

### 为什么删除 launch-sh-post-mortem.md
该文件的 Step 1-7 checklist 与 `subagent-takeover.md` 附录 B 的接管流程高度重叠，仅增加了部分 Step 3 Python 脚本片段。核心 recovery 逻辑已存在，删除冗余文件降低维护负担。

### 为什么删除 one-pass.bak.md
该文件已明确标注为废弃（"⚠️ 已废弃"），且无任何内容摘要或索引引用其存在。删除后 A-ARCHIVED 目录已无有效文件。

### 为什么删除 subagent-timeout.md
该文件内容与 `subagent-takeover.md` 高度重叠（有 5 处重复描述），但包含 3 个独特信息片段（恢复决策树/.mp4 文件名陷阱/launch.sh 路径陷阱 D.10 节）。这些独特内容已并入 `subagent-takeover.md` 附录 D，`subagent-timeout.md` 删除后信息零丢失。

### 为什么删除 frame-sync-regex-patterns.md 引用
该文件已不存在（合并入 `frame-sync-workflow.md` 第6节），SKILL.md 中的引用为残留死链，已移除。

---

## 历史版本

| 日期 | 变更 |
|------|------|
| 2026-05-30 | 第2次重组：合并 index.md → README.md；H-CONFIG 新增 README；所有子目录 README 补全元数据 |
| 2026-05-29 | 第2次重组：edge-tts-ffprobe-params.md → C-CONTENT/audio-tts.md；subagent-handover.md → D-SUBAGENT/subagent-takeover.md |
| 2026-05-28 | 第1次重组：建立 8 分类结构，废弃文档移入 A-ARCHIVED |
| 2026-05-24 | 初始结构：8 个子目录建立 |
