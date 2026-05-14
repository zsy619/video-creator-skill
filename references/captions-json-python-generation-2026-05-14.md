# captions.json 生成：Python 优于 Node.js

> **发现时间**: 2026-05-14
> **适用场景**: 从 narration.txt 生成 captions.json（Remotion Native 字幕时间戳）

## 核心问题：Node.js -e 模板字符串在 Chinese TTS 场景下有致命缺陷

```bash
# ❌ Node.js -e 内嵌 narration.txt 时，backtick 模板导致语法错误
node -e "
const text = \`$(cat narration.txt)\`;  # 中文引号/书名号等导致解析失败
" 
# SyntaxError: Unexpected identifier

# ❌ heredoc + node -e 也失败（deepagents 项目验证）
node << 'NODEEOF'
const text = \`$NARRATION\`;  # $NARRATION 变量展开后含反引号
...
NODEEOF
```

## 解决方案：Python heredoc（100% 可靠）

```python
python3 << 'PYEOF'
import json
import subprocess
import re

PROJECT_DIR = '{WORKSPACE_DIR}/workspace/<项目>-video'

with open(f'{PROJECT_DIR}/docs/narration.txt', 'r') as f:
    text = f.read()

# 按中文标点分割句子
sentences = re.split(r'(?<=[。！？])', text)
sentences = [s.strip() for s in sentences if s.strip()]
total = len(sentences)

# 获取音频时长
result = subprocess.run(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
     '-of', 'csv=p=0', f'{PROJECT_DIR}/audio/neural_1_2x.m4a'],
    capture_output=True, text=True
)
duration = float(result.stdout.strip())
slot = duration / total

# 生成 captions.json
captions = []
for i, s in enumerate(sentences):
    start_ms = round(i * slot * 1000)
    end_ms = round((i + 1) * slot * 1000)
    captions.append({'text': s, 'startMs': start_ms, 'endMs': end_ms})

with open(f'{PROJECT_DIR}/audio/captions.json', 'w') as f:
    json.dump(captions, f, ensure_ascii=False, indent=2)

print(f'✅ captions.json: {total}条, 每句{slot:.3f}s')
PYEOF
```

**关键点**:
- `'PYEOF'` (带单引号) 确保 heredoc 内容原样传递，不受 shell 变量展开影响
- narration.txt 内容作为 Python 变量读取，不经过 shell 插值
- 无任何模板字符串问题

## 验证

本 session 8个项目全部使用 Python 方法生成 captions.json，全部成功。

## 涉及脚本

- `video-quality-gate.js` — 音频门禁（Node.js execSync 模式，见 node-execsync-encoding-bug.md）
- captions.json 生成 — **必须用 Python**（不能用 Node.js -e inline 脚本）
