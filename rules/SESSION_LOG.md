# 会话日志规范 (Session Log)

> 所属模块：video-creator / SKILL.md → 会话追踪
> **版本**: v3.0.0（Snapshot 法版）
> **用途**: 记录每次大模型请求的 token 消耗、模型、处理时长

---

## ⚠️ 重要：session_status 是工具，不是 shell 命令

**`session_status` 是 OpenClaw 的工具调用**，它的输出在 tool result 中，**不是 stdout**，所以：

```bash
# ❌ 错误写法（无法捕获输出）：
STATUS=$(session_status)
session_status > file.txt
echo "$STATUS" | grep Tokens

# ✅ 正确写法：
#    1. 调用 session_status 工具 → 在 AI 对话中看到 emoji 格式输出
#    2. 手动将输出复制到 Python 脚本，或直接用 echo 追加行
```

### session_status 实际输出格式（emoji 格式）

```
🦎 OpenClaw 2026.4.14 (323493f)
🧠 Model: minimax/MiniMax-M2.7 · 🔑 api-key (minimax:cn)
🧮 Tokens: 85k in / 123 out · 💵 Cost: $0.03
🗄️ Cache: 0% hit · 22k cached, 5.1m new
📚 Context: 111k/205k (54%) · 🧹 Compactions: 4
📊 Usage: 5h 85% left ⏱1h 32m
🧵 Session: agent:main:main • updated just now
⚙️ Runtime: direct · Think: high · elevated
🪢 Queue: collect (depth 0)
```

**注意**：
- Token 值可能是缩写：`85k` (= 85,000)、`123` (= 123)、`5.1m` (= 5,100,000)
- 这是 **session 级别累计**，不是 per-request 分解
- `session_status` 只能记录 session 总消耗，无法精确拆分每个步骤

---

## 追踪指标

| 字段 | 说明 | 来源 |
|------|------|------|
| `timestamp` | 请求时间戳（GMT+8） | `date '+%Y-%m-%d %H:%M:%S %Z'` |
| `model` | 请求模型 | 从 session_status 解析 |
| `tokens_in` | 输入 token（session 累计） | `🧮 Tokens: {X} in` |
| `tokens_out` | 输出 token（session 累计） | `🧮 Tokens: / {X} out` |
| `total_tokens` | 总 token | in + out |
| `cost_usd` | 本次请求费用 | `💵 Cost: $X.XX` |
| `context_used/limit` | Context 使用情况 | `📚 Context: {used}/{limit}` |
| `task` | 本次任务简述 | 手动填写 |

---

## 记录时机

每次执行以下操作时**手动**追加一行到 session-log.md：

- `Step 1`: 内容获取（web_fetch / 搜索）
- `Step 4`: 文案生成
- `Step 6`: 视觉生成（封面、插图）
- `Step 7`: 音频生成（edge-tts）
- `Step 8`: 字幕生成
- `Step 10`: 视频渲染
- `Step 11`: 报告生成

---

## 项目 session-log.md 文件位置

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
- **状态**: 进行中 / 已完成

## 模型配置
- **默认模型**: minimax/MiniMax-M2.7
- **Token 追踪**: session_status 工具（session 级别累计，emoji 格式输出）

## 请求记录

| # | 时间 | 任务 | 模型 | 输入token | 输出token | 总token | 费用 | Context |
|---|------|------|------|----------|----------|---------|------|---------|
| 01 | 2026-04-17 13:09 | 内容获取（baoyu-fetch） | minimax/MiniMax-M2.7 | - | - | - | - | - |
```

---

## Python 辅助脚本

推荐使用 `scripts/session-log-append.py` 解析 emoji 格式：

```bash
SKILL_SCRIPT="${HOME}/.openclaw/skills/video-creator/scripts/session-log-append.py"
PROJECT_DIR="workspace/toutiao-video"

# 追加一行（手动复制 session_status 输出）
STATUS_TEXT="🧮 Tokens: 85k in / 123 out · 💵 Cost: $0.03 · 📚 Context: 111k/205k"
python3 "${SKILL_SCRIPT}" "${PROJECT_DIR}" "Step X: 任务描述" "${STATUS_TEXT}"
```

脚本会自动：
- 解析 `85k` → `85000`，`123` → `123`
- 提取 model、cost、context 等字段
- 追加一行到 session-log.md

---

## 历史记录

每次会话完成后，将最终数据追加到项目 `docs/session-log.md`，并在 HEARTBEAT.md 中更新状态。

---

## ⚠️ 累计追踪问题：Snapshot 法

`session_status` 只能返回**累计值**，无法精确拆分每个子任务的 token 消耗。

**解决方案：Snapshot 快照法**

每次大步骤完成后，立即调用 `session_status`，将累计值作为快照记录。

```
步骤1完成后 → session_status 累计:  100k in /  5k out  → 记录 Snapshot #1
步骤2完成后 → session_status 累计:  200k in / 10k out  → 记录 Snapshot #2
步骤3完成后 → session_status 累计:  350k in / 15k out  → 记录 Snapshot #3
...
最终：Snapshot #N - Snapshot #(N-1) = 该步骤实际消耗
```

**在 session-log.md 中的记录格式**：

```
| 01 | 2026-04-17 14:52 | 内容获取 | minimax/MiniMax-M2.7 | 918k in(cum) / 7.8k out(cum) | Snapshot#1 | $0.28(cum) | ctx:97k/205k | 备注 |
```

> `cum` 表示该值为 session 累计值。
> `Snapshot#N` 标注这是第 N 次快照，估算单步骤消耗时用相邻快照差值。

**WORKFLOW 中每个 Step 结束时必须执行**：

```bash
# Step X 完成后（不是 shell 命令，是工具调用）：
#   1. 在 AI 对话中输入: /status 或调用 session_status
#   2. AI 会返回 emoji 格式的累计数据
#   3. 将输出作为备注记录到 session-log.md
#
# 示例（手动追加）：
TS=$(date '+%Y-%m-%d %H:%M:%S %Z')
echo "| XX | $TS | Step X: 任务名 | minimax/MiniMax-M2.7 | {累计in} | {累计out} | - | - | {emoji输出} |" >> "${PROJECT_DIR}/docs/session-log.md"
```
