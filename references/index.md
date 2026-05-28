# video-creator/references 索引

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
| **H-CONFIG/** | 配置文件 | 参考 · baoyu / CDN / Tailwind |
| **A-ARCHIVED/** | 已废弃文档 | **请勿使用** |

---

## 快速查询

**渲染失败 / 黑屏 / 首帧亮度问题**
→ `B-REMOTION/remotion-troubleshoot.md`

**--props 不传 / durationInFrames 硬编码**
→ `B-REMOTION/remotion-render-gotchas.md`

**create-remotion-project.js 生成空文件 / 双花括号 / literal `\n`**
→ `B-REMOTION/create-remotion-project-bugs.md`

**DynamicScene.tsx 完整模板（直接复制使用）**
→ `B-REMOTION/dynamic-scene-template.md`

**音频 1.2x / atempo / edge-tts 音色**
→ `C-CONTENT/audio-tts.md`

**字幕生成（captions.json + @remotion/captions）**
→ `C-CONTENT/subtitle-production.md`

**narration.txt / article.md / README.md 生成规范**
→ `C-CONTENT/content-document-generation.md`

**已知系统性失败模式（按严重程度排序）**
→ `C-CONTENT/video-workflow-failures.md`

**Subagent 超时恢复 / Base 更新 / 清理**
→ `D-SUBAGENT/subagent-timeout.md`

**会话压缩上下文丢失 / narration.txt 损坏**
→ `D-SUBAGENT/subagent-context-preservation.md`

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

**视频优化 / 性能 / 质量门禁**
→ `G-WORKFLOW/video-optimization.md`

---

## 分类文件清单

### B-REMOTION — Remotion 渲染核心

```
remotion-troubleshoot.md           # Remotion 问题排查大全（入口）
remotion-render-gotchas.md         # 三个致命陷阱：duration硬编码/props传递/atempo覆盖
remotion-props.md                  # --props JSON 构造算法 + Bash 引号嵌套陷阱
remotion-dynamic-scene-debugging.md # hive 项目 9 次渲染调试实录
dynamic-scenes-architecture.md     # DynamicScene 架构：SCENE_TYPES 枚举/百分比等分
dynamic-scene-template.md          # DynamicScene.tsx 完整模板（CSS 渐变封面版）
dynamic-scene-vertical-center.md    # 垂直居中规范 + 首帧亮度验证
create-remotion-project-bugs.md    # create-remotion-project.js 三大 Bug 修复
scenes-config-pattern.md           # 场景配置数据结构模式
```
> ⚠️ `duration-zero-fix.md` 和 `remotion-tsx-bug.md` 已删除，内容并入 `remotion-render-gotchas.md` 和 `create-remotion-project-bugs.md`

### C-CONTENT — 内容与音频字幕

```
audio-tts.md                       # 音频生产与 TTS 语音生成（edge-tts + 1.2x atempo）
subtitle-production.md             # 字幕生产与 TikTokCaptionOverlay 方案
content-document-generation.md     # 内容获取与文档生成工作流
video-workflow-failures.md         # video-creator 系统性失败模式（按严重程度排序）
readme-location.md                 # README 位置变体（monorepo / doc 子目录）
cloudflare-medium.md               # Medium.com Cloudflare 拦截
audio-tempo-user-patterns.md       # atempo 用户偏好（YunjianNeural vs YunxiNeural）
```

### D-SUBAGENT — Subagent 管理

```
subagent-timeout.md               # 超时恢复指南（launch.sh / Base 更新 / 清理）
subagent-context-preservation.md  # 会话压缩上下文丢失 + narration.txt 损坏防护
```

### E-VISUAL — 视觉设计

```
theme-palette.md                  # 50 套主题配色参考
theme-matching.md                 # 主题匹配系统（sceneContent 动态化）
cover-font.md                     # 封面字体选择规范
cover-image-rendering.md          # 封面图渲染失败诊断（base64 data URL 最终方案）
video-visual.md                   # 视频视觉设计与场景增强
pil-cover.md                      # PIL 本地封面生成（含 pil-cover-usage.md 内容合并）
pil-cover-attrs-rendering.md      # PIL 标签属性渲染
bulk-cover-generation.md          # 批量封面生成
```

### F-GENDOCS — generate_docs.js 分析

```
generate-docs-failures.md         # 失败模式与强制重写规程
generate-docs-deep-analysis.md   # 深度知识库（stripMarkdown 问题/质量统计）
```

### G-WORKFLOW — 工作流与集成

```
feishu-base-batch.md             # Feishu Base 批量视频处理（record_id 查询/更新）
git-workflow.md                   # Git 工作流与目录分离规范
documentation-consistency.md      # 文档一致性维护指南
node-execsync-bug.md              # Node.js execSync 返回值 bug（macOS arm64）
video-optimization.md             # 视频性能优化与质量门禁（含 video-optimization-pitfalls.md 内容合并）
audio-duration-mismatch.md        # 音画同步（atempo 与音频时长匹配）
captions-endms-sync.md            # 字幕末端 ms 同步
batch-duration-fix-20260527.md    # 批量时长修复记录
video-config-cover-attrs.md       # video-config.json cover.attrs 字段规范
video-creator-deep-lessons.md     # video-creator 深度教训
subagent-handover.md             # Subagent 交接规范
frame-sync.md                     # 帧同步
frame-sync-regex-patterns.md      # 帧同步正则模式
```

### H-CONFIG — 配置文件

```
baoyu-config.json                 # baoyu 技能配置（url-to-markdown / cover-image 等）
cdn-mapping.json                  # CDN 映射：中国/全球/fallback 字体配置
tailwind-config.json             # Tailwind 主题扩展配置（cyberpunk / neon / tech）
```

### A-ARCHIVED — 已废弃文档（请勿使用）

```
feishu-base-completion.bak.md    # 旧版手动流程，已被 launch.sh all 替代
one-pass.bak.md                  # ⚠️ 已废弃
remotion-render-output.md        # ⚠️ 已废弃
launch-sh.md                     # ⚠️ 已废弃，内容并入 subagent-timeout.md
```

---

## 修订记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-28 | 去重删除 | 删除 `duration-zero-fix.md`（并入 `remotion-render-gotchas.md`）、`remotion-tsx-bug.md`（并入 `create-remotion-project-bugs.md`）、`launch-sh.md`（内容并入 `subagent-timeout.md`） |
| 2026-05-28 | 内容合并 | `pil-cover-usage.md` → `pil-cover.md`；`video-optimization-pitfalls.md` → `video-optimization.md` |
| 2026-05-28 | 目录重组 | 7 个子目录各新增 `README.md`，主 `index.md` 精简为快速索引 |
| 2026-05-24 | 目录重组 | 建立 8 分类结构，废弃文档移入 A-ARCHIVED |