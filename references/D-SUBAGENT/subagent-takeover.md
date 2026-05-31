# Subagent 超时接管流程

> **最后更新**：2026-05-28
> **来源**：oh-my-pi 项目实战

---

## 核心原则

**Subagent 报告 status=completed 不可信。** 主进程必须独立验证产出物，不能依赖 subagent 的自我报告。

**Subagent 超时后，主进程必须接管并验证**。

---

## 超时后的强制验证步骤

```bash
# 1. 视频是否存在
ls video-project/out/final.mp4

# 2. 视频时长验证（必须 ≈ 音频时长）
ffprobe -v quiet -show_entries format=duration -of csv=p=0 video-project/out/final.mp4
ffprobe -v quiet -show_entries format=duration -of csv=p=0 audio/neural_full.mp3
# 误差必须 ≤1s

# 3. 字幕末段 endMs 验证（必须 ≤ 视频时长×1000）
python3 -c "import json; c=json.load(open('audio/captions.json')); print(f'末段 endMs: {c[-1][\"endMs\"]}')"

# 4. video-config.json totalMs 验证
python3 -c "import json; c=json.load(open('video-config.json')); print(f'totalMs: {c.get(\"totalMs\")}')"

# 5. narration.txt 中文字数验证（≥175）
python3 -c "
text = open('docs/narration.txt', encoding='utf-8').read()
cn = sum(1 for c in text if '\u4e00'<=c<='\u9fff')
print(f'中文字数: {cn}')
"
```

## 不合格时的修复步骤

| 问题 | 修复 |
|------|------|
| 视频 35s ≠ 音频 75s | 重新渲染，或检查 atempo 配置 |
| captions 末段 endMs >> 视频时长 | 按比例缩放所有字幕时间戳 |
| totalMs 缺失 | 回写 `video-config.json` |
| narration 中文字数 <175 | 重新生成 narration.txt |

## 项目结构恢复

Subagent 超时后目录结构可能不完整，标准化布局：

```
oh-my-pi/
├── video-project/out/final.mp4   ← Remotion Native 输出（含音频轨道）
├── audio/
│   ├── neural_full.mp3           ← Remotion 渲染用音频
│   └── captions.json             ← 字幕
├── docs/narration.txt            ← 复制自根目录
└── video-config.json
```

## 清理后更新 Base

```bash
# 1. 清理 Git 仓库
rm -rf oh-my-pi-repo/

# 2. 更新飞书 Base（使用 +record-batch-update）
lark-cli base +record-batch-update \
  --base-token "DTjXbS3tcaLVlqss6mHcmTwrnMg" \
  --table-id "tblks7R5MCE03xlS" \
  --json '{"record_id_list":["{record-id}"],"patch":{"video-creator":"是}}'

---

## 附录 B：主进程标准接管流程

> **来源**：`G-WORKFLOW/subagent-handover.md`（合并，原始文件已删除）
> **最后更新**：2026-05-26

### B.1 流程图

```
subagent 返回 completed
    ↓
检查 out/final.mp4 是否存在
    ├── 存在 → ✅ 渲染已完成，无需接管
    └── 不存在
         ↓
    检查 audio/neural_1_2x.m4a 是否存在
         ├── 不存在 → subagent 未完成音频，异常终止 → 报告错误
         └── 存在 → 主进程接管渲染
                   ↓
              1. 读取音频时长：ffprobe ... → dur (秒)
              2. 计算帧数：int(dur × 60)
              3. 修复 Root.tsx（如有 durationInFrames={0}）
              4. 执行 npx remotion render（后台 + notify_on_complete）
              5. 等待渲染完成
              6. 验证 final.mp4 + 更新 Base
              7. 清理 *-repo/
