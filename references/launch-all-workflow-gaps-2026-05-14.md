# launch.sh all 已知问题

## 问题描述

`launch.sh all` 声称执行完整流程（Step 0-11），但实际上：

1. 执行 Step 0-3（docs + audio + subtitles）
2. Gate B 失败时直接 `exit 1`，不会继续执行 Step 4（Remotion 项目创建）和 Step 10（渲染）

## 根因

- `launch.sh all` 中 Step 3 将 `captions.json` 写入 `video-project/public/audio/`（Remotion 读取路径）
- Gate B（`video-quality-gate.js` subtitle 节点）检查 `audio/` 目录
- 路径不一致导致 Gate B 失败，`launch.sh all` 提前退出

## 修复方法

Gate B 失败后，手动执行：

```bash
# 1. 复制 captions.json 到 audio/（Gate B 检查路径）
cp video-project/public/audio/captions.json audio/

# 2. 验证 Gate B 通过
node {SKILL_DIR}/scripts/video-quality-gate.js {PROJECT_DIR} subtitle

# 3. 创建 Remotion 项目
node {SKILL_DIR}/scripts/create-remotion-project.js {PROJECT_DIR}

# 4. 修复 Remotion 项目
node {SKILL_DIR}/scripts/fix-remotion-project.js {PROJECT_DIR}

# 5. npm install
cd video-project && npm install

# 6. 渲染
npx remotion render VerticalVideo out/final.mp4 --concurrency=4 --fps=60 --disable-gpu --log=error
```

## 长期修复方向

launch.sh 应该：
- Step 3 生成 captions.json 后，同时复制到 `audio/`（Gate B 检查路径）
- 或者 Gate B 检查 `video-project/public/audio/`（与 Remotion 读取路径一致）
- `launch.sh all` 应该在 Gate B 失败后继续尝试渲染（--continue-on-error 模式）