# Remotion 4.x 已知问题与修复方案

> **最后更新**: 2026-05-13
> **来源**: ai-trader-video 项目实战

---

## 问题1: create-remotion-project.js 生成空目录结构

**症状**: 运行 `node create-remotion-project.js --dir video-project` 后，video-project 目录存在但所有 src 文件都不存在。

**根因**: 脚本只打印了结构说明，但没有实际创建任何文件。

**修复**: 手动创建完整 Remotion 项目结构：

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

---

## 问题2: remotion.config.ts 导致 CLI 崩溃

**症状**:
```
TypeError: Cannot read properties of undefined (reading 'setVideoImageFormat')
```

**根因**: Remotion 4.x 中 `Config.setVideoImageFormat` API 已变更或移除。

**修复**: **删除 remotion.config.ts**，Remotion 使用合理默认值，不需要配置文件。

```bash
rm -f remotion.config.ts
npx remotion render VerticalVideo out/final.mp4 --fps=60 --disable-gpu --log=error
```

---

## 问题3: package.json 缺少 @remotion/cli

**症状**: `npm install` 只安装 6 个包（js-tokens, loose-envify, react, react-dom, remotion, scheduler），没有 remotion CLI。

**根因**: `remotion` 包不包含 CLI，必须单独安装 `@remotion/cli`。

**正确 package.json**:
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

**验证**: `ls node_modules/.bin/ | grep remotion` 应显示 remotion 可执行文件。

---

## 问题4: npx remotion still 输出嵌套目录

**症状**: 封面图生成在 `video-project/docs/assets/cover.png` 而非 `docs/assets/cover.png`。

**根因**: `--output` 参数相对于 video-project 目录而非项目根目录。

**修复**:
```bash
# 先生成到 video-project 目录
npx remotion still VerticalVideo docs/assets/cover.png --frame=0 --log=error

# 然后复制到正确位置
cp video-project/docs/assets/cover.png docs/assets/cover.png
```

---

## 问题5: calculateMetadata.ts 错误导入

**错误写法**:
```typescript
import { getAudioDuration } from "@remotion/media-utils";  // 不需要
import { useVideoConfig } from "remotion";                 // 不需要
```

**正确写法**（静态时长）:
```typescript
export const calculateMetadata = async () => {
  const fps = 60;
  const audioDurationInSeconds = 40.426;  // 硬编码或从配置文件读取
  const durationInFrames = Math.ceil(audioDurationInSeconds * fps);

  return { fps, width: 1080, height: 1920, durationInFrames };
};
```

---

## 问题6: 音频文件路径问题

**症状**: `cp ../../audio/neural_1_2x.m4a` 提示文件不存在。

**根因**: 相对路径在 video-project 目录内执行时解析错误。

**修复**: 使用绝对路径：
```bash
cp /Users/zhushuyan/VideoProjects/project/audio/neural_1_2x.m4a public/audio/
```

---

## 问题7: ffmpeg 输出路径模式错误

**症状**:
```
[image2 @ 0x...] The specified filename 'output.png' does not contain an image sequence pattern
```

**根因**: ffmpeg image2 muxer 需要 `-update` 或 `%03d` 模式。

**正确写法**:
```bash
# 单张图片输出
ffmpeg -y -i input.png -update 1 -frames:v 1 output.png

# 或者
ffmpeg -y -i input.png output.png  # 对于 PNG 通常可以
```

---

## 验证清单（渲染前必查）

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

---

## 问题8: Remotion still 封面图文字不可见（暗色/透明）

**症状**: `npx remotion still` 渲染的封面帧看起来没有文字，但实际上像素数据中存在文字。

**根因**:
1. 动画 `opacity: interpolate(frame, [from, from+duration], [0, 1])` 从透明逐渐变到不透明，如果渲染的帧号在动画中途，文字仍然是半透明的
2. 即使到达动画最后一帧，白色文字 `#FFFFFF` 在深色背景 `#0D0D1A` 上的 PNG 编码亮度可能仍然很低（深色背景本身 RGB 就接近文字颜色）

**诊断方法** — 渲染后立即用 Python 检查文字区域亮度:
```bash
python3 -c "
from PIL import Image
import numpy as np
img = Image.open('/tmp/cover.png')
arr = np.array(img)
h, w = arr.shape[:2]
# 检查中心区域（主标题通常在这里）
center = arr[h//3:2*h//3, w//3:2*w//3]
tb = center.max(axis=2)
print(f'>200亮度像素: {np.sum(tb > 200)}')
print(f'>100亮度像素: {np.sum(tb > 100)}')
print(f'平均亮度: {tb.mean():.1f}')
"
```

**判断标准**:
- `>200 亮度像素 > 10000`: 文字清晰可见 ✅
- `>200 亮度像素 ≈ 0 但 >100 像素很多`: 文字存在但偏暗，可用 ImageMagick 增强
- `>100 亮度像素也很少`: 文字基本不可见，需要从更晚的帧重新渲染

**帧号选择策略**:
- 封面动画时长 = 3秒 × 60fps = 180帧
- 渲染 `帧号 = 总帧数 - 1`（例如179，而非0或90）
- 如果动画时长不是整数，提前一帧是安全的

**ImageMagick 增强暗色封面**:
```bash
# 轻度增强（文字略微偏暗时）
magick /tmp/cover.png -level 10%,60%,1.5 -brightness-contrast 20x15 /tmp/cover_enhanced.png

# 重度增强（文字严重偏暗时）
magick /tmp/cover.png -brightness-contrast 70x30 /tmp/cover_recovered.png

# 然后替换封面文件
cp /tmp/cover_recovered.png docs/assets/cover.png
```

**从视频第179帧重新渲染完整封面**:
```bash
cd video-project
npx remotion still VerticalVideo /tmp/cover_frame179.png --frame 179
cp /tmp/cover_frame179.png ../docs/assets/cover.png
magick /tmp/cover_frame179.png -resize 900x383^ -gravity center -extent 900x383 ../docs/assets/cover-wechat.png
magick /tmp/cover_frame179.png -resize 1440x2560 ../docs/assets/cover-xhs.png
```

---

## 已知有效的命令组合

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
