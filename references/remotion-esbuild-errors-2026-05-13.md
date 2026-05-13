# Remotion esbuild 语法错误修复（2026-05-13）

> create-remotion-project.js 生成的代码在 esbuild bundling 时暴露的语法错误。
> TypeScript 编译（`tsc`）静默通过，但 esbuild bundling 失败。
> **必须每次创建项目后检查并修复这些问题。**

---

## 错误1：themes/index.ts 连字符 key 无引号

**症状**：
```
ERROR: Expected "}" but found "-"
src/themes/index.ts:12:6: ERROR
```

**根因**：JavaScript 对象 key 包含连字符时必须加引号：
```ts
// ❌ 错误：esbuild 解析失败
export const THEMES: Record<string, ThemeConfig> = {
  tech-modern: {    // 连字符 key 无引号
    primary: "#2563EB",
  }
};

// ✅ 正确：所有 key 加引号
export const THEMES: Record<string, ThemeConfig> = {
  "tech-modern": {
    primary: "#2563EB",
  }
};
```

**自动修复**：
```python
import re
content = open('src/themes/index.ts').read()
# 匹配无引号连字符 key：前面有空白+冒号+大括号，前面不是引号
fixed = re.sub(
    r'(\s+)([a-z][a-z0-9]*-[a-z0-9-]+):(\s*\{)',
    r'\1"\2":\3',
    content
)
open('src/themes/index.ts', 'w').write(fixed)
```

**验证**：`grep -n '^[a-z]' src/themes/index.ts | grep ':' | head`

---

## 错误2：JSX 属性值后多余右花括号

**症状**：
```
ERROR: Expected ">" but found "}"
Scene4_Features.tsx:194:134: ERROR
```

**根因**：属性值后多写了一个 `}`：
```tsx
// ❌ 错误
<FeatureCard color="#00FF88"} delay={30} ... />
//                                     ^ 多余的 }

<ProtocolBadge label="0-RTT" color="#00FF88"} delay={45} ... />
//                                      ^ 多余的 }
```

```tsx
// ✅ 正确
<FeatureCard color="#00FF88" delay={30} ... />
<ProtocolBadge label="0-RTT" color="#00FF88" delay={45} ... />
```

**搜索模式**（查找所有类似错误）：
```bash
grep -rn '} delay=' src/scenes/
grep -rn '} index=' src/scenes/
grep -rn '} frame=' src/scenes/
```

---

## 错误3：组件 prop 缺少必需参数

**症状**：
```
Type error: Property 'delay' is missing in type
```

**根因**：自定义组件要求特定 prop，但 JSX 调用时遗漏：
```tsx
// ❌ 错误：ProtocolBadge 缺少 delay 参数
<ProtocolBadge label="0-RTT" color="#00FF88" delay={45} frame={frame} x={540} y={700} />
// 在某处调用时写成了：
<ProtocolBadge label="0-RTT" color="#00FF88" delay={45} ... />  // delay 正常
// 但另一个地方：
<ProtocolBadge label="0-RTT" color="#00FF88" delay={45} frame={frame} x={540} y={700} />
```

**搜索模式**：
```bash
grep -rn '<ProtocolBadge' src/scenes/
grep -rn '<FeatureCard' src/scenes/
grep -rn '<PulseRing' src/scenes/
```
手动检查每个调用的参数是否与组件定义一致。

---

## 错误4：未使用的 import 导致 TypeScript 编译警告

**症状**：`Video.tsx` 包含 `Spring` 和 `FontName` 的 import 但未使用，Remotion bundling 仍可成功但应清理。

**修复**：删除所有未使用的 import：
```tsx
// ❌ Video.tsx 中多余
import { spring, interpolate, AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
// Spring 和 FontName 未使用

// ✅ 正确
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
```

---

## 自动修复脚本

```python
#!/usr/bin/env python3
"""fix-remotion-esbuild.py — 修复 create-remotion-project.js 生成的 esbuild 错误"""
import re, sys, os

def fix_themes_index(path):
    content = open(path).read()
    fixed = re.sub(
        r'(\s+)([a-z][a-z0-9]*-[a-z0-9-]+):(\s*\{)',
        r'\1"\2":\3',
        content
    )
    if fixed != content:
        open(path, 'w').write(fixed)
        print(f"Fixed: {path}")

def fix_jsx_syntax(path):
    content = open(path).read()
    # 修复 color="..."} 后多余的 }
    fixed = re.sub(r'(color="[^"]*")\}(\s+(delay|frame|index)x=)', r'\1 \2', content)
    if fixed != content:
        open(path, 'w').write(fixed)
        print(f"Fixed JSX syntax: {path}")

def main():
    base = sys.argv[1] if len(sys.argv) > 1 else '.'
    # 修复 themes/index.ts
    themes = os.path.join(base, 'src', 'themes', 'index.ts')
    if os.path.exists(themes):
        fix_themes_index(themes)
    # 扫描所有 .tsx 文件
    for root, _, files in os.walk(os.path.join(base, 'src')):
        for f in files:
            if f.endswith('.tsx'):
                fix_jsx_syntax(os.path.join(root, f))

if __name__ == '__main__':
    main()
```

---

## 验证命令（渲染前必须执行）

```bash
# 1. themes/index.ts 所有 key 有引号
grep -E '^\s+[a-z][a-z0-9]*-[a-z0-9-]+:' src/themes/index.ts && echo "❌ 有未加引号的 key" || echo "✅ 全部加引号"

# 2. JSX 属性无多余 }
grep -rn '} delay=\|} frame=\|} index=' src/scenes/ && echo "❌ 有多余 }" || echo "✅ 无多余 }"

# 3. 渲染前最终验证
cd video-project && npm install && npx remotion render VerticalVideo out/test.mp4 --concurrency=4 --fps=60 --disable-gpu
```
