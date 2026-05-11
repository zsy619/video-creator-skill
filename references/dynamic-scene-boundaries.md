# 动态场景帧边界计算

## 核心问题

旧代码使用硬编码场景边界（如 `0-180`、`180-900`），导致：
- 60秒视频固定分配，任意时长视频无法适配
- 主题切换时比例不变，灵活性差

## 解决方案：compute_scene_boundaries()

```python
def compute_scene_boundaries(total_frames, config):
    """基于 video-config.json sceneFractions 动态计算场景边界。"""
    DEFAULT_FRACTIONS = [0.05, 0.22, 0.25, 0.20, 0.15, 0.13]
    fractions = config.get('sceneFractions', DEFAULT_FRACTIONS)
    
    # 归一化
    total = sum(fractions)
    fractions = [f / total for f in fractions]
    
    boundaries = []
    cumsum = 0.0
    for i, frac in enumerate(fractions):
        start = int(cumsum * total_frames)
        end = int((cumsum + frac) * total_frames)
        if i == len(fractions) - 1:
            end = total_frames  # 最后一场景延伸到底
        boundaries.append((start, end))
        cumsum += frac
    return boundaries
```

## video-config.json 配置格式

```json
{
  "theme": "cyberpunk",
  "sceneFractions": [0.05, 0.22, 0.25, 0.20, 0.15, 0.13],
  "scenes": [
    {"name": "cover", "title": "..."},
    ...
  ]
}
```

比例数组长度 = 场景数量（6）。顺序：cover → concept → systems → features → code → cta。

## 帧生成循环安全写法

```python
n_funcs = len(scene_funcs)  # 6

for fn in range(TOTAL_FRAMES):
    for i, (start, end) in enumerate(SCENE_BOUNDARIES):
        if start <= fn < end:
            func_idx = i % n_funcs  # 循环使用场景函数
            frame_img = scene_funcs[func_idx](fn - start, end - start, scene_config, colors)
            break
```

**注意**：`i % n_funcs` 让任意场景数量都能安全运行，不越界。

## 默认 6 场景比例

| 场景 | 比例 | 说明 |
|------|------|------|
| cover | 5% | 封面 |
| concept | 22% | 核心理念 |
| systems | 25% | 系统架构 |
| features | 20% | 核心特性 |
| code | 15% | 快速开始 |
| cta | 13% | 行动号召 |
