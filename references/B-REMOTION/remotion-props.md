# Remotion `--props` 传递与场景时间同步

## 问题症状

渲染出来的视频所有场景标题都是占位符："视频标题"、"痛点场景"、"解决方案"、"核心功能"、"快速上手"、"行动号召"，而不是 video-config.json 中的真实标题和字幕内容。

## 根因

`npx remotion render VerticalVideo ...` 调用时没有传 `--props`，导致 Remotion 使用 `defaultProps`：
```tsx
const sceneList = scenes.length > 0 ? scenes : DEFAULT_SCENES.map(s => ({...}))
```
`scenes: []` → 触发 DEFAULT_SCENES 回退 → 全部占位符标题。

## 正确做法

必须在 `--props` 中传入完整配置对象：
```bash
npx remotion render VerticalVideo out/final.mp4 \
  --props='{"scenes":[...],"title":"CF-Hero","subtitle":"Cloudflare 真实 IP 发现工具","theme":"cyberpunk"}' \
  --fps=60 --concurrency=4 --disable-gpu
```

## 场景数量规则（动态 N，10+ 句触发最低 6 帧）

```
N ≤ 3  句 → ['Cover', 'Ending']                        → 2 帧
N ≤ 6  句 → ['Cover', 'PainPoint', 'Solution', 'Ending'] → 4 帧
N ≤ 9  句 → ['Cover', 'PainPoint', 'Solution', 'Features', 'Ending'] → 5 帧
N > 9  句 → ['Cover', 'PainPoint', 'Solution', 'Features', 'Start', 'Ending'] → 6 帧（最低要求）
```

> ⚠️ **narration.txt 必须 ≥10 句（≥420 中文字）**才能触发 6 帧最低要求。低于此值视频质量不满足最低规格。

## 场景时间计算（百分比等分法，绝对正确）

```javascript
const types = n<=3  ? ['Cover','Ending']
             : n<=6  ? ['Cover','PainPoint','Solution','Ending']
             : n<=9  ? ['Cover','PainPoint','Solution','Features','Ending']
             :         ['Cover','PainPoint','Solution','Features','Start','Ending'];

// 末 caption startMs = 视频总时长（毫秒），不是音频时长
const totalMs = captions[n - 1].startMs;

types.forEach((name, i) => {
  const pctStart = i / types.length;
  const pctEnd   = (i + 1) / types.length;
  scenes.push({
    id:       i + 1,
    name:     name,
    startMs:  Math.round(pctStart * totalMs),
    endMs:    Math.round(pctEnd   * totalMs),
    duration: (pctEnd - pctStart) * totalMs / 1000,
  });
});
```

**Python 构造 scenes JSON（推荐）：**
```python
import json
with open('audio/captions.json') as f:
    caps = json.load(f)
n = len(caps)
total_ms = caps[-1]['startMs']
types = ['Cover','PainPoint','Solution','Features','Start','Ending'] if n > 9 \
        else ['Cover','PainPoint','Solution','Features','Ending'] if n > 6 \
        else ['Cover','PainPoint','Solution','Ending'] if n > 3 \
        else ['Cover','Ending']
scenes = []
for i, name in enumerate(types):
    pct_start = i / len(types)
    pct_end = (i + 1) / len(types)
    scenes.append({
        'id': i + 1, 'name': name,
        'startMs': round(pct_start * total_ms),
        'endMs': round(pct_end * total_ms),
        'duration': round((pct_end - pct_start) * total_ms / 1000, 2)
    })
props = {'scenes': scenes, 'title': 'TITLE', 'subtitle': 'SUBTITLE', 'theme': 'cyberpunk'}
```

## ✅ 完整场景 props 示例（每条 scene 包含全部渲染数据）

每个 scene 对象必须包含 `name` + `title` + `subtitle` + 内容字段（painPoints / features / steps / url / license）。

