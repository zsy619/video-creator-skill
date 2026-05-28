# video-creator 深度经验总结（2026-05-26）

> 来源：synapse-ai 视频生成完整流程 + CF-Hero 调试会话

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

**原因**：`extractNarration` 按字节截断中文时在 UTF-8 字符边界处截断产生乱码；Markdown 残留符号（`---`、`|`）未被过滤。

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

## 4. DynamicScene.tsx 三层修复流程

**问题层**：
1. `create-remotion-project.js` 生成含 literal `\n`（字节 `5c6e`）的 TSX 文件
2. JSX 中 `{{ hLines }}{{ vLines }}` 双花括号语法错误
3. `painPoints` / `features` / `steps` 数据为空或占位符

**修复流程**（按顺序执行）：
```bash
# 1. 修复 literal \n
python3 -c "
with open('video-project/src/scenes/DynamicScene.tsx', 'rb') as f:
    data = f.read()
fixed = data.replace(b'\x5c\x6e', b'\x0a')
count = data.count(b'\x5c\x6e')
with open('video-project/src/scenes/DynamicScene.tsx', 'wb') as f:
    f.write(fixed)
print(f'Fixed {count} occurrences')
"

# 2. 修复 JSX fragment 语法
grep -n "return <>{{" video-project/src/scenes/DynamicScene.tsx
# 若有输出，手动替换：
# return <>{{ hLines }}{{ vLines }}</>;  →  return <>{hLines}{vLines}</>;

# 3. 覆盖 painPoints / features / steps 数据（通过 --props 传入或手动编辑）
```

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