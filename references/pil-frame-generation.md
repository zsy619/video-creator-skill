# PIL 帧生成规范 (gen_frames_template.py)

## 核心职责
生成 `frames/frame_%04d.png` 帧序列（竖屏 1080×1920 @60fps），由 ffmpeg 单次混流为 MP4。

## 入口
```bash
python3 scripts/gen_frames_template.py <project-dir> [--theme THEME]
```

## 帧边界计算
### 动态场景边界 (`compute_scene_boundaries()`)
- 优先读取 `video-config.json` 的 `sceneFractions`（比例数组，如 `[0.05, 0.25, 0.25, 0.20, 0.13, 0.12]`）
- 未定义时使用默认 6 场景比例（总和=1.0，自动归一化）
- 返回 `[(start0, end0), (start1, end1), ...]`，全局帧号
- 最后一场景 end 延伸到 `total_frames`
- 内部局部帧 = `fn - start`

### 总帧数
```
TOTAL_FRAMES = math.ceil(audio_duration * 60)  # 强制60fps
```
音频时长由 ffprobe 读取 `neural_1_2x.m4a`

## 主题支持
### 配色常量 (`THEME_COLORS`)
支持 21 个主题（同步 `themes.js`）：
```
cyberpunk, tech-modern, minimal-tech, neon-future, particle-tech,
quantum-tech, data-stream, holographic, deep-ocean, gradient-wave,
aurora-gradient, vibrant-gradient, glass-morphism, forest-nature,
arctic-ice, dark-minimal, neon-city, fintech, pure-medical,
autumn-vintage, game-elite
```

### 安全颜色访问
使用 `get_theme_color(colors, *keys)` 安全获取颜色：
```python
c_cyan = get_theme_color(C, 'neon_cyan', 'primary', 'bg2')
c_muted = get_theme_color(C, 'muted', 'secondary', 'bg2')
```
键名不存在时按顺序尝试，最终降级到 `(255, 255, 255)`。

**不要**使用 `C.get('neon_cyan', (0,255,255))` — 因为不同主题的键名差异大，降级值不准确。

## 场景函数规范
6 个场景函数（封面/理念/系统/特性/代码/CTA），每个签名为：
```python
def scene_cover(fn, total_frames, config, colors) -> Image:
    # fn: 局部帧号（从0开始）
    # total_frames: 当前场景总帧数 (= end - start)
    # config: video-config.json
    # colors: THEME_COLORS[key]
```

### 动态场景数量
`scene_funcs` 数量固定为 6，但 `n_funcs = len(scene_funcs)`，渲染时用 `func_idx = i % n_funcs` 循环映射到场景函数。

## 门禁检查 (video-quality-gate.js C7-C10)
- **C7**: 帧数验证（actual vs target）
- **C8**: 帧编号连续性（frame_0000 → frame_NNNN）
- **C9**: gen_frames_template.py 存在性
- **C10**: 黑屏检测（抽样亮度分析）

### C10 黑屏检测逻辑
```python
# 抽样策略：帧数>=10时，抽首帧+末帧+中间帧+每10%位置
# 亮度计算：mean_brightness = arr.mean()  # 0-255
# 判定：is_black = (mean_brightness < 5.0)
# 首帧黑屏 → fail()
# 30%+帧黑屏 → warn()
# 正常 → pass() + 报告平均亮度
```

## ffmpeg 单次混流命令
```bash
ffmpeg -y -framerate 60 \
  -i frames/frame_%04d.png \
  -i audio/neural_1_2x.m4a \
  -i audio/subtitles.ass \
  -map 0:v -map 1:a -map 2 \
  -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 256k \
  -shortest \
  output/final.mp4
```

## 常见问题
- **KeyError 颜色键**: 使用 `get_theme_color()` 而非 `.get()`
- **场景边界越界**: 用 `func_idx = i % n_funcs` 动态映射
- **黑屏首帧**: 封面场景 `scene_cover` 必须在第 0 帧生成非黑色内容（默认有网格+HUD四角装饰）
