# GitHub 仓库项目视频制作流程

> 何时读：用户要求为某个 GitHub 仓库生成视频时阅读并执行。以下内容从 `SKILL.md` 原文搬迁，未改写。

### GitHub 仓库项目视频制作流程（2026-05-31 新增；2026-06-01 更新）

当用户要求为 GitHub 仓库项目生成视频时（如 `为 shanselman/PeekDesktop 项目生成视频`），执行以下流程：

**Step 1 — 克隆仓库（隔离模式）**
```bash
PROJECT_DIR=/Users/zhushuyan/.hermes/workspace/<repo-name>
REPO_DIR="${PROJECT_DIR}/<repo-name>-repo"
mkdir -p "${REPO_DIR}" && git clone --depth=1 https://github.com/<user>/<repo-name>.git "${REPO_DIR}"
```

**Step 2 — 从 README 提取内容**
读取仓库根目录的 `README.md`，提取核心信息：
- 项目名称与一句话描述
- 核心特性（3-5条）
- 应用场景
- 技术亮点

**Step 3 — 初始化 video-creator 项目**
```bash
# ⚠️ launch.sh init 在 /Users/zhushuyan 下执行，不是在 REPO_DIR 内
cd /Users/zhushuyan && bash {SKILL_DIR}/scripts/launch.sh init <repo-name>
```

**Step 4 — 创建 Remotion 项目（必须单独执行）**
```bash
# ⚠️ 在 PROJECT_DIR 内执行（launch.sh init 已创建目录结构）
cd {PROJECT_DIR} && node {SKILL_DIR}/scripts/create-remotion-project.js .
```

**⚠️ 必须两步走（缺一不可）：**

```bash
# Step 4a: 生成 Remotion 源码（create-remotion-project.js 只创建 package.json，不安装 node_modules）
cd {PROJECT_DIR} && node {SKILL_DIR}/scripts/create-remotion-project.js .

# Step 4b: 安装依赖（跳过此步 → 渲染时报 "No such file or directory: node_modules/.bin/remotion"）
cd {PROJECT_DIR}/video-project && npm install
```

**Step 5 — 修复 literal `\n` 污染（立即执行！）**
创建后立即验证：
```bash
python3 -c "print(open('{PROJECT_DIR}/video-project/src/scenes/DynamicScene.tsx','rb').read().count(b'\x5c\x6e'))"
# 输出 382 = 有污染 → 执行修复
python3 -c "d=open('{PROJECT_DIR}/video-project/src/scenes/DynamicScene.tsx','rb').read();open('{PROJECT_DIR}/video-project/src/scenes/DynamicScene.tsx','wb').write(d.replace(b'\x5c\x6e',b'\x0a'))"
wc -l {PROJECT_DIR}/video-project/src/scenes/DynamicScene.tsx  # 修复后应 > 200
```

**Step 6 — 编写 narration 并生成 TTS**
手动编写 narration（中文字符 ≥175，10句以上），用 `edge-tts --write-media` 生成音频。
⚠️ narration 必须放在 `{PROJECT_DIR}/docs/narration.txt`，不是 `{PROJECT_DIR}/<repo-name>-repo/docs/`。
⚠️ narration 写完后需要估算时长：如果 TTS 原速时长远超目标时长，需要用 atempo 压缩。请在 Step 7 中根据实际音频时长判断是否需要 atempo。
⚠️ **大文本必须用 inline 模式**：`--text "$(cat file)"` 在文本 >1500 字符时会导致 edge-tts 超时（120s），生成 0 字节文件。

```bash
cd {PROJECT_DIR} && edge-tts --voice zh-CN-YunjianNeural --text "长文本内容直接内联到这里..." --write-media audio/neural_1_2x.m4a
```

**Step 7 — 复制音频到 Remotion public 目录（易遗漏！注意是 atempo 后的 Tempo 版本！）**
```bash
# ⚠️ 渲染必须用 atempo 调整后的音频！
cp {PROJECT_DIR}/audio/neural_1_2xTempo.m4a {PROJECT_DIR}/video-project/public/audio/neural_1_2x.m4a
```

