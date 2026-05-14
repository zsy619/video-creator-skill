---
name: launch-sh-bugs-2026-05-14
title: launch.sh 关键Bug修复记录
description: launch.sh 脚本中的路径错误和逻辑缺陷，已在2026-05-14修复
tags:
  - video-creator
  - launch.sh
  - captions.json
  - SKILL_DIR
  - pre-render-check
  - 已知问题
---

# launch.sh 关键Bug修复记录

> session-specific detail: 2026-05-14 实测发现的 launch.sh 脚本缺陷

## Bug 1: SKILL_DIR 默认路径错误

**文件**: `scripts/launch.sh` 第16行

**错误值**:
```bash
SKILL_DIR="${SKILL_DIR:-$HOME/AISkills/video-creator}"
```

**正确值**:
```bash
SKILL_DIR="${SKILL_DIR:-$HOME/.hermes/skills/video-creator}"
```

**影响**: 不设置 SKILL_DIR 环境变量时，`bash launch.sh init` 等命令会报错 "Permission denied" 或找不到脚本

---

## Bug 2: captions.json 未同步到 audio/

**文件**: `scripts/launch.sh` Step 3 (cmd_all 函数内)

**现象**: Gate B 检查失败，报 "captions.json 文件不存在"

**根因**: Step 3 的 Python 脚本只将 captions.json 写入 `video-project/public/audio/captions.json`，但 Gate B（video-quality-gate.js）检查 `audio/captions.json`

**修复**: Step 3 末尾添加:
```bash
# 同时复制到 audio/（供 Gate B 检查使用）
cp "${VP_DIR}/public/audio/captions.json" "${proj_dir}/audio/captions.json"
```

**影响**: 导致 `launch.sh all` 在 Gate B 阶段提前退出

---

## Bug 3: pre-render-check 路径检查错误

**文件**: `scripts/launch.sh` cmd_render 函数

**现象**: `cmd_render` 将 `$proj_dir`（项目根目录）传给 `pre-render-check`，但 pre-render-check 在 `$proj_dir/src/` 下找 .tsx 文件，而 Remotion 项目实际在 `$proj_dir/video-project/src/`

**错误逻辑**:
```bash
# cmd_render 接收的是 $1 = "$proj_dir"，但传给 pre-render-check 时
# pre-render-check 在 {proj_dir}/src/ 找 tsx，实际路径是 {proj_dir}/video-project/src/
if ! node "${GATE}" "${proj_dir}" "render" > /dev/null 2>&1; then
```

**影响**: pre-render-check 对有效项目报错 "在 src/ 下找不到 .tsx 文件"

**备注**: `launch.sh all` 的 cmd_all 中也有相同问题（Step 6），但因 warn 级别不影响流程，未阻塞渲染

---

## 修复记录

- 2026-05-14: 首次记录
  - Bug 1: `AISkills` → `.hermes/skills` (P1 — 阻塞 init)
  - Bug 2: 添加 `cp captions.json` 到 audio/ (P1 — 阻塞 Gate B)
  - Bug 3: pre-render-check 路径问题，记录但不阻塞 (P2)
