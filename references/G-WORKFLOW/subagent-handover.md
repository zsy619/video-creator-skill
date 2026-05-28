# 主进程接管 Subagent 渲染流程

> 2026-05-26 发现：subagent 完成音频/文档/项目骨架后被压缩退出（session_status=completed），Remotion 渲染命令未执行或正在后台运行。主进程必须主动接管。

## 标准接管流程

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

## 主进程必须检查的三件事

```bash
# ① mp4 文件是否已生成
ls video-project/out/*.mp4 2>/dev/null || echo "❌ 无 mp4"

# ② 是否有渲染进程在跑（可能 subagent 已启动渲染但尚未完成）
ps aux | grep "remotion render" | grep -v grep || echo "✅ 无渲染进程"

# ③ 音频文件是否存在（subagent 完成音频的标志）
ls audio/neural_1_2x.m4a audio/captions.json 2>/dev/null || echo "❌ 音频文件缺失"
```

## 接管时 Root.tsx 修复清单

subagent 创建的 Root.tsx 可能包含以下问题：

```bash
# 问题 1：durationInFrames={0} 或含 calculateMetadata
grep "durationInFrames={0}" video-project/src/Root.tsx && echo "❌" || echo "✅"

# 问题 2：getAudioDuration 函数不存在（@remotion/media-utils 版本问题）
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

## 接管渲染命令

```bash
cd video-project && npx remotion render VerticalVideo \
  --props='{"scenes":[...6 scenes...],"title":"...","subtitle":"...","theme":"..."}' \
  out/final.mp4 --fps=60 --concurrency=4 --disable-gpu --log=error
```

## 完整接管示例（kooky 项目）

```bash
# 1. 检查 mp4
ls video-project/out/*.mp4 2>/dev/null || echo "❌ 无 mp4"
# → ❌ 无 mp4

# 2. 检查音频
ls audio/neural_1_2x.m4a audio/captions.json 2>/dev/null || echo "❌"
# → ✅ 音频存在

# 3. 获取帧数
python3 -c "
import subprocess
dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','audio/neural_1_2x.m4a'], text=True).strip())
print(int(dur*60))
"
# → 3120

# 4. 修复 Root.tsx（如需要）

# 5. 执行渲染
nohup npx remotion render VerticalVideo ... out/final.mp4 &
# 等待完成 ...

# 6. 验证
ffprobe -v quiet -show_entries format=duration -of csv=p=0 video-project/out/final.mp4
# → 52.053333

# 7. 重命名为 final.mp4
mv video-project/out/kooky.mp4 video-project/out/final.mp4

# 8. 更新 Base
lark-cli base +record-upsert ... --json '{"video-creator":"是"}'

# 9. 清理
rm -rf kooky-repo
```

## 相关文件
- `D-SUBAGENT/subagent-context-preservation.md` — subagent 会话压缩问题
- `B-REMOTION/remotion-render-gotchas.md` — durationInFrames={0} 修复（陷阱一）