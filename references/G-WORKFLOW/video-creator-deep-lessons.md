# video-creator-deep-lessons

> **最后更新**：2026-05-30
> 来源：oh-my-pi 项目、hive 项目、notebooklm-py 项目实战

---

## 9. 已确认致命 Bug（持续追加）

### 9.1 generate_docs.js + 占位符综合症

**症状**：文档含 `github.com/xxx` 占位符；`\n` 被 markdown 处理为字面字符串 `\|`（`|` 是字面字符）；字节/字符边界混淆。

**根因**：stripMarkdown 处理时，换行符被转义或清空，导致内容碎片化。

**修复**：全文检查 `grep -rn "github.com/xxx\|\\| " docs/`，手动替换真实值。

---

### 9.2 Root.tsx durationInFrames={0}

**症状**：首帧黑屏 + 视频时长 0。

**根因**：Remotion `durationInFrames={0}` 初始值。

**修复**：`calculateMetadata` 动态计算，禁止硬编码。

---

### 9.3 CoverScene attrs 断连

**症状**：封面图底部属性标签（icon + text）不显示。

**根因**：5环节修复链路中任意一环失效导致 attrs 数据流断裂。

**修复**：5环节链路逐项检查。

---

### 9.4 voice.atempo 字段说明

**状态**：✅ 已解决（2026-05-28）

voice.atempo 字段说明已修正。

---

### 9.5 duration/scenes 近似值

**状态**：✅ 已解决（2026-05-27）

场景时长近似值问题已修复。

---

### 9.6 DURATION_FRAMES 正则 4 模式

**症状**：帧数配置有 4 种形式，无法用单一正则全覆盖。

**模式**：
- JSX 硬编码：`durationInFrames={60*60}`
- 乘法表达式：`durationInFrames={60*duration}`
- TOTAL_FRAMES 常量：`TOTAL_FRAMES`
- DURATION 别名：`DURATION`

**修复**：正则必须覆盖全部 4 种模式。

---

### 9.7 （保留）

---

### 9.8 captions endMs 缩放

**症状**：字幕末段 endMs 与视频实际时长不匹配。

**根因**：captions endMs 需要按 `scale = video_ms / cap_endms` 缩放。

**修复**：缩放公式见 `captions-endms-sync.md`。

---

### 9.9 h264x 误判

**症状**：视频编码误识别为 h264x。

**根因**：h264/h264x/libx264 三选一白名单误判。

**修复**：使用白名单验证实际编码。

---

### 9.10 （保留）

---

### 9.11 node_modules 失效

**症状**：复制 node_modules 后仍报错 module not found。

**根因**：软链接或权限问题。

**修复**：不复制，直接 npm install。

---

### 9.12 JSON trailing comma

**症状**：JSON 文件含尾随逗号，Python JSON.parse 失败。

**根因**：Python 3.9 RFC 8259 严格拒绝尾随逗号。

**修复**：去除所有尾随逗号。

---

### 9.13 audio 不确定

**症状**：音频时长与预期不符。

**根因**：ffmpeg pad/truncate 不确定性。

**修复**：永远以 ffprobe 视频时长为准。

---

### 9.14 文档时长过期引用

**状态**：✅ 已解决（2026-05-27）

---

### 9.15 AbsoluteFill flex 失效

**症状**：内容无法垂直居中。

**根因**：外层 flex 三层嵌套失效。

**修复**：transform 方案（实测偏底 888px → 最终用外层 flex 三层嵌套）。

---

### 9.16 Step 0 Bypass

**症状**：跳过 Step 0 直接进入渲染。

**根因**：12 文档门禁未强制执行。

**修复**：必须全部 12 个文档存在才能渲染。

---

### 9.17 atempo operator precedence

**症状**：atempo 三元运算符优先级陷阱。

**根因**：atempo 计算表达式优先级错误。

**修复**：用括号明确优先级。

---

### 9.18 Root.tsx calculateMetadata

**状态**：✅ 已解决（2026-05-30）

---

### 9.19 OpenClawDrive .m4a 覆写

**症状**：ffmpeg 输出到 .m4a 返回码 234。

**根因**：OpenClawDrive 挂载卷写入冲突。

**修复**：ffmpeg → /tmp/ → cp。

---

### 9.20 三字段同步

**症状**：totalMs/scenes[-1].endMs/scenes[-1].duration 不同步。

**根因**：动态计算时未同时更新三个字段。

**修复**：三字段同步更新公式。

---

### 9.21 Remotion audio 404

**状态**：✅ 已解决（2026-05-30）

---

### 9.22 narr 句数 <10 → subagent 不可信

**症状**：subagent 状态 completed 但未实际更新 Base。

**根因**：narration 句数不足时 subagent 跳过更新。

**修复**：主进程强制重写 narration，主进程自己执行 Base 更新。

---

### 9.23 patch 损坏 JSON

**症状**：patch 工具修改 JSON 文件后 JSON 语法错误。

**根因**：每次 patch 只改一个字段假设未遵守。

**修复**：严格遵守每次只改一个字段，改后立即验证。

---

### 9.24 painPoints/tags 同步

**症状**：Solution 场景渲染时 painPoints 为空，tags 缺失导致空白内容。

**根因**：Solution 场景从 painPoints 渲染，tags 缺失。

**修复**：确保 props JSON 中 painPoints 和 tags 字段完整。

---

### 9.25 JSX 双花括号语法错误

**状态**：✅ **已于 2026-05-30 在源码级修复**（`create-remotion-project.js` 第 368 行）

**症状**：React error #31 — `object with keys {hLines}`。

**根因**：`create-remotion-project.js` 生成的 DynamicScene.tsx 中含 JSX 双花括号语法。

**源码修复**：在 `scripts/create-remotion-project.js` 第 368 行：
```javascript
// 修复前（BUG）：
"  return <>{{ hLines }}{{ vLines }}</>;\n" +
// 修复后（正确）：
"  return <>{hLines}{vLines}</>;\n" +
```

**检测**：`grep 'return <>{{' video-project/src/scenes/DynamicScene.tsx`（应为 0）
**验证**：修复后重新渲染，`npx remotion render ... --log=error` 应无 React error。

---

*最后更新：2026-05-30 — 新增 Bug 9.25 JSX 双花括号语法错误*