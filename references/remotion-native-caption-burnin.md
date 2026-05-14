# Remotion Native 字幕烧录机制

> 分析日期：2026-05-14
> 涉及文件：`create-remotion-project.js` 第 171-292 行，`Video.tsx` 第 654-721 行，`launch.sh` Step 3

## 核心结论

**CaptionOverlay 组件确实将字幕烧录进最终 MP4。**

CaptionOverlay 是 React 组件，通过 `staticFile` 读取 `captions.json`，在 Remotion 渲染**每一帧**时用 `<Sequence>` + 绝对定位 `<div>` 将字幕绘制进画面。最终输出的 MP4 包含烧录后的可见字幕。

**SKILL.md 旧版（2026-05-13 之前）的说法是错的**：
> "所有 CaptionOverlay 都是 HTML/CSS 组件，只在 Remotion Player 中渲染。导出 MP4 后完全消失"

这句话已被删除，替换为正确的 CaptionOverlay 烧录机制说明。

## 组件结构

```
Video.tsx（第 696-718 行）
├── <Audio src={staticFile(audioFile)} />      ← 音频内嵌
├── <Sequence> × N                              ← 场景序列
│   └── <SceneN_XXX />                         ← 各场景组件
└── <CaptionOverlay captionsFile={...} />      ← 字幕烧录
```

CaptionOverlay 内部（`create-remotion-project.js` 第 171-292 行）：
```typescript
// TikTokCaptionLine：逐字高亮行
const TikTokCaptionLine = ({ text, startFrame, durationInFrames, fps }) => {
  // 分词：中文按字符，英文按单词
  const tokens = useMemo(() => tokenize(text), [text]);
  // msPerToken = (durationInFrames / tokens.length / fps) * 1000
  // 当前帧 localFrame = frame - startFrame
  // currentMs = localFrame * (1000 / fps)
  // isPast = currentMs > tokenEndMs → 变半透明
  return <div style={{ bottom: 56, ... }}>
    {tokens.map((token, i) => (
      <span key={i} style={{ color: isPast ? "rgba(255,255,255,0.45)" : "#FFFFFF" }}>
        {token}
      </span>
    ))}
  </div>
};

// CaptionOverlay：读取 JSON + 按时间戳切分
export const CaptionOverlay = ({ captionsFile = "audio/captions.json" }) => {
  const [captions, setCaptions] = useState([]);
  useEffect(() => {
    fetch(staticFile(captionsFile)).then(r => r.json()).then(d => setCaptions(d));
  }, [captionsFile]);

  return (
    <AbsoluteFill>
      {captions.map((caption, index) => {
        const nextCaption = captions[index + 1] || null;
        const startFrame = Math.floor((caption.startMs / 1000) * fps);
        const endFrame = nextCaption
          ? Math.floor((nextCaption.startMs / 1000) * fps)
          : Math.floor((caption.endMs / 1000) * fps);
        return (
          <Sequence key={index} from={startFrame} durationInFrames={endFrame - startFrame}>
            <TikTokCaptionLine text={caption.text} startFrame={0} durationInFrames={...} fps={fps} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

## 字幕时间轴精度问题

**captions.json 的 startMs/endMs 由 launch.sh Step 3 生成**：
采用**比例分配算法**——总时长 = ffprobe 实测音频时长，每句按句子数等比划分时间槽。startMs/endMs 精确对应音频实际时间轴，字幕与音频完全同步。

## 文件路径

| 文件 | 路径 |
|------|------|
| captions.json | `video-project/public/audio/captions.json`（launch.sh Step 3 直接生成） |
| 音频 | `video-project/public/audio/neural_1_2x.m4a`（create-remotion-project.js 第 774-779 行复制） |
| CaptionOverlay.tsx | `video-project/src/components/CaptionOverlay.tsx` |
| Video.tsx | `video-project/src/Video.tsx` |
