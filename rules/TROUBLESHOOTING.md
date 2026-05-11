# 故障排除

> 所属模块：video-creator / SKILL.md → 问题解决

## 常见问题

### Q: 视频渲染失败

```bash
# 清除缓存重试
rm -rf node_modules/.cache
npm install
npx remotion render
```

### Q: baoyu 技能无法获取内容

```bash
# 检查网络
curl -I https://example.com

# 使用交互模式
bun scripts/vendor/baoyu-fetch/src/cli.ts <url> --wait-for interaction
```

### Q: 字体显示异常

```html
<!-- 使用系统字体栈，无需加载外部字体 -->
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC',
                 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
  }
</style>
```

### Q: 音频有回音/重叠

- 原因：多个 `<Audio>` 组件同时播放，或 Remotion 渲染时内嵌了音频
- **解决方案：整个视频只用 1 个 `<Audio>` 组件，且必须通过 ffmpeg 混流嵌入，禁止在 Remotion 渲染时内嵌音频**

### Q: Remotion 渲染后音频混入

- **问题**：即使移除 `<Audio>` 组件，Remotion 4 仍会生成带静音音轨的视频
- **解决方案**：
  1. 确认 `VerticalVideo.tsx` 中**完全没有** `Audio` 和 `staticFile` 导入
  2. `grep -n "Audio" src/VerticalVideo.tsx` 应只返回导入行
  3. 如仍有音轨，用 ffmpeg 替换音频：`ffmpeg -y -i in.mp4 -c:v copy -c:a aac -b:a 256k -an out.mp4`

### Q: 音频有拼接感

- 原因：分段生成后拼接
- 解决：整段连续生成，不分段。详见 `VOICE.md`

### Q: Remotion 音频有编码杂音

- 解决：用 ffmpeg 混流绕过重编码。详见 `VOICE.md`

### Q: Remotion bundle 报错 "Entry point was specified as X, but it was not found"

- **原因**: `VerticalVideo` 是组件名（Composition ID），不是入口文件
- **解决**: bundle 使用 `src/index.ts`，render 使用 Composition ID
```bash
# bundle（用 index.ts）
npx remotion bundle src/index.ts --output build/bundle.js
# render（用 Composition ID）
npx remotion render VerticalVideo out/final-video.mp4
```

### Q: ffmpeg 报 "No such file or directory"（output 目录不存在）

- **原因**: 输出目录不存在
- **解决**: 先创建目录再执行 ffmpeg
```bash
mkdir -p out/
ffmpeg -i video-project/out/final-video.mp4 -i audio/neural_1_2x.m4a \
  -c:v copy -c:a aac -shortest out/final-video-with-audio.mp4
```

### Q: 封面图生成失败（API 不可用 / 错位）

当 baoyu 图像生成 API（Seedream / MiniMax / DashScope / OpenAI / OpenRouter）均不可用时，使用以下两种容错方案：


#### 方案一：Remotion 代码生成（推荐）

适用场景：需要动画效果、已有 Remotion 项目、需要与视频风格一致。

```tsx
// cover-project/src/Cover.tsx
import React from 'react';
import { AbsoluteFill, spring, interpolate } from 'remotion';
import { Composition } from 'remotion';

const CoverImage: React.FC = () => {
  const frame = 60; // 取中间帧
  const scale = spring({ frame, fps: 60, config: { damping: 12 } });
  const opacity = spring({ frame, fps: 60, config: { damping: 15 } });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0F172A', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      {/* 渐变光效 */}
      <div style={{ position: 'absolute', width: '100%', height: '100%' }}>
        <div style={{ position: 'absolute', top: '15%', left: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, #2563EB55, transparent)', filter: 'blur(80px)' }} />
      </div>
      {/* 标题 */}
      <div style={{ position: 'relative', textAlign: 'center', opacity, transform: `scale(${scale})` }}>
        <div style={{ color: '#22D3EE', fontSize: 112, fontWeight: 'bold', fontFamily: 'PingFang SC, sans-serif' }}>Obsidian Second Brain</div>
        <div style={{ color: '#94A3B8', fontSize: 40, fontFamily: 'PingFang SC, sans-serif', marginTop: 32 }}>让你的笔记库活过来</div>
      </div>
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition id="CoverImage" component={CoverImage} durationInFrames={90} fps={60} width={1080} height={1920} />
  );
};
```

渲染并提取帧：
```bash
npx remotion render CoverImage --output out/cover.mp4 --fps=60 --height=1920 --width=1080
ffmpeg -y -i out/cover.mp4 -vf "select=eq(n\,45)" -vsync 0 -frames:v 1 docs/assets/cover.png
```

#### 方案二：PIL/Pillow 纯代码生成

适用场景：API 全部不可用、快速生成、无需 AI 绘图能力。

**参考实现**：`scripts/generate_cover.py`

核心要素：
- 使用 `PIL.ImageDraw` 绘制渐变背景、文字、标签
- 使用 `ImageFont.truetype` 加载系统字体（macOS: `/System/Library/Fonts/STHeiti Medium.ttc` 或 PingFang）
- 垂直居中布局计算：先算总高度，再算起始 Y 坐标
- 输出分辨率 1080×1920（竖屏封面）

