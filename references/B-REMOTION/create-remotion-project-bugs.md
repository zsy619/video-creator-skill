# create-remotion-project.js Bug 修复 + 主进程接管手册

> 本文件收录 `create-remotion-project.js` 的已知 Bug（双花括号/literal `\n`）及主进程在 subagent 失败时的标准接管流程。

## 目录
1. [DynamicScene.tsx 双花括号 Bug](#dynamicscenetsx-双花括号-bug)
2. [DynamicScene.tsx 含 literal `\n` 损坏](#场景-bdynamicscenetsx-含-literal-n-或完全损坏)
3. [launch.sh Permission Denied](#launchsh-permission-denied-bug)
4. [Subagent 失败时主进程接管](#subagent-api-失败时主进程接管)
5. [Root.tsx durationInFrames 硬编码 Bug](#roottsx-durationinframes-硬编码-bug)

## DynamicScene.tsx 双花括号 Bug

**问题**：`create-remotion-project.js` 生成的 `DynamicScene.tsx` 中，`hLines` 和 `vLines` 使用了双花括号 `{{ hLines }}` 而非单花括号 `{hLines}`。

**错误表现**：
- 编译阶段：React error #31 — object with keys `{hLines}`（被解析为对象字面量而非数组 children）
- 症状：`{{ hLines }}` 在 JSX children 位置是语法错误

**修复**（项目生成后立即执行）：

```javascript
// 修复 DynamicScene.tsx 中的双花括号问题
const fs = require('fs');
const path = require('path');
const dScene = path.join(__dirname, 'src/scenes/DynamicScene.tsx');
let content = fs.readFileSync(dScene, 'utf8');
content = content.replace(/\{\{\s*hLines\s*\}\}/g, '{hLines}');
content = content.replace(/\{\{\s*vLines\s*\}\}/g, '{vLines}');
fs.writeFileSync(dScene, content);
```

**验证**：
```bash
# 确认不存在双花括号包裹的 hLines/vLines
grep -c '\{\{ hLines \}\}' src/scenes/DynamicScene.tsx  # 应为 0
grep -c '\{\{ vLines \}\}' src/scenes/DynamicScene.tsx  # 应为 0
# 确认存在单花括号形式
grep -c '{hLines}' src/scenes/DynamicScene.tsx  # 应 > 0
```

**注意**：`{{ ... }}` 在其他场景（如 inline style）是合法语法 `{{ property: value }}`，不能全局替换。必须精确匹配 `{{ hLines }}` 和 `{{ vLines }}`。

---

## 字节级 \\n 污染 Bug

**问题**：`create-remotion-project.js` 生成的 TSX 文件中，换行符被写成字面反斜杠+n（字节 `5c 6e`）而非真实换行符（`0a`），导致 esbuild 报 Syntax error `"n"`。

**根因**：旧版 `fix-all-tsx.js` 使用 `Buffer.replace(b'\x5c\x6e', b'\x0a')` — 但 JS 源码中的字符串字面量 `\n` 在内存中恰好也是字节 `5c 6e`，导致 JS 文件本身被破坏（字符串值被篡改），而不是 TSX 产出文件被修复）。

**损坏链路**：
1. `fix-all-tsx.js` 处理了 `create-remotion-project.js` 自身（.js 文件）
2. JS 文件中的所有 `\\n` 转义字符串被替换为真实换行，破坏拼接逻辑
3. 下次运行 `node create-remotion-project.js` 产出的 TSX 仍然有 literal `\n`
4. 即使对 TSX 跑 `fix-all-tsx.js`，JS 已经被破坏，整个修复循环失效

**三种损坏场景的修复策略**：

### 场景 A：DynamicScene.tsx 有内容但含 literal `\n`
**症状**：`head -1 src/scenes/DynamicScene.tsx | xxd` 显示 `5c6e` 字节
**修复**（只对 TSX 文件）：
```bash
node -e "
const fs = require('fs');
const p = 'src/scenes/DynamicScene.tsx';
let c = fs.readFileSync(p, 'binary');
c = c.replace(/\x5c\x6e/g, '\n');
fs.writeFileSync(p, c);
"
```
**验证**：`head -1 src/scenes/DynamicScene.tsx | xxd | grep 5c6e`（应无输出）

### 场景 B：DynamicScene.tsx 含 literal `\\n` 或完全损坏

**症状**：`wc -l src/scenes/DynamicScene.tsx` 可能仍 >0，但文件第一行字节长度 20544（含大量 `\\n` 字面字符）。

**修复**：

1. **先检测**：
```bash
python3 -c "
with open('video-project/src/scenes/DynamicScene.tsx','rb') as f:
    d = f.read()
print('size:', len(d), 'bytes')
if b'\\\\n' in d:
    print('PROBLEM: literal backslash-n found')
"
```

2. **修复命令**：
```bash
# 备份
cp video-project/src/scenes/DynamicScene.tsx /tmp/DynamicScene_bak.tsx

# 用 python3 字节替换（只替换行末的 5c6e，不碰 JS 字符串中的合法 \n）
python3 -c "
with open('video-project/src/scenes/DynamicScene.tsx', 'rb') as f:
    data = f.read()
# 将连续的 literal \\n 序列转为真实换行
# 但更可靠：直接用 dynamic-scene-template.md 模板覆盖
import sys
print('File has', data.count(b'\\\\n'), 'literal backslash-n occurrences')
print('First line length:', data.split(b'\\n')[0).__len__() if b'\\n' in data else len(data))
print('Use template from references/B-REMOTION/dynamic-scene-template.md')
"
```

3. **直接用模板覆盖**（最可靠）：使用 `write_file` 将 `dynamic-scene-template.md` 中的模板作为起点，根据当前 `video-config.json` 替换 theme/title/subtitle 后写入。详见 `dynamic-scene-template.md`。

**防护**：不要对 `create-remotion-project.js` 自身执行 Buffer 替换。若 JS 文件被意外破坏：`git checkout scripts/create-remotion-project.js`

---

### launch.sh Permission Denied Bug

**症状**：`bash launch.sh init` 报错 `Permission denied`。

**根因**：`launch.sh` 未设置执行权限。

**修复**：
```bash
chmod +x /Users/zhushuyan/.hermes/skills/video-creator/scripts/launch.sh
```

---

### Subagent API 失败时主进程接管

**症状**：`delegate_task` 返回 `status: failed`（401）或 `status: timeout`（600s）。

**主进程接管流程**：
```bash
# 1. 检查目录
ls ~/.hermes/workspace/<repo>/

# 2. 音频已生成 → 跳过 TTS
# 3. video-project/src/ 为空或损坏 → 重建
rm -rf video-project/
node /Users/zhushuyan/.hermes/skills/video-creator/scripts/create-remotion-project.js .
# 检测并修复 DynamicScene.tsx（含 \\n 则模板覆盖）

# 4. 恢复 captions.json
cp /tmp/<repo>_captions.json video-project/public/audio/captions.json

# 5. npm install && 渲染
cd video-project && npm install
npx remotion render VerticalVideo out/final.mp4 --quality 0 --fps 60 --public-dir public

# 6. 更新 Base → 清理 Git
```

---

## Root.tsx `durationInFrames` 硬编码 Bug

## Root.tsx `durationInFrames` 硬编码 Bug

**症状**：渲染出来的视频帧数与音频时长不匹配——视频在错误时间点截断（如 60s 而非 85s），或开头几帧显示占位符内容。

**根因**：`create-remotion-project.js` 生成的 `Root.tsx` 中 `durationInFrames={3606}` 是硬编码值（对应 60.1s @ 60fps）。实际音频可能更长或更短，导致：
- 视频帧数 = 硬编码值 → 音频比视频长则截断，音频比视频短则尾部黑屏
- `calculateMetadata` 动态方案需要导入 `getAudioDuration` + `staticFile`，但 esbuild 不支持时报 `TypeError: (0 , esm.getAudioDuration) is not a function`

**修复（正确版——不依赖 calculateMetadata）：**

```bash
# 1. 用 ffprobe 获取音频实际帧数
python3 -c "
import subprocess
a = float(subprocess.check_output(['ffprobe', '-v', 'error',
    '-show_entries', 'format=duration', '-of', 'csv=p=0',
    'audio/neural_1_2x.m4a']).strip())
print(f'音频: {a:.3f}s = {int(a*60)}帧 @ 60fps')
"

# 2. 手动写入 Root.tsx（准确值，非 calculateMetadata）
# 直接写入 durationInFrames={计算值} 而不是依赖 getAudioDuration
```

```tsx
// ✅ 正确写法（在 calculateMetadata 不可用时，直接写入准确帧数）
<Composition
  id="VerticalVideo"
  component={VerticalVideo}
  durationInFrames={5107}   // ← 用 ffprobe 音频时长 × 60fps 的准确值
  fps={60}
  width={1080}
  height={1920}
  defaultProps={{ ... }}
/>

// ❌ 错误写法（硬编码错误值）
<Composition ... durationInFrames={3606} ... />

// ⚠️ calculateMetadata 方案（仅在 Remotion 版本支持 getAudioDuration 时使用）
calculateMetadata={async ({ props }) => {
  const audioDur = await getAudioDuration(staticFile(props.audioFile || "audio/neural_1_2x.m4a"));
  return { durationInFrames: Math.round(audioDur * 60), props };
}}
```

**验证命令：**
```bash
# 检查 Root.tsx 是否硬编码（不应有 durationInFrames={数字}）
grep "durationInFrames={[0-9]}" video-project/src/Root.tsx && echo "❌ 硬编码" || echo "✅"

# 检查视频实际帧数与音频帧数匹配
python3 -c "
import subprocess, json
v = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','video-project/out/final.mp4']).strip())
a = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','audio/neural_1_2x.m4a']).strip())
print(f'视频:{v:.3f}s 音频:{a:.3f}s 差异:{abs(v-a):.3f}s')
if abs(v-a) < 1: print('✅ 同步')
else: print('❌ 不同步')
"
```
