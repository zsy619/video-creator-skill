# Remotion 项目创建与重建

> **最后更新**：2026-05-15
> **配套文档**：`remotion-compilation-errors.md`（编译错误）、`remotion-rendering-issues.md`（渲染问题）、`remotion-native-subtitles.md`（字幕机制）

---

## 目录

1. [创建 Remotion 项目](#1-创建-remotion-项目)
2. [--dir 路径解析 Bug](#2---dir-路径解析-bug)
3. [备份重建与版本冲突](#3-备份重建与版本冲突)
4. [已知有效命令组合](#4-已知有效命令组合)

---

## 1. 创建 Remotion 项目

### create-remotion-project.js 生成空目录结构

**症状**：运行 `node create-remotion-project.js --dir video-project` 后，video-project 目录存在但所有 src 文件都不存在。

**根因**：脚本只打印了结构说明，但没有实际创建任何文件。

**修复**：手动创建完整 Remotion 项目结构：

```bash
cd video-project
mkdir -p src/scenes src/components src/themes public/audio

# package.json（必须包含 @remotion/cli）
cat > package.json << 'EOF'
{
  "name": "video-project",
  "private": true,
  "dependencies": {
    "remotion": "4.0.459",
    "@remotion/cli": "4.0.459",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
EOF

npm install
```

### remotion.config.ts 导致 CLI 崩溃

**症状**：
```
TypeError: Cannot read properties of undefined (reading 'setVideoImageFormat')
```

**根因**：Remotion 4.x 中 `Config.setVideoImageFormat` API 已变更或移除。

**修复**：**删除 remotion.config.ts**，Remotion 使用合理默认值，不需要配置文件。

```bash
rm -f remotion.config.ts
npx remotion render VerticalVideo out/final.mp4 --fps=60 --disable-gpu --log=error
```

### package.json 缺少 @remotion/cli

**症状**：`npm install` 只安装 6 个包（js-tokens, loose-envify, react, react-dom, remotion, scheduler），没有 remotion CLI。

**根因**：`remotion` 包不包含 CLI，必须单独安装 `@remotion/cli`。

**正确 package.json**：
```json
{
  "dependencies": {
    "remotion": "4.0.459",
    "@remotion/cli": "4.0.459",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

**验证**：`ls node_modules/.bin/ | grep remotion` 应显示 remotion 可执行文件。

### npx remotion 输出嵌套目录

**症状**：封面图生成在 `video-project/docs/assets/cover.png` 而非 `docs/assets/cover.png`。

**根因**：`--output` 参数相对于 video-project 目录而非项目根目录。

**修复**：
```bash
# 先生成到 video-project 目录
npx remotion still VerticalVideo docs/assets/cover.png --frame=0 --log=error

# 然后复制到正确位置
cp video-project/docs/assets/cover.png docs/assets/cover.png
```

### calculateMetadata.ts 错误导入

**错误写法**：
```typescript
import { getAudioDuration } from "@remotion/media-utils";  // 不需要
import { useVideoConfig } from "remotion";                 // 不需要
```

**正确写法**（静态时长）：
```typescript
export const calculateMetadata = async () => {
  const fps = 60;
  const audioDurationInSeconds = 40.426;  // 硬编码或从配置文件读取
  const durationInFrames = Math.ceil(audioDurationInSeconds * fps);

  return { fps, width: 1080, height: 1920, durationInFrames };
};
```

### 音频文件路径问题

**症状**：`cp ../../audio/neural_1_2x.m4a` 提示文件不存在。

**根因**：相对路径在 video-project 目录内执行时解析错误。

**修复**：使用绝对路径：
```bash
cp /Users/zhushuyan/VideoProjects/project/audio/neural_1_2x.m4a public/audio/
```

### ffmpeg 输出路径模式错误

**症状**：
```
[image2 @ 0x...] The specified filename 'output.png' does not contain an image sequence pattern
```

**根因**：ffmpeg image2 muxer 需要 `-update` 或 `%03d` 模式。

**正确写法**：
```bash
# 单张图片输出
ffmpeg -y -i input.png -update 1 -frames:v 1 output.png

# 或者
ffmpeg -y -i input.png output.png  # 对于 PNG 通常可以
```

### Remotion still 封面图文字不可见（暗色/透明）

**症状**：`npx remotion still` 渲染的封面帧看起来没有文字。

**诊断方法**：
```bash
python3 -c "
from PIL import Image
import numpy as np
img = Image.open('/tmp/cover.png')
arr = np.array(img)
h, w = arr.shape[:2]
center = arr[h//3:2*h//3, w//3:2*w//3]
tb = center.max(axis=2)
print(f'>200亮度像素: {np.sum(tb > 200)}')
print(f'>100亮度像素: {np.sum(tb > 100)}')
print(f'平均亮度: {tb.mean():.1f}')
"
```

**判断标准**：
- `>200 亮度像素 > 10000`：文字清晰可见 ✅
- `>200 亮度像素 ≈ 0 但 >100 像素很多`：文字存在但偏暗
- `>100 亮度像素也很少`：文字基本不可见

---

## 2. --dir 路径解析 Bug

**文件**：`scripts/create-remotion-project.js`

**现象**：
```
node create-remotion-project.js --dir /full/path/to/project --name my-project
# 项目实际创建在 {cwd}/video-project，而非 /full/path/to/project/video-project
```

**根因**：脚本内部 `path.join(projectDir, 'video-project')` 使用相对路径拼接，但 `projectDir` 从 `--dir` 参数获取时，如果传入绝对路径但工作目录不在目标位置，路径解析可能出错。

**实测复现**：
```bash
cd /tmp
node $SKILL_DIR/scripts/create-remotion-project.js \
  --name hermes-agent-camel \
  --dir /Volumes/OpenClawDrive/.hermes/workspace/hermes-agent-camel-video
# 结果：video-project 被创建在 /tmp/video-project，而非目标目录
```

**影响**：
- Remotion 项目创建在错误位置
- 后续 `npm install` / `npx remotion render` 全部失败
- 报错 `ENOENT: no such file or directory, open .../package.json`

### Workaround

**方案A（推荐）**：不要从 `/tmp` 或其他非项目目录运行脚本
```bash
# ✅ 从项目父目录执行
cd /Volumes/OpenClawDrive/.hermes/workspace
node $SKILL_DIR/scripts/create-remotion-project.js --name my-project --dir .

# ✅ 从项目根目录执行
cd /Volumes/OpenClawDrive/.hermes/workspace/my-project-video
node $SKILL_DIR/scripts/create-remotion-project.js --name my-project --dir .
```

**方案B**：直接复制已知正常的 Remotion 项目结构
```bash
# 从 gallery-video 复制（已验证可用）
cp -r /Volumes/OpenClawDrive/.hermes/workspace/gallery-video/video-project \
       /Volumes/OpenClawDrive/.hermes/workspace/my-project-video/video-project
```

### 修复记录

- 2026-05-15: 首次记录（hermes-agent-camel 项目实测）
  - Workaround: 改用 `cp -r` 从 gallery-video 复制已知正常结构
  - 长期修复: 待 script 修改路径解析逻辑

---

## 3. 备份重建与版本冲突

### node_modules 版本冲突

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

**根因**：从备份复制 `node_modules` 时，各 `@remotion/*` 包版本不一致。

**修复**：
```bash
cd video-project
rm -rf node_modules package-lock.json
npm install remotion@4.0.461 @remotion/cli@4.0.461 lucide-react@1.8.0
```

### Audio 组件找不到文件

**症状**：Remotion 渲染成功但最终视频无音频。

**根因**：音频文件在 `src/audio/` 但 Remotion `Audio` 组件需要文件在 `public/audio/` 才能被 bundle。

**修复**：
```bash
# 确保音频文件在 public/audio/
cp src/audio/male_processed.m4a public/audio/

# 验证 Video.tsx 中的引用路径
grep "Audio src=" src/Video.tsx
```

### package.json 无 scripts

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

### 完整重建流程

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

### 备份应包含的最小文件集

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

---

## 4. 已知有效命令组合

```bash
# 渲染视频
npx remotion render VerticalVideo out/final.mp4 \
  --fps=60 --disable-gpu --log=error

# 生成封面
npx remotion still VerticalVideo docs/assets/cover.png \
  --frame=0 --log=error

# 音频处理
edge-tts --voice zh-CN-YunjianNeural --rate +0% \
  --text "$(cat narration.txt)" --write-media neural_full.mp3

ffmpeg -y -i neural_full.mp3 -af "atempo=1.2" \
  -c:a aac -b:a 256k neural_1_2x.m4a
```

### 验证清单（渲染前必查）

```bash
# 1. 检查 node_modules/.bin/remotion 存在
ls node_modules/.bin/remotion

# 2. 检查无 remotion.config.ts
[ ! -f remotion.config.ts ] && echo "✅ no config" || echo "❌ remove config"

# 3. 检查 package.json 包含 @remotion/cli
grep "@remotion/cli" package.json

# 4. 检查音频文件存在
ls public/audio/neural_1_2x.m4a public/audio/captions.json

# 5. 计算总帧数
python3 -c "print(int(40.426 * 60))"  # ≈ 2423 帧
```
