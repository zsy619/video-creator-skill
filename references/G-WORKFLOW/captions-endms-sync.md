# captions.json 末段 endMs 同步（批量检测脚本）

> **最后更新**：2026-05-27
> **来源**：修复 hive/kooky/animal-island-ui/osiris/CF-Hero 等项目 captions 末段偏差

---

## 背景

Remotion 渲染后，实际视频时长与音频时长存在微小差异（通常 <100ms）。
若 captions.json 末段 endMs 使用音频时长渲染前估算值，会导致末条字幕显示提前截止。

**实测偏差**：
| 项目 | captions 末段 endMs | 视频实际时长 | 差值 |
|------|---------------------|--------------|------|
| hive | 50000ms | 50.027s | +27ms |
| kooky | 52002ms | 52.053s | +51ms |
| animal-island-ui | 51987ms | 52.053s | +66ms |
| osiris | 51977ms | 52.032s | +55ms |
| CPA-Helper | 140979ms | 141.035s | +56ms |
| CF-Hero | 85153ms | 85.163s | +10ms |

---

## 渲染后必须执行的同步脚本

```bash
cd /path/to/project
VIDEO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 video-project/out/VerticalVideo.mp4)
python3 -c "
import json, sys
dur = float('${VIDEO_DUR}')
caps = json.load(open('audio/captions.json'))
caps[-1]['endMs'] = int(round(dur * 1000))
json.dump(caps, open('audio/captions.json','w'), ensure_ascii=False, indent=2)
print(f'末段 endMs → {caps[-1][\"endMs\"]}ms (视频 {dur:.3f}s)')
"
cp audio/captions.json video-project/public/audio/
```

## Root.tsx + video-config.json scenes 同步（必须与 captions endMs 同时更新）

当 captions.json 末段 endMs 更新后，Root.tsx 和 video-config.json 中的 scenes 时间戳必须同步更新，否则渲染时场景边界错误。

**精确等分公式**（6场景，无余数）：
```python
total_ms = captions[-1]['endMs']  # 视频实际总时长（ms）
step = total_ms // 6              # 每场景精确毫秒数（整除）
# 场景 1-5: endMs = (i+1) × step
# 场景 6:   endMs = total_ms（最后一段独立计算）
```

**Root.tsx 同步项**：
- `DURATION_FRAMES = ceil(total_ms / 1000 × 60)`（向上取整）
- `defaultProps.scenes[].startMs / endMs`（6个场景全部更新）

**video-config.json 同步项**：
- `totalMs` → 视频实际总时长ms
- `scenes[].startMs / endMs / duration`（6个场景全部更新）

**检测命令**：
```bash
python3 -c "
import json, re
with open('video-config.json') as f: cfg = json.load(f)
cfg_total = cfg['totalMs']
max_end = max(s['endMs'] for s in cfg['scenes'])
print(f'video-config totalMs={cfg_total}, scenes max endMs={max_end}')
diff = cfg_total - max_end
print('OK' if abs(diff) < 20 else f'OUT OF SYNC diff={diff}ms')
"
```

---

## 批量检测脚本（扫描 workspace 下所有项目）

```bash
python3 -c "
import json, os, subprocess
for proj in sorted(os.listdir('.')):
    if not os.path.isdir(proj) or '-' in proj: continue
    mp4 = f'{proj}/video-project/out/final.mp4'
    cap = f'{proj}/audio/captions.json'
    if not os.path.exists(mp4) or not os.path.exists(cap): continue
    dur = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',mp4], text=True).strip())
    caps = json.load(open(cap))
    diff = int(dur*1000) - caps[-1]['endMs']
    flag = 'OK' if abs(diff) < 10 else 'FIX'
    print(f'{flag} {proj}: video={int(dur*1000)}ms captions={caps[-1][\"endMs\"]}ms diff={diff}ms')
"
```