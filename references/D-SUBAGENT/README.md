# D-SUBAGENT — Subagent 超时与上下文管理

> 辅助 · 深度分析后必读

## 文件索引

| 文件 | 用途 | 关键内容 |
|------|------|---------|
| `subagent-takeover.md` | **Subagent 超时接管流程** | 强制验证步骤 / Root.tsx 修复 / 接管命令 / 附录 B 主进程接管 / 附录 C 7步恢复 / 附录 D 超时恢复指南 |
| `subagent-context-preservation.md` | **会话压缩防护** | context compaction 后上下文丢失 / narration.txt 损坏 / references 文件写入规则 |

## 核心原则

1. **深度分析 + 多步工作的结论必须写入 references/ 文件**，否则 context compaction 后丢失
2. **subagent status=completed 不可信**——必须强制验证产出
3. **渲染/清理必须主进程执行**，不委托 subagent
