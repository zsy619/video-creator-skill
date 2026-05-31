# create-remotion-project.js Bug 修复记录

> **最后更新**：2026-05-31

## 目录

1. [GridBackground 双花括号 Bug](#gridbackground-双花括号-bug)（✅ 已源码级修复）
2. [字节级 `\n` 污染 Bug](#字节级-n-污染-bug)
3. [launch.sh Permission Denied](#launchsh-permission-denied)（✅ 已解决）
4. [Root.tsx 帧数方案](#roottsx-帧数方案）
5. [captions.json 覆盖 Bug](#captionsjson-覆盖-bug)（⚠️ 尚未源码修复）

---

## ✅ GridBackground 双花括号 Bug（已源码级修复）

**问题**：`create-remotion-project.js` 生成的 `DynamicScene.tsx` 中，`hLines` 和 `vLines` 使用了双花括号 `{{ hLines }}` 而非单花括号 `{hLines}`。
**错误表现**：编译阶段 React error #31 — object with keys `{hLines}`（被解析为对象字面量而非数组 children）。

**修复（2026-05-30）**：在 `scripts/create-remotion-project.js` 第 368 行：
```javascript
// 修复前（BUG）：
"  return <>{{ hLines }}{{ vLines }}</>;\n" +
// 修复后（正确）：
"  return <>{hLines}{vLines}</>;\n" +
```

**验证**：
```bash
node /Users/zhushuyan/.hermes/skills/video-creator/scripts/create-remotion-project.js /tmp/test
grep -c '{{ hLines }}' /tmp/test/video-project/src/scenes/DynamicScene.tsx  # 应为 0
grep -c '{hLines}' /tmp/test/video-project/src/scenes/DynamicScene.tsx       # 应 > 0
```

> ⚠️ `{{ ... }}` 在 inline style（如 `style={{ property: value }}`）是合法语法，不能全局替换。

---

## 字节级 `\n` 污染 Bug（2026-05-31 根因升级）

**现象**：`create-remotion-project.js` 生成的 `DynamicScene.tsx` 只有 1 行，`wc -l` 返回 1。esbuild 报 `Syntax error "n"`。实测 liaohch3/claude-tap 项目 382 处 literal `\n`，Python 修复后文件从 1 行变为 383 行。

**两种独立触发路径**：

**路径 A（已知）**：`fix-all-tsx.js` 意外处理了 `create-remotion-project.js` 自身，将 JS 文件中的合法 `\\n` 转义序列破坏为真实换行符，导致拼接逻辑失效。损坏链路：fix-all-tsx.js → JS 文件的 `\\n` 被替换 → 拼接逻辑破坏 → TSX 仍含 literal `\n` → 修复循环失效。

**路径 B（新版，2026-05-31）**：`create-remotion-project.js` 的 heredoc 模板自身包含 `\\n` 字面量（来自 JS 字符串中的换行转义），经构建环境差异直接透传到 TSX 输出。**此路径无需 fix-all-tsx.js 参与，每次运行都可能触发。**

**检测**：
```bash
# xxd（最可靠）
head -c 200 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e
# wc -l（正常 TSX 应多行，若返回 1 → 全是 literal \n）
wc -l video-project/src/scenes/DynamicScene.tsx
```

**Python 一键修复**（每次 create-remotion-project.js 后强制执行）：
```bash
python3 -c "
data = open('video-project/src/scenes/DynamicScene.tsx', 'rb').read()
fixed = data.replace(b'\x5c\x6e', b'\x0a')
open('video-project/src/scenes/DynamicScene.tsx', 'wb').write(fixed)
print(f'Fixed {data.count(b\"\x5c\x6e\")} literal \\\\n, lines now: {fixed.count(b\"\x0a\")}')
"
```

**routine fix 原则**：Python 修复应作为 `create-remotion-project.js` 后的**常规步骤**，不等 esbuild 报错。更新 muscle memory：
```
node create-remotion-project.js <dir>  →  immediately Python \n fix  →  verify wc -l > 1
```

**检测 JS 文件是否损坏**：
```bash
python3 -c "
with open('/Users/zhushuyan/.hermes/skills/video-creator/scripts/create-remotion-project.js','rb') as f:
    d = f.read()
if b'\x0a' in d[:200]: print('PROBLEM: JS has real newlines in heredoc area')
"
```

---

## captions.json 覆盖 Bug（⚠️ 尚未源码修复）

**问题**：`create-remotion-project.js` 在执行时会将 `video-project/public/audio/captions.json` 重写为 `[]`（空数组），覆盖掉之前通过 `launch.sh audio` 或手动生成的字幕文件。

**影响**：如果在 `create-remotion-project.js` 之后、`launch.sh audio` 之前检查 captions.json，会发现内容被清空。

**防护步骤**：
1. **先备份**：`cp video-project/public/audio/captions.json /tmp/captions_backup.json`
2. 执行 `create-remotion-project.js`
3. **后恢复**：`cp /tmp/captions_backup.json video-project/public/audio/captions.json`
4. 渲染完成后再次确认 captions.json 内容未丢失

**检测**：
```bash
cat video-project/public/audio/captions.json
# 应显示有效 JSON 数组；若显示 [] 说明被覆盖
```

**⚠️ 根本修复方向**：`create-remotion-project.js` 应跳过 `public/audio/` 目录，只在 `src/` 目录生成源码文件。可考虑修改 JS 在写入 captions.json 前检查文件是否已存在且非空，若存在则跳过。

---

## launch.sh Permission Denied

**状态**：✅ 已解决（`chmod +x` 已执行）
`launch.sh` 需执行权限。执行一次即可：
```bash
chmod +x /Users/zhushuyan/.hermes/skills/video-creator/scripts/launch.sh
```

---

## Root.tsx 帧数方案

`create-remotion-project.js` 通过 ffprobe 动态计算帧数写入 `Root.tsx`，无需 `calculateMetadata`：

```javascript
// 从音频时长计算帧数
const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`, { encoding: "utf8" });
totalFrames = Math.round(parseFloat(dur.trim()) * fps);
```

**✅ 正确写法**（直接写入准确帧数）：
```tsx
<Composition
  id="VerticalVideo"
  component={VerticalVideo}
  durationInFrames={5107}   // ffprobe 音频时长 × 60fps 的准确值
  fps={60}
  width={1080}
  height={1920}
  defaultProps={{ ... }}
/>
```

**❌ 错误写法**（硬编码错误值）：
```tsx
<Composition ... durationInFrames={3606} ... />
```

**⚠️ `calculateMetadata` 方案不适用**：Remotion v4 无 `getAudioDuration` API，不可依赖。
**验证**：
```bash
python3 -c "
import subprocess
v = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','video-project/out/final.mp4']).strip())
a = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','audio/neural_1_2x.m4a']).strip())
print(f'视频:{v:.3f}s 音频:{a:.3f}s 差异:{abs(v-a):.3f}s')
print('✅ 同步' if abs(v-a) < 1 else '❌ 不同步')
"
```