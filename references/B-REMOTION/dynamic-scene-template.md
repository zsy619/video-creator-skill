# DynamicScene.tsx 完整模板（CSS 渐变封面版）

> **⚠️ 重要更新（2026-05-23）**：封面图请勿使用 `staticFile("assets/cover.png")` 或 `import ... from ".png"` 方式——Remotion 服务端渲染时 Chromium 的 file:// 协议限制会导致图片 404。**SVG `<line>` stroke 同样不渲染**。**正确做法**：使用 CSS `background: linear-gradient(...)` 多层渐变（唯一可靠方案，见下方模板 CoverScene）。

---

## 快速修复流程（当 DynamicScene.tsx 为空或损坏时）

1. 删除现有项目：`rm -rf video-project/`
2. 重建 Remotion 项目：`node {SKILL_DIR}/scripts/create-remotion-project.js .`
3. 验证文件：`wc -l video-project/src/scenes/DynamicScene.tsx`
4. 若文件为空（0行）或含 literal `\n`（`5c6e` 字节），执行后处理：
   ```bash
   node -e "
   const fs = require('fs');
   const f = 'video-project/src/scenes/DynamicScene.tsx';
   const buf = fs.readFileSync(f);
   fs.writeFileSync(f, buf);
   "
   ```
5. 若后处理后仍为空或损坏，直接用下方模板覆盖：
   ```bash
   cat > video-project/src/scenes/DynamicScene.tsx << 'TSXEOF'
   [粘贴下方完整模板]
   TSXEOF
   ```

---

## 完整模板（竖屏 1080×1920，CSS 渐变封面）

