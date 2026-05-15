# Changelog — video-creator 技能演进记录

> 记录技能迭代中的 Bug 发现、冲突解决、根因分析。
> **目的**：避免同一问题重复修复，让后人快速理解为什么规范是现在的值。

---

## [Unreleased]

### 核心发现
- **⚠️ 作废（2026-05-14 修正）**：`CaptionOverlay` 字幕在 Remotion Native 方案中**确实进入 MP4 帧**。CaptionOverlay 是 React 组件，通过 `<Sequence>` + 绝对定位 `<div>` 在每一帧渲染时将字幕绘制进画面，最终 MP4 包含烧录后的字幕。CHANGELOG 此条记录**基于早期错误认知（以为 HTML overlay 不进 MP4），现已废弃**。
- **fontconfig 重要性**：macOS 上 libass 需 `~/.config/fontconfig/fonts.conf` 指向 `/System/Library/Fonts`

## 2026-05-13 — 语速实测修正 + Remotion Native 成功案例

### 核心发现：edge-tts 实际语速 vs 规范值

**问题**：技能规范长期使用 6.45 字/秒（`⌊目标时长 × 6.45⌋`），源自高密度短句测试。实际项目旁白含大量英文、符号、长复合句，朗读速度显著更慢。

**实测数据（2026-05-13）**：
- `rate +0%` + `atempo 1.2x` → **3.73 中文字符/秒**
- 294字 → 78.9秒
- 184字 → 52.8秒（目标达成）

**修正值**：
| 目标时长 | 旧安全字数 | **新安全字数** | 依据 |
|---------|-----------|--------------|------|
| 52秒 | 330字 | **175字** | 52 × 3.37 = 175 |
| 60秒 | 390字 | **202字** | 60 × 3.37 = 202 |

**公式**：`⌊目标时长 × 3.37⌋`（3.37 = 3.73 × 0.9，留 10% 余量）

**受影响文件**：SKILL.md（多处表格+公式）、 rules/VOICE.md、references/tts-production.md

### 核心发现：Remotion Native 在 Mac M1 headless 可用

**旧结论**：Mac M-series headless 必须用 ffmpeg 兜底（PIL帧序列）。

**新发现（2026-05-13）**：
- Remotion 4.0.459 在 Mac M1 headless（Node v24）下**成功渲染**
- 3169帧@60fps，约 52.8 秒，68MB，H.264+AAC
- 修复了 3 个 esbuild bundling 错误后渲染正常通过
- **ffmpeg 混流不再是必须路径**

**成功渲染命令**：
```bash
npx remotion render VerticalVideo out/final.mp4 \
  --concurrency=4 --fps=60 --disable-gpu
```

**需修复的 esbuild 错误**：
1. `themes/index.ts` 连字符 key：`tech-modern:` → `"tech-modern":`（29个 key 全部需引号）
2. `Scene4_Features.tsx` JSX语法错误：`color="#00FF88"}` → `color="#00FF88"`
3. `ProtocolBadge` 缺少 `delay` prop：补全缺失参数

### 修复内容

#### P1 — 语速实测修正

| 文件 | 修复 |
|------|------|
| `SKILL.md` | 表格数值 330→175（52秒），公式 `×6.45` → `×3.37`，增加 6.45/3.37 差异说明 |
| `rules/VOICE.md` | 同上 |
| `references/tts-production.md` | 表格更新，补充实测数据 |

#### P2 — Remotion Native 成功路径记录

| 文件 | 修复 |
|------|------|
| `rules/TROUBLESHOOTING.md` | 新增"Remotion Native 渲染成功案例"章节 |
| `references/remotion-native.md` | 补充 `tech-modern` 引号问题、JSX语法错误、ProtocolBadge prop 问题 |

---

## 2026-05-10 — 大规模修订（v5.x 统一版）

### 问题诊断

每次生成视频要反复修订音频、字幕（格式/位置/大小）、画面与字幕与音频同步问题，进行了多轮修订才能达到效果。

**5个根因**：
1. **包名错误** — 技能文档说 `@remotion/core`，npm 不存在（404）
2. **Text 组件不存在** — Remotion 4.x exports 中无 Text，导致 React Error #130
3. **字幕规范冲突** — 5套不同的字号规范（10/12/18/36/72px）并存，无权威
4. **ms() 时间戳 Bug** — 3位毫秒 vs 2位厘秒混用，时间轴错误
5. **文本长度无约束** — 配音文本无限长，atempo 补救形成反模式

### 修复内容

#### P1 — 质量门禁升级

