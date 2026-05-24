# Remotion Troubleshooting

> 本文档是 Remotion 问题排查的快速入口。
> 完整问题清单 → `remotion-troubleshoot.md`
> create-remotion-project.js Bug 修复 → `create-remotion-project-bugs.md`

---

## 双花括号 Bug（渲染失败 / React error #31）

**症状**：编译报错 `object with keys {hLines}` 或 `Syntax error`

**根因**：`create-remotion-project.js` 生成的 TSX 中 `{{ hLines }}` 应为 `{hLines}`

**修复**（项目生成后立即执行）：
```js
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
grep -c '\{\{ hLines \}\}' src/scenes/DynamicScene.tsx  # 应为 0
grep -c '{hLines}' src/scenes/DynamicScene.tsx         # 应 > 0
```

⚠️ `{{ ... }}` 在其他场景（如 inline style `{{ property: value }}`）是合法语法，不能全局替换。必须精确匹配 `{{ hLines }}` 和 `{{ vLines }}`。

详见：`B-REMOTION/create-remotion-project-bugs.md`

---

## DynamicScene.tsx 为空（0行）或完全损坏

**症状**：`wc -l src/scenes/DynamicScene.tsx` = 0，或文件含大量 literal `\n`（字节 `5c6e`）

**修复路径**：
1. `git checkout -- scripts/create-remotion-project.js`（恢复损坏的生成器）
2. 重新生成：`node create-remotion-project.js .`
3. 验证：`wc -l src/scenes/DynamicScene.tsx` — 若仍为 0 或含 `5c6e`，直接放弃生成器
4. **手动从 `B-REMOTION/dynamic-scene-template.md` 复制已知良好模板**

详见：`B-REMOTION/create-remotion-project-bugs.md`（场景 B）+ `B-REMOTION/dynamic-scene-template.md`（完整模板源码）

---

## 其他 Remotion 错误

详见 `B-REMOTION/remotion-troubleshoot.md`