**Step 8 — 生成 captions.json**
⚠️ **关键：captions 必须基于 atempo 调整后的音频生成**，否则时间轴错位。
使用 Python 等比分段（注意使用 `neural_1_2xTempo.m4a` 的时长，不是原始 `neural_1_2x.m4a`）：
```python
cd {PROJECT_DIR} && python3 << 'PYEOF'
import json, subprocess, re
# ⚠️ 必须用 atempo 调整后的音频计算时长
dur = float(subprocess.check_output(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
     'audio/neural_1_2xTempo.m4a'], text=True).strip())
with open('docs/narration.txt') as f:
    text = f.read().strip()
sentences = re.split(r'[。！？\n]', text)
sentences = [s.strip() for s in sentences if s.strip()]
ms_per_sentence = dur * 1000 / len(sentences)
captions = []
for i, s in enumerate(sentences):
    start = int(i * ms_per_sentence)
    end = int((i + 1) * ms_per_sentence)
    captions.append({"startMs": start, "endMs": end, "text": s})
captions[-1]["endMs"] = int(round(dur * 1000))  # 末段精确同步
with open('audio/captions.json', 'w', encoding='utf-8') as f:
    json.dump(captions, f, ensure_ascii=False, indent=2)
print(f"Generated {len(captions)} captions from atempo audio ({dur:.2f}s)")
PYEOF
cp {PROJECT_DIR}/audio/captions.json {PROJECT_DIR}/video-project/public/audio/
```

**Step 9 — 更新 Root.tsx 帧数**
```bash
# round(音频时长秒数 × 60)
patch {PROJECT_DIR}/video-project/src/Root.tsx << 'EOF'
-      durationInFrames={3600}
+      durationInFrames={5236}  # 例：87.264s × 60
EOF
```

**Step 10 — 生成 render-props.json**
```bash
cd {PROJECT_DIR} && node -e "
const fs = require('fs');
const captions = JSON.parse(fs.readFileSync('video-project/public/audio/captions.json'));
const totalMs = captions[captions.length - 1].endMs;
const types = ['Cover', 'PainPoint', 'Solution', 'Features', 'Ending'];
const scenes = types.map((name, i) => ({
  id: i + 1, name,
  startMs: Math.round((i / types.length) * totalMs),
  endMs: Math.round(((i + 1) / types.length) * totalMs)
}));
fs.writeFileSync('video-project/render-props.json', JSON.stringify({
  scenes, title: 'PeekDesktop', subtitle: '让Windows拥有macOS Sonoma的桌面预览功能', theme: 'tech-blue'
}, null, 2));
"
```

**Step 11 — 渲染**
```bash
cd {PROJECT_DIR}/video-project && node_modules/.bin/remotion render VerticalVideo out/final.mp4 \
  --concurrency=4 --fps=60 --disable-gpu --log=error --props-file ../render-props.json
```

**Step 12 — 清理**
```bash
rm -rf {PROJECT_DIR}/*-repo  # 清理克隆的仓库目录
```

> ⚠️ **launch.sh init 之后必须单独运行 create-remotion-project.js + npm install**
> ⚠️ **workspace 项目还原后必查 Root.tsx 帧数**：从 Git 克隆的 workspace 项目，`Root.tsx` 的 `durationInFrames` 可能与当前 `audio/neural_full.mp3` 时长不同步（音频时长变了但帧数未更新）。渲染前必须用 `round(音频秒数×60)` 校验并修复，否则帧数错位。
> ⚠️ **渲染前音频复制（易遗漏！）**
`launch.sh init` 仅创建空目录骨架（`video-project/src/` 等），**不生成 Remotion 源码**。必须依次执行：

```bash
# 1. 生成 Remotion 源码
node {SKILL_DIR}/scripts/create-remotion-project.js .

# 2. 安装 node_modules（create-remotion-project.js 只创建 package.json，不执行 npm install）
cd video-project && npm install
```

> ⚠️ 若跳过第 2 步，渲染时会报 `No such file or directory: node_modules/.bin/remotion`。

### edge-tts 大文本 inline 优于 --text "$(cat file)"