| 文件 | 修复 |
|------|------|
| `scripts/video-quality-gate.js` | 新增 C1-C6 检查项：package.json包名、`<Text>`组件、node_modules/remotion存在性、Sequence全局帧误用 |
| `scripts/launch.sh` | render 命令强制 gate render 节点通过 |
| `rules/WORKFLOW.md` | Step 7/8/10 前加强制 gate 调用 |
| `rules/VOICE.md` | 新增文本长度→目标时长强约束表 |
| `SKILL.md` | 4.0.448→4.0.459，删除 @remotion/* 错误引用说明 |

#### P2 — 文档权威统一

| 文件 | 修复 |
|------|------|
| `SKILL.md` | 更新致命错误修复记录，统一规范描述 |
| `rules/SUBTITLES.md` | 新增"规范冲突记录"表，废弃值明确标注 |
| `rules/VOICE.md` | 新增"文本长度→目标时长"强约束章节 |
| `references/remotion-compilation-errors.md` | 保留作为权威参考（已验证正确） |

#### P3 — 脚本增强

| 文件 | 修复 |
|------|------|
| `scripts/pre-subtitle-check.js` | 新增 checkTextLength() 函数，支持 `--target-duration` 参数 |
| `rules/SUBTITLES.md` | 新增验证命令节 |

#### P4 — 清理失效文档

| 操作 | 说明 |
|------|------|
| 删除 `subtitle-fontsize-fix.md` | 被 SUBTITLES.md 统一规范取代 |
| 删除 `subtitle-fontsize-verified.md` | 被 SUBTITLES.md 统一规范取代 |
| 删除 `fontsize-template-fix.md` | 被 SUBTITLES.md 统一规范取代 |
| 新建 `CHANGELOG.md` | 本文件 |

#### P5 — 一键启动增强

| 文件 | 修复 |
|------|------|
| `scripts/launch.sh --all` | 所有 gate 节点失败则退出，不继续 |

---

## 演进履历

### 包名问题

| 日期 | 发现内容 | 影响 |
|------|---------|------|
| 2026-05-10 | `@remotion/core` 在 npm 不存在（只有 1.0.0-y.x prerelease） | EISDIR 错误 / React Error #130 |
| 2026-05-10 | 正确包名是 `remotion`（无 @ 作用域） | 所有使用 @remotion/core 的项目从第一天就无法运行 |

**修复**：所有文档统一为 `remotion` + `@remotion/cli`。

### Text 组件问题

| 日期 | 发现内容 | 影响 |
|------|---------|------|
| 2026-05-10 | `remotion` 4.0.459 只有 47 个 exports，**无 Text** | `<Text>` → `React.createElement(undefined)` → Error #130 |

**修复**：所有 `<Text>` 改为 `<div>` + inline style。

### 字幕字号冲突

| 规范来源 | 值 | 问题 |
|---------|---|------|
| 早期参考文档 | 10px | 竖屏完全不可读 |
| FONTS.md 早期版 | 12px | 同上 |
| 某次调试记录 | 18px | 仍然太小 |
| 又一次尝试 | 36px | 仍然偏小 |
| **最终正确值** | **72px** | 约40px视觉，竖屏可读 |

**修复**：SUBTITLES.md 为最终权威，所有旧文档删除。

### ms() 时间戳 Bug

| 症状 | 根因 |
|------|------|
| `0:04:00.00` 被解析为 4 分钟而非 4 秒 | 正则 `/\d+/g` 匹配了所有数字含前导零 |
| ASS 时间格式 | 3位毫秒 → 2位厘秒（centiseconds） |

**修复**：`subtitle-generator.js` 中 msToTime() 和 timeToMs() 已修复。

### atempo 反模式

| 症状 | 根因 |
|------|------|
| 配音文本过长 → 音频超长 → 用 atempo 1.5x+ 补救 → 音质下降 + 时长仍不匹配 | 没有在生成配音前校验文本长度 |

**修复**：VOICE.md 新增文本长度约束，pre-subtitle-check.js 新增 checkTextLength()。

---

## 规范权威链（冲突时以此为准）

```
最终权威: rules/SUBTITLES.md（2026-05-10 验证通过）
    ↓
失效文档（已删除）:
  - subtitle-fontsize-fix.md
  - subtitle-fontsize-verified.md
  - fontsize-template-fix.md
```

---

## 关键文件说明

| 文件 | 用途 |
|------|------|
| `SKILL.md` | 技能入口，流程概览，强制规范 |
| `rules/WORKFLOW.md` | 12步详细流程，每步强制检查 |
| `rules/SUBTITLES.md` | 字幕格式最终权威（取代所有旧字号文档） |
| `rules/VOICE.md` | 音频生成铁律 + 文本长度约束 |
| `rules/FONTS.md` | 视频内字体规范（≠字幕规范） |
| `scripts/video-quality-gate.js` | 一键质量门禁（audio/subtitle/render/final） |
| `scripts/launch.sh` | 一键启动脚本 |
| `scripts/pre-subtitle-check.js` | 字幕前置检查（含文本长度校验） |
| `references/remotion-compilation-errors.md` | Remotion 包名 + exports 权威验证 |
