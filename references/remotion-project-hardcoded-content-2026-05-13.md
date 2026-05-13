# Video Creator 架构缺陷：create-remotion-project.js 的硬编码问题

> **审计时间**：2026-05-13
> **严重程度**：架构级（每次生成都产生错误内容）

---

## 核心问题

`create-remotion-project.js` 生成的6个场景组件使用**硬编码的通用内容**，与实际项目完全无关：

```javascript
// Scene1_Cover.tsx — 标题永远是"视频标题"
title: "视频标题"
subtitle: "副标题"

// Scene2_PainPoint.tsx — 硬编码痛点
const PAIN_POINTS = [
  "网络延迟高，游戏卡顿",   // ← 通用痛点
  "视频缓冲，转圈圈",
  "访问缓慢，工作效率低",
]

// Scene3_Solution.tsx — 硬编码标签
const TAGS = ["QUIC 协议", "智能加速", "多平台支持"]  // ← Hysteria相关

// Scene5_Start.tsx — 硬编码 Hysteria 命令
const STEPS = [
  { cmd: "brew install hysteria", desc: "一键安装" },  // ← Hysteria
  { cmd: "hysteria server -c config.yaml", desc: "启动服务" },
]
```

**结果**：无论项目是 AI-Trader、react-doctor 还是任何其他项目，生成的视频内容完全相同，都是"Hysteria推广视频"。

---

## 为什么之前能生成正确内容

之前成功的 AI-Trader 和 react-doctor 项目，是因为**完全绕过了 `create-remotion-project.js`**，由 AI 手动编写 `Entry.tsx` 和 `Root.tsx`，内容来自实际项目分析。

"成功"靠的是绕过技能，而不是技能的脚本工作正常。

---

## 正确的做法

视频内容必须由 AI 根据 `docs/article.md` 的实际内容生成，Remotion 项目只需要提供：
1. 正确的 Composition 注册模式（fps/duration 从 config 读取）
2. 场景组件的**结构框架**（封面动画、字幕叠加、序列布局）
3. 主题配置（颜色、字体、动画曲线）

**不应该**在模板中硬编码任何业务相关内容。

---

## 已修复的部分

| 问题 | 状态 | 说明 |
|------|------|------|
| fps/duration 硬编码 | ✅ 已修复 | 从 video-config.json 读取 |
| 标题硬编码 | ✅ 已修复 | 从 config.cover.title 读取 |
| zod 版本 | ✅ 已修复 | 3.4.0 → 4.3.6 |
| 封面帧号 | ✅ 已修复 | 添加 N-2 规则 |
| **场景内容硬编码** | ❌ **未修复** | 架构层面，需要重构 |

---

## 临时解决方案

对于当前项目，AI 必须：
1. 不使用 `create-remotion-project.js` 的场景组件
2. 手动编写 Entry.tsx / Root.tsx，内容来自 `docs/article.md` 分析
3. `create-remotion-project.js` 只用于生成 Composition 结构框架

---

## 长期解决方案

`create-remotion-project.js` 需要重构为**内容无关的脚手架生成器**：

```javascript
// 输出应该只有：
// - video-project/ 目录结构
// - Remotion 配置文件
// - 空白的 Entry.tsx / Root.tsx（仅有占位注释）
// - 正确的 CaptionOverlay.tsx
// - 主题配置

// 场景内容由 AI 根据 article.md 动态生成到 Entry.tsx
```

触发条件：当检测到 `docs/article.md` 存在且非占位内容时，跳过模板场景组件生成。
