# C-CONTENT — 内容获取与音频字幕

> **最后更新**：2026-05-28
> 必读 · Step 0-3

## 文件索引

| 文件 | 用途 | 关键内容 |
|------|------|---------|
| `audio-tts.md` | **音频生产完整流程** | edge-tts + ffmpeg atempo + 音色选择；含 launch.sh audio 是空壳的发现；含原 `audio-tempo-user-patterns.md`（附录 D） |
| `subtitle-production.md` | **字幕生成** | captions.json + @remotion/captions；SRT 解析；TikTokCaptionOverlay；含原 `inline-captions.md`（附录 F） |
| `content-document-generation.md` | 文档生成工作流 | Step 0 generate_docs.js / narration.txt 生成规范 / README 位置变体 |
| `video-workflow-failures.md` | 已知系统性失败模式 | 按严重程度排序；Subagent Step 0 Bypass 等 5 种模式 |
| `cloudflare-medium.md` | Medium Cloudflare 拦截 | curl 绕过方案 |
| `readme-location.md` | README 位置变体 | monorepo / doc 子目录检测逻辑 |

> **已合并**：`inline-captions.md` → `subtitle-production.md` 附录 F；`audio-tempo-user-patterns.md` → `audio-tts.md` 附录 D

## 关键约束

- `narration.txt` 上限 337 字（中文字符）
- edge-tts 音色：默认 `zh-CN-YunjianNeural`，科技类项目用 `zh-CN-YunxiNeural`
- `launch.sh audio` 是空壳，必须手动执行 edge-tts 命令