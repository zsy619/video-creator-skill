# Subagent 会话压缩上下文丢失问题

> 2026-05-22 发现：video-creator subagent 执行深度分析后，会话压缩仅保留最后一条用户消息（"开始执行"），丢失所有 TODO 状态、分析结论和工作上下文。

## 问题现象

subagent 执行了以下工作：
1. 深度分析 `generate_docs.js` 和 `create-remotion-project.js`
2. 输出 5 大类 30 项 TODO 清单
3. 用户回复"开始执行"
4. subagent 被压缩，仅保留"开始执行"这一条用户消息
5. 新会话完全不知道之前的分析内容和 TODO 状态

## 根因

[CONTEXT COMPACTION] 摘要仅保留"等待用户确认"的状态，不保留：
- 已识别的代码修改位置（行号、old_string）
- 30 项 TODO 清单详情
- 深度分析结论（如"硬编码在 Scene2 行319、Scene3 行431"）

## 解决方案

**任何涉及多步骤分析 + 后续执行的工作，必须将分析结论写入 `references/` 文件**：

```
references/subagent-context-preservation.md  ← 分析结论写入这里
```

文件路径写入 [CONTEXT COMPACTION] 摘要的 "Relevant Files" 节，这样压缩后新会话可以 `read_file` 恢复完整上下文。

## 最佳实践

1. **分析阶段完成时**：立即将分析结论写入 `references/<topic>.md`
2. **Relevant Files 节**：写入所有中间文件的绝对路径，新会话可以 read_file 恢复
3. **TODO 列表路径化**：TODO 写入文件而非仅内存，这样压缩后仍可读取
4. **patch 规划**：多步骤 patch 应先规划修改顺序，避免后续 patch 依赖已删除的 old_string

## 相关文件
- `~/.hermes/skills/video-creator/references/generate-docs-deep-analysis.md` — generate_docs.js 深度分析
- `~/.hermes/skills/video-creator/references/theme-matching.md` — sceneContent 动态化完整数据流
