# GitHub 仓库视频项目：Session 实战记录

> **性质**：session-specific 知识银行，记录具体项目的完整执行过程。
> **用途**：包含可复用的命令片段和参数模板，非通用流程文档。
> **历史**：本文件由 `github-repo-video-session.md`（margelo/react-native-graph）和 `peekdesktop-video-session.md`（shanselman/PeekDesktop）合并而来。

---

## 1. 通用流程（两个项目均适用）

```
克隆仓库（--depth=1）
  → init video-creator 目录结构
  → create-remotion-project.js（在项目根目录执行）
  → 修复 literal \n 污染（Python 兜底）
  → 编写 narration
  → edge-tts TTS
  → Python 生成 captions.json
  → 复制音频+字幕到 video-project/public/audio/
  → 更新 Root.tsx 帧数（round(dur × 60)）
  → 生成 render-props.json
  → remotion render（cd video-project/ 执行）
  → 复制 out/final.mp4
  → 清理（rm -rf {repo}-repo/）
```

### 关键参数模板

| 参数 | 模板 | 说明 |
|------|------|------|
| 帧数 | `round(audio_dur × 60)` | Root.tsx durationInFrames |
| atempo | `SOURCE_DUR / TARGET_DUR` | 动态计算，不用固定值 |
| captions | `total_ms / len(sentences)` | 等分，末段 endMs = 音频时长 |
| Ending 场景 | remainder（总时 - 已分配） | 保证 5 场景总时长 = 音频时长 |

---

## 2. Session A — margelo/react-native-graph

> **日期**：2026-05-31
> **音频时长**：59.976s | **帧数**：3599 | **场景**：5

### 完整命令序列

```bash
# 克隆仓库
PROJECT_DIR=/Users/zhushuyan/.hermes/workspace/margelo-react-native-graph
REPO_DIR="${PROJECT_DIR}/margelo-react-native-graph-repo"
mkdir -p "$REPO_DIR" && git clone --depth=1 https://github.com/margelo/react-native-graph.git "$REPO_DIR"

# 初始化目录结构
mkdir -p "$PROJECT_DIR"/{docs/assets/imgs,audio,video-project/src/scenes,video-project/out,video-project/public/audio}

# 创建 Remotion 项目（在项目根目录执行）
node {SKILL_DIR}/scripts/create-remotion-project.js .

# 修复 literal \n 污染
python3 -c "d=open('video-project/src/scenes/DynamicScene.tsx','rb').read();open('video-project/src/scenes/DynamicScene.tsx','wb').write(d.replace(b'\\x5c\\x6e',b'\\x0a'))"

# edge-tts 配音（+0% 不加速）
edge-tts --voice zh-CN-YunjianNeural --rate +0% --text "$(cat docs/narration.txt)" --write-media audio/neural_full.mp3

# 计算 atempo 并处理
SOURCE_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 audio/neural_full.mp3)
TARGET_DUR=60
ATEMPO=$(python3 -c "print(round($SOURCE_DUR / $TARGET_DUR, 4))")
ffmpeg -y -i audio/neural_full.mp3 -af "atempo=${ATEMPO}" -c:a aac -b:a 256k audio/neural_1_2x.m4a

# 生成 captions.json
python3 << 'PYEOF'
import json, subprocess
dur = float(subprocess.check_output(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
     '/path/to/audio/neural_1_2x.m4a'], text=True).strip())
with open('docs/narration.txt') as f:
    text = f.read().strip()
sentences = [s.strip() for s in text.split('。') if s.strip()]
total_ms = dur * 1000
ms_per_sentence = total_ms / len(sentences)
captions = []
for i, s in enumerate(sentences):
    start = int(i * ms_per_sentence)
    end = int((i + 1) * ms_per_sentence)
    captions.append({"startMs": start, "endMs": end, "text": s})
captions[-1]["endMs"] = int(round(dur * 1000))
with open('audio/captions.json', 'w', encoding='utf-8') as f:
    json.dump(captions, f, ensure_ascii=False, indent=2)
PYEOF

# 复制到 Remotion public 目录
cp audio/neural_1_2x.m4a video-project/public/audio/
cp audio/captions.json video-project/public/audio/

# 更新 Root.tsx 帧数
patch video-project/src/Root.tsx << 'EOF'
-      durationInFrames={3120}
+      durationInFrames={3599}
EOF

# 渲染
cd video-project && node_modules/.bin/remotion render VerticalVideo out/final.mp4 \
  --concurrency=4 --fps=60 --disable-gpu --log=error \
  --props "$(cat ../render-props.json)"
```

