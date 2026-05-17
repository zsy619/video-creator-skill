# Remotion Composition ID 与 registerRoot 不匹配问题

## 问题现象

执行 `npx remotion render RemotionRoot out/final.mp4` 时报错：
```
Could not find composition with ID RemotionRoot. Available compositions: VerticalVideo
```

但代码中 `index.ts` 确实注册了 `registerRoot(RemotionRoot)`，编译无报错。

## 根因分析

Remotion 的 Composition 系统有两个独立的命名空间：

| 命名空间 | 位置 | 示例值 |
|----------|------|--------|
| React 组件名 | `index.ts` 中 `registerRoot(YourComponent)` | `RemotionRoot` |
| Composition ID | `Root.tsx` 中 `<Composition id="...">` 的 `id` 属性 | `VerticalVideo` |

Remotion CLI 查找的是 **Composition ID**（`id` 属性），不是 React 组件名。

## 正确诊断步骤

```bash
# 1. 查看实际可用的 Composition ID 列表
npx remotion ls

# 输出示例：
# ┌─────────────┬──────────────────┬──────────┐
# │ ID          │ Component        │ Duration │
# ├─────────────┼──────────────────┼──────────┤
# │ VerticalVideo │ RemotionRoot    │ 52s      │
# └─────────────┴──────────────────┴──────────┘

# 2. 如果报错 "Could not find composition with ID X"
# 说明渲染命令使用的 ID 不在 Available compositions 列表中
```

## 修复方法

**方案A：修改渲染命令（推荐，无需改代码）**

```bash
# ❌ 错误
npx remotion render RemotionRoot out/final.mp4 ...

# ✅ 正确（使用 Composition id 属性值）
npx remotion render VerticalVideo out/final.mp4 ...
```

**方案B：统一命名（改代码）**

修改 `Root.tsx` 中的 Composition id 属性，使其与组件名一致：

```tsx
// Root.tsx
<Composition id="RemotionRoot" component={RemotionRoot} durationInFrames={3119} fps={60}>
```

## launch.sh 中的不一致

`launch.sh` 的 `cmd_render` 函数可能硬编码了错误的 Composition ID：

```bash
# launch.sh 中
npx remotion render RemotionRoot out/final.mp4 \
  --concurrency=4 --fps=60 --duration-in-frames=3119 --disable-gpu
```

应修改为：

```bash
npx remotion render VerticalVideo out/final.mp4 \
  --concurrency=4 --fps=60 --duration-in-frames=3119 --disable-gpu
```

## 验证修复

```bash
# 渲染成功标志：exit code 0 + 输出文件大小 > 0
ls -la out/final.mp4
# -rw-r--r--  1 xxx  6769362 May 17 19:30 out/final.mp4
```

## 预防措施

在 `launch.sh` 的 render 命令前后增加验证：

```bash
# render 前后打印当前可用的 composition IDs
npx remotion ls
```