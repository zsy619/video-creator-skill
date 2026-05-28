# 文档一致性维护指南

> **最后更新**：2026-05-27
> **配套文档**：`B-REMOTION/remotion-troubleshoot.md`（Remotion 问题排查）、`C-CONTENT/audio-tts.md`（TTS 规范）

---

## 目录

1. [预防框架](#1-预防框架)
2. [审计方法论](#2-审计方法论)
3. [占位符规范](#3-占位符规范)
4. [已修复冲突案例库](#4-已修复冲突案例库)

---

## 1. 预防框架

### 常见脱节模式

#### 1.1 文档路径与代码输出路径不一致

**模式**：文档写 `docs/xxx.md`，代码实际输出到 `{project-root}/xxx.md`

**修复原则**：
- **生成类文档**（pipeline 自动生成的文件）：检查 `generate_*.py` 确认实际输出路径，文档必须与之一致
- **拷贝类文档**（技能 `docs/` 目录下的参考文档）：不拷贝到项目，不存在路径问题

**验证命令**：
```bash
# 检查生成脚本的实际输出路径
grep -n "session-log\|tags\.md\|post\.md" "$SKILL_DIR/scripts/generate_*.py" | grep "open\|write"
```

#### 1.2 引用不存在的文件

**模式**：文档引用 `references/X.md`，但 `ls {SKILL_DIR}/references/` 中该文件不存在

**原因**：上下文摘要压缩时，"声称完成"被当作"实际完成"，摘要来自 handoff 不是文件系统真相
**预防**：
- 每次修订后用 `grep -r "references/" {SKILL_DIR}/SKILL.md` 交叉验证所有引用
- 使用脚本批量验证：
```bash
# 验证 SKILL.md 中所有 references/ 引用是否实际存在
cd {SKILL_DIR}
grep -oP 'references/[^)]]+\.md' SKILL.md | sort -u | while read f; do
  [ -f "$f" ] || echo "❌ 死链: $f"
done
```

#### 1.3 摘要压缩导致虚假前提

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

#### 1.4 自相矛盾的文档

**模式**：同一文档中，一处说"X不存在"，另一处仍引用"X"

**修复后状态**：两处同时修复

---

## 2. 审计方法论

### 何时使用

技能声称已完成修订，但仍出现同类错误时执行本审计流程。

### 审计入口：全局正则搜索（唯一可信来源）

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

# ===== 第二批：路径占位符 ======
grep -rn "~/video-projects" {SKILL_DIR}/
grep -rn "~/.hermes/skills/video-creator/" {SKILL_DIR}/  # 全部替换为 {SKILL_DIR}

# ===== 第三批：验证器/检查器 ======
grep -rn "fontSize.*应为.*10\|fontsize.*10.*✅" {SKILL_DIR}/scripts/
grep -rn "Fontsize=10" {SKILL_DIR}/rules/

# ===== 第四批：文档引用 ======
grep -rn "fontSize\|MarginV\|Outline" {SKILL_DIR}/SKILL.md
```

### 必须检查的 8 类文件

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

### 审计发现的常见遗漏模式

#### 2.1 验证器不同步（最常见根因）

症状：规范值已在生成器修复，但验证器仍检查旧值，导致"通过验证却生成错误"。

```
症状：subtitle-generator.js 已是 fontSize=72
     video-creator-validator.js 仍检查 fontSize === '10'  # 遗漏
```

修复：验证器必须与生成器同步更新。

#### 2.2 实例化参数覆盖

症状：SubtitleGenerator 类已正确，但直接调用时用旧值覆盖。

```javascript
// 类默认值正确（第35-58行）
this.options = { fontSize: 72, marginV: 50, outline: 2, ... };
// 但直接实例化时覆盖（main.js 第796行、cli.js 第118行）
const gen = new SubtitleGenerator({ fontSize: 10, ... }); // ← 遗漏
```

修复：所有 SubtitleGenerator 实例化点必须显式传正确值。

#### 2.3 文档说明与代码不同步

症状：代码已修复，但文档注释仍描述旧值，误导后续调试。

```
CHECKLIST.md 第114行：Fontsize=72 ✅ 已修复（2026-05-22）
main.js 第784行注释：Fontsize=10（已过时）
```

修复：文档和代码必须同步，可用 grep 交叉验证。

### Remotion 项目生成审计检查项

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

### 审计战果记录

#### 2026-05-10 审计

| 类型 | 发现 | 修复 |
|------|------|------|
| fontSize=10 残留 | 8 个文件 | 全部修正为 72 |
| marginV=30 残留 | main.js 注释 | 修正为 50 |
| outline=1 残留 | main.js 注释 | 修正为 2 |
| 路径硬编码 | 14 处 | 全部替换为 {SKILL_DIR}/{WORKSPACE_DIR} |
| 验证器旧值 | video-creator-validator.js / check-subtitle.js | 同步更新 |
| 文档旧值 | CHECKLIST.md / QUICKSTART.md / SUBTITLES.md | 同步更新 |

#### 2026-05-13 审计

| 类型 | 发现 | 修复 |
|------|------|------|
| 封面帧号缺失规范 | UNIFIED_RULES.md 无帧号指导 | 添加 `--frame=N-2` 规则 |
| npx create-video 挂起 | CLI bug 无文档 | 新增 TROUBLESHOOTING.md Q&A |
| zod 版本错误 | create-remotion-project.js 写 3.4.0 | 修正为 4.3.6 |
| Root.tsx 硬编码 | fps=60/duration=3180/标题="视频标题" | 改为从 config 读取 |
| launch.sh 顺序错误 | Step -1 封面在 Remotion 项目之前 | 标注 PIL 占位质量 |
| 缺少正式封面生成 | Step 7 后无 Remotion still | 新增 Step 8 重生成封面 |
| 场景内容硬编码 | create-remotion-project.js 全 Hysteria 模板 | 架构问题，待重构 |

---

## 3. 占位符规范

### 标准占位符

| 占位符 | 含义 | 替换要求 |
|--------|------|----------|
| `{SKILL_DIR}` | 技能根目录 | 全部脚本和文档用此占位符 |
| `{WORKSPACE_DIR}` | 用户工作区根目录 | 文档示例用此占位符 |

### 禁止

- `~/.hermes/skills/video-creator/` 硬编码路径
- `~/video-projects/` 硬编码路径
- 绝对路径出现在任何说明性文档中

**例外**：`launch.sh` 第10行注释定义默认值那行可以保留原始路径作为默认值说明。

---

## 4. 已修复冲突案例库

### 修复铁律（永久规则）

1. **输出文件名**：统一为 `final.mp4`，禁止出现 `final_with_subs.mp4` / `final-video.mp4`
2. **字幕 JSON 路径**：`video-project/public/audio/captions.json`（Remotion 运行时读取位置）
3. **帧率**：统一 `60fps`（禁止 `60fps`）
4. **音频方案**：Remotion Native（`<Audio>` 组件内嵌），禁止 ffmpeg 混流
5. **caps 文件来源**：由 launch.sh Step 3 直接生成到 `video-project/public/audio/captions.json`，无需 ASS 中转

### 输出文件路径规范

| 文件 | 路径 |
|------|------|
| 最终视频 | `video-project/out/final.mp4` |
| 字幕 JSON | `video-project/public/audio/captions.json` |
| 处理后音频 | `{project}/audio/neural_1_2x.m4a` |
| 封面（vertical） | `docs/assets/cover.png` |
| 封面（wechat） | `docs/assets/cover-wechat.png` |
| 封面（xhs） | `docs/assets/cover-xhs.png` |

### 已修复冲突清单

#### 冲突 1：captions.json 路径错误 ✅ 2026-05-14

- **问题**：launch.sh Step 3 写到 `${proj_dir}/audio/captions.json`，Remotion CaptionOverlay 读 `video-project/public/audio/captions.json`
- **根因**：create-remotion-project.js 的 ASS→JSON 转换块（死代码）从未触发，且目录不匹配
- **修复**：launch.sh Step 3 直接写到 `${VP_DIR}/public/audio/captions.json`
- **受影响文件**：launch.sh, create-remotion-project.js

#### 冲突 2：输出文件名不一致 ✅ 2026-05-14

- **问题**：`final_with_subs.mp4` / `final.mp4` / `final-video.mp4` 三种文件名散布在 7+ 文件中
- **根因**：Remotion 渲染技术迭代（Native → PIL fallback → 再切回 Native）遗留
- **修复**：统一为 `final.mp4`
- **受影响文件**：launch.sh, SKILL.md, WORKFLOW.md, video-quality-gate.js, video-composer.js, generate_docs.js, SUBTITLES.md, QUALITY.md, TROUBLESHOOTING.md, ONEPASS_WORKFLOW.md, audio-validation-protocol.md, video-creation-performance-optimizations.md, pil-frame-generation.md, remotion-package-discovery.md, ffmpeg-subtitle-burnin-font-fix.md, remotion-entrypoint-fix.md

#### 冲突 3：Remotion Native vs ffmpeg 混流架构冲突 ✅ 2026-05-14

- **问题**：WORKFLOW.md Step 10 使用"Remotion 渲染无音频视频 + ffmpeg 混流"，launch.sh 使用"Remotion `<Audio>` 组件内嵌"
- **根因**：WORKFLOW.md 长期未同步 Remotion Native 升级
- **修复**：WORKFLOW.md Step 10 改为 Remotion Native 渲染命令，删除 ffmpeg 混流段落
- **受影响文件**：WORKFLOW.md

#### 冲突 4：FPS 不一致 ✅ 2026-05-14

- **问题**：WORKFLOW.md Step 10 用 `fps=60`，launch.sh 用 `fps=60`
- **修复**：WORKFLOW.md 改为 `--fps=60`，ONEPASS_WORKFLOW.md Gate D 帧率改为 60fps
- **受影响文件**：WORKFLOW.md, ONEPASS_WORKFLOW.md

#### 冲突 5：AUDIO_DURATION 缺失 ✅ 2026-05-14

- **问题**：`cmd_all` Step 7 渲染帧数计算引用 `${AUDIO_DURATION}`，但该变量未在 Step 7 内定义
- **根因**：`cmd_audio` 里定义过，但 `cmd_all` 跳过了 cmd_audio 直接进入后续步骤
- **修复**：cmd_all Step 7 开头添加 ffprobe 获取 AUDIO_DURATION
- **受影响文件**：launch.sh

#### 冲突 6：ASS→JSON 死代码块 ✅ 2026-05-14

- **问题**：`create-remotion-project.js` 包含 ASS→captions.json 转换逻辑，依赖 `subtitles.ass` 文件，但 launch.sh 从不生成 ASS
- **根因**：Remotion Native 方案下 captions.json 直接由 launch.sh Step 3 生成，跳过 ASS 中转
- **修复**：删除该死代码块及 `assToCaptions` 导出
- **受影响文件**：create-remotion-project.js

#### 冲突 7：cmd_render vs cmd_all 渲染输出不一致 ✅ 2026-05-14

- **问题**：`cmd_render` 声称输出 `final_with_subs.mp4`，`cmd_all` Step 7 输出 `final.mp4`
- **修复**：cmd_render 统一输出 `final.mp4`，完成消息同步
- **受影响文件**：launch.sh

#### 冲突 8：文档时长过期引用（52s→47s 脱节）✅ 2026-05-27

- **问题**：`posting-guide.md` / `session-log.md` 含 `52秒` 过期引用未更新，`video-config.json` / `report.json` 含 `inferredTheme` 残留字段（与实际 `theme` 不一致）
- **根因**：视频时长从 52s 优化至 47s 后，自动生成的文档未同步更新
- **受影响文件**：posting-guide.md, session-log.md, video-script.md, video-config.json, report.json
- **检测脚本**：
```bash
python3 -c "
import os, re
for root, dirs, files in os.walk('docs'):
    for f in files:
        if f.endswith(('.md', '.html')):
            path = os.path.join(root, f)
            content = open(path).read()
            if re.search(r'\d{2,3}\s*秒', content):
                print(f'⚠️  {path}')
"
```
- **修复原则**：
  - 视频时长以 Remotion 渲染后 `ffprobe` 测得的实际秒数为准
  - `inferredTheme` 是自动分析残留字段，应删除；保留 `theme` 字段即可

---

## 5. 视频时长变化后的文档同步门禁

> **新增日期**：2026-05-27（来源：osiris 项目修复）

### 触发条件

视频时长从旧值变化到新值时（如 52s→47s），自动生成的文档中可能出现过期引用。

### 受影响的 4 类文档

| 文档类型 | 过期内容模式 | 修复要求 |
|----------|--------------|----------|
| `posting-guide.md` | 表格中的 `52秒` / 文案模板 `第52秒` | 替换为 ffprobe 实际测得秒数 |
| `session-log.md` | 目标时长 `52秒` / 字数上限 `⌊52×3.37⌋` | 重写为当前值 |
| `video-script.md` | `52s` 时长描述 | 替换为实际时长 |
| `report.json` / `video-config.json` | `inferredTheme` 残留字段 | 删除（与实际 `theme` 不一致） |

### 验证命令

```bash
# 检测所有 markdown/html 中的过期时长引用
python3 -c "
import os, re
for root, dirs, files in os.walk('docs'):
    for f in files:
        if f.endswith(('.md', '.html')):
            path = os.path.join(root, f)
            content = open(path).read()
            if re.search(r'\d{2,3}\s*秒', content):
                print(f'⚠️  {path}')
"

# 检测 video-config.json 中的 inferredTheme 残留
python3 -c "
import json, sys
cfg = json.load(open('video-config.json'))
if 'inferredTheme' in cfg:
    print(f'⚠️  video-config.json 含 inferredTheme: {cfg[\"inferredTheme\"]}')
else:
    print('✅ 无 inferredTheme')
"
```

---

## 维护检查清单

每次 skill 大修订后执行：

```bash
SKILL_DIR=~/.hermes/skills/video-creator

# 1. 验证所有内联引用存在
grep -oP '(?:references|rules|scripts)/[^)]]+\.(?:md|sh|py|js)' "$SKILL_DIR/SKILL.md" | sort -u | while read f; do
  [ -f "$SKILL_DIR/$f" ] || echo "❌ 死链: $f"
done

# 2. 检查是否有自相矛盾的段落（如"X不存在"+"引用X"）
grep -n "不存在\|死链\|缺失" "$SKILL_DIR/SKILL.md" | head -10
# 3. 交叉检查 references/ 文件数量变化
find "$SKILL_DIR/references" -maxdepth 1 -name "*.md" | wc -l
```

---

## 经验教训

1. **摘要永远不可信**：context compaction 将"声称完成"当作"实际完成"
2. **文档与代码必须同步修订**：代码改了文档要改，文档改了代码也要查
3. **自相矛盾是最高优先级信号**：文档自己否认自己，比文档与代码不一致更严重
4. **任何文件操作前先验证文件系统状态**：ls / test -f 是唯一可信的真相来源
5. **视频时长变化必须同步文档**：自动生成文档中的时长引用容易成为过期引用，渲染后必须验证