# DynamicScene.tsx 垂直居中与封面图（2026-05-23 最终修订）
> **最后更新**：2026-05-28


## 核心教训

`create-remotion-project.js` 生成的文件**可能为空**（`wc -l` 返回 0），或包含 literal `\n`（字节 `5c6e`）导致 esbuild 崩溃。直接手动写一个完整的 `DynamicScene.tsx`（参考 `B-REMOTION/dynamic-scene-template.md`），绕过该脚本。

---

## 垂直居中布局规范（2026-05-30 修订）

### 原则

Remotion 的 `<AbsoluteFill>` = `position: absolute; inset: 0`。内部 flex 容器的 `justifyContent: "center"` **只在父元素有高度时生效**。

⚠️ **两种方案的对错已由 agenticSeek 项目实测验证**：

| 方案 | 做法 | 实测结果 |
|------|------|---------|
| `transform: translate(-50%, -50%)` | 内层 div 用 transform | ❌ 内容偏底 888px（PainPoint y=1848） |
| **外层 flex 居中** | 外层 div 用 `display:flex; justifyContent:center; alignItems:center` | ✅ 内容精确居中（所有场景 y=959，偏差 -0.1%） |

### ✅ 正确方案：外层 flex 三层嵌套

```tsx
// 第1层：DynamicScene 根容器 — 用 flex 替代 AbsoluteFill
<div style={{
  position: "absolute",
  inset: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
}}>
  <SceneWrapper ... />   {/* 第2层 */}
</div>

// 第2层：SceneWrapper — 负责入场动画 + 垂直居中
<div style={{
  position: "absolute",
  inset: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  opacity: enter,
  transform: `scale(${enter})`,
}}>
  <PainPointScene ... />  {/* 第3层，场景组件本身 */}
</div>

// 第3层：场景组件 — 纯 flex column，由外层 flex 容器实现垂直居中
<div style={{
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100%",
}}>
  {/* 内容自然垂直居中 */}
</div>
```

> ⚠️ **关键洞察**：`SceneWrapper` 的动画层（opacity + scale）必须用 `position:absolute; inset:0; display:flex; justifyContent:center; alignItems:center` 包裹场景组件，否则动画层会破坏垂直居中。

### ❌ 错误方案（不要用）

```tsx
// ❌ transform translate(-50%, -50%) 在 Remotion 多行内容场景失效
<div style={{
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
}}>
  {/* 内容偏底，无法真正居中，实测偏底 888px */}
</div>

// ❌ justifyContent center 对 AbsoluteFill 内部的 div 无效
<AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
  <div style={{ height: "100%" }}>
    {/* 仍然偏底，因为 CSS height:100% 无法获取 position:absolute 高度 */}
  </div>
</AbsoluteFill>
```

### 实测数据（agenticSeek，11场景）

修复后所有场景内容 Y 中心 = 959，相对画面中心 960 偏差 -0.1%，内容精确垂直居中：

| 场景 | Y中心 | 状态 |
|------|-------|------|
| Cover | 959 | ✅居中 |
| PainPoint ×4 | 959 | ✅居中 |
| Solution ×5 | 959 | ✅居中 |
| Features | 959 | ✅居中 |

### 验证脚本

```python
# 提取场景中点帧并分析内容区域
python3 << 'EOF'
import subprocess, json
from PIL import Image
import numpy as np

with open("video-config.json") as f:
    cfg = json.load(f)

times = []
t = 0
for scene in cfg["scenes"]:
    mid = t + scene["duration"]/2
    times.append((scene["name"], mid))
    t += scene["duration"]

for name, mid in times:
    img = Image.open(f"/tmp/scene_{name}_{mid:.3f}.jpg")
    arr = np.array(img)
    bg = arr[0,0]
    diff = np.abs(arr.astype(int) - bg.astype(int)).sum(axis=2)
    bright = diff > 30
    rows = np.where(bright.any(axis=1))[0]
    if len(rows) > 0:
        y_min, y_max = rows.min(), rows.max()
        y_center = (y_min + y_max) // 2
        deviation = y_center - 960
        status = "✅居中" if abs(deviation) < 100 else ("⚠️轻微偏离" if abs(deviation) < 300 else "❌偏离")
        print(f"{name:12s} y_center={y_center:4d} h={y_max-y_min:4d} {status}")
EOF
```

---

## 封面图：使用 CSS 渐变（唯一可靠方案）

