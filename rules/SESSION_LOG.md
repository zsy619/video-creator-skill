# 会话日志规范 (Session Log)

> 所属模块：video-creator / SKILL.md → 会话追踪
> **版本**: v1.1.0
> **用途**: 记录每次大模型请求的输入/输出 token 数量、请求模型、处理时长

---

## 追踪指标

| 字段 | 说明 |
|------|------|
| `timestamp` | 请求时间戳（ISO 8601，GMT+8） |
| `model` | 请求模型（如 `minimax/MiniMax-M2.7`） |
| `input_tokens` | 输入 token 数量 |
| `output_tokens` | 输出 token 数量 |
| `total_tokens` | 总 token 数量（in + out） |
| `cost_usd` | 本次请求费用（美元） |
| `duration_ms` | 处理时长（毫秒） |
| `cache_hit_rate` | 缓存命中率（%） |
| `context_used` | 本次 context 使用量（token） |
| `context_limit` | context 上限（token） |
| `task` | 本次任务简述 |
| `compaction_count` | 截至本次的上下文压缩次数 |

---

## 记录时机

每次执行以下操作时记录一条，只要是当前会话中的请求：

- `Step 1`: 内容获取（web_fetch / 搜索）
- `Step 4`: 文案生成（封面文案、视频脚本等）
- `Step 6`: 视觉生成（封面、插图）
- `Step 7`: 音频生成（edge-tts）
- `Step 8`: 字幕生成
- `Step 10`: 视频渲染
- `Step 11`: 报告生成

---

## 项目会话日志文件

每个视频项目的会话日志存储在：

```
workspace/{project-name}/docs/session-log.md
```

---

## 日志格式模板

```markdown
# Session Log - {project-name}

## 项目信息
- **项目名称**: {project-name}
- **开始时间**: {start_time}
- **结束时间**: {end_time}
- **总请求次数**: {request_count}

## 模型配置
- **默认模型**: minimax/MiniMax-M2.7

## 请求记录

| # | 时间 | 任务 | 模型 | 输入 token | 输出 token | 总 token | 费用 | 处理时长 | Cache命中率 | Context |
|---|------|------|------|------------|------------|----------|------|----------|-------------|---------|
| 1 | {ts} | {task} | {model} | {in} | {out} | {total} | ${cost} | {ms}ms | {cache}% | {ctx}/{limit} |
```

---

## 获取实时 Session 数据

通过 `session_status` 工具获取当前会话数据：

```bash
# 在工具调用后获取 session 状态
session_status
```

关键字段：
- `Tokens in` → `input_tokens`
- `Tokens out` → `output_tokens`
- `Cost` → `cost_usd`
- `Context` → `context_used / context_limit`
- `Cache hit` → `cache_hit_rate`

---

## 历史记录

每次会话完成后，将数据追加到项目 `docs/session-log.md`。
