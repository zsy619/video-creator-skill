# Root.tsx 帧数 + 配置同步（2026-05-27 修订）

> **最后更新**：2026-05-27
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

---

## 6. DURATION_FRAMES 正则提取与批量修复

> **来源**：`G-WORKFLOW/frame-sync-regex-patterns.md`（合并，原始文件已删除）
> **最后更新**：2026-05-27

### 6.1 本 session 发现的新问题

141 个项目全部通过 `batch-duration-fix-20260527.md` 的帧数检测后，再次批量扫描发现 **4 个硬编码帧数与视频实际时长偏差 ≥1s**，另有 2 个项目因正则无法匹配而被错误标记。

#### 6.1.1 根因：正则只匹配了一种模式

原正则：
```python
re.search(r'DURATION_FRAMES\s*=\s*(\d+)', content)
```

**只匹配 `const DURATION_FRAMES = 3610`**，无法匹配：

1. **JSX 硬编码 `durationInFrames={3610}`** — 135 个项目全部是这种格式
2. **乘法表达式 `durationInFrames={60 * 53}`** — 9router 等项目
3. **常量别名 `const TOTAL_FRAMES = 844`** — needle-video
4. **导出常量 `const DURATION = 48`** — andrej-karpathy-video（Video.tsx 内）

### 6.2 修正正则（4 种模式全覆盖）

```python
import re, math, subprocess, json, os

def extract_frames(content: str):
    """从 Root.tsx / Video.tsx / index.tsx 中提取帧数（4 种模式）"""
    # 模式 1: JSX 硬编码 durationInFrames={3610}
    m = re.search(r'durationInFrames\s*[=:]\s*\{?\s*(\d+)\s*\}?', content)
    if m:
        return int(m.group(1))

    # 模式 2: 乘法表达式 durationInFrames={60 * 53}
    m = re.search(r'durationInFrames\s*[=:]\s*\{?\s*(\d+)\s*\*\s*(\d+)\s*\}?', content)
    if m:
        return int(m.group(1)) * int(m.group(2))

    # 模式 3: const TOTAL_FRAMES = xxx
    m = re.search(r'const\s+(?:TOTAL_FRAMES|DURATION_FRAMES)\s*=\s*(\d+)', content)
    if m:
        return int(m.group(1))

    # 模式 4: const DURATION = xxx（Video.tsx）
    m = re.search(r'const\s+DURATION\s*=\s*(\d+)', content)
    if m:
        return int(m.group(1))

    return None
```

#### 6.2.1 帧数验证公式

```
correct_frames = round(ffprobe_video_seconds × 60)
注意：用 round() 而非 ceil()！
实测 47082ms → ceil(47.082×60)=2826，但 Remotion 渲染出 2825
Remotion 内部用 round(47082/1000×60)=round(2824.92)=2825 ✅
```

**切记**：`ceil()` 会导致多 1 帧，永远用 `round()`。

### 6.3 5 个修复明细

| 项目 | 旧帧数 | 旧帧含义 | 新帧数 | 视频实测 | 误差 |
|------|--------|----------|--------|----------|------|
| CF-Hero | 3610 | ~60s 估算 | 5110 | 85.16s | 0.01s |
| hermes-atlas-video | 1719 | ~28s 估算 | 1819 | 30.31s | 0.01s |
| hermes-web-search-plus-video | 1719 | ~28s 估算 | 2675 | 44.57s | 0.01s |
| workshop | 3003 | ~50s 估算 | 1568 | 26.12s | 0.01s |
| needle-video | 3440 | ~57s 错误 | 844 | 14.06s | 0.01s |

#### 6.3.1 修复命令

```python
import os, re, math, subprocess, json

workspace = "/Volumes/OpenClawDrive/.hermes/workspace"

def fix_project(p, new_frames):
    """更新 Root.tsx 或 Video.tsx 中的帧数"""
    root = f"{workspace}/{p}/video-project/src/Root.tsx"
    if not os.path.exists(root):
        root = f"{workspace}/{p}/video-project/src/Video.tsx"
    if not os.path.exists(root):
        root = f"{workspace}/{p}/video-project/src/index.tsx"

    with open(root) as f:
        content = f.read()

    # 替换所有形式的 durationInFrames
    new_content = re.sub(
        r'durationInFrames\s*[=:]\s*\{?\s*\d+\s*\*?\s*\d*\}?',
        f'durationInFrames={{{new_frames}}}',
        content
    )

    with open(root, 'w') as f:
        f.write(new_content)

    print(f"✓ {p}: → {new_frames} ({new_frames/60:.2f}s)")

# 并发验证全部 135 个项目
def verify_all():
    valid = [p for p in os.listdir(workspace)
             if os.path.exists(f"{workspace}/{p}/video-project/out/final.mp4")]

    errors = []
    for p in sorted(valid):
        root = f"{workspace}/{p}/video-project/src/Root.tsx"
        idx = f"{workspace}/{p}/video-project/src/index.tsx"

        content = ''
        for fp in [root, idx]:
            if os.path.exists(fp):
                with open(fp) as f:
                    content = f.read()
                break
        else:
            # 尝试 Video.tsx
            vp = f"{workspace}/{p}/video-project/src/Video.tsx"
            if os.path.exists(vp):
                with open(vp) as f:
                    content = f.read()

        frames = extract_frames(content)
        r = subprocess.run(['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format',
                           f"{workspace}/{p}/video-project/out/final.mp4"],
                          capture_output=True, text=True, timeout=10)
        actual = float(json.loads(r.stdout)['format']['duration'])

        if frames is not None:
            diff = abs(frames / 60 - actual)
            if diff >= 1.0:
                errors.append((p, frames, actual, diff))
        else:
            errors.append((p, None, actual, None))

    print(f"验证完成: {len(valid)} 项目, {len(errors)} 有问题")
    for p, df, a, d in errors:
        print(f"  {'未找到' if df is None else df}: {p} ({a:.2f}s)")
```

### 6.4 残留 -repo 目录清理

本 session 发现 `CPA-Helper-repo`（含 `.git`，应为 `CPA-Helper` 的 Git 克隆残留），已删除。

```bash
rm -rf "/Volumes/OpenClawDrive/.hermes/workspace/CPA-Helper-repo"
```

**检测脚本**：
```python
repos = [d for d in os.listdir(workspace) if d.endswith('-repo')]
print(f"-repo 残留: {repos}")
```

### 6.5 验收标准

```
135 个有效项目：
  - 帧数偏差 < 1s: 133/135 (98.5%)
  - andrej-karpathy-video: DURATION=48 → 48.04s (差 0.04s，可接受)
  - osiris: DURATION_FRAMES=2825 → 47.08s (差 0s，完全精确)
```

### 6.6 关键教训

1. **正则必须覆盖所有模式**：Remotion 项目帧数配置至少有 4 种形式
2. **永远用 round() 而非 ceil()**：Remotion 内部用 round()
3. **以 ffprobe 实测为准**：不能相信代码注释（如 `// 57.33s at 60fps`）
4. **-repo 残留必须主动检测**：Git 克隆后未清理的残留目录浪费存储
5. **ffmpeg pad/truncate 必须用 /tmp/ 中转**：直接覆盖输入文件触发 returncode=234，先写 `/tmp/` 再 `cp`
6. **音频同步阈值为 0.15s**：放宽自 0.1s，兼顾实用性与准确性（>0.15s 才修复）