当 narration.txt 字符数较多（>1500 字符）时，`--text "$(cat file)"` 可能因 shell 参数超限导致 timeout（120s）。

**修复**：将文本直接内联到命令行中：
```bash
# ✅ 大文本用 inline（stackprism 项目 2305 字符成功）
edge-tts --voice zh-CN-YunjianNeural --text "StackPrism 栈棱镜是网页技术栈识别扩展..." --write-media audio/neural_1_2x.m4a

# ⚠️ 小文本可用 --text "$(cat file)"，大文本会超时
edge-tts --text "$(cat docs/narration.txt)" --write-media audio/neural_1_2x.m4a
```

> 实测 stackprism 项目 narration.txt 2305 字符，inline 方式成功；用 `--text "$(cat file)"` 超时（120s），文件生成 0 字节。

### create-remotion-project.js 验证清单（生成后必查）

创建后必须验证（4项，全通过才可继续）：

```bash
# 1. DynamicScene.tsx 有内容（> 0 行）
wc -l video-project/src/scenes/DynamicScene.tsx

# 2. 检测 literal \n 污染（0 = 正常，382 = 有bug）
python3 -c "print(open('video-project/src/scenes/DynamicScene.tsx','rb').read().count(b'\x5c\x6e'))"

# 3. 修复 literal \n 污染（如有）
python3 -c "d=open('video-project/src/scenes/DynamicScene.tsx','rb').read();open('video-project/src/scenes/DynamicScene.tsx','wb').write(d.replace(b'\x5c\x6e',b'\x0a'))"
wc -l video-project/src/scenes/DynamicScene.tsx  # 修复后应 > 200

# 4. 检测 JSX 双花括号语法错误
grep 'return <>{{' video-project/src/scenes/DynamicScene.tsx  # 无输出 = 正常
```

### 渲染前音频复制（易遗漏！）

```bash
# 音频文件必须复制到 Remotion 能找到的位置
cp audio/neural_1_2x.m4a video-project/public/audio/
```

> ⚠️ 若不复制，Remotion 会在 `http://localhost:3000/public/audio/` 查找，导致 404 渲染失败。这个 404 表现为 `localhost:3000/... could not be found`，极易误判为服务器问题。

### launch.sh 使用（2026-05-23 重要修正）

```bash
bash {SKILL_DIR}/scripts/launch.sh init <项目名>   # 初始化（自动隔离 Git 内容）
bash {SKILL_DIR}/scripts/launch.sh all              # 完整流程（Step 0→10 + 封面）
```

> ⚠️ **launch.sh init 仅创建空目录骨架，不生成 Remotion 项目代码！** `init` 创建 `video-project/src/` 等空目录，但无 `Root.tsx`、`Video.tsx`、`package.json`。必须**单独执行** `node {SKILL_DIR}/scripts/create-remotion-project.js .` 生成 Remotion 源码，否则渲染时 `video-project/src/` 为空导致失败。检测方法：`ls video-project/src/` 为空则说明缺少 Remotion 代码。

> ⚠️ **launch.sh 必须先 chmod +x**：若遇到 `Permission denied`，立即执行 `chmod +x /Users/zhushuyan/.hermes/skills/video-creator/scripts/launch.sh`

> ⚠️ **create-remotion-project.js 执行后必须立即验证（4 项）：**
> 1. `wc -l video-project/src/scenes/DynamicScene.tsx` — 应 > 0；为 0 则文件为空，需手动从 `references/B-REMOTION/dynamic-scene-template.md` 复制模板
> 2. `head -c 200 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e` — 应无输出；有输出说明含 **literal `\n`**（字节 `0x5c 0x6e`），运行 `node {SKILL_DIR}/scripts/fix-remotion-project.js <project-dir>` 修复（自动替换为真实换行符）
> 3. `grep 'return <>{{' video-project/src/scenes/DynamicScene.tsx` — 应无输出；有输出说明含 **JSX 双花括号语法错误**（`return <>{{ hLines }}{{ vLines }}</>`），用 `patch` 修复为 `return <>{hLines}{vLines}</>`
> 4. 执行 `npm install && node_modules/.bin/remotion render ...` 验证编译通过

