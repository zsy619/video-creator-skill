# H-CONFIG — 配置文件

> **最后更新**：2026-05-30
> **用途**：video-creator 技能的自动化配置文件，由系统脚本自动生成和引用。
> **⚠️ 请勿手动修改这些文件**，否则可能被系统覆盖。

---

## 文件索引

| 文件 | 用途 | 关键字段 |
|------|------|---------|
| `baoyu-config.json` | baoyu 技能配置 | `url-to-markdown`、`cover-image` 等工具配置 |
| `cdn-mapping.json` | CDN 映射 | 中国/全球/fallback 字体路径映射 |
| `tailwind-config.json` | Tailwind 主题扩展 | `cyberpunk`、`neon`、`tech` 等主题色板 |

---

## 使用说明

H-CONFIG/ 目录存放与运行时配置相关的 JSON 文件。这些文件由以下场景引用：

- **baoyu-config.json**：被 baoyu 技能栈的 URL 抓取和图片生成流程引用
- **cdn-mapping.json**：被封面渲染流程引用，用于解析字体 CDN 路径
- **tailwind-config.json**：被 Remotion 项目构建引用，用于注入主题变量

所有路径均为**相对于项目根目录**的绝对路径或相对于 `references/H-CONFIG/` 的相对路径。
