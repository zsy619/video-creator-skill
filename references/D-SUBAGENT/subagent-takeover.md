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

## 教训（2026-05-28）

1. **Subagent max_iterations=48 次 API 调用后超时**，不是等所有步骤完成
2. **Remotion 输出文件名**：`video-project/out/final.mp4`（Remotion Native 方案，直接指定文件名）
3. **音频 75.5s vs 视频 35s**：subagent 在音频未完成处理前就触发了渲染，导致音视频完全脱节
4. **narration 字数必须受控**：179 字（10句）通过；超过 337 字会导致 atempo 异常