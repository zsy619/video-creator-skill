# captions.json 404 根因与解决方案（2026-05-14 实测）

## 问题现象

Remotion 渲染时 `CaptionOverlay` 报错：
```
[http://localhost:3000/public/audio/captions.json] Failed to load resource: the server responded with a status of 404 (Not Found)
TypeError: captions.map is not a function
```

## 根因分析

`create-remotion-project.js` 在创建项目时会生成空的 `public/audio/neural_1_2x.m4a` 和 `public/audio/captions.json`。即使后续手动生成正确的 captions.json 并复制到 `public/audio/`，Remotion bundle 在服务启动时已经编译了这些路径。

关键问题：**Remotion 的 bundle 是预编译的，服务启动后不再重新读取文件系统中的 audio 目录**。所以即使覆盖了 `public/audio/` 中的文件，已经 bundle 的路径仍然指向旧的内容。

## 实测验证（3个项目）

| 步骤 | 操作 | 结果 |
|------|------|------|
| 1 | create-remotion-project.js | 生成空 captions.json |
| 2 | 手动生成 audio + captions.json | 覆盖到 public/audio/ |
| 3 | npm install | 安装完成 |
| 4 | npx remotion render | 仍报 404 |

## 解决方案

需要在 **create-remotion-project.js 执行之前** 就准备好正确的 audio 文件。

正确流程：
```bash
# 1. 先生成音频和字幕（在创建 Remotion 项目之前）
edge-tts --voice "zh-CN-YunjianNeural" --rate "+0%" --write-media audio/neural_full.mp3 --text "$(cat docs/narration.txt)"
ffmpeg -y -i audio/neural_full.mp3 -af "atempo=1.2" -c:a aac -b:a 256k audio/neural_1_2x.m4a

# 2. 生成 captions.json
node -e "..." > audio/captions.json

# 3. 然后再创建 Remotion 项目（create-remotion-project.js 会读取 audio/ 中的文件）
node {SKILL_DIR}/scripts/create-remotion-project.js {PROJECT_DIR}

# 4. 修复项目
node {SKILL_DIR}/scripts/fix-remotion-project.js {PROJECT_DIR}

# 5. 安装依赖
cd video-project && npm install

# 6. 渲染（此时 public/audio/ 中的文件已经是正确的）
npx remotion render VerticalVideo out/final.mp4 --concurrency=4 --fps=60 --disable-gpu --log=error
```

## 关键教训

**音频和字幕必须在创建 Remotion 项目之前生成，并放置在 `audio/` 目录中**。`create-remotion-project.js` 会在创建项目时从 `audio/` 复制到 `public/audio/`。如果 `audio/` 中已有正确的文件，就不会复制空文件。

## 自动修复命令

如果已经经历了 404 问题，执行以下命令重新复制：
```bash
PROJECT_DIR="/Volumes/OpenClawDrive/.hermes/workspace/{project-name}"
cp "$PROJECT_DIR/audio/captions.json" "$PROJECT_DIR/video-project/public/audio/"
cp "$PROJECT_DIR/audio/neural_1_2x.m4a" "$PROJECT_DIR/video-project/public/audio/"
```
然后重新渲染应该就能成功。