### fix-remotion-project.js 失败实录

**错误**：`TypeError: data.replace is not a function`

**根因**：`fs.readFileSync` 返回 `Buffer`（Uint8Array），但调用了 `data.replace()`（String 方法）。

**Python 兜底**：
```python
python3 -c "d=open('video-project/src/scenes/DynamicScene.tsx','rb').read();open('video-project/src/scenes/DynamicScene.tsx','wb').write(d.replace(b'\x5c\x6e',b'\x0a'))"
```

---

## 3. Session B — shanselman/PeekDesktop

> **日期**：2026-06-01
> **音频时长**：87.264s | **帧数**：5236 | **场景**：5 | **字幕**：17句

### 关键参数

| 参数 | 值 |
|------|---|
| 帧数 | `round(87.264 × 60)` = 5236 |
| captions.json 条数 | 17（等于 narration 句数） |
| 字幕分割 pattern | `re.split(r'[。！？\n]', text)` |
| 输出文件 | `out/final.mp4`，7.65 MB |

### narration 编写

**源**：README 精简为 539 字符、17 句。远超 `≥175 字符、≥10 句` 要求。

**split pattern**（关键发现）：
```python
sentences = re.split(r'[。！？\n]', text)  # 用 \n 分割物理换行
```
效果：narration.txt 中用物理换行分隔的 17 行文本被正确分割为 17 句。

### render-props.json 生成（场景等分模板）

```node
const types = ['Cover', 'PainPoint', 'Solution', 'Features', 'Ending'];
const scenes = types.map((name, i) => ({
  id: i + 1, name,
  startMs: Math.round((i / types.length) * totalMs),
  endMs: Math.round(((i + 1) / types.length) * totalMs)
}));
```

末段 endMs = 87264ms，与音频时长精确同步。

---

## 4. 通用验证命令库

```bash
# 1. 检查 literal \n 污染
python3 -c "print(open('video-project/src/scenes/DynamicScene.tsx','rb').read().count(b'\x5c\x6e'))"
# 输出 382 = 有污染，0 = 正常

# 2. 检查文件行数（修复后应 > 200）
wc -l video-project/src/scenes/DynamicScene.tsx

# 3. 检查 captions.json 条数（应 >= 10）
python3 -c "import json; print(len(json.load(open('audio/captions.json'))))"

# 4. 检查音频时长
ffprobe -v error -show_entries format=duration -of csv=p=0 audio/neural_1_2x.m4a

# 5. 检查视频时长和大小
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 out/final.mp4

# 6. 检查封面尺寸
python3 -c "from PIL import Image; print(Image.open('docs/assets/cover.png').size)"

# 7. 帧数匹配验证
python3 -c "
import subprocess, re
root = open('video-project/src/Root.tsx').read()
m = re.search(r'durationInFrames=\{(\d+)\}', root)
if m:
    root_frames = int(m.group(1))
    audio_dur = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','audio/neural_1_2x.m4a'], text=True).strip())
    expected = round(audio_dur * 60)
    print(f'Root frames: {root_frames}, expected: {expected}, diff: {abs(root_frames - expected)}')
"
```

---

## 5. 关键决策点汇总

| 决策 | 选择 | 原因 |
|------|------|------|
| 克隆深度 | `--depth=1` | README 项目通常不需要完整历史 |
| atempo 策略 | 动态计算（SOURCE_DUR/TARGET_DUR） | 固定 1.2x 会导致时长偏差 > 5% |
| 末段场景 | Ending 作为 remainder | 保证总时长精确 = 音频时长 |
| 渲染调用 | `cd video-project/` + 绝对路径 | shell 找不到 node_modules/.bin/remotion |
| captions 生成 | Python 等比分割 | 避免 subtitle-generator.js 不同步问题 |

---

## 相关文档

- `B-REMOTION/create-remotion-project-bugs.md`（literal \n 根因）
- `C-CONTENT/subtitle-production.md`（captions.json 格式规范）
- `G-WORKFLOW/subagent-takeover.md`（渲染失败主进程接管流程）
- `G-WORKFLOW/video-optimization.md`（4 项预检）
