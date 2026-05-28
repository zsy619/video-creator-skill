# Math.round() 帧数计算规范

> **最后更新**：2026-05-28
> **适用范围**：所有生成 Remotion 视频帧数的代码（JS/Shell/Python）

---

## 核心规则

**Remotion 内部使用 `Math.round()` 计算帧数**，所有帧数计算必须统一使用 `round()` 而非 `ceil()` 或 `floor()`。

**`ceil()` 会导致多 1 帧偏差**：
- `ceil(58.944 × 60)` = 3540 帧 → 渲染时长 59.0s
- `round(58.944 × 60)` = 3537 帧 → 渲染时长 58.95s（与音频匹配）
- 多 1 帧会导致末帧被切，captions.json 末段 endMs 对应不上

---

## 必须用 round() 的场景

| 文件 | 行 | 代码 |
|------|-----|------|
| `scripts/create-remotion-project.js` | 750 | `Math.round(s.duration * (fps \|\| 60))` |
| `scripts/create-remotion-project.js` | 806 | `Math.round(parseFloat(dur.trim()) * fps)` |
| `scripts/create-remotion-project.js` | 808 | `Math.round((config.duration \|\| 52) * fps)` |
| `scripts/create-remotion-project.js` | 811 | `Math.round((config.duration \|\| 52) * fps)` |
| `scripts/video-composer.js` | 138 | `Math.round(duration * fps)` |
| `scripts/video-composer.js` | 144 | `Math.round(totalFrames / sceneCount)` |
| `scripts/video-composer.js` | 316/325 | `Math.round(${duration} * ${fps})` |
| `scripts/video-composer.js` | 319 | `Math.round(audioDuration * fps)` |
| `scripts/launch.sh` | 386/654 | `math.round`（TOTAL_FRAMES） |
| `scripts/pre-render-check.js` | 184 | `Math.round(EXPECTED_DURATION * FPS)` |
| `scripts/pre-subtitle-check.js` | 212/215 | `Math.round(dur * 60)` |

---

## 可以用 ceil/floor 的场景（语义不同）

| 场景 | 原因 |
|------|------|
| 时长估算（秒，非帧数）`ceil(chineseChars / 400 * 60)` | 向上取整估算阅读时间，合理 |
| 场景时长分配 `ceil(duration * 0.15)` | 末场景用 TOTAL_FRAMES 吸收误差 |
| 时间轴换算 `Math.floor((ms/1000) * fps)` | 字幕时间轴计算（帧边界用 floor 可接受） |
| 音频码率/字数上限 `Math.floor(TARGET_DURATION * 3.37)` | 字数上限取整，向下取整更安全 |

---

## 验证命令

```bash
# Python 帧数验证（round，非 ceil）
python3 -c "import math; ms=46968; fps=60; frames=math.round(ms/1000*fps); print(f'DURATION_FRAMES={frames}')"
# 输出：DURATION_FRAMES=2819

# JS 语法检查
node --check scripts/create-remotion-project.js
node --check scripts/video-composer.js
node --check scripts/launch.sh
```

---

## 常见错误模式

```javascript
// ❌ 错误：ceil 导致多 1 帧
const totalFrames = Math.ceil(audioDuration * fps);

// ✅ 正确：round 与 Remotion 内部一致
const totalFrames = Math.round(audioDuration * fps);

// ❌ 错误：floor 导致总帧数偏少
const framesPerScene = Math.floor(totalFrames / sceneCount);

// ✅ 正确：round 均分场景
const framesPerScene = Math.round(totalFrames / sceneCount);
```

---

## 历史教训

2026-05-28：发现 `video-composer.js` 使用 `Math.floor(totalFrames / sceneCount)` 导致场景帧分配不足，总帧可能 < audioFrames。另发现 `pre-subtitle-check.js` 字数上限公式使用 `6.45`（对应 rate=+20%），但 TTS 使用 rate=+0%，实际速率 3.37 字/秒。
