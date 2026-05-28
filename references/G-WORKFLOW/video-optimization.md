# 视频性能优化与质量门禁

> **最后更新**：2026-05-15
> **配套文档**：`audio-production.md`（音频验证）、`video-one-shot-checks.md`（生成前验证）

---

## 1. video-quality-gate.js 性能优化

### 黑屏检测 execSync 批量优化

**问题**：Gate C/D 中的黑屏检测对每个抽样帧单独调用 `execSync` Python 子进程：
- 12个抽样帧 = 12次进程创建
- 每次 ~100-150ms（进程创建 + Python 启动 + PIL 加载）
- 总 overhead ~1.8s

**优化方案**：单次批量调用，所有帧路径通过 JSON 传入 Python：

```javascript
const batchResult = execSync(
  `python3 -c "
import json
from PIL import Image
import numpy as np

frames = json.loads('${JSON.stringify(escapedFrames)}')
results = []
for fp in frames:
    img = Image.open(fp).convert('RGB')
    arr = np.array(img).astype(float)
    mean_brightness = arr.mean()
    is_black = 1 if mean_brightness < 5.0 else 0
    results.append(f'{mean_brightness:.2f},{is_black}')
print('\\n'.join(results))
" 2>/dev/null`,
  { encoding: 'utf8', timeout: 30000 }
);
```

**效果**：12次进程创建 → 1次，节省 ~1.5s。

### ffprobe 调用合并：getAudioMeta

**问题**：`video-quality-gate.js` 中多处独立调用 `getDuration()` 和 `getBitrate()`，各需一次 ffprobe 进程创建。

**优化方案**：单次 ffprobe 获取两个值：

```javascript
function getAudioMeta(filePath) {
  const raw = execSync(
    `ffprobe -v error -show_entries format=duration:stream=bit_rate -of csv=p=0 "${filePath}" 2>/dev/null`,
    { encoding: 'utf8' }
  );
  const output = typeof raw === 'string' ? raw : (raw.stdout || '');
  const lines = output.trim().split('\n').filter(l => l.trim());
  const duration = parseFloat(lines.find(l => !l.includes(',')) || '0') || null;
  const bitrateLine = lines.find(l => l.includes(','));
  const bitrate = bitrateLine ? parseInt(bitrateLine.split(',')[0] || '0') || 0 : 0;
  return { duration, bitrate };
}
```

**效果**：8次 ffprobe → 4次，节省 ~0.6s。

### CJK 字体渲染检测批量优化

**问题**：`checkCoverFont()` 对3种测试文本逐个调用 `execSync` Python。

**优化方案**：单次批量调用，JSON 传入文本列表。

**效果**：3次进程创建 → 1次，节省 ~0.5s。

---

## 2. PIL 字体缓存优化

**问题**：`gen_frames_template.py` 的 `get_font()` 每帧都从磁盘重新加载字体文件：
- 2160帧 × 15种字体 = 数万次磁盘读取
- 单次 ~5-10ms = 100+ 秒纯 I/O

**优化方案**：模块级字体缓存：

```python
_FONT_CACHE = {}  # {(size, path): ImageFont}

def get_font(size, font_paths=None):
    for path in font_paths:
        cache_key = (size, path)
        if cache_key in _FONT_CACHE:
            return _FONT_CACHE[cache_key]
        font = ImageFont.truetype(path, size)
        _FONT_CACHE[cache_key] = font
        return font
```

**效果**：数千次磁盘读取 → 每 worker 仅加载一次，节省 ~100s。

---

## 3. PIL 帧生成并行化

**核心策略**：Python GIL 限制 PIL 图像绘制必须用 `ProcessPoolExecutor`（不能用 ThreadPoolExecutor）。

```python
with ProcessPoolExecutor(max_workers=multiprocessing.cpu_count()) as executor:
    futures = {
        executor.submit(_draw_frame_worker, (fn, scene_end, scene_cfg, colors_arg, output_path, sfunc)): fn
        for fn in range(1, TOTAL_FRAMES)
    }
    for future in as_completed(futures):
        fn = futures[future]
        ok, _, err = future.result()
