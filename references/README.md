# video-creator/references

> **最后更新**：2026-05-30
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

| 文件 | 用途 | 关键内容 |
|------|------|---------|
| `remotion-troubleshoot.md` | **入口总览** | 问题排查大全：Composition ID / esbuild 错误 / Sequence 黑屏 / 字幕缺失 |
| `remotion-render-gotchas.md` | **3大致命陷阱** | durationInFrames 硬编码 / staticFile 404 / atempo 配置值被覆盖 |
| `remotion-props.md` | `--props` JSON 构造 | Bash 引号嵌套陷阱 / getAudioDuration |
| `create-remotion-project-bugs.md` | 项目创建 Bug | 双花括号 / literal `\n` / launch.sh Permission Denied / 主进程接管 |
| `dynamic-scene-template.md` | **完整 TSX 模板** | 可直接复制使用的 DynamicScene.tsx（含 CSS 渐变封面） |
| `dynamic-scene-vertical-center.md` | 垂直居中规范 | CSS 渐变封面 + 首帧亮度验证（ffmpeg + numpy） |
| `dynamic-scenes-architecture.md` | 场景架构 | SCENE_TYPES 枚举 / 百分比等分 / name 路由 |
| `remotion-dynamic-scene-debugging.md` | 调试实录 | hive 项目 9 次渲染调试完整记录 |
| `scenes-config-pattern.md` | 场景配置模式 | 场景配置数据结构 |
| `frame-round-calculation.md` | 帧数 round() 规范 | `Math.round()` 而非 `Math.ceil()` / Python `round()` / 4种帧数配置正则全覆盖 |

### C-CONTENT — 内容与音频字幕

| 文件 | 用途 | 关键内容 |
|------|------|---------|
| `audio-tts.md` | **音频生产完整流程** | edge-tts + ffmpeg atempo + 音色选择；含 launch.sh audio 是空壳的发现 |
| `subtitle-production.md` | **字幕生成** | captions.json + @remotion/captions；SRT 解析；TikTokCaptionOverlay |
| `content-document-generation.md` | 文档生成工作流 | Step 0 generate_docs.js / narration.txt 生成规范 / README 位置变体 |
| `video-workflow-failures.md` | 已知系统性失败模式 | 按严重程度排序；Subagent Step 0 Bypass 等 5 种模式 |
| `cloudflare-medium.md` | Medium Cloudflare 拦截 | curl 绕过方案 |
| `readme-location.md` | README 位置变体 | monorepo / doc 子目录检测逻辑 |

### D-SUBAGENT — Subagent 管理

| 文件 | 用途 | 关键内容 |
|------|------|---------|
| `subagent-timeout.md` | **超时恢复指南** | delegate_task 600s 超时 / launch.sh 整体耗时 / SIGBUS / 主进程接管流程 |
| `subagent-takeover.md` | **超时接管 + 主进程接管流程** | 强制验证步骤 / Root.tsx 修复 / 接管命令 |
| `subagent-context-preservation.md` | **会话压缩防护** | context compaction 后上下文丢失 / narration.txt 损坏 / references 文件写入规则 |

### E-VISUAL — 视觉设计

| 文件 | 用途 | 关键内容 |
|------|------|---------|
| `cover-image-rendering.md` | **封面图渲染失败诊断** | staticFile 404 / import PNG 失效 / CSS 渐变唯一可靠 / base64 data URL 最终方案 |
| `pil-cover.md` | **PIL 本地封面生成** | 无 AI API 时的备用方案，含 alpha_composite 注意事项 |
| `theme-palette.md` | 50 套主题配色参考 | cyberpunk / neon / tech / minimal 等主题色板 |
| `theme-matching.md` | 主题匹配系统 | sceneContent 动态化 / 主题色板映射 |
| `cover-font.md` | 封面字体选择规范 | 中文字体选择建议 |
| `pil-cover-attrs-rendering.md` | PIL 标签属性渲染 | attrs 标签带渲染注意事项 |
| `bulk-cover-generation.md` | 批量封面生成 | 从 video-config.json 读取并批量生成三尺寸封面 |
| `video-visual.md` | 视频视觉设计与场景增强 | 视觉设计原则 |

