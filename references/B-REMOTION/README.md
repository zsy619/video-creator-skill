# B-REMOTION — Remotion 渲染核心

> **最后更新**：2026-05-28
> 必读 · 每次渲染前必查

## 文件索引

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

## 快速修复入口

**DynamicScene.tsx 为空或含 literal `\n`** → 直接用 `dynamic-scene-template.md` 模板覆盖

**durationInFrames 硬编码导致视频时长不匹配** → `remotion-render-gotchas.md` 陷阱一

**音频文件 404（staticFile 未包裹）** → `remotion-render-gotchas.md` 陷阱二

**atempo 被动态计算覆盖** → `remotion-render-gotchas.md` 陷阱三