**Python 构造脚本（推荐）：**
```python
import json

with open('docs/report.json') as f:
    report = json.load(f)
sc = report.get('sceneContent', {})
painPoints = sc.get('painPoints', [])
features  = sc.get('features', [])
tags      = sc.get('tags', [])
steps_raw = sc.get('steps', [])
url       = sc.get('url', 'https://github.com/REPO')
license  = sc.get('license', 'MIT License')

with open('audio/captions.json') as f:
    caps = json.load(f)
n = len(caps)
total_ms = caps[-1]['startMs']

types = (['Cover','PainPoint','Solution','Features','Start','Ending'] if n > 9
         else ['Cover','PainPoint','Solution','Features','Ending'] if n > 6
         else ['Cover','PainPoint','Solution','Ending'] if n > 3
         else ['Cover','Ending'])

scenes = []
for i, name in enumerate(types):
    pct_start = i / len(types)
    pct_end   = (i + 1) / len(types)
    start_ms  = round(pct_start * total_ms)
    end_ms    = round(pct_end   * total_ms)
    duration  = round((pct_end - pct_start) * total_ms / 1000, 2)
    scene = {'id': i+1, 'name': name, 'startMs': start_ms, 'endMs': end_ms, 'duration': duration}

    if name == 'Cover':
        scene.update({'title': '项目名', 'subtitle': '副标题'})
    elif name == 'PainPoint':
        scene.update({'title': '痛点场景', 'painPoints': painPoints, 'subtitle': '项目名'})
    elif name == 'Solution':
        scene.update({'title': '解决方案', 'tags': tags, 'subtitle': '项目名'})
    elif name == 'Features':
        scene.update({'title': '核心功能', 'features': features, 'subtitle': '项目名'})
    elif name == 'Start':
        scene.update({'title': '快速上手',
                      'steps': [{'cmd': s.get('cmd',''), 'text': s.get('text', s.get('desc','')), 'desc': s.get('desc','')}
                                for s in steps_raw] if steps_raw else [],
                      'subtitle': '项目名'})
    elif name == 'Ending':
        scene.update({'title': '立即行动', 'url': url, 'license': license, 'subtitle': '项目名'})
    scenes.append(scene)

props = {'scenes': scenes, 'title': '项目名', 'subtitle': '副标题', 'theme': 'cyberpunk'}
print(json.dumps(props, ensure_ascii=False, indent=2))
```

> ⚠️ 若 `report.json` 的 `sceneContent` 含乱码（`generate_docs.js` Bug 导致），**必须手动重写 `report.json` 和 `narration.txt`**，不能用脚本自动提取。

## ⚠️ 末段 endMs 必须同步视频实际时长

渲染完成后，**末段 endMs 必须覆盖为视频实际毫秒数**：
```python
video_ms = int(round(video_duration * 1000))
captions[-1]['endMs'] = video_ms
```
症状：视频结尾 3-4 秒无字幕覆盖 → 根因是末段 endMs 用的是音频时长而非视频时长。

## 致命陷阱

| # | 陷阱 | 解决方案 |
|---|------|---------|
| 1 | `--props` 不传或 `scenes=[]` | 传入完整 4 字段 JSON |
| 2 | 末段 endMs = 音频时长 | 渲染后用 ffprobe 视频时长覆盖 |
| 3 | narration 句数 <10 | 手动补充过渡句确保 ≥10 句 |
| 4 | 百分比等分用 N 而非 types.length | 用 `types.length` 等分时间轴 |
| 5 | `--props` 只传 title/subtitle，缺少场景内容字段 | 每条 scene 必须含 painPoints / features / steps / url / license |
| 6 | `Root.tsx durationInFrames` 硬编码错误值 | 必须用 `ffprobe` 音频时长 × 60，准确值决定视频帧数 |

## 验证命令

```bash
# 检查末段 endMs 同步视频时长
python3 -c "
import json,subprocess
c=json.load(open('audio/captions.json'))
v=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','video-project/out/final.mp4']).strip())
ne=int(round(v*1000))
print('✅' if c[-1]['endMs']==e else f'❌末段={c[-1][\"endMs\"]}ms，视频={e}ms')
"

# 检查 caption 句数 ≥10
python3 -c "import json; n=len(json.load(open('audio/captions.json'))); assert n>=10"

# 检查 DynamicScene.tsx 无 literal \n
head -3 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e && echo "❌" || echo "✅"

# 检查 Root.tsx durationInFrames 是否硬编码（⚠️ 新增）
grep "durationInFrames={[0-9]}" video-project/src/Root.tsx && echo "❌ 硬编码" || echo "✅"