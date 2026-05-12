# gen_frames_template.py Bug 修复记录 (2026-05-12)

## Bug 1: 音频路径双重 video-project（前次已知）

**触发条件**: 调用时传入绝对路径（如 `/Volumes/.../project`），而非项目根目录。

**根因**: `main()` 中两处都无条件拼接 `video-project`:
```python
frames_dir = os.path.join(project_dir, 'video-project', 'frames')
audio_file = os.path.join(project_dir, 'video-project', 'audio', 'neural_1_2x.m4a')
```
当 `project_dir` 已经是 `/path/project-video` 时，路径变成 `/path/project-video/video-project/...`。

**临时解法**: 调用时从项目根目录用 `.`：
```bash
cd /path/project-video
python3 gen_frames_template.py . --theme cyberpunk
```

---

## Bug 2: _draw_frame_worker 参数解包错误（本次新发现）

**错误信息**:
```
ValueError: not enough values to unpack (expected 7, got 6)
```

**根因**: `main()` 构建的任务元组只有6个值，缺少 `bg_color`：
```python
# main() 中（错误）：
tasks.append((local_fn, scene_end, scene_cfg, colors,
              output_path, selected_scene_func))  # 6个值

# _draw_frame_worker 期望7个：
def _draw_frame_worker(args):
    fn, total_local, scene_config, colors, output_path, scene_func, bg_color = args
```

**修复**: 在 `tasks.append` 末尾加上 `bg_color`（传 `None`）：
```python
tasks.append((local_fn, scene_end, scene_cfg, colors,
              output_path, selected_scene_func, None))
```

**注意**: 所有 scene_func 都不使用 `bg_color`，传 None 安全。

---

## 建议

gen_frames_template.py 设计过于复杂（600+ 行），两个 bug 互相独立。
短期：修复这两个 bug。长期：用 `gen_frames.py` 单文件模式替代（场景逻辑内联，无参数传递问题）。
