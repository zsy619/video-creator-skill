# 视频创作统一规则（铁律）

> **优先级：最高**
> **适用范围**：所有 video-creator 技能生成的视频项目
> **默认风格**：赛博朋克（Cyberpunk）
> **最后更新**：2026-04-26

---

## ⚠️ 问题根源分析

### 常见问题与教训

| # | 问题 | 原因 | 教训 |
|---|------|------|------|
| 1 | 字幕太小 | 10px/18px 不适合竖屏 | **竖屏字幕必须 ≥72px** |
| 2 | 封面字体小 | PIL 字体渲染有大小限制 | **封面必须用 baoyu-imagine AI 生成，PIL 仅兜底** |
| 3 | 黑屏 | 场景总帧数 < 视频总帧数 | **所有场景帧数之和必须 = 视频总帧数** |
| 4 | 元素不居中 | CSS 硬编码 top 值 | **使用 Flexbox 居中，禁止硬编码偏移** |
| 5 | 中间文件残留 | 未清理 | **只保留 final-with-subs.mp4** |
| 6 | 重复渲染 | 每次小修改都重新渲染 | **批量修改到位再渲染** |

---

## 📋 铁律清单

### 1. 字幕规格（强制）

```
Fontsize: 72px     ← 竖屏(1080x1920)必须≥72px
Font: PingFang SC
Color: &H00FFFF (黄色)
Alignment: 2 (底部居中)
MarginV: 50px      ← 距底边50px
Outline: 1px
PlayResX: 1080
PlayResY: 1920
```

### 2. 视频帧数计算（强制）

```
总时长 = 音频时长（秒）
总帧数 = ceil(音频时长 × 60)
所有场景帧数之和必须 = 总帧数，禁止少一帧！
```

**示例**：
- 音频时长 58.944秒 → 总帧数 = ceil(58.944 × 60) = 3540帧
- 场景分布：cover(180) + apps(720) + frameworks(900) + CTA(900) + continue(840) = 3540 ✅

### 3. 居中布局规范（强制）

```tsx
// ✅ 正确：Flexbox 绝对居中
<div style={{
  position: "absolute",
  top: 0, left: 0, right: 0, bottom: 0,
  display: "flex",
  justifyContent: "center",  // 水平居中
  alignItems: "center",       // 垂直居中
}}>

// ❌ 错误：硬编码 top 值
<div style={{ position: "absolute", top: 80 }}>
```

### 4. 场景帧数计算模板

```typescript
const FPS = 60;
const AUDIO_DURATION = 58.944; // 秒
const TOTAL_FRAMES = Math.ceil(AUDIO_DURATION * FPS);

// 场景定义（帧数必须加起来 = TOTAL_FRAMES）
const SCENES = [
  { name: "cover", from: 0, duration: Math.ceil(3 * FPS) },        // 0-180
  { name: "apps", from: 180, duration: Math.ceil(12 * FPS) },     // 180-900
  { name: "frameworks", from: 900, duration: Math.ceil(15 * FPS) }, // 900-1800
  { name: "cta", from: 1800, duration: Math.ceil(15 * FPS) },      // 1800-2700
  { name: "continue", from: 2700, duration: TOTAL_FRAMES - 2700 },  // 2700-3540
];
```

### 5. 封面图规格

| 类型 | 尺寸 | 用途 |
|------|------|------|
| 竖屏封面 | 1080×1920 | 视频封面、抖音/视频号 |
| 微信封面 | 900×383 | 公众号文章封面 |

**封面生成方式（按优先级）**：
1. **baoyu-imagine（AI 生成）** ← 首选，字体大、效果好
2. **PIL（兜底）** ← 仅在 AI 不可用时使用

**封面字体规范**：
| 元素 | 字号 | 说明 |
|------|------|------|
| 主标题 | ≥300px | "DeepSeek" |
| 副标题 | ≥200px | "实用集成" |
| 描述文字 | ≥80px | 副标题下的说明 |

### 6. 赛博朋克风格规范（默认风格）

```typescript
const CYBER = {
  bg: "#0D0D1A",           // 深空黑背景
  neonCyan: "#00FFFF",      // 霓虹青色
  neonMagenta: "#FF00FF",   // 霓虹品红
  neonPurple: "#9D00FF",    // 霓虹紫色
  darkPurple: "#1A0033",    // 深紫色
  gridLine: "#1A1A3A",      // 网格线
  text: "#FFFFFF",           // 白色文字
  muted: "#8888AA",          // 灰色文字
};
```

**视觉元素**：
- 背景网格：`backgroundImage: linear-gradient(gridLine, transparent)`
- 霓虹发光：`textShadow: 0 0 20px neonCyan`
- 渐变光效：`linear-gradient(180deg, neonCyan 20%, transparent)`
- 边框光条：`boxShadow: 0 0 20px neonColor`

### 7. 文件清理规则

渲染完成后**立即删除所有中间文件**：

```
video_raw.mp4
video_audio.mp4
video_cyber.mp4
video_v2.mp4
video_static.mp4
video_noaudio.mp4
video_with_audio.mp4
```

只保留：
```
final-with-subs.mp4  ← 最终视频（字幕已烧录）
```

### 8. 渲染流程

```
Step 1: 渲染无音频视频 → video_raw.mp4
Step 2: 合并音频 → video_audio.mp4
Step 3: 烧录字幕(72px) → final-with-subs.mp4
Step 4: 删除所有中间文件
```

**注意**：Remotion 组件中**不要**集成字幕，字幕通过 ffmpeg 烧录。

---

## 🔢 参数速查表

| 参数 | 值 | 说明 |
|------|------|------|
| 分辨率 | 1080×1920 | 竖屏9:16 |
| 帧率 | 60fps | 固定 |
| 字幕大小 | 72px | ≥36px，推荐72px |
| 字幕颜色 | #00FFFF | 黄色 |
| 字幕距底边 | 50px | MarginV |
| 音频码率 | 128kbps | AAC |
| 视频码率 | CRF 22 | H.264 |

---

## 🚫 禁止事项

1. **禁止**字幕 < 72px
2. **禁止**场景帧数之和 < 总帧数（会导致黑屏）
3. **禁止**使用 `top: xxx px` 硬编码布局
4. **禁止**保留中间文件
5. **禁止**封面使用 PIL 作为首选（必须用 baoyu-imagine）
6. **禁止**在 Remotion 中集成字幕（用 ffmpeg 烧录）

---

## ✅ 质量检查清单

渲染完成后**必须验证**：
- [ ] 视频总时长 = 音频时长（允许 ±0.5秒误差）
- [ ] 字幕清晰可读（≥72px）
- [ ] 无黑屏（最后帧 = 延续场景）
- [ ] 只有 final-with-subs.mp4 一个视频文件
- [ ] 封面图存在且尺寸正确（1080×1920）
- [ ] 封面由 AI 生成（非 PIL 兜底）

---

## 📝 经验总结

### 为什么封面必须用 AI 生成？

PIL 字体渲染存在限制：
- 字体实际渲染大小可能小于指定字号
- 字体间距和行高计算不准确
- 生成的封面字体偏小，不够醒目

baoyu-imagine（Seedream）生成效果：
- 字体大小由 AI 自动优化
- 视觉效果更专业
- 霓虹发光效果更自然

### 为什么字幕要在 ffmpeg 烧录？

Remotion 字幕集成问题：
- 字幕样式控制不精确
- 渲染速度慢
- 与音频同步复杂

ffmpeg 烧录优势：
- 字幕样式精确控制（72px、PingFang SC）
- 渲染速度快
- 字幕与音频完美同步
