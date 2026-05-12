# 文档一致性维护指南

> **用途**：预防 skill 文档与实际代码行为脱节
> **来源**：2026-05-12 session-log.md 路径修订 + ONEPASS_WORKFLOW.md 死链修复
> **适用**：所有 class-level skill

---

## 常见脱节模式

### 1. 文档路径与代码输出路径不一致

**模式**：文档写 `docs/xxx.md`，代码实际输出到 `{project-root}/xxx.md`

**修复原则**：
- **生成类文档**（pipeline 自动生成的文件）：检查 `generate_*.py` 确认实际输出路径，文档必须与之一致
- **拷贝类文档**（技能 `docs/` 目录下的参考文档）：不拷贝到项目，不存在路径问题

**验证命令**：
```bash
# 检查生成脚本的实际输出路径
grep -n "session-log\|tags\.md\|post\.md" "$SKILL_DIR/scripts/generate_*.py" | grep "open\|write"
```

### 2. 引用不存在的文件

**模式**：文档引用 `references/X.md`，但 `ls {SKILL_DIR}/references/` 中该文件不存在

**原因**：上下文摘要压缩时，"声称完成"被当作"实际完成"，摘要来自 handoff 不是文件系统真相

**预防**：
- 每次修订后用 `grep -r "references/" {SKILL_DIR}/SKILL.md` 交叉验证所有引用
- 使用脚本批量验证：
```bash
# 验证 SKILL.md 中所有 references/ 引用是否实际存在
cd {SKILL_DIR}
grep -oP 'references/[^]]+\.md' SKILL.md | sort -u | while read f; do
  [ -f "$f" ] || echo "❌ 死链: $f"
done
```

### 3. 摘要压缩导致虚假前提

**模式**：context compaction 将"声称完成"当作"实际完成"，摘要来自 handoff 不是文件系统真相

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

**修复后状态**：两处同时修复

---

## 维护检查清单

每次 skill 大修订后执行：

```bash
SKILL_DIR=~/.hermes/skills/video-creator

# 1. 验证所有内联引用存在
grep -oP '(?:references|rules|scripts)/[^\)]+\.(?:md|sh|py|js)' "$SKILL_DIR/SKILL.md" | sort -u | while read f; do
  [ -f "$SKILL_DIR/$f" ] || echo "❌ 死链: $f"
done

# 2. 检查是否有自相矛盾的段落（如"X不存在"+"引用X"）
grep -n "不存在\|死链\|缺失" "$SKILL_DIR/SKILL.md" | head -10
```

---

## 经验教训

1. **摘要永远不可信**：context compaction 将"声称完成"当作"实际完成"
2. **文档与代码必须同步修订**：代码改了文档要改，文档改了代码也要查
3. **自相矛盾是最高优先级信号**：文档自己否认自己，比文档与代码不一致更严重
4. **任何文件操作前先验证文件系统状态**：ls / test -f 是唯一可信的真相来源