```

**首帧跳过并行**：封面帧（frame_0000.png）单独快速处理，不进入并行池。

**M1 Mac 实测**：

| 配置 | 帧生成耗时 |
|------|-----------|
| 串行（1核） | ~260s |
| ProcessPoolExecutor(8核) | ~45s |
| **提升** | **~5.7x** |

---

## 4. launch.sh 性能优化

| 优化项 | 优化前 | 优化后 | 节省 |
|--------|--------|--------|------|
| Remotion CLI 可用性探测 | `timeout 20` | `timeout 5`（快速失败） | ~15s |
| re-encoding | edge-tts 后再 ffmpeg 重编码 | 删除（输出码率已足够） | ~10s |
| Gate A + 字幕并行 | 串行等待 | PID 后台 + wait | ~5s |
| ffmpeg preset | `fast -crf 20` | `ultrafast -crf 22` | ~15s |

**整体构建时间**：~400s → ~110s（提升约 73%）

---

## 5. Root.tsx + video-config.json scenes 同步（重要）

**症状**：Root.tsx 的 `defaultProps.scenes` 时间戳与 video-config.json 不一致，或 `DURATION_FRAMES` 使用旧值。osiris 项目实测：Root.tsx scenes 基于旧 51977ms，与 video-config.json 的 52032ms 偏差 55ms，导致渲染帧数错误。

**精确等分公式**（6场景，无余数）：
```python
total_ms = video-config.json totalMs
step = total_ms // 6
# 场景 0-4: startMs=i×step, endMs=(i+1)×step
# 场景 5:   startMs=5×step, endMs=total_ms
```

**Root.tsx 必同步项**：
- `DURATION_FRAMES = ceil(total_ms / 1000 × 60)`（向上取整）
- `defaultProps.scenes[].startMs / endMs`（6个场景全部更新）

**video-config.json 必同步项**：
- `totalMs` → captions 末段 endMs
- `scenes[].startMs / endMs / duration`（6个场景全部更新）

**检测命令**：
```bash
python3 -c "
import json
with open('video-config.json') as f: cfg = json.load(f)
cfg_total = cfg['totalMs']
max_end = max(s['endMs'] for s in cfg['scenes'])
print(f'video-config totalMs={cfg_total}, scenes max endMs={max_end}, diff={cfg_total-max_end}')
"
```

---

## 6. launch.sh Bug 修复记录

> 已合并 `launch-all-workflow-gaps-2026-05-14.md` 内容

### Bug 1: SKILL_DIR 默认路径错误（P1 — 阻塞 init）

```bash
# ❌ 错误
SKILL_DIR="${SKILL_DIR:-$HOME/AISkills/video-creator}"

# ✅ 正确
SKILL_DIR="${SKILL_DIR:-$HOME/.hermes/skills/video-creator}"
```

### Bug 2: captions.json 未同步到 audio/（P1 — 阻塞 Gate B）

Step 3 的 Python 脚本只将 captions.json 写入 `video-project/public/audio/captions.json`，但 Gate B（video-quality-gate.js）检查 `audio/captions.json`。

**修复**：Step 3 末尾添加：
```bash
cp "${VP_DIR}/public/audio/captions.json" "${proj_dir}/audio/captions.json"
```

### Bug 3: pre-render-check 路径检查错误（P2）

`cmd_render` 将 `$proj_dir` 传给 `pre-render-check`，但 pre-render-check 在 `$proj_dir/src/` 下找 .tsx 文件，而 Remotion 项目实际在 `$proj_dir/video-project/src/`。

**影响**：pre-render-check 对有效项目报错 "在 src/ 下找不到 .tsx 文件"，但不阻塞渲染（warn 级别）。

---

## 6. launch.sh all 已知问题

`launch.sh all` 声称执行完整流程（Step 0-11），但实际上：
1. 执行 Step 0-3（docs + audio + subtitles）
2. Gate B 失败时直接 `exit 1`，不会继续执行 Step 4（Remotion 项目创建）和 Step 10（渲染）

**长期修复方向**：
- Step 3 生成 captions.json 后，同时复制到 `audio/`（Gate B 检查路径）
- 或 Gate B 检查 `video-project/public/audio/`（与 Remotion 读取路径一致）
- `launch.sh all` 应该在 Gate B 失败后继续尝试渲染（--continue-on-error 模式）
