# create-remotion-project.js 模板 Bug 修复

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

### 场景 B：DynamicScene.tsx 完全为空（0 行）
**症状**：`wc -l src/scenes/DynamicScene.tsx` = 0，且修复后重新生成仍得到空文件（因为 create-remotion-project.js 自身已损坏）
**修复**：手动写完整 `DynamicScene.tsx`。从 session 上下文中恢复完整源码，或参考 `B-REMOTION/dynamic-scene-template.md` 中的已知良好模板。**不要依赖损坏的 create-remotion-project.js**。

### 场景 C：create-remotion-project.js 自身被破坏
**症状**：`node create-remotion-project.js` 报错 `SyntaxError: Invalid or unexpected token`
**修复**：
```bash
cd /Users/zhushuyan/.hermes/skills/video-creator
git checkout -- scripts/create-remotion-project.js
```
恢复后重新运行 `node create-remotion-project.js`。

**原则**：
- 字节级替换只应作用于已确认含 literal `\n` 的 TSX 文件
- `.js` 源码文件绝对不能碰 Buffer 替换
- DynamicScene.tsx 为空时，优先手动写完整代码（参考 `B-REMOTION/dynamic-scene-template.md`），而非修复损坏的生成器