### F-GENDOCS — generate_docs.js 分析

| 文件 | 用途 | 关键内容 |
|------|------|---------|
| `generate-docs-failures.md` | **失败模式与强制重写规程** | narration.txt 100% 失败 / 中文字数超限 / markdown 残留 |
| `generate-docs-deep-analysis.md` | 深度知识库 | stripMarkdown 问题 / 质量统计 / 修复方案 |

### G-WORKFLOW — 工作流与集成

| 文件 | 用途 | 关键内容 |
|------|------|---------|
| `git-workflow.md` | **Git 工作流与目录分离** | `{repo}/` vs `{repo}/{repo}-repo/` 隔离规范 / launch.sh init 自动隔离 |
| `feishu-base-batch.md` | **Feishu Base 批量处理** | record_id 查询 / 批量更新 / 受影响项目列表 |
| `feishu-base-pagination.md` | Base 分页查询陷阱 | limit=20 返回 100 条 / has_more 误判 |
| `lark-cli-base-record-update.md` | lark-cli Base 记录更新 | record_id 查询 / 批量更新语法 |
| `node-execsync-bug.md` | Node.js execSync 返回值 bug | macOS arm64 信号处理问题 |
| `video-optimization.md` | **视频优化与质量门禁** | 首帧亮度验证 / 码率检查 |
| `video-creator-deep-lessons.md` | video-creator 深度教训 | 关键经验总结（教训1-4 + SKILL.md 迁移Bug） |
| `documentation-consistency.md` | 文档一致性维护指南 | copy.md / article.md / narration.txt 一致性规范 |
| `frame-sync.md` | 帧同步 | 音频/字幕/视频帧同步 |
| `audio-duration-mismatch.md` | 音画同步 | atempo 与音频时长匹配 |
| `captions-endms-sync.md` | 字幕末端 ms 同步 | captions.json 末段 endMs 用视频实际时长校准 |
| `batch-duration-fix-20260527.md` | 批量时长修复记录 | 7 个项目的修复记录 |
| `video-config-cover-attrs.md` | video-config.json cover.attrs | attrs 字段规范 |

### H-CONFIG — 配置文件

| 文件 | 用途 | 关键内容 |
|------|------|---------|
| `baoyu-config.json` | baoyu 技能配置 | url-to-markdown / cover-image 等 |
| `cdn-mapping.json` | CDN 映射 | 中国/全球/fallback 字体配置 |
| `tailwind-config.json` | Tailwind 主题扩展 | cyberpunk / neon / tech |

> H-CONFIG/ 目录为自动化配置目录，配置文件由系统自动生成和引用，**请勿手动修改**。

### A-ARCHIVED — 已废弃文档（请勿使用）

| 文件 | 说明 |
|------|------|
| `one-pass.bak.md` | ⚠️ 已废弃 |

---

## 修订记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-30 | 合并 / 规范化 | 合并 `index.md` 到 `README.md`；H-CONFIG/ 新增 README；所有子目录 README 补全元数据 |
| 2026-05-29 | 合并优化 | `G-WORKFLOW/edge-tts-ffprobe-params.md` → `C-CONTENT/audio-tts.md` 附录E；`G-WORKFLOW/subagent-handover.md` → `D-SUBAGENT/subagent-takeover.md` 附录B |
| 2026-05-28 | 去重删除 | 删除 `duration-zero-fix.md`（并入 `remotion-render-gotchas.md`）、`remotion-tsx-bug.md`（并入 `create-remotion-project-bugs.md`）、`launch-sh.md`（内容并入 `subagent-timeout.md`） |
| 2026-05-28 | 内容合并 | `pil-cover-usage.md` → `pil-cover.md`；`video-optimization-pitfalls.md` → `video-optimization.md` |
| 2026-05-28 | 目录重组 | 7 个子目录各新增 `README.md`，主 `index.md` 精简为快速索引 |
| 2026-05-24 | 目录重组 | 建立 8 分类结构，废弃文档移入 A-ARCHIVED |
