# Root.tsx scenes 配置模式

> **最后更新**：2026-05-28

## 问题
`create-remotion-project.js` 生成的 Root.tsx 中 `defaultProps.scenes = []`（空数组），导致 Video.tsx 使用硬编码的 DEFAULT_SCENES（6个通用场景，内容与项目无关）。

## 解决方案
在渲染前，将实际 scenes 配置注入到 Root.tsx 的 `defaultProps.scenes`。

## 场景数量与音频同步

| 句数 N | 场景类型 |
|--------|---------|
| ≤3 | Cover + Ending |
| ≤6 | Cover + PainPoint + Solution + Ending |
| ≤9 | Cover + PainPoint + Solution + Features + Ending |
| ≥10 | Cover + PainPoint + Solution + Features + Start + Ending |

## 计算公式

```python
n = len(captions)          # 句数
total_ms = captions[-1]['endMs']
types = ['Cover','PainPoint','Solution','Features','Start','Ending']

scenes = []
for i, name in enumerate(types):
    pct_start = i / len(types)
    pct_end   = (i + 1) / len(types)
    scenes.append({
        'id': i + 1,
        'name': name,
        'startMs': round(pct_start * total_ms),
        'endMs':   round(pct_end   * total_ms),
        'duration': (pct_end - pct_start) * total_ms / 1000,
    })
```

## 注入 Root.tsx

```tsx
// 在 Root.tsx defaultProps 中替换 scenes: [] 为实际配置
defaultProps={{
  // ...其他字段...
  scenes: [
    {"id":1,"name":"Cover","title":"标题","subtitle":"副标题","duration":8.66,"startMs":0,"endMs":8662,"painPoints":["A","B","C"]},
    {"id":2,"name":"PainPoint","title":"痛点","subtitle":"","duration":8.66,"startMs":8662,"endMs":17325,"painPoints":["A","B","C"]},
    {"id":3,"name":"Solution","title":"解决方案","subtitle":"","duration":8.66,"startMs":17325,"endMs":25988,"tags":["标签A","标签B"]},
    {"id":4,"name":"Features","title":"核心功能","subtitle":"","duration":8.66,"startMs":25988,"endMs":34651,"features":[{"icon":"🛩️","name":"功能A","desc":"描述"},{"icon":"🚢","name":"功能B","desc":"描述"}]},
    {"id":5,"name":"Start","title":"快速上手","subtitle":"Docker 一键部署","duration":8.66,"startMs":34651,"endMs":43314,"steps":[{"cmd":"git clone ...","desc":"克隆"},{"cmd":"docker-compose up","desc":"启动"}],"url":"github.com","license":"MIT"},
    {"id":6,"name":"Ending","title":"立即开始","subtitle":"MIT 协议","duration":8.66,"startMs":43314,"endMs":51977,"url":"github.com","license":"MIT"},
  ],
}}
```

## 各场景字段对照

| 场景 | 必需字段 | 可选字段 |
|------|---------|---------|
| Cover | title, subtitle | painPoints |
| PainPoint | title, painPoints | subtitle |
| Solution | title, subtitle | tags |
| Features | title, features[] | subtitle |
| Start | title, subtitle | steps[], url, license |
| Ending | title, subtitle | url, license |

## features 数组项类型

```typescript
Array<{ icon?: string; name?: string; desc?: string }>
```

⚠️ 必须是对象类型语法 `{ icon?: string; ... }`，不是 `Array<icon?: string`（后者是类型语法错误）。

## 验证命令

```bash
# 验证 Root.tsx 中 scenes 不为空
grep "scenes: \[\]" video-project/src/Root.tsx && echo "❌ 空数组" || echo "✅ 已填充"

# 验证渲染后6帧亮度
python3 -c "
from PIL import Image
import subprocess, numpy as np
frames = [0, 519, 1039, 1559, 2079, 2599, 3118]
for f in frames:
    r = subprocess.run(['ffmpeg','-y','-i','video-project/out/final.mp4','-vf',f'select=eq(n\\,{f})','-vframes','1','-update','1',f'/tmp/f{f}.png'],capture_output=True)
    img = Image.open(f'/tmp/f{f}.png')
    m = np.array(img).mean()
    print(f'帧{f}: {m:.1f} {\"✅\" if m>25 else \"❌\"} ')
"
```