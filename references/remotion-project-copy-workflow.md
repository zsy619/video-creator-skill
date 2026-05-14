# Remotion 项目复制后重建工作流

## 何时使用

从 `gallery-video` 模板复制 Remotion 项目到新项目时使用。

## 标准流程（已验证成功 × 3）

```bash
PROJECT_DIR="/Volumes/OpenClawDrive/.hermes/workspace/{project-name}-video"
GALLERY_VIDEO="/Volumes/OpenClawDrive/.hermes/workspace/gallery-video/video-project"

# 1. 复制整个项目（保留结构）
rm -rf "$PROJECT_DIR/video-project"
cp -r "$GALLERY_VIDEO" "$PROJECT_DIR/video-project"

# 2. 【关键】重建 node_modules（复制后必然损坏）
cd "$PROJECT_DIR/video-project"
rm -rf node_modules
npm install 2>&1 | tail -3

# 3. 复制音频和字幕到 public 目录
mkdir -p "$PROJECT_DIR/video-project/public/audio"
cp "$PROJECT_DIR/audio/neural_1_2x.m4a" "$PROJECT_DIR/video-project/public/audio/"
cp "$PROJECT_DIR/audio/captions.json" "$PROJECT_DIR/video-project/public/audio/"

# 4. 更新 Root.tsx 的项目信息
# （修改 title, subtitle, theme, durationInFrames）

# 5. 渲染
cd "$PROJECT_DIR/video-project"
npx remotion render VerticalVideo out/final \
  --concurrency=4 --fps=60 --timeout 300000 --log=error

# 6. 音频混流（Remotion 内嵌音频静默，必须重新混流）
ffmpeg -y -i out/final.mp4 \
  -map 0:v -c:v copy \
  video_only.mp4

ffmpeg -y -i video_only.mp4 \
  -i "$PROJECT_DIR/audio/neural_1_2x.m4a" \
  -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 256k -shortest \
  out/final_with_audio.mp4

cp out/final_with_audio.mp4 "$PROJECT_DIR/final.mp4"
```

## 根因：为何 node_modules 必须重建

`cp -r` 复制 node_modules 时：
- bin 目录的 symlink 可能指向错误路径（源项目 build 目录）
- `.bin/` 下的 executable 脚本失效
- 报错：`Cannot find module './dist/index'`

验证 `remotion` CLI 是否正常：
```bash
cd "$PROJECT_DIR/video-project"
node_modules/.bin/remotion --version
```

## 已验证项目

| 项目 | 日期 | 结果 |
|---|---|---|
| gallery-video | 2026-05-13 | 模板 |
| hermes-agent-camel | 2026-05-14 | ✅ 成功 |
| html-anything | 2026-05-14 | ✅ 成功 |