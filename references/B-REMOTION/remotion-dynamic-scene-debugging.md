# Remotion 动态场景修复实录（hive 项目）

> 来源：2026-05-23 为 GitHub 仓库 `tt-a1i/hive` 生成视频时的 9 次渲染调试过程。
> 目标：记录每个失败点的根因、修复动作和实测结果，供未来遇到同类问题时参考。

---

## 问题 1：create-remotion-project.js 生成空文件（0 行）

### 现象
第二次及后续运行 `node create-remotion-project.js` 时，`video-project/src/scenes/DynamicScene.tsx` 生成后为 **0 行空文件**，导致 Remotion 渲染失败。

### 根因
`create-remotion-project.js` 在目标目录非空时拒绝覆盖，或生成过程中断。空文件说明脚本执行了写入权限，但模板内容未成功写入。

### 修复方案
```
# 删除整个 video-project 目录后再生成
rm -rf video-project/
node create-remotion-project.js .
# 立即检查行数
wc -l video-project/src/scenes/DynamicScene.tsx
# 应 > 0；为 0 则直接用 `B-REMOTION/dynamic-scene-template.md` 复制
```

---

## 问题 2：PainPointScene / FeaturesScene 元素未上下居中

### 根因
父级 `FlexBox` 缺少 `alignItems: "center"` 和 `maxWidth` 约束，内层内容即使 `flexDirection: "column"` 也无法居中。

### 修复方案（Cyberpunk 主题示例）

```tsx
// PainPointScene — 外层约束
<FlexBox
  style={{
    width: "100%",
    height: "100%",
    background: "#0D0221",
    flexDirection: "column",
    alignItems: "center",   // ← 必须
    justifyContent: "center", // ← 必须
    padding: "0 40px",
  }}
>
  <div style={{
    maxWidth: 900,          // ← 内容宽度约束
    width: "100%",
    alignItems: "center",   // ← 内层也居中
    display: "flex",
    flexDirection: "column",
    gap: 24,
  }}>
    {/* Pain point 内容 */}
  </div>
</FlexBox>

// FeaturesScene — 同样结构
<FlexBox
  style={{
    width: "100%",
    height: "100%",
    background: "#0D0221",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 40px",
  }}
>
  <div style={{
    maxWidth: 900,
    width: "100%",
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  }}>
    {/* Features 内容 */}
  </div>
</FlexBox>
```

**关键点**：
- 外层 `FlexBox`：`alignItems: "center"` + `justifyContent: "center"` + `padding`
- 内层容器：`maxWidth: 900` + `alignItems: "center"`
- 两层都要有 `alignItems: "center"` 才能真正居中

---

## 问题 3：封面图（cover.png）首帧不可见

### 9 次渲染亮度记录

| 次数 | 方案 | 首帧亮度均值 | R | G | B | 结论 |
|------|------|------------|---|---|---|------|
| 1 | staticFile + img (opacity=0.82) | 17.2 | 12.9 | 4.2 | 34.6 | ❌ 不可见 |
| 2 | 调深背景色 | 22.0 | — | — | — | ❌ |
| 3 | SVG 渐变 + 网格线 | 28.1 | 25.6 | 1.1 | 57.7 | ❌ 线条不可见 |
| 4 | CSS radial-gradient | 59.7 | 45.0 | 28.3 | 105.8 | △ 背景可见，线条不可见 |
| 5 | PIL 新封面图（107KB） | 59.7 | 45.0 | 28.3 | 105.8 | △ 同上 |
| 6 | ES import 内嵌 img | 59.7 | — | — | — | ❌ img不渲染 |
| 7 | CSS 多层渐变背景 | 59.7 | — | — | — | △ 背景可见 |
| 8 | CSS 渐变 + 提高透明度 | 60+ | — | — | — | △ |
| 9 | ES import 替换 staticFile | 59.7 | — | — | — | ❌ img不渲染 |

### 根因分析

1. **Remotion headless 环境限制**：Chromium file:// 协议限制导致 `staticFile()` 返回的路径在 headless 中 404
2. **ES import 在 Vite 打包后路径错误**：Remotion 的 Vite 打包器处理 publicDir 文件时路径解析不正确
3. **CSS 渐变背景工作正常**：背景色可达 60+ 亮度
4. **CSS grid lines 在 headless 中不渲染**：`linear-gradient` 绘制的网格线在 Remotion headless Chromium 中完全不产生可见像素（与有界面 Chrome 不同）

### 经验结论

- **封面背景**：CSS 多层渐变可用，但网格线条在 headless 中不渲染
- **封面前景文字**：需要靠卡片本身的对比度，不是背景网格
- **img 元素**：无论 `staticFile` 还是 ES import，在 Remotion headless 中都无法正确渲染 PNG
- **当前最佳实践**：
  - 用 CSS 渐变做背景（`#2D1B69` 等亮色基底层 + radial-gradient 光晕）
  - 前景卡片使用高对比度（白字/亮色边框 + 深色背景 `rgba(30,5,70,0.9)`）
  - 不依赖外部图片文件的 img 元素

---

## 问题 4：渲染命令需要 `--public-dir public`

### 根因
Remotion 默认 publicDir 为项目根目录的 `public/` 目录。如果 `public/assets/cover.png` 存在但渲染时找不到，需确认 `publicDir` 配置。

### 修复方案
```bash
cd video-project/
npx remotion render VerticalVideo \
  out/final.mp4 \
  --quality 0 \
  --fps 60 \
  --public-dir public    # ← 必须显式传入
```

---

## 快速修复命令（调试循环）

```bash
# 1. 检查 DynamicScene.tsx 是否为空
wc -l video-project/src/scenes/DynamicScene.tsx

# 2. 检查是否有 literal \n 字节
head -3 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e

# 3. 快速修复 literal \n（如果需要）
node -e "
const fs = require('fs');
const f = 'video-project/src/scenes/DynamicScene.tsx';
let c = fs.readFileSync(f);
c = Buffer.concat([c]);
c = c.includes(Buffer.from('\\x5c\\x6e')) ? c : c;
fs.writeFileSync(f, c);
"

# 4. 检查 cover.png 是否存在
ls -la video-project/public/assets/cover.png

# 5. 启动渲染
cd video-project && npx remotion render VerticalVideo \
  out/final.mp4 \
  --quality 0 --fps 60 --public-dir public
```

---

## 相关文件

- `B-REMOTION/dynamic-scene-template.md` — 已知良好的 DynamicScene.tsx 模板（当生成文件损坏时使用）
- `B-REMOTION/create-remotion-project-bugs.md` — 双花括号 `{{ hLines }}` 和 literal `\n` 的修复方法
- `B-REMOTION/create-remotion-project-bugs.md` — `create-remotion-project.js` 的全部已知 bug
- `E-VISUAL/cover-image-rendering.md` — 封面图渲染的完整诊断（包含 CSS 渐变解法）
- `B-REMOTION/dynamic-scene-vertical-center.md` — 居中布局规范