**最小模板**：
```python
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
fp = "/System/Library/Fonts/STHeiti Medium.ttc"  # macOS 系统字体
img = Image.new('RGB', (W, H), '#0F172A')
d = ImageDraw.Draw(img)

F = {
    'title': ImageFont.truetype(fp, 120),
    'sub':   ImageFont.truetype(fp, 48),
}

# 渐变背景
for y in range(H):
    t = y / H
    r, g, b = int(15 + t*20), int(23 + t*15), int(42 + t*30)
    d.line([(0, y), (W, y)], fill=(r, g, b))

X = W // 2

# 主标题（居中）
t = "Obsidian Second Brain"
bbox = d.textbbox((0, 0), t, font=F['title'])
d.text((X - bbox[2]//2, H//3), t, fill=(255,255,255), font=F['title'])

# 副标题
t = "让你的笔记库活过来"
bbox = d.textbbox((0, 0), t, font=F['sub'])
d.text((X - bbox[2]//2, H//3 + 200), t, fill=(34,211,238), font=F['sub'])

img.save('docs/assets/cover.png')
```

**关键字体路径（macOS）**：
| 字体 | 路径 |
|------|------|
| 黑体 | `/System/Library/Fonts/STHeiti Medium.ttc` |
| 苹方 | `/System/Library/Fonts/PingFang.ttc` |
| 华文细黑 | `/System/Library/Fonts/STHeiti Light.ttc` |


### Q: Chrome headless shell 下载失败 (UNABLE_TO_GET_ISSUER_CERT_LOCALLY)

- 原因：TLS 证书验证失败
- 解决：设置环境变量绕过验证

```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
npx remotion render VerticalVideo --output out/video.mp4
```

注意：此方法会降低安全性，仅在本地开发环境使用。

### Q: useCurrentFrame() 报错 "can only be called inside a component registered as a Composition"

- 原因：`useCurrentFrame()` 只能在被 `<Composition>` 注册的组件内部调用。在 `Sequence` 的子组件中直接使用 `useCurrentFrame()` 会触发此错误。
- 解决：采用「传递帧参数」模式。

**错误模式（不要这样做）**：

```tsx
// ❌ 错误：Scene 组件内部直接调用 useCurrentFrame()，在 Sequence 内会报错
export const VerticalVideo: React.FC = () => {
  const frame = useCurrentFrame(); // ✅ 主组件可以
  return (
    <Sequence from={0} durationInFrames={300}>
      <Scene1 /> {/* ❌ Scene1 内部 useCurrentFrame() 会失败 */}
    </Sequence>
  );
};
```

**正确模式（标准做法）**：

```tsx
// ✅ src/Root.tsx — 定义 Composition
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VerticalVideo"
      component={VerticalVideo}
      durationInFrames={3600}
      fps={60}
      width={1080}
      height={1920}
    />
  );
};

// ✅ src/index.tsx — 注册根组件
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';
registerRoot(() => <RemotionRoot />);

// ✅ src/VerticalVideo.tsx — 主组件获取帧，传递给场景
export const VerticalVideo: React.FC = () => {
  const frame = useCurrentFrame(); // 在 Composition 内，可直接调用
  return (
    <AbsoluteFill>
      {/* ⚠️ headless 环境：音频通过 ffmpeg 外部注入，禁止 Remotion Audio 组件 */}
      {/* <Audio src={staticFile('audio/neural_1_2x.m4a')} /> ← 禁止！ */}
      <Sequence from={0} durationInFrames={300}>
        <Scene1 frame={frame} /> {/* 通过 props 传递 frame */}
      </Sequence>
      <Sequence from={300} durationInFrames={420}>
        <Scene2 frame={frame} />
      </Sequence>
    </AbsoluteFill>
  );
};

// ✅ src/Scene1.tsx — 接收 frame 作为 props
const Scene1: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [0, 30], [0, 1]); // 使用传入的 frame
  return <div style={{ opacity }}>内容</div>;
};
```

**关键规则**：
- `useCurrentFrame()` 只在 `Root.tsx` 中定义的 `<Composition>` 组件内可直接使用
- 所有场景子组件通过 `frame` prop 接收帧数
- 每个 `Sequence` 嵌套一个「帧包装组件」，该组件调用 `useCurrentFrame()` 并传给实际场景

---

## 封面渲染：remotion still 文字不显示

**症状**：Remotion 封面图只有深色背景，所有文字（标题、统计数字、CTA）都不渲染，图片为纯黑/深蓝色。

**原因**：`remotion still` 命令在某些版本中对 div 内文字渲染有问题，文字内容不被捕获。

**解决方案**：使用 `render --frames=0` 代替 `still`：

```bash
# ❌ 错误方式 — 文字不渲染
npx remotion still CoverImage --output-file=docs/assets/cover.png

# ✅ 正确方式 — 文字正常渲染
cd video-project
npx remotion render CoverImage --frames=0 --log=error
cp out/CoverImage.png docs/assets/cover.png
```

**验证**：生成后检查图片中亮色像素数量：
```python
from PIL import Image
img = Image.open('docs/assets/cover.png')
bright = sum(1 for p in img.getdata() if max(p[:3]) > 100)
print(f"亮色像素: {bright}")  # 应 > 0
```
