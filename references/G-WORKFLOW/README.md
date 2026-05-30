# G-WORKFLOW — 工作流与集成

> **最后更新**：2026-05-28
> **辅助 · Git / Base / 优化 / 已合并 edge-tts-ffprobe-params.md 到 C-CONTENT/audio-tts.md**

## 文件索引

|| 文件 | 用途 | 关键内容 |
|------|------|---------|
| `git-workflow.md` | **Git 工作流与目录分离** | `{repo}/` vs `{repo}/{repo}-repo/` 隔离规范 / launch.sh init 自动隔离 |
| `feishu-base-batch.md` | **Feishu Base 批量处理** | record_id 查询 / 批量更新 / 受影响项目列表 |
| `feishu-base-pagination.md` | Base 分页查询陷阱 | limit=20 返回 100 条 / has_more 误判 |
| `lark-cli-base-record-update.md` | lark-cli Base 记录更新 | record_id 查询 / 批量更新语法 |
| `node-execsync-bug.md` | Node.js execSync 返回值 bug | macOS arm64 信号处理问题 |
| `video-optimization.md` | **视频优化与质量门禁** | 首帧亮度验证 / 码率检查 / **已合并 video-optimization-pitfalls.md** |
| `video-creator-deep-lessons.md` | video-creator 深度教训 | 关键经验总结 |
| `documentation-consistency.md` | 文档一致性维护指南 | copy.md / article.md / narration.txt 一致性规范 |
| `frame-sync.md` | 帧同步 | 音频/字幕/视频帧同步；含原 `frame-sync-regex-patterns.md` 内容（第 6 节） |
| `audio-duration-mismatch.md` | 音画同步 | atempo 与音频时长匹配 |
| `captions-endms-sync.md` | 字幕末端 ms 同步 | captions.json 末段 endMs 用视频实际时长校准 |
| `batch-duration-fix-20260527.md` | 批量时长修复记录 | 7 个项目的修复记录 |
| `video-config-cover-attrs.md` | video-config.json cover.attrs | attrs 字段规范 |

> **已合并**：`edge-tts-ffprobe-params.md` → `C-CONTENT/audio-tts.md` 附录 E；`subagent-handover.md` → `D-SUBAGENT/subagent-takeover.md` 附录 B；`frame-sync-regex-patterns.md` → `frame-sync.md` 第 6 节

## 关键约束

- **Git 仓库用完必须删除**：`rm -rf {repo}/{repo}-repo/`
- **渲染后 captions.json 末段 endMs 必须用 ffprobe 视频实际时长校准**
- **video-config.json 的 scenes 时间戳渲染后需二次校准**