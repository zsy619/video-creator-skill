# video-creator/references 索引

> **最后更新**：2026-05-24
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
| **G-WORKFLOW/** | 工作流与集成 | 辅助 · Git / Base / 文档规范 |
| **H-CONFIG/** | 配置文件 | 参考 · baoyu / CDN / Tailwind |
| **A-ARCHIVED/** | 已废弃文档 | **请勿使用** |

---

## 快速查询

**渲染失败 / 黑屏 / 首帧亮度问题**
→ `B-REMOTION/remotion-troubleshoot.md`

**--props 不传 / durationInFrames 硬编码**
→ `B-REMOTION/remotion-render-gotchas.md`

**create-remotion-project.js 生成空文件 / 双花括号 / literal \n**
→ `B-REMOTION/create-remotion-project-bugs.md`

**DynamicScene.tsx 垂直居中 / CSS 渐变封面 / 首帧亮度验证**
→ `B-REMOTION/dynamic-scene-vertical-center.md`

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

---

## 分类文件清单

### B-REMOTION — Remotion 渲染核心

```
remotion-troubleshoot.md         # Remotion 问题排查大全（入口）
remotion-render-gotchas.md       # 三个致命陷阱：durationInFrames硬编码/props传递/输出文件名
remotion-props.md                # --props JSON构造算法 + Bash引号嵌套陷阱
remotion-dynamic-scene-debugging.md  # hive项目9次渲染调试实录
dynamic-scenes-architecture.md   # DynamicScene架构：SCENE_TYPES枚举/百分比等分
dynamic-scene-template.md        # DynamicScene.tsx完整模板（CSS渐变封面版）
dynamic-scene-vertical-center.md # 垂直居中规范 + CSS渐变封面 + 首帧亮度验证
create-remotion-project-bugs.md  # create-remotion-project.js三大Bug修复
remotion-tsx-bug.md              # ⚠️ 已废弃，内容并入 create-remotion-project-bugs.md
```

### C-CONTENT — 内容与音频字幕

```
audio-tts.md                     # 音频生产与TTS语音生成（edge-tts + 1.2x atempo）
subtitle-production.md           # 字幕生产与TikTokCaptionOverlay方案
content-document-generation.md  # 内容获取与文档生成工作流
video-workflow-failures.md      # video-creator系统性失败模式（按严重程度排序）
readme-location.md              # README位置变体（monorepo/doc子目录）
cloudflare-medium.md            # Medium.com Cloudflare blocking
```

### D-SUBAGENT — Subagent 管理

```
subagent-timeout.md              # 超时恢复指南（launch.sh / Base更新 / 清理）
subagent-context-preservation.md # 会话压缩上下文丢失 + narration.txt损坏防护
```

### E-VISUAL — 视觉设计

```
theme-palette.md                 # 50套主题配色参考
theme-matching.md                # 主题匹配系统（sceneContent动态化）
cover-font.md                    # 封面字体选择规范
cover-image-rendering.md          # 封面图渲染失败诊断（2026-05-23最终修订）
video-visual.md                  # 视频视觉设计与场景增强
pil-cover.md                     # PIL本地封面生成（无AI API时备用）
```

### F-GENDOCS — generate_docs.js 分析

```
generate-docs-failures.md        # 失败模式与强制重写规程
generate-docs-deep-analysis.md  # 深度知识库（stripMarkdown问题/质量统计）
```

### G-WORKFLOW — 工作流与集成

```
feishu-base-batch.md             # Feishu Base批量视频处理（record_id查询/更新）
git-workflow.md                  # Git工作流与目录分离规范
documentation-consistency.md     # 文档一致性维护指南
node-execsync-bug.md             # Node.js execSync返回值bug（macOS arm64）
video-optimization.md            # 视频性能优化与质量门禁
```

### H-CONFIG — 配置文件

```
baoyu-config.json                # baoyu技能配置（url-to-markdown/cover-image等）
cdn-mapping.json                 # CDN映射：中国/全球/fallback字体配置
tailwind-config.json            # Tailwind主题扩展配置（cyberpunk/neon/tech）
```

### A-ARCHIVED — 已废弃文档（请勿使用）

```
feishu-base-completion.bak.md    # 旧版手动流程，已被launch.sh all替代
launch-sh.md                    # ⚠️ 已废弃
one-pass.bak.md                 # ⚠️ 已废弃
remotion-render-output.md       # ⚠️ 已废弃
```

---

## 修订记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-24 | 目录重组 | 建立8分类结构，废弃文档移入A-ARCHIVED |
| 2026-05-24 | 去重合并 | remotion-tsx-bug.md 内容并入 create-remotion-project-bugs.md |
| 2026-05-24 | 清理 | feishu-base-batch.md 旧版从 archived 移出删除，保留有效版本 |