```tsx
import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, spring } from "remotion";

const PRIMARY = "#00FFFF";
const SECONDARY = "#FF00FF";
const ACCENT = "#FFFF00";
const BG = "#1A0038";

interface DynamicSceneProps {
  name: string;
  title: string;
  subtitle: string;
  theme: any;
  frame: number;
  painPoints?: string[];
  tags?: string[];
  features?: Array<{ icon?: string; name?: string; desc?: string }>;
  steps?: Array<{ cmd?: string; text?: string; desc?: string }>;
  url?: string;
  license?: string;
}

const SceneWrapper = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ opacity: enter, transform: `scale(${0.95 + enter * 0.05})` }}>
      {children}
    </div>
  );
};

// === COVER SCENE（CSS 多层渐变，无外部图片依赖）===
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
      <div style={{ marginTop: 56, display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
        {["🤖 AI Agent", "🔗 协作", "⚡ 自动化"].map(tag => (
          <span key={tag} style={{
            background: "rgba(255,0,255,0.18)", border: `2px solid ${SECONDARY}`,
            borderRadius: 999, padding: "12px 28px", color: "#FFFFFF", fontSize: 30, fontFamily: "STHeiti Medium, sans-serif",
            boxShadow: `0 0 16px rgba(255,0,255,0.3)`,
          }}>{tag}</span>
        ))}
      </div>
      <div style={{ marginTop: 48, fontSize: 28, color: "rgba(0,255,255,0.6)", fontFamily: "JetBrains Mono, monospace" }}>
        github.com/[owner]/[repo]
      </div>
    </div>
  </AbsoluteFill>
);

// === PAIN POINT SCENE ===
const PainPointScene = ({ title, painPoints }: { title: string; painPoints?: string[] }) => (
  <AbsoluteFill style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", padding: 60 }}>
    <div style={{ width: "100%", maxWidth: 900, textAlign: "center" }}>
      <div style={{ fontSize: 56, color: SECONDARY, fontFamily: "JetBrains Mono, monospace", marginBottom: 48, fontWeight: "bold" }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
        {(painPoints || ["Agent 各自为战", "缺乏统一调度", "协作成本高"]).map((point, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 24,
            background: "rgba(255,0,255,0.08)", borderLeft: `4px solid ${SECONDARY}`,
            borderRadius: 12, padding: "20px 28px", maxWidth: 800,
          }}>
            <span style={{ fontSize: 36, color: SECONDARY, fontFamily: "JetBrains Mono" }}>✗</span>
            <span style={{ fontSize: 36, color: "#FFFFFF", fontFamily: "STHeiti Medium, sans-serif" }}>{point}</span>
          </div>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);

// === SOLUTION SCENE ===
const SolutionScene = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <AbsoluteFill style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", padding: 60 }}>
    <div style={{ width: "100%", textAlign: "center", background: "linear-gradient(180deg, rgba(0,255,255,0.1), transparent)", borderRadius: 24, padding: "60px 40px" }}>
      <div style={{ fontSize: 64, color: PRIMARY, fontFamily: "JetBrains Mono, monospace", marginBottom: 24, fontWeight: "bold" }}>
        {"> [RepoName]"}
      </div>
      <div style={{ fontSize: 48, color: ACCENT, fontFamily: "STHeiti Medium, sans-serif", marginBottom: 32 }}>
        {title}
      </div>
      <div style={{ fontSize: 36, color: "rgba(255,255,255,0.7)", fontFamily: "STHeiti Medium, sans-serif", lineHeight: 1.8 }}>
        {subtitle}
      </div>
    </div>
  </AbsoluteFill>
);

// === FEATURES SCENE ===
const FeaturesScene = ({ title, features }: { title: string; features?: Array<{ name?: string; desc?: string }> }) => {
  const items = features && features.length > 0 ? features : [
    { name: "Feature A", desc: "功能描述 A" },
    { name: "Feature B", desc: "功能描述 B" },
    { name: "Feature C", desc: "功能描述 C" },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", padding: 60 }}>
      <div style={{ width: "100%", maxWidth: 900, textAlign: "center" }}>
        <div style={{ fontSize: 52, color: ACCENT, fontFamily: "JetBrains Mono, monospace", marginBottom: 48, fontWeight: "bold" }}>
          {title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
          {items.map((f, i) => (
            <div key={i} style={{
              background: "rgba(255,255,0,0.07)", border: `1px solid rgba(255,255,0,0.3)`,
              borderRadius: 16, padding: "24px 32px", maxWidth: 800, width: "100%", textAlign: "left",
            }}>
              <div style={{ fontSize: 36, color: ACCENT, fontFamily: "JetBrains Mono, monospace", marginBottom: 8 }}>{f.name}</div>
              <div style={{ fontSize: 28, color: "rgba(255,255,255,0.75)", fontFamily: "STHeiti Medium, sans-serif" }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// === START SCENE ===
const StartScene = ({ title, subtitle, url }: { title: string; subtitle: string; url?: string }) => (
  <AbsoluteFill style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", padding: 60 }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 64, color: PRIMARY, fontFamily: "JetBrains Mono, monospace", marginBottom: 24 }}>{"> "}{title}</div>
      <div style={{ fontSize: 36, color: "rgba(255,255,255,0.8)", fontFamily: "STHeiti Medium, sans-serif", marginBottom: 40 }}>{subtitle}</div>
      {url && (
        <div style={{ background: "rgba(0,255,255,0.1)", border: `2px solid ${PRIMARY}`, borderRadius: 999, padding: "16px 40px", fontSize: 32, color: PRIMARY, fontFamily: "JetBrains Mono, monospace", display: "inline-block" }}>
          {url}
        </div>
      )}
      <div style={{ marginTop: 48, fontSize: 32, color: "rgba(255,255,255,0.5)", fontFamily: "JetBrains Mono, monospace" }}>
        {"$ "}<span style={{ color: PRIMARY }}>npm</span>{" install [package]"}
      </div>
    </div>
  </AbsoluteFill>
);

// === ENDING SCENE ===
const EndingScene = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <AbsoluteFill style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", padding: 60 }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 72, color: PRIMARY, fontFamily: "JetBrains Mono, monospace", marginBottom: 24 }}>✓ {title}</div>
      <div style={{ fontSize: 40, color: "rgba(255,255,255,0.8)", fontFamily: "STHeiti Medium, sans-serif" }}>{subtitle}</div>
      <div style={{ marginTop: 60, fontSize: 36, color: SECONDARY, fontFamily: "JetBrains Mono, monospace" }}>
        github.com/[owner]/[repo]
      </div>
    </div>
  </AbsoluteFill>
);

// === GENERIC SCENE ===
const GenericScene = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <AbsoluteFill style={{ backgroundColor: BG, justifyContent: "center", alignItems: "center", padding: 60 }}>
    <div style={{ fontSize: 64, color: PRIMARY, fontFamily: "JetBrains Mono, monospace", marginBottom: 24, textAlign: "center" }}>{title}</div>
    <div style={{ fontSize: 36, color: "rgba(255,255,255,0.7)", fontFamily: "STHeiti Medium, sans-serif", textAlign: "center" }}>{subtitle}</div>
  </AbsoluteFill>
);

// === MAIN COMPONENT ===
export const DynamicScene: React.FC<DynamicSceneProps> = ({
  name, title, subtitle, painPoints, features, steps, url, license,
}) => {
  const frame = useCurrentFrame();
  const p = useMemo(() => ({
    entry: interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    glow: interpolate(frame % 120, [0, 60, 120], [0.3, 0.8, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  }), [frame]);

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <div style={{ position: "absolute", inset: 0, opacity: p.glow, background: "radial-gradient(ellipse at 50% 50%, rgba(0,255,255,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, transparent, ${PRIMARY}, ${SECONDARY}, transparent)`, opacity: p.entry }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, transparent, ${SECONDARY}, ${PRIMARY}, transparent)`, opacity: p.entry }} />
      <div style={{ position: "absolute", top: 32, right: 40, fontSize: 24, color: "rgba(255,255,255,0.25)", fontFamily: "JetBrains Mono, monospace" }}>
        {frame}f
      </div>
      <SceneWrapper>
        {name === "Cover" && <CoverScene title={title} subtitle={subtitle} />}
        {name === "PainPoint" && <PainPointScene title={title} painPoints={painPoints} />}
        {name === "Solution" && <SolutionScene title={title} subtitle={subtitle} />}
        {name === "Features" && <FeaturesScene title={title} features={features} />}
        {name === "Start" && <StartScene title={title} subtitle={subtitle} url={url} />}
        {name === "Ending" && <EndingScene title={title} subtitle={subtitle} />}
        {name === "Generic" && <GenericScene title={title} subtitle={subtitle} />}
        {!["Cover", "PainPoint", "Solution", "Features", "Start", "Ending", "Generic"].includes(name) && (
          <GenericScene title={title} subtitle={subtitle} />
        )}
      </SceneWrapper>
    </AbsoluteFill>
  );
};
```