**⚠️ `npx remotion` 在某些环境下不可用**：必须使用 `node_modules/.bin/remotion` 直接调用。
**⚠️ 渲染命令必须在 `video-project/` 子目录内执行**：`node_modules/.bin/remotion` 位于 `video-project/node_modules/.bin/`，**不是**父目录。cd 到 video-project 再执行。render-props.json 放在父目录时，使用 `$(cat ../render-props.json)` 引用。
**⚠️ narration.txt 更新后必须重新生成音频和字幕**：narration 改变 → 重新 edge-tts → 重新 ffmpeg atempo → 重新生成 captions.json → 重新复制到 `public/audio/` → 更新 Root.tsx 帧数 → 重新生成 render-props.json → 渲染。
**⚠️ Root.tsx 帧数须与实际音频同步**：每次音频重新生成后（atempo 处理），用 `round(新音频时长秒数 × 60)` 更新 Root.tsx 的 `durationInFrames`。不更新会导致渲染帧数与音频不匹配。
**⚠️ DynamicScene.tsx 为空时的恢复顺序**（不要 re-run create-remotion-project.js，直接：
1. 验证 `wc -l video-project/src/scenes/DynamicScene.tsx` → 0 或 1
2. `head -c 200 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e` 查 literal \n
3. 确认无 literal \n 后，直接将 `references/B-REMOTION/dynamic-scene-template.md` 的完整 TSX 模板写入 `video-project/src/scenes/DynamicScene.tsx`
4. 验证写入后行数 > 200
5. 继续渲染 — 不要重跑 create-remotion-project.js（会覆盖已修复的文件）
**⚠️ launch.sh all 渲染失败后的恢复步骤**：
1. 手动修复 DynamicScene.tsx literal \n（Python replace）
2. 重新生成音频（edge-tts → ffmpeg atempo）
3. 重新生成 captions.json（Python 等比分割 narration）
4. 复制音频和字幕到 `public/audio/`
5. 更新 Root.tsx 帧数
6. 生成 render-props.json
7. cd video-project && node_modules/.bin/remotion render ...

### 渲染命令

```bash
# 预写 props JSON 文件（避免 shell 引号嵌套问题）
node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync('video-config.json'));const caps=JSON.parse(fs.readFileSync('video-project/public/audio/captions.json'));const dur=58.4;const ms=dur*1000;const types=['Cover','PainPoint','Solution','Features','Start','Ending'];const scenes=types.map((n,i)=>({id:i+1,name:n,startMs:Math.round(i/types.length*ms),endMs:Math.round((i+1)/types.length*ms),duration:(1/types.length*ms)/1000,title:n==='Cover'?c.cover.title:n==='Solution'?'程序化API访问':n==='Features'?'核心功能':n==='Start'?'pip install':n==='PainPoint'?'痛点场景':n==='Ending'?'立即开始':n,subtitle:n==='Cover'?c.cover.subtitle:'',painPoints:['Web UI 功能有限','批量操作繁琐','API 访问困难'],features:[{name:'Python API',icon:'🐍'},{name:'CLI 工具',icon:'💻'},{name:'AI Agent',icon:'🤖'},{name:'批量下载',icon:'📦'}],steps:[{cmd:'pip install notebooklm-py',desc:'安装库'},{cmd:'notebooklm login',desc:'认证'},{cmd:'notebooklm create',desc:'创建笔记本'}]}));fs.writeFileSync('video-project/render-props.json',JSON.stringify({scenes,title:c.cover.title,subtitle:c.cover.subtitle,theme:c.theme}));"
# Remotion Native（音频内嵌 + 字幕同期烧录，无需 ffmpeg）
# ⚠️ 必须使用 node_modules/.bin/remotion，npx remotion 在某些环境下不可用
# 推荐使用 --props-file（避免 shell 引号嵌套问题）
node_modules/.bin/remotion render VerticalVideo out/final.mp4 --concurrency=4 --fps=60 --disable-gpu --log=error --props-file ../render-props.json

# 封面生成（必须先执行）
python3 generate_cover.py   # 三平台：vertical/wechat/xhs
```
