# 文档一致性维护指南

> **用途**：预防 skill 文档与实际代码行为脱节
> **来源**：2026-05-12 session-log.md 路径修订 + ONEPASS_WORKFLOW.md 死链修复
> **适用**：所有 class-level skill

---

## 0. session-log.md 专项规范

**生成类文档**（pipeline 自动生成，非手动编辑）必须与代码严格同步：

| 文档 | 生成脚本 | 实际输出路径 |
|------|----------|--------------|
| `session-log.md` | `scripts/session-log-append.py` | `{project}/docs/session-log.md` |
| `tags.md` | `scripts/generate_tags.py` | `{project}/docs/tags.md` |
| `post.md` | `scripts/generate_post.py` | `{project}/docs/post.md` |

**验证命令**：
```bash
SKILL_DIR=~/.hermes/skills/video-creator

# 检查生成脚本的实际输出路径
grep -n "session-log\|tags\.md\|post\.md" "$SKILL_DIR/scripts/generate_*.py" | grep "open\|write"

# 验证 session-log-append.py 的 get_log_path() 返回值
grep -n "docs.*session-log" "$SKILL_DIR/scripts/session-log-append.py"
```

**维护铁律**：
- `session-log.md` **必须主动调用** `session_status` 工具并写入文件，单独调用工具不生效
- 文档中所有 `session-log-append.py` 的调用路径必须与脚本实际位置一致
- 初始化：`python3 session-log-append.py <project_dir> --init`
- 追加：`python3 session-log-append.py <project_dir> <任务描述> --snapshot "<emoji输出>"`

**session-log.md 内容验证铁律**：
- `session-log.md` 是**生成类文档**，不是"拷贝类文档"（见上文"常见脱节模式"节1）
- 验证不仅检查文件存在，还必须检查有**数据行**（不只是表头）：
```bash
# 验证有数据行（不只是表头）— 至少 >= 3 行（含表头分隔行）
grep -c "^[|]" "${PROJECT_DIR}/docs/session-log.md"
# 结果 >= 3 才正常
```

---

## 常见脱节模式

### 1. 文档路径与代码输出路径不一致

**模式**：文档写 `docs/xxx.md`，代码实际输出到 `{project-root}/xxx.md`

**修复原则**：
- **生成类文档**（session-log.md、tags.md、post.md 等 pipeline 自动生成的文件）：检查 `run_full_pipeline.py` 或 `generate_*.py` 确认实际输出路径，文档必须与之一致
- **拷贝类文档**（技能 `docs/` 目录下的参考文档）：不拷贝到项目，不存在路径问题

**验证命令**：
```bash
# 检查生成脚本的实际输出路径
grep -n "session-log\\|tags\\.md\\|post\\.md" {SKILL_DIR}/scripts/generate_*.py | grep "open\\|write"

# 检查 run_full_pipeline.py 中的步骤函数
grep -n "session_log_step\\|tags_output\\|post_step" {SKILL_DIR}/scripts/run_full_pipeline.py
```

### 2. 引用不存在的文件

**模式**：文档引用 `references/X.md`，但 `ls {SKILL_DIR}/references/` 中该文件不存在

**原因**：上下文摘要压缩时，"声称完成"被当作"实际完成"，摘要来自 handoff 不是文件系统真相

**预防**：
- 每次修订后用 `grep -r "references/" {SKILL_DIR}/SKILL.md` 交叉验证所有引用
- 或使用脚本批量验证：
```bash
# 验证 SKILL.md 中所有 references/ 引用是否实际存在
cd {SKILL_DIR}
grep -oP 'references/[^]]+\.md' SKILL.md | sort -u | while read f; do
  [ -f "$f" ] || echo "❌ 死链: $f"
done
```

### 3. 摘要压缩导致虚假前提

**模式**：context compaction 将"声称完成"当作"实际完成"，摘要来自 handoff 不是文件系统真相。导致后续基于摘要的编辑完全错误。