**⚠️ 所有外部图片方案均已验证失败**：
- `staticFile("assets/cover.png")` + `<img>` — Chromium headless file:// 协议限制导致 404
- `import CoverImg from "...png"` — Vite 路径解析问题，图片不出现
- base64 data URL + `<img>` — img 标签渲染管线问题，图片不出现
- base64 data URL + CSS `backgroundImage` — 图片仍不出现（背景渐变可见）

**唯一已验证可行的方案**：纯 CSS 多层渐变构建封面视觉，不依赖任何外部图片文件。

### 已验证的 CSS 渐变模板（CoverScene）

```tsx
const CoverScene = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
    {/* CSS 渐变背景：水平线(青色) + 垂直线(品红) + 中心光晕 + 紫蓝基色 */}
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      background: `
        linear-gradient(rgba(0,255,255,0.25) 2px, transparent 2px),
        linear-gradient(90deg, rgba(255,0,255,0.25) 2px, transparent 2px),
        radial-gradient(ellipse at 50% 40%, rgba(255,0,255,0.4) 0%, rgba(0,255,255,0.1) 40%, transparent 70%),
        linear-gradient(160deg, #4A1B8C 0%, #3D1B6E 40%, #1A0A3D 100%)
      `,
      backgroundSize: '80px 80px, 80px 80px, 100% 100%, 100% 100%',
    }} />
    {/* 前景卡片 */}
    <div style={{
      position: "relative", zIndex: 10,
      width: "100%", maxWidth: 900,
      background: "rgba(30,5,70,0.9)",
      border: "3px solid #00FFFF",
      borderRadius: 28, padding: "90px 70px",
      textAlign: "center",
      boxShadow: "0 0 120px rgba(0,255,255,0.4), 0 0 60px rgba(255,0,255,0.2), inset 0 0 60px rgba(0,255,255,0.05)",
    }}>
      <div style={{ fontSize: 100, fontWeight: "bold", color: PRIMARY, fontFamily: "JetBrains Mono, monospace", marginBottom: 36, letterSpacing: 6, filter: "drop-shadow(0 0 20px rgba(0,255,255,0.6))" }}>
        {"> "}{title.split(":")[0] || title}
      </div>
      <div style={{ fontSize: 48, color: "rgba(255,255,255,0.92)", fontFamily: "STHeiti Medium, sans-serif", lineHeight: 1.7, marginBottom: 12 }}>
        {subtitle}
      </div>
      {/* 标签 + URL */}
    </div>
  </AbsoluteFill>
);
```

### 首帧亮度参考（hive 项目实测）

| 背景色 BG | 首帧 B 均值 | 可见性 |
|---------|-----------|-------|
| `#0D0221` | 17.2 | ❌ 极暗 |
| `#1A0038`（加深卡片背景后） | 22.0 | ❌ 仍暗 |
| CSS 多层渐变（bg #4A1B8C→#3D1B6E→#1A0A3D） | 59.7 | ✅ 可用 |

---

## 渲染输出文件名（隐藏的 .mp4）

Remotion 渲染到 `out/` 目录时，文件名为 `.mp4`（以 `.` 开头，隐藏文件）：

```bash
# 查找输出文件（不能用 *.mp4）
find out/ -name "*.mp4" -type f
# 或
ls -la out/

# 重命名到 final.mp4
mv out/.mp4 out/final.mp4
```

---

## 快速检查清单（每次渲染前）

```bash
# 1. DynamicScene.tsx 不为空
wc -l src/scenes/DynamicScene.tsx   # 应 > 0

# 2. 无 literal \n（字节 5c6e）
head -3 src/scenes/DynamicScene.tsx | xxd | grep 5c6e && echo "有literal\\n!" || echo "干净"

# 3. CSS 渐变存在（封面用 CSS，无外部图片依赖）
grep -c "background.*linear-gradient" src/scenes/DynamicScene.tsx   # 应 >= 1

# 4. 音频存在
ls -lh public/audio/neural_1_2x.m4a # 应 ~50s at 1.2x

# 5. 验证首帧亮度（渲染后）
ffmpeg -vframes 1 -ss 1 -i out/final.mp4 -update 1 /tmp/frame0.jpg 2>/dev/null
python3 -c "from PIL import Image; img=Image.open('/tmp/frame0.jpg'); import numpy as np; arr=np.array(img); print(f'亮度: {arr.mean():.1f}')"
# 亮度应 > 50
```