---

## 关键设计要点

1. **CoverScene 用 CSS 多层渐变**：无任何外部图片依赖，`background: linear-gradient(...)` 绘制网格，`background-size` 匹配断点，亮度可达 60+
2. **PainPointScene/FeaturesScene 居中**：`justifyContent: "center" alignItems: "center"`，外层 maxWidth: 900，内层 alignItems: "center"
3. **背景渐变色**：从 #4A1B8C → #3D1B6E → #1A0A3D，比纯 #0D0221 亮得多
4. **无 literal `\n`**：所有 JSX 中的换行都是真实的 JSX 缩进结构，无字节 `5c6e`
5. **SVG stroke 禁止用于网格线**：SVG `<line stroke="...">` 在 Remotion headless 中不渲染，必须用 CSS `background: linear-gradient(...)`
6. **`features` 类型必须正确**：`Array<{ icon?: string; name?: string; desc?: string }>` — 大括号是对象类型语法，不是 `Array<icon?: string`

## 验证命令

```bash
# 验证文件行数
wc -l video-project/src/scenes/DynamicScene.tsx   # 应 > 200

# 验证无 literal \n（字节 5c6e）
head -5 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e  # 应无输出

# 验证 CSS 渐变存在
grep -c "background.*linear-gradient" video-project/src/scenes/DynamicScene.tsx   # 应 >= 1

# 验证 features 类型语法正确（应为 { icon?: string; ... }）
grep "Array<icon" video-project/src/scenes/DynamicScene.tsx  # 应无输出

# 验证首帧亮度（渲染后）
ffmpeg -i out/final.mp4 -vf "select=eq(n\,0)" -vframes 1 -update 1 /tmp/frame0.png
python3 -c "from PIL import Image; img=Image.open('/tmp/frame0.png'); arr=list(img.getdata()); print(f'亮度: {(sum(p[0]+p[1]+p[2] for p in arr)/len(arr)/3):.1f}')"
# 亮度应 > 50
```