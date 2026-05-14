# Remotion 项目备份重建指南

## 何时使用

从备份目录（如 `VideoProjectsBak/`）恢复或重建视频项目时使用。

---

## 常见问题

### 问题1：node_modules 版本冲突

**症状**：
```
Error: Cannot find module './dist/index'
```
或 Remotion 版本不一致警告：
```
Version mismatch:
- On version: 4.0.461
  - @remotion/bundler node_modules/@remotion/bundler/package.json
- On version: 4.0.459
  - @remotion/cli node_modules/@remotion/cli/package.json
```

**根因**：从备份复制 `node_modules` 时，各 `@remotion/*` 包版本不一致（备份中的包来自不同时间点的安装）。

**修复**：
```bash
cd video-project
rm -rf node_modules package-lock.json
npm install remotion@4.0.461 @remotion/cli@4.0.461 lucide-react@1.8.0
```

### 问题2：Audio 组件找不到文件

**症状**：Remotion 渲染成功但最终视频无音频。

**根因**：音频文件在 `src/audio/` 但 Remotion `Audio` 组件需要文件在 `public/audio/` 才能被 bundle。

**修复**：
```bash
# 确保音频文件在 public/audio/
cp src/audio/male_processed.m4a public/audio/

# 验证 Video.tsx 中的引用路径
grep "Audio src=" src/Video.tsx
# 应显示：<Audio src={require("./audio/male_processed.m4a")} />
```

### 问题3：package.json 无 scripts

**症状**：备份的 `package.json` 是最小模板，缺少 `dev`/`start` 脚本。

**修复**：确保 `package.json` 包含：
```json
{
  "dependencies": {
    "remotion": "4.0.461",
    "@remotion/cli": "4.0.461",
    "lucide-react": "^1.8.0"
  }
}
```

---

## 完整重建流程

```bash
PROJECT_DIR="/Volumes/OpenClawDrive/.hermes/workspace/{project-name}-video"

# 1. 复制备份的 docs/ 和 video-project/
cp -r /Volumes/OpenClawDrive/VideoProjectsBak/260514/{project}/docs "$PROJECT_DIR/"
cp -r /Volumes/OpenClawDrive/VideoProjectsBak/260514/{project}/video-project "$PROJECT_DIR/"

# 2. 确保音频在正确位置
mkdir -p "$PROJECT_DIR/video-project/public/audio"
cp "$PROJECT_DIR/video-project/src/audio/"*.m4a "$PROJECT_DIR/video-project/public/audio/" 2>/dev/null

# 3. 清理并重装 node_modules
cd "$PROJECT_DIR/video-project"
rm -rf node_modules package-lock.json
npm install remotion@4.0.461 @remotion/cli@4.0.461 lucide-react@1.8.0

# 4. 验证安装
node --check src/index.tsx

# 5. 渲染
npx remotion render VerticalVideo out/final.mp4 --concurrency=4 --fps=60 --disable-gpu --log=error

# 6. 验证
ffprobe -v error -show_streams out/final.mp4 2>&1 | grep -E "codec_name|width|height|duration|r_frame_rate"
```

---

## 备份应包含的最小文件集

从备份恢复时，确认以下文件存在：

| 路径 | 说明 |
|------|------|
| `docs/video-script.md` | 场景脚本 |
| `docs/narration.txt` | 配音文本 |
| `video-project/src/Video.tsx` | 视频组件 |
| `video-project/src/index.tsx` | Remotion 入口 |
| `video-project/public/audio/*.m4a` | 音频文件 |

可选（有则复制）：
- `docs/assets/cover*.png` — 封面图
- `video-project/out/final.mp4` — 上次渲染结果
