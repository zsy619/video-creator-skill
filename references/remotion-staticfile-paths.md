# Remotion 4.x staticFile() 相对路径陷阱

> **来源**: ian-handdrawn-ppt 视频项目实战（2026-05-09）
> **触发**: Remotion 4.x 渲染音频时报错
> **教训**: `staticFile()` 只接受 `public/` 下的文件名，不接受 `../` 路径跳转

---

## 错误

```
TypeError: staticFile() does not support relative paths - got "../../audio/neural_processed.m4a"
```

Remotion 4.x 的 `staticFile()` API **只接受** `public/` 目录下的文件名。

## 正确流程

### Step 1: 音频后处理完成后，拷贝到 `public/audio/`

```bash
mkdir -p video-project/public/audio
cp ../../audio/neural_processed.m4a video-project/public/audio/
```

### Step 2: Composition 中使用文件名引用

```tsx
// ❌ 错误
<Audio src={staticFile("../../audio/neural_processed.m4a")} />

// ✅ 正确
<Audio src={staticFile("audio/neural_processed.m4a")} />
```

## 原理

`staticFile()` 在 Remotion 4.x 内部会查找 `public/` 目录，文件名必须相对于该目录。

完整文件树：
```
video-project/
├── public/
│   └── audio/
│       └── neural_processed.m4a   ← 音频放这里
└── src/
    └── Composition.tsx              ← staticFile("audio/neural_processed.m4a")
```

## 验证命令

```bash
# 确认文件在正确位置
ls -la video-project/public/audio/

# 渲染时确认无相对路径错误
npx remotion render MyComp out/video.mp4 --log=error
```