# literal \n 污染 Bug 修复实录（termshot 项目）

> **最后更新**：2026-05-31
> **相关文件**：`create-remotion-project-bugs.md`（同目录）

---

## 事件摘要

termshot 项目执行 `create-remotion-project.js` 后，`DynamicScene.tsx` 包含 **382 处** literal `\n`（字节 `5c 6e`），导致 esbuild 报 `Syntax error "n"`。

---

## 根因分析

`create-remotion-project.js` 生成 TSX 文件时，换行符被写成字面反斜杠+n（`\n` 作为两个字符 `\` + `n`）而非真实换行符（`0a`）。

这 382 处污染来自 JS 模板字符串中的 `\\n` 被破坏。

---

## 修复命令（Python，100% 可靠）

```bash
# Step 1: 确认污染存在
python3 -c "
data = open('video-project/src/scenes/DynamicScene.tsx', 'rb').read()
count = data.count(b'\x5c\x6e')
print(f'literal \n occurrences: {count}')
"

# Step 2: 一键修复
python3 -c "
data = open('video-project/src/scenes/DynamicScene.tsx', 'rb').read()
fixed = data.replace(b'\x5c\x6e', b'\x0a')
open('video-project/src/scenes/DynamicScene.tsx', 'wb').write(fixed)
print(f'Fixed {data.count(b\"\\x5c\\x6e\")} occurrences')
"
```

---

## 为什么 `fix-remotion-project.js` 不可靠

`fix-remotion-project.js` 的 `fixLiteralNL` 函数在 data 类型非字符串时抛出 `TypeError: data.replace is not a function`，导致整个脚本崩溃。Python 一行命令无此问题，始终有效。

---

## 预防措施

渲染前检查命令：
```bash
COUNT=$(python3 -c "print(open('video-project/src/scenes/DynamicScene.tsx','rb').read().count(b'\x5c\x6e'))")
if [ "$COUNT" -gt 0 ]; then
    echo "❌ $COUNT 处 literal \\n 污染，渲染前必须修复"
    exit 1
fi
```