**典型案例**（2026-05-12）：
- 摘要声称 `ONEPASS_WORKFLOW.md` 不存在，触发所有引用被移除
- 实际上该文件存在，被删除的引用后来需要手动恢复

**预防**：
- **任何基于摘要的文件操作，必须先用 `ls`/`test -f` 验证摘要描述的文件系统状态**
- 摘要说"X 不存在" → 先 `ls X` 确认，再做删除引用的操作
- 摘要说"Y 已修复" → 先 grep/cat 验证实际内容，再做移除修复记录的操作
- 上下文摘要压缩是不可信的来源；文件系统是唯一真相

**验证命令（在移除任何文件引用前必须执行）**：
```bash
SKILL_DIR=~/.hermes/skills/video-creator
for f in references/ONEPASS_WORKFLOW.md rules/SESSION_LOG.md scripts/session-log-append.py; do
  if [ -f "$SKILL_DIR/$f" ]; then echo "✅ 存在: $f"
  else echo "❌ 不存在: $f（确认后再移除引用）"; fi
done
```

### 4. 自相矛盾的文档

**模式**：同一文档中，一处说"X不存在"，另一处仍引用"X"

**典型案例**（video-creator SKILL.md）：
- 第350行："> 实际验证发现 `references/ONEPASS_WORKFLOW.md` 根本不存在"
- 第439行：`- [references/ONEPASS_WORKFLOW.md](...) — 一键生成工作流`

**修复后状态**：第350行承认问题，第439行仍引用 → 两处同时修复

---

## 维护检查清单

每次 skill 大修订后执行：

```bash
SKILL_DIR=~/.hermes/skills/{skill-name}

# 1. 验证所有内联引用存在
grep -oP '(?:references|rules|scripts)/[^\])+\.(?:md|sh|py|js)' "$SKILL_DIR/SKILL.md" | sort -u | while read f; do
  [ -f "$SKILL_DIR/$f" ] || echo "❌ 死链: $f"
done

# 2. 验证生成脚本输出路径与文档描述一致
for script in generate_session_log generate_tags generate_post; do
  grep -n "\.md" "$SKILL_DIR/scripts/${script}.py" | grep "open\|write" | head -3
done

# 3. 检查是否有自相矛盾的段落（如"X不存在"+"引用X"）
grep -n "不存在\\|死链\\|缺失" "$SKILL_DIR/SKILL.md" | head -10
```

---

## 经验教训

1. **摘要永远不可信**：context compaction 将"声称完成"当作"实际完成"
2. **文档与代码必须同步修订**：代码改了文档要改，文档改了代码也要查
3. **copy_docs.py 仅能检查版本号**：不能依赖它发现路径错误或死链
4. **自相矛盾是最高优先级信号**：文档自己否认自己，比文档与代码不一致更严重

---

## 附录：为什么 session-status 无法自动实时记录

**架构障碍**

`session_status` 是 OpenClaw **工具调用**，它的输出在 AI 对话的 tool result 中（emoji 格式），不是 stdout。数据流向：

```
AI 模型 → tool result（存在于对话 context window）→ 用户看到 emoji 输出 → context compaction 后丢失
```

没有任何 hook 或 callback 能自动截获这个输出写文件。数据只存在于对话的 context 中，compaction 后无法恢复。

**各方案可行性**

| 方案 | 可行性 | 局限 |
|------|--------|------|
| 每次手动调用（当前方案） | ✅ | 依赖人工，容易遗漏 |
| `delegate_task` 子 agent | ⚠️ | 子 agent 无法访问父 session 的 session_status 数据 |
| cron job 定时记录 | ⚠️ | cron 独立 session，无法访问正在进行的对话 context |
| Hermes 插件拦截 tool result | ⚠️ | 需要 Hermes Agent 底层支持，当前无此机制 |

**结论**

当前架构下**无法实现自动实时记录**。唯一可靠方案是保持"关键节点显式调用"机制，在 skill 文档中强化约束（见 SESSION_LOG.md 的强制记录时机清单）。

如果 Hermes Agent 将来支持大模型输出结果的 hook，才可能实现自动记录。