```

### B.2 接管前必须检查的三件事

### ① mp4 文件是否已生成

```bash
ls video-project/out/*.mp4 2>/dev/null || echo "❌ 无 mp4"

## ② 是否有渲染进程在跑（可能 subagent 已启动渲染但尚未完成）
ps aux | grep "remotion render" | grep -v grep || echo "✅ 无渲染进程"

## ③ 音频文件是否存在（subagent 完成音频的标志）
ls audio/neural_1_2x.m4a audio/captions.json 2>/dev/null || echo "❌ 音频文件缺失"
```

### B.3 接管时 Root.tsx 修复清单

### 问题 1：durationInFrames={0} 或含 calculateMetadata

```bash
grep "durationInFrames={0}" video-project/src/Root.tsx && echo "❌" || echo "✅"

## 问题 2：getAudioDuration 函数不存在（@remotion/media-utils 版本问题）
grep "getAudioDuration" video-project/src/Root.tsx && echo "⚠️ 需验证函数存在" || echo "✅"
```

**标准修复**（直接硬编码帧数）：
```tsx
// 替换整个 Root.tsx
import { Composition } from "remotion";
import { VerticalVideo } from "./Video";

export const RemotionRoot = () => {
  return (
    <Composition
      id="VerticalVideo"
      component={VerticalVideo}
      durationInFrames={3120}   // ffprobe 音频时长 × 60fps
      fps={60}
      width={1080}
      height={1920}
      defaultProps={{
        title: "项目名",
        subtitle: "副标题",
        theme: "cyberpunk",
        scenes: [],
        audioFile: "audio/neural_1_2x.m4a",
        captionsFile: "audio/captions.json",
      }}
    />
  );
};
```

### B.4 接管渲染命令

```bash
cd video-project && npx remotion render VerticalVideo \
  --props='{"scenes":[...6 scenes...],"title":"...","subtitle":"...","theme":"..."}' \
  out/final.mp4 --fps=60 --concurrency=4 --disable-gpu --log=error
```

### B.5 完整接管示例（kooky 项目）

```bash
### 1. 检查 mp4
ls video-project/out/*.mp4 2>/dev/null || echo "❌ 无 mp4"
### → ❌ 无 mp4

### 2. 检查音频
ls audio/neural_1_2x.m4a audio/captions.json 2>/dev/null || echo "❌"
### → ✅ 音频存在

### 3. 获取帧数
python3 -c "
import subprocess
dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','audio/neural_1_2x.m4a'], text=True).strip())
print(int(dur*60))
"
### → 3120

### 4. 修复 Root.tsx（如需要）

### 5. 执行渲染
nohup npx remotion render VerticalVideo ... out/final.mp4 &
### 等待完成 ...

### 6. 验证
ffprobe -v quiet -show_entries format=duration -of csv=p=0 video-project/out/final.mp4
### → 52.053333

### 7. 重命名为 final.mp4
mv video-project/out/kooky.mp4 video-project/out/final.mp4

### 8. 更新 Base
lark-cli base +record-upsert ... --json '{"video-creator":"是"}'

### 9. 清理
rm -rf kooky-repo
```

### B.6 相关文件

- `D-SUBAGENT/subagent-context-preservation.md` — subagent 会话压缩问题
- `B-REMOTION/remotion-render-gotchas.md` — durationInFrames={0} 修复（陷阱一）

## 附录 C：渲染失败 7 步恢复 checklist

> **来源**：`G-WORKFLOW/launch-sh-post-mortem.md`（合并，原始文件已删除）
> **适用场景**：`launch.sh all` 在 Remotion 渲染步骤失败后，主进程接管的完整恢复流程。
> **最后更新**：2026-05-31

### C.1 7 步恢复 checklist

| Step | 操作 | 关键命令 |
|------|------|----------|
| 1 | 修复 literal `\n` 污染 | `python3 -c "d=open('v-p/...','rb').read();open(...,'wb').write(d.replace(b'\x5c\x6e',b'\x0a'))"` |
| 2 | 重新生成音频（如 narration 改变） | `edge-tts --voice zh-CN-YunjianNeural --text "$(cat docs/narration.txt)" --write-media audio/neural_full.mp3` |
| 3 | 重新生成 captions.json（Python 等比分割） | `python3 << 'PYEOF'...` |
| 4 | 复制音频+字幕到 `video-project/public/audio/` | `cp audio/neural_1_2x.m4a video-project/public/audio/` |
| 5 | 更新 Root.tsx 帧数 | `round(audio_dur × 60)` |
| 6 | 生成 render-props.json（Python，避免 shell 引号嵌套） | `python3 << 'PYEOF'...` |
| 7 | 渲染（cd video-project/） | `node_modules/.bin/remotion render VerticalVideo out/final.mp4 --props "$(cat ../render-props.json)"` |

### C.2 Step 1 详解：literal `\n` 检测与修复

**症状**：esbuild 报 Syntax error 或渲染全黑。

**检测**：
```bash
python3 -c "
with open('video-project/src/scenes/DynamicScene.tsx','rb') as f:
    d = f.read()
print('size:', len(d), 'bytes')
if b'\x5c\x6e' in d:
    print('PROBLEM: literal backslash-n found, count:', d.count(b'\x5c\x6e'))
"
```

**修复**：
```bash
python3 -c "
with open('video-project/src/scenes/DynamicScene.tsx', 'rb') as f:
    data = f.read()
data = data.replace(b'\x5c\x6e', b'\x0a')
with open('video-project/src/scenes/DynamicScene.tsx', 'wb') as f:
    f.write(data)
print('Fixed. Remaining literal n:', data.count(b'\x5c\x6e'))
"
```

**验证**：`python3 -c "d=open('video-project/src/scenes/DynamicScene.tsx','rb').read();print('clean' if b'\x5c\x6e' not in d else 'STILL DIRTY')"`

### C.3 Step 3 详解：captions.json Python 生成

⚠️ 不用 `subtitle-generator.js`，它生成的 captions 与更新后的 narration 不同步。用 Python 直接生成：

```python
python3 << 'PYEOF'
import json, subprocess, re

PROJECT_DIR = '/Users/zhushuyan/.hermes/workspace/{project}'

with open(f'{PROJECT_DIR}/docs/narration.txt') as f:
    text = f.read()

sentences = [s.strip() for s in re.split(r'[。]', text) if s.strip()]
print(f"Sentences: {len(sentences)}")

dur = float(subprocess.check_output(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
     '-of', 'csv=p=0', f'{PROJECT_DIR}/audio/neural_1_2x.m4a'], text=True).strip())
total_ms = dur * 1000
ms_per_sentence = total_ms / len(sentences)

captions = []
for i, s in enumerate(sentences):
    start_ms = round(i * ms_per_sentence)
    end_ms = round((i + 1) * ms_per_sentence)
    captions.append({'startMs': start_ms, 'endMs': end_ms, 'text': s})

captions[-1]['endMs'] = round(dur * 1000)  # 末段 endMs = 音频实际时长

with open(f'{PROJECT_DIR}/audio/captions.json', 'w') as f:
    json.dump(captions, f, ensure_ascii=False, indent=2)

print(f"Generated {len(captions)} captions, last endMs: {captions[-1]['endMs']}")
PYEOF
```

### C.4 渲染前快速检测

```bash
# 1. literal \n 检测
python3 -c "d=open('video-project/src/scenes/DynamicScene.tsx','rb').read();print('dirty' if b'\x5c\x6e' in d else 'clean')"

# 2. 音频存在
ls -la audio/neural_1_2x.m4a audio/captions.json

# 3. 字幕条数（应 >= 10）
python3 -c "import json; d=json.load(open('audio/captions.json')); print(f'captions: {len(d)}')"

# 4. 帧数匹配
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

## 教训（2026-05-28）

1. **Subagent max_iterations=48 次 API 调用后超时**，不是等所有步骤完成
2. **Remotion 输出文件名**：`video-project/out/final.mp4`（Remotion Native 方案，直接指定文件名）
3. **音频 75.5s vs 视频 35s**：subagent 在音频未完成处理前就触发了渲染，导致音视频完全脱节

## 附录 D：Subagent 超时恢复指南（详细版）

> **来源**：`D-SUBAGENT/subagent-timeout.md`（合并，原始文件已删除）
> **最后更新**：2026-05-28

### D.1 触发场景

- `delegate_task` 超时（默认 600s），status=interrupted
- subagent 已完成部分工作（文档/音频已生成），但渲染未完成或未更新 Base
- `launch.sh all` 包含 Step 0-11 多个子步骤，总耗时可能超过 600s subagent 超时

**典型症状**：
```
=== Step 7: Remotion 渲染（60fps / 1080×1920 / 3119帧）===
[Command timed out after 600s]
```

> **注**：渲染步骤（Step 7）在 600s 内可完成，但整体流程超时。音频和文档在渲染前已生成（Step 0-3），因此可跳过这些步骤直接恢复渲染。

### D.2 检测步骤

```bash
# 1. 检查 out/ 目录是否有视频文件
ls "{WORKSPACE_DIR}/<project>-video/video-project/out/"

# 2. 检查音频是否已生成
ls "{WORKSPACE_DIR}/<project>-video/audio/"

# 3. 检查 narration 是否存在
cat "{WORKSPACE_DIR}/<project>-video/docs/narration.txt" | wc -c
```

### D.3 恢复决策树

```
out/ 有 .mp4 文件？
├── 是 → 直接更新 Base + 清理仓库
├── 否
│   ├── audio/neural_1_2x.m4a 存在？
│   │   ├── 是 → 直接运行渲染
│   │   └── 否 → 需要完整重跑 launch.sh all
│   └── narration.txt 不存在或极小？
│       └── 是 → 需要完整重跑 launch.sh all
```

### D.4 渲染恢复命令

```bash
cd "{WORKSPACE_DIR}/<project>-video/video-project"
npx remotion render VerticalVideo \
  out/final.mp4 \
  --concurrency=4 --fps=60 --disable-gpu --log error
```

### D.5 Remotion 输出文件名异常

**症状**：`npx remotion render VerticalVideo --output out/` 在 `out/` 目录下生成 `out/.mp4`（无文件名），而不是 `out/VerticalVideo.mp4`。

```
ls -la video-project/out/
# 输出: -rw-r--r--  1 zhushuyan  staff  5502035 May 18 09:37 .mp4
#                              ↑ 文件名为 .mp4（前导点）
```

**根因**：Remotion 的 `--output` 参数接受目录路径时会自动写入 `out.mp4`，但当路径以 `/` 结尾时文件名处理异常。

**解决方案**：
```bash
# 方案一（推荐）：指定完整文件名
cd video-project
npx remotion render VerticalVideo --output out/hermes-deployer.mp4

# 方案二：渲染后重命名
cd video-project
npx remotion render VerticalVideo --output out/
mv out/.mp4 out/hermes-deployer.mp4
```

**渲染后必须操作**：
1. **检查文件名**：确认不是 `.mp4`
2. **重命名为项目名**：统一为 `{project-name}.mp4` 格式
3. **验证 ffprobe**

### D.6 Feishu Base 任务补全流程

当 Subagent 在 Remotion 渲染阶段（Step 10）超时退出，但 Remotion 渲染已完成（out/.mp4 存在）时，Step 0 文档和 Step 6 封面可能缺失。

```bash
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"

echo "=== 文档 ===" && for f in README.md video-script.md copy.md wechat-copy.md posting-guide.md landing-page.html article-page.html wechat-page.html session-log.md report.json; do
  [ -f "$PROJECT_DIR/docs/$f" ] && echo "✅ $f" || echo "❌ $f"
done

echo "=== 封面 ===" && for f in cover.png cover-wechat.png cover-xhs.png; do
  [ -f "$PROJECT_DIR/docs/assets/$f" ] && echo "✅ $f" || echo "❌ $f"
done
```

**补全流程**：
```bash
# Step 0: 生成文档
cd "$PROJECT_DIR"
node "$SKILL_DIR/scripts/generate_docs.js" .

# Step 6: 生成三平台封面
TITLE=$(node -e "const c=require('./video-config.json');console.log(c.cover?.title||c.title||'')")
SUBTITLE=$(node -e "const c=require('./video-config.json');console.log(c.cover?.subtitle||'')")
python3 "$SKILL_DIR/scripts/generate_cover.py" "$TITLE" "$SUBTITLE" "$PROJECT_DIR/docs/assets" vertical
python3 "$SKILL_DIR/scripts/generate_cover.py" "$TITLE" "$SUBTITLE" "$PROJECT_DIR/docs/assets" wechat
```

> ⚠️ **注意事项**：
> 1. **video-config.json 必须在项目根目录**（不是 docs/）
> 2. **narration.txt 覆盖风险**：重新执行 generate_docs.js 会覆盖之前手动重写的版本
> 3. **video-config.json 缺失时**：根据 article.md 内容手动创建，确保含 `cover.title/subtitle/attrs` 字段

### D.7 Base 更新命令

```bash
lark-cli base +record-upsert \
  --base-token DTjXbS3tcaLVlqss6mHcmTwrnMg \
  --table-id tblks7R5MCE03xlS \
  --record-id <record_id> \
  --json '{"video-creator":"是"}'
```

### D.8 清理命令

```bash
rm -rf "{WORKSPACE_DIR}/<repo>-repo"
```

### D.9 已知问题：SIGBUS on CWD invalidation

launch.sh 内部执行多条命令，若 CWD 在 launch.sh 期间被移动（如用户 cd 到其他目录），某些 execSync 会 SIGBUS。

**解决方案**：不在 launch.sh 内整体运行，而是分步执行或确保 CWD 稳定。

### D.10 launch.sh init → all 路径陷阱

**症状**：`bash launch.sh init openhuman-video` 成功，但 `node generate_docs.js openhuman-video` 在 workspace 根目录而非项目目录执行，导致找不到 `video-config.json`。

**正确做法**：
```bash
# ✅ cd 后执行 all
cd "{WORKSPACE_DIR}/openhuman-video"
bash $SKILL_DIR/scripts/launch.sh all

# ✅ 或显式 PROJECT_DIR
PROJECT_DIR="{WORKSPACE_DIR}/openhuman-video" \
  bash $SKILL_DIR/scripts/launch.sh all
```
4. **narration 字数必须受控**：179 字（10句）通过；超过 337 字会导致 atempo 异常