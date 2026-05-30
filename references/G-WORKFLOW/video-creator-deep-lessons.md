# video-creator 深度经验总结（2026-05-29）
> **最后更新**：2026-05-29
> 来源：VibeVoice-video + synapse-ai + CF-Hero 调试会话

---

## 1. article.md 占位符问题是致命根因

**症状**：视频每帧内容与项目无关（CF-Hero 项目显示为通用占位符文本），`generate_docs.js` 提取出垃圾关键词（"为安全研"、"这是一款专"）。
**根因**：`article.md` 被 Subagent 写入占位符模板文本，不是真实内容。后续所有 extract 函数基于占位符生成垃圾数据 → narration 乱码 → 音频配音无意义 → 视频内容全错。
**防护检查（Step 0 后必做）**：
```python
text = open('docs/article.md').read()
assert '请在此处' not in text, "占位符内容！"
cn = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
assert cn >= 100, f"中文字数不足: {cn}"
```

---

## 2. narration.txt 必须手写，不得依赖 generate_docs.js

**症状**：生成器输出的 narration 含英文句号（`.`）、控制字符、或过短（<100字），导致音频时长异常或内容空洞。

**正确做法**：
- 根据 README 真实内容手写 150-200 字纯中文 narration
- 用中文 `。` 分割，不用 ASCII `.`
- 控制字符数 = 0
- 写入后验证：
```python
text = open('docs/narration.txt').read()
bad = sum(1 for c in text if ord(c) < 32 and c not in '\n\r\t')
dots = text.count('.')
cn = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
print(f'控制字符:{bad}, 英文句号:{dots}, 中文字数:{cn}')
assert bad == 0 and dots == 0 and 100 <= cn <= 350
```

---

## 3. 动态 N 场景 + 百分比等分是标准解法

**场景数量规则**（caption 句数 N）：
- N ≤ 3 → 2 场景：Cover + Ending
- N ≤ 6 → 4 场景：Cover + PainPoint + Solution + Ending
- N ≤ 9 → 5 场景：+ Features
- N > 9 → 6 场景：+ Start

**百分比等分时间轴**（避免末场景越界）：
```python
total_ms = captions[-1]['endMs']  # 视频总时长
types = ['Cover', 'PainPoint', 'Solution', 'Features', 'Start', 'Ending']
for i, name in enumerate(types):
    pct_start = i / len(types)
    pct_end = (i + 1) / len(types)
    scenes.append({
        'startMs': round(pct_start * total_ms),
        'endMs': round(pct_end * total_ms),
        'duration': round((pct_end - pct_start) * total_ms / 1000, 2),
    })
```

---

## 4. DynamicScene.tsx 三层修复流程（2026-05-29 更新）

**问题层**（同时存在，缺一不可修复）：
1. `create-remotion-project.js` 生成的 JS 模板字符串中，换行符写成 `\\n`（字面反斜杠+n），写入 TSX 后文件变成 1 行超长串（字节 `5c 6e`），esbuild 无法解析
2. JSX 中 `{{ hLines }}{{ vLines }}` 双花括号 → React error #31（被识别为对象字面量而非数组 children）
3. `Root.tsx` 的 `scenes: []` 为空，未从 `video-config.json` 注入场景数据

**修复流程**（每次创建项目后必须执行）：

### Step A：检测
```bash
LINES=$(wc -l < video-project/src/scenes/DynamicScene.tsx)
[ "$LINES" -lt 50 ] && echo "❌ 仅 ${LINES} 行（含 literal \\n 损坏）"
head -1 video-project/src/scenes/DynamicScene.tsx | xxd | grep -q "5c6e" && echo "❌" || echo "✅"
grep -c '{{ hLines }}' video-project/src/scenes/DynamicScene.tsx  # 必须为 0
grep "scenes: \[\]" video-project/src/Root.tsx && echo "❌ scenes 为空" || echo "✅"
```

### Step B：Python 修复 literal \n（若检测到）
```python
with open('video-project/src/scenes/DynamicScene.tsx', 'rb') as f:
    data = f.read()
count = data.count(b'\x5c\x6e')
if count > 0:
    fixed = data.replace(b'\x5c\x6e', b'\x0a')
    with open('video-project/src/scenes/DynamicScene.tsx', 'wb') as f:
        f.write(fixed)
    print(f'Fixed {count} literal \\n → {len(fixed.split(chr(10)))} lines')
```

### Step C：Patch 修复 JSX double brace（若检测到）
```python
# ❌ 不能用 fix-all-tsx.js（会破坏 create-remotion-project.js 自身）
# ✅ 直接 patch
content = open('video-project/src/scenes/DynamicScene.tsx').read()
content = content.replace('{{ hLines }}', '{hLines}')
content = content.replace('{{ vLines }}', '{vLines}')
open('video-project/src/scenes/DynamicScene.tsx', 'w').write(content)
print('Fixed double curly braces')
```

