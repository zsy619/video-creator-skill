# Video Creator 技能深度审计方法论

## 何时使用

技能声称已完成修订，但仍出现同类错误时执行本审计流程。

---

## 审计入口：全局正则搜索（唯一可信来源）

**永远不要信任摘要或对话记忆——只信任文件系统。**

执行全局搜索，按优先级逐批检查：

```bash
# ===== 第一批：关键规范值（旧值模式）=====
grep -rn "fontSize:\s*10\b" {SKILL_DIR}/scripts/
grep -rn "fontSize:\s*10\b" {SKILL_DIR}/rules/
grep -rn "Fontsize=10[^0-9]" {SKILL_DIR}/

grep -rn "marginV:\s*30\b" {SKILL_DIR}/scripts/
grep -rn "outline:\s*1\b" {SKILL_DIR}/scripts/

grep -rn "\\\\n" {SKILL_DIR}/scripts/        # 查 ASS 换行符（应有 \N）
grep -rn "\\n" {SKILL_DIR}/scripts/subtitle-generator.js  # 上下文确认

# ===== 第二批：路径占位符 =====
grep -rn "~/video-projects" {SKILL_DIR}/
grep -rn "~/.hermes/skills/video-creator/" {SKILL_DIR}/  # 全部替换为 {SKILL_DIR}

# ===== 第三批：验证器/检查器 =====
grep -rn "fontSize.*应为.*10\|fontsize.*10.*✅" {SKILL_DIR}/scripts/
grep -rn "Fontsize=10" {SKILL_DIR}/rules/

# ===== 第四批：文档引用 =====
grep -rn "fontSize\|MarginV\|Outline" {SKILL_DIR}/SKILL.md
```

---

## 必须检查的 8 类文件

| 文件类型 | 检查重点 | 常见遗漏 |
|----------|----------|----------|
| `scripts/subtitle-generator.js` | Fontsize/MarginV/Outline/msToTime() | 通常第一个被修复 |
| `scripts/main.js` | SubtitleGenerator 实例化参数 | **常遗漏** |
| `scripts/cli.js` | SubtitleGenerator 实例化参数 | **常遗漏** |
| `scripts/video-quality-gate.js` | 检查函数中的期望值 | 验证器自身也要更新 |
| `scripts/video-creator-validator.js` | `fontsize === '10'` 比较逻辑 | **常遗漏** |
| `scripts/check-subtitle.js` | 头部注释规范描述 | **常遗漏** |
| `rules/CHECKLIST.md` | 检查项列表 | **常遗漏** |
| `rules/QUICKSTART.md` | 快速参考规范值 | **常遗漏** |

---

## 审计发现的常见遗漏模式

### 1. 验证器不同步（最常见根因）

症状：规范值已在生成器修复，但验证器仍检查旧值，导致"通过验证却生成错误"。

```
症状：subtitle-generator.js 已是 fontSize=72
     video-creator-validator.js 仍检查 fontSize === '10'  # 遗漏
```

修复：验证器必须与生成器同步更新。

### 2. 实例化参数覆盖

症状：SubtitleGenerator 类已正确，但直接调用时用旧值覆盖。

```javascript
// 类默认值正确（第35-58行）
this.options = { fontSize: 72, marginV: 50, outline: 2, ... };

// 但直接实例化时覆盖（main.js 第796行、cli.js 第118行）
const gen = new SubtitleGenerator({ fontSize: 10, ... }); // ← 遗漏
```

修复：所有 SubtitleGenerator 实例化点必须显式传正确值。

### 3. 文档说明与代码不同步

症状：代码已修复，但文档注释仍描述旧值，误导后续调试。

```
CHECKLIST.md 第131行：Fontsize=10（已过时）
main.js 第784行注释：Fontsize=10（已过时）
```

修复：文档和代码必须同步，可用 grep 交叉验证。

---

## 占位符规范

| 占位符 | 含义 | 替换要求 |
|--------|------|----------|
| `{SKILL_DIR}` | 技能根目录 | 全部脚本和文档用此占位符 |
| `{WORKSPACE_DIR}` | 用户工作区根目录 | 文档示例用此占位符 |

**禁止**：
- `~/.hermes/skills/video-creator/` 硬编码路径
- `~/video-projects/` 硬编码路径
- 绝对路径出现在任何说明性文档中

**例外**：`launch.sh` 第10行注释定义默认值那行可以保留原始路径作为默认值说明。

---

## 本次审计战果（2026-05-10）

| 类型 | 发现 | 修复 |
|------|------|------|
| fontSize=10 残留 | 8 个文件 | 全部修正为 72 |
| marginV=30 残留 | main.js 注释 | 修正为 50 |
| outline=1 残留 | main.js 注释 | 修正为 2 |
| 路径硬编码 | 14 处 | 全部替换为 {SKILL_DIR}/{WORKSPACE_DIR} |
| 验证器旧值 | video-creator-validator.js / check-subtitle.js | 同步更新 |
| 文档旧值 | CHECKLIST.md / QUICKSTART.md / SUBTITLES.md | 同步更新 |

## 本次审计战果（2026-05-13）

| 类型 | 发现 | 修复 |
|------|------|------|
| 封面帧号缺失规范 | UNIFIED_RULES.md 无帧号指导 | 添加 `--frame=N-2` 规则 |
| npx create-video 挂起 | CLI bug 无文档 | 新增 TROUBLESHOOTING.md Q&A |
| zod 版本错误 | create-remotion-project.js 写 3.4.0 | 修正为 4.3.6 |
| Root.tsx 硬编码 | fps=60/duration=3180/标题="视频标题" | 改为从 config 读取 |
| launch.sh 顺序错误 | Step -1 封面在 Remotion 项目之前 | 标注 PIL 占位质量 |
| 缺少正式封面生成 | Step 7 后无 Remotion still | 新增 Step 8 重生成封面 |
| 场景内容硬编码 | create-remotion-project.js 全 Hysteria 模板 | 架构问题，待重构 |

### 新增 Remotion 项目生成审计检查项

```bash
# 检查 create-remotion-project.js 输出目录
grep "path.join.*project.*video-project" {SKILL_DIR}/scripts/create-remotion-project.js
# 期望：vpDir = path.join(projectDir, "video-project")

# 检查 Root.tsx 是否硬编码 fps/duration/标题
grep "fps={60}\|fps=60\|3180\|视频标题" {SKILL_DIR}/scripts/create-remotion-project.js
# 期望：无硬编码值，应从 config 读取

# 检查 launch.sh 是否在 Step 7 后生成封面
grep -n "remotion still\|Step 8\|--frame=" {SKILL_DIR}/scripts/launch.sh
# 期望：有 Step 8 remotion still，且使用 --frame=$((TOTAL_FRAMES-2))
```

### Remotion 项目生成 4 大常见失败模式

| 模式 | 症状 | 根因 |
|------|------|------|
| CLI 挂起 | npx create-video 不返回 | --yes + --template 冲突 |
| 目录错乱 | 生成了 subdir/ 而非 video-project/ | 手动创建 vs 脚本生成 |
| 内容无关 | 视频是"视频标题/Hysteria" | create-remotion-project.js 硬编码模板 |
| 封面模糊 | 帧0淡入中，文字不可见 | 未指定帧号或帧号错误 |
