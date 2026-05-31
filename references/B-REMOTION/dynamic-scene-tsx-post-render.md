# DynamicScene.tsx 渲染后验证 + 根因修复记录

> **最后更新**：2026-05-30

## 教训：渲染前必须验证 TSX 文件

**本次事件**（pdf-inspector 项目）：
- `create-remotion-project.js` 生成的 `DynamicScene.tsx` 包含 **382 处字面反斜杠-n**（字节 `0x5c 0x6e`），而非真实换行符
- Remotion 渲染失败：`Syntax error: unexpected token "n"`（esbuild 报错位置：第 1 行第 40 列）
- 修复：用 Python 替换 `b'\x5c\x6e' → b'\x0a'`，382 处全部替换后渲染成功

**根因**：`create-remotion-project.js` 在拼接 TSX 字符串时使用 `\n` 转义字符，但如果拼接逻辑有中间层处理（如 `fix-all-tsx.js` 误处理了 JS 文件），可能导致 `\n` 被写入文件时变成字面字符串 `\` + `n`。

**⚠️ 关键发现**：此 Bug 出现在 `create-remotion-project.js` 生成的文件中，说明 JS 文件自身在生成过程中没有被破坏（否则渲染成功后 TSX 里的 JSX 也会有问题）。问题集中于 `DynamicScene.tsx` 的 hex pattern。

---

## 渲染前必做的 4 项验证（2026-05-30 新增）

执行 `node create-remotion-project.js` 后，**立即**运行以下 4 项检查，任意一项失败都应立即修复再继续：

```bash
# 1. 文件非空
wc -l video-project/src/scenes/DynamicScene.tsx
# 应 > 0；为 0 则文件为空，从 dynamic-scene-template.md 复制模板

# 2. 无 literal backslash-n（字节 0x5c 0x6e）
python3 -c "
with open('video-project/src/scenes/DynamicScene.tsx','rb') as f:
    d = f.read()
if b'\x5c\x6e' in d:
    print('PROBLEM: literal backslash-n found, count:', d.count(b'\x5c\x6e'))
else:
    print('OK: no literal backslash-n')
"
# 有输出 PROBLEM → 立即用 python3 -c "data.replace(b'\x5c\x6e',b'\x0a')" 修复

# 3. 无 JSX 双花括号（GridBackground 语法错误）
grep -c '{{ hLines }}' video-project/src/scenes/DynamicScene.tsx
# 应为 0；非 0 → patch 修复为 <>{hLines}{vLines}</>

# 4. 编译通过（快速验证，不渲染完整视频）
cd video-project && node_modules/.bin/remotion render VerticalVideo /tmp/test.mp4 --concurrency=4 --fps=60 --disable-gpu --log=error 2>&1 | head -20
# 若报 Syntax error / React error，立即停手，不要继续 step 7/8
```

> **验证顺序**：按 1→2→3→4 执行。任何一步失败都在继续前修复。
> **注意**：步骤 2 的 Python 检测比 `grep '\n'` 更可靠——grep 只能找到真实换行符，无法区分 `0x5c 0x6e`（字面反斜杠+n）和 `0x0a`（真实换行符）。

---

## 修复命令（供快速复制）

```bash
# 修复 literal \n → 真实换行符
python3 -c "
with open('video-project/src/scenes/DynamicScene.tsx', 'rb') as f:
    data = f.read()
replaced = data.replace(b'\x5c\x6e', b'\x0a')
count = data.count(b'\x5c\x6e')
with open('video-project/src/scenes/DynamicScene.tsx', 'wb') as f:
    f.write(replaced)
print(f'Replaced {count} occurrences')
"

# 验证修复结果
python3 -c "
with open('video-project/src/scenes/DynamicScene.tsx','rb') as f:
    d = f.read()
print('Remaining literal backslash-n:', d.count(b'\x5c\x6e'))
"
```

---

## 相关文件

- `references/B-REMOTION/create-remotion-project-bugs.md` — 项目创建 Bug 修复记录（含 captions.json 覆盖 Bug）
- `references/B-REMOTION/dynamic-scene-template.md` — DynamicScene.tsx 完整模板（备用）