### Step D：Root.tsx 场景数据注入（若 scenes: []）
```python
import json
cfg = json.load(open('video-config.json'))
scenes = cfg['scenes']
# 从 cfg.cover 读取 title/subtitle/attrs，构建完整 scenes 数组
# 包含 painPoints/features/steps/url/license
# 写入 Root.tsx defaultProps.scenes（替换 scenes: []）
```

### Step E：音频和字幕复制
```bash
mkdir -p video-project/public/audio
cp audio/neural_1_2x.m4a video-project/public/audio/
cp audio/captions.json video-project/public/audio/
cd video-project && npm install
```

### Step F：渲染前最终验证
```bash
wc -l video-project/src/scenes/DynamicScene.tsx  # 必须 > 200
head -1 video-project/src/scenes/DynamicScene.tsx | xxd | grep "5c6e" && echo "❌" || echo "✅"
grep -c '{{ hLines }}' video-project/src/scenes/DynamicScene.tsx  # 必须为 0
grep "scenes: \[\]" video-project/src/Root.tsx && echo "❌" || echo "✅ scenes 已注入"
ls video-project/public/audio/neural_1_2x.m4a video-project/public/audio/captions.json
```

**已知 bug 组合**（必然同时触发）：
- ✅ 双花括号 bug → `fix-all-tsx.js` 可修复（但会破坏 create-remotion-project.js）
- ❌ literal `\n` bug → `fix-all-tsx.js` **无效**
- **正确组合**：Python 字节替换（Step B）+ patch（Step C）

---

## 5. `lark-cli` 每次调用必须带完整认证参数

**症状**：首次执行成功，后续执行同一命令时报错 `required flag(s) "base-token", "table-id" not set`。

**原因**：`--base-token` 和 `--table-id` 不会跨调用持久化。

**正确做法**：每次都显式传入：
```bash
lark-cli base +record-upsert \
  --base-token "DTjXbS3tcaLVlqss6mHcmTwrnMg" \
  --table-id "tblks7R5MCE03xlS" \
  --record-id recvkjoKmNxTJM \
  --json '{"video-creator":"是"}'
```

---

## 6. 封面图 base64 data URL 是最终可靠方案

**症状**：`staticFile("assets/cover.png")` 404、`import Cover from "./cover.png"` 失败、CSS gradient 无法达到亮度要求。
**根因**：Remotion 服务端渲染时 Chromium file:// 协议限制 + SVG `<line stroke>` 不渲染。

**最终解决方案**：base64 data URL
```python
import base64
with open('docs/assets/cover.png', 'rb') as f:
    data = base64.b64encode(f.read()).decode()
with open('video-project/src/assets/coverData.js', 'w') as f:
    f.write(f'export const coverDataUrl = "data:image/png;base64,{data}";\n')
```
在 DynamicScene.tsx 中：
```tsx
import { coverDataUrl } from '../assets/coverData';
// 使用：
<img src={coverDataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
```

---

## 7. Remotion 渲染后必须验证的内容

| 检查项 | 命令 | 合格标准 |
|--------|------|---------|
| 首帧亮度 | `ffmpeg -i out/final.mp4 -vf "select=eq(n\\,0)" -vframes 1 /tmp/f.png && python3 -c "from PIL import Image; img=Image.open('/tmp/f.png'); print(sum(p[0]+p[1]+p[2] for p in img.getdata())/len(list(img.getdata()))/3)"` | 均值 > 25 |
| 视频时长 | `ffprobe -v quiet -show_entries format=duration -of csv=p=0 out/final.mp4` | 误差 < 1s |
| 尺寸 | `ffprobe -v quiet -show_entries stream=width,height -of csv=p=0 out/final.mp4` | 1080×1920 |
| 帧率 | `ffprobe -v quiet -show_entries stream=r_frame_rate -of csv=p=0 out/final.mp4` | 60/1 |
| 音频 | `ffprobe -v quiet -show_entries stream=codec_name -of csv=p=0 out/final.mp4` | aac |

---

## 8. Subagent 超时接管：强制验证项目结构

Subagent 报告 `status=completed` 后，主进程**必须**执行以下门禁：
```bash
for f in \
  video-project/src/Root.tsx \
  video-project/src/Video.tsx \
  video-project/src/scenes/DynamicScene.tsx \
  video-project/public/audio/captions.json \
  video-project/public/audio/neural_1_2x.m4a; do
  if [ ! -s "$f" ]; then echo "❌ 空文件: $f"; exit 1; fi
done
LINES=$(wc -l < video-project/src/scenes/DynamicScene.tsx)
if [ "$LINES" -lt 50 ]; then echo "❌ DynamicScene.tsx 仅 $LINES 行"; exit 1; fi
echo "✅ Remotion 项目结构完整"
```