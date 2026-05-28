# Root.tsx 帧数 + 配置同步（2026-05-27 修订）

> **来源**：osiris 项目 batch 优化轮次
> **配套**：`remotion-render-gotchas.md`（staticFile 陷阱）、`subtitle-production.md`（SRT 解析）

---

## 核心原则：先渲染 → ffprobe 实测 → 再同步

**症状**：Root.tsx 的 `DURATION_FRAMES` 用 `⌊total_ms/1000×60⌋` 公式硬编码，渲染后发现实际帧数偏差 6 帧。

osiris 实测：
- 公式：`⌊46968/1000×60⌋ = 2819`（错误）
- ffprobe 实测：`47082ms` → `round(47082/1000×60) = 2825`（正确）

**Remotion 的 round() vs ceil()**：
- `ceil(47082/1000×60) = ceil(2824.92) = 2826` ❌
- `round(47082/1000×60) = round(2824.92) = 2825` ✅
- Remotion 内部用 `round()` 而非 `ceil()`

**永远不要在渲染前硬编码帧数**。工作流：
```
1. 渲染视频
2. ffprobe 获取实际 dur_ms
3. frames = round(dur_ms / 1000 * 60)
4. 同步 Root.tsx DURATION_FRAMES
5. 同步 video-config.json totalMs + scenes[-1].endMs
6. 同步 captions.json 末段 endMs = dur_ms
7. 重新渲染
```

---

## 检测脚本（渲染后立即执行）

```python
import subprocess, json, re

r = subprocess.run(
    ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'json',
     'video-project/out/final.mp4'],
    capture_output=True, text=True)
actual_ms = int(float(json.loads(r.stdout)['format']['duration']) * 1000)
actual_frames = round(actual_ms / 1000 * 60)

with open('video-project/src/Root.tsx') as f:
    root = f.read()
root_frames = int(re.search(r'DURATION_FRAMES = (\d+)', root).group(1))

with open('video-config.json') as f:
    cfg = json.load(f)
cfg_total = cfg['totalMs']
cfg_last_end = cfg['scenes'][-1]['endMs']

print(f'Actual: {actual_ms}ms ({actual_frames}f)')
print(f'Root:   {root_frames}f  diff={abs(root_frames - actual_frames)}')
print(f'Config: totalMs={cfg_total}, lastEnd={cfg_last_end}')

if abs(root_frames - actual_frames) <= 2 and cfg_total == actual_ms and cfg_last_end == actual_ms:
    print('✅ ALL SYNCED')
else:
    print('❌ OUT OF SYNC — patch required')
```

**修复命令**：
```bash
# 1. ffprobe 实测
ACTUAL_MS=$(python3 -c "import subprocess, json; r=subprocess.run(['ffprobe','-v','quiet','-show_entries','format=duration','-of','json','video-project/out/final.mp4'],capture_output=True,text=True); print(int(float(json.loads(r.stdout)['format']['duration'])*1000))")
ACTUAL_FRAMES=$(python3 -c "print(round($ACTUAL_MS / 1000 * 60))")
echo "实测: ${ACTUAL_MS}ms = ${ACTUAL_FRAMES}帧"

# 2. Patch Root.tsx DURATION_FRAMES
patch video-project/src/Root.tsx << 'EOF'
--- a/video-project/src/Root.tsx
+++ b/video-project/src/Root.tsx
@@ -X,Y +X,Y @@
-    DURATION_FRAMES = XXXX
+    DURATION_FRAMES = ${ACTUAL_FRAMES}
EOF

# 3. Patch video-config.json
python3 -c "
import json
with open('video-config.json') as f: cfg = json.load(f)
cfg['totalMs'] = ${ACTUAL_MS}
cfg['scenes'][-1]['endMs'] = ${ACTUAL_MS}
with open('video-config.json', 'w') as f:
    json.dump(cfg, f, ensure_ascii=False, indent=2)
print('✅ video-config.json synced')
"

# 4. Patch captions.json 末段 endMs
python3 -c "
import json
with open('audio/captions.json') as f: caps = json.load(f)
caps[-1]['endMs'] = ${ACTUAL_MS}
with open('audio/captions.json', 'w') as f:
    json.dump(caps, f, ensure_ascii=False, indent=2)
print('✅ captions.json末段 synced')
"

# 5. 同步到 Remotion public/audio/
cp audio/captions.json video-project/public/audio/captions.json
```

---

## 场景时间戳等分原则

**注意**：`video-config.json scenes` 的等分应在渲染后根据实际 `totalMs` 进行，
不要在渲染前用公式硬编码。

```python
# 等分算法
total_ms = actual_ms  # ffprobe 实测值
step = total_ms // 6   # 整数除法，无余数
# 场景 0-4: startMs=i*step, endMs=(i+1)*step
# 场景 5:   startMs=5*step, endMs=total_ms
```

**检测**：
```bash
python3 -c "
import json
with open('video-config.json') as f: cfg = json.load(f)
ms = cfg['totalMs']
last = cfg['scenes'][-1]['endMs']
diff = abs(ms - last)
print(f'totalMs={ms}, lastEnd={last}, diff={diff}')
if diff <= 50:
    print('✅ sync ok')
else:
    print(f'❌ diff={diff}ms — 需要同步')
"
```

---

## Caption SRT 解析重叠问题

**症状**：`edge-tts --write-subtitles` 输出 SRT 格式，Python 解析后 caption[1].startMs < caption[0].endMs（重叠 -50ms）。

**根因**：SRT 时间戳解析精度问题，caption[N].startMs 被解析为比 caption[N-1].endMs 更早的时间。

**检测脚本**：
```python
import json

caps = json.load(open('audio/captions.json'))
overlaps = []
for i in range(1, len(caps)):
    if caps[i]['startMs'] < caps[i-1]['endMs']:
        overlaps.append((i, caps[i-1]['endMs'], caps[i]['startMs']))

if overlaps:
    print(f'❌ {len(overlaps)} 处重叠')
    for i, prev_end, curr_start in overlaps:
        print(f'  caption[{i}]: startMs={curr_start} < caption[{i-1}].endMs={prev_end}, gap={curr_start-prev_end}ms')
else:
    print('✅ gap-free')
```

**修复**：将重叠 caption 的 startMs 重置为前一条的 endMs：
```python
caps[i]['startMs'] = caps[i-1]['endMs']
```

> ⚠️ SRT 解析重叠与帧数同步是两个独立的问题，需分别检测和修复。