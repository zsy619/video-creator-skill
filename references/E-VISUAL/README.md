# E-VISUAL — 视觉设计与封面图

> **最后更新**：2026-05-28
> 辅助 · 封面/视觉相关

## 文件索引

| 文件 | 用途 | 关键内容 |
|------|------|---------|
| `cover-image-rendering.md` | **封面图渲染失败诊断** | staticFile 404 / import PNG 失效 / CSS 渐变唯一可靠 / base64 data URL 最终方案 |
| `pil-cover.md` | **PIL 本地封面生成** | 无 AI API 时的备用方案，含 alpha_composite 注意事项；**已合并 pil-cover-usage.md** |
| `theme-palette.md` | 50 套主题配色参考 | cyberpunk / neon / tech / minimal 等主题色板 |
| `theme-matching.md` | 主题匹配系统 | sceneContent 动态化 / 主题色板映射 |
| `cover-font.md` | 封面字体选择规范 | 中文字体选择建议 |
| `bulk-cover-generation.md` | 批量封面生成 | 从 video-config.json 读取并批量生成三尺寸封面 |
| `pil-cover-attrs-rendering.md` | PIL 标签属性渲染 | attrs 标签带渲染注意事项 |
| `video-visual.md` | 视频视觉设计与场景增强 | 视觉设计原则 |

## 关键约束

- **AI 生成图片不要有文字**，留白区域给 Remotion 渲染层添加文字
- 竖屏视频字体：主标题 ≤96px，正文 ≤28px
- `generate_cover.py` 路径：`/Volumes/OpenClawDrive/.hermes/workspace/9router/docs/assets/generate_cover.py`