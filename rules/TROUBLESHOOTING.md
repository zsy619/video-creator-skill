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

- 原因：多个 `<Audio>` 组件同时播放
- 解决：只使用 1 个 `<Audio>` 组件从头播到尾。详见 `VOICE.md`

### Q: 音频有拼接感

- 原因：分段生成后拼接
- 解决：整段连续生成，不分段。详见 `VOICE.md`

### Q: Remotion 音频有编码杂音

- 解决：用 ffmpeg 混流绕过重编码。详见 `VOICE.md`

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
