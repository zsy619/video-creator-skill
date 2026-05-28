# 视频创作统一规则（铁律）

> **优先级：最高**
> **适用范围**：所有 video-creator 技能生成的视频项目
> **默认风格**：赛博朋克（Cyberpunk）
> **最后更新**：2026-05-28（Remotion Native + captions.json + final.mp4）

---

## ⚠️ 问题根源分析

### 常见问题与教训

| # | 问题 | 原因 | 教训 |
|---|------|------|------|
| 1 | 字幕太小 | 10px/18px 不适合竖屏 | **竖屏字幕必须 ≥72px** |
| 2 | 封面字体小 | PIL 字体渲染字号有限制 | **封面使用 PIL generate_cover.py，字号上限已定义** |
| 3 | 黑屏 | 场景总帧数 < 视频总帧数 | **所有场景帧数之和必须 = 视频总帧数** |
| 4 | 元素不居中 | CSS 硬编码 top 值 | **使用 Flexbox 居中，禁止硬编码偏移** |
| 5 | 中间文件残留 | 未清理 | **只保留 final.mp4** |
| 6 | 重复渲染 | 每次小修改都重新渲染 | **批量修改到位再渲染** |

---

## 📋 铁律清单

### 1. 字幕规格（强制）

```
Fontsize: 72px     ← 竖屏(1080x1920)必须≥72px（约40px视觉，已验证）
Font: PingFang SC
Color: &H00FFFF (黄色)
Alignment: 2 (底部居中)
MarginL: 30px      ← 左边距30px
MarginR: 30px      ← 右边距30px
MarginV: 50px      ← 距底边50px（增加避免贴边）
Outline: 2px       ← 2px黑色描边（1px太细）
Shadow: 0          ← 无阴影（霓虹风格用发光效果更好）
WrapStyle: 0        ← 多行支持（必须设置）
换行符: \N          ← ASS格式必须用\N，不是\\n

每行字数: ≤25字符   ← 72px字体下25字符约900px，1080px内安全
PlayResX: 1080
PlayResY: 1920
```
⚠️ **铁律警告**：
- 换行符必须用 `\N`（ASS格式），不是 `\n`
- 每行最多25字符，避免超出1080px画面
- **MarginV=50px**（距底边），MarginL/MarginR=30px（不是全部30px）
- WrapStyle=0 必须设置，否则多行不生效

### 2. 视频帧数计算（强制）

```
总时长 = 音频时长（秒）
总帧数 = round(音频时长 × 60)
所有场景帧数之和必须 = 总帧数（允许 ±1 帧误差）
```

**示例**：
- 音频时长 58.944秒 → 总帧数 = round(58.944 × 60) = 3537帧
- 场景分布：cover(180) + apps(720) + frameworks(900) + CTA(900) + continue(837) = 3537 ✅

### 2.5 atempo 反模式门禁（强制，2026-05-10 新增）

**问题根因**：先生成超长配音 → atempo 加速 → 裁剪 → 基于错误时长生成字幕 → 音画不同步

**正确做法**：基于配音文本 + 目标时长，直接生成正确长度的音频，不依赖 atempo 加速。

**强制门禁**：音频时长偏差 > 5% → 退出码=1，禁止继续

```bash
# audio/neural_1_2x.m4a 时长偏差检查（嵌入 video-quality-gate.js 节点 A）
TARGET_DURATION=60   # 从 video-config.json 或 duration.txt 读取
ACTUAL=$(ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=nokey=1 audio/neural_1_2x.m4a)
DIFF=$(python3 -c "print(abs($ACTUAL - $TARGET_DURATION) / $TARGET_DURATION * 100)")
if [ "$(python3 -c "exit(0 if $DIFF <= 5 else 1)")" -eq 0 ]; then
  echo "✅ 音频时长偏差 ${DIFF}%（≤5%）"
else
  echo "❌ 音频时长偏差 ${DIFF}%（>5%），可能存在 atempo+裁剪反模式"
  exit 1
fi
```

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
const TOTAL_FRAMES = Math.round(AUDIO_DURATION * FPS);

// 场景定义（帧数必须加起来 = TOTAL_FRAMES）
const SCENES = [
  { name: "cover", from: 0, duration: Math.ceil(3 * FPS) },        // 0-180
  { name: "apps", from: 180, duration: Math.ceil(12 * FPS) },     // 180-900
  { name: "frameworks", from: 900, duration: Math.ceil(15 * FPS) }, // 900-1800
  { name: "cta", from: 1800, duration: Math.ceil(15 * FPS) },      // 1800-2700
  { name: "continue", from: 2700, duration: TOTAL_FRAMES - 2700 },  // 2700-3537 (round模式)
];
```

### 5. 封面图规格

#### 5.1 三种画布类型

| 类型 | 尺寸 | 用途 |
|------|------|------|
| 竖屏封面 | 1080×1920 | 视频封面、抖音/视频号 |
| 微信公众号封面 | 900×383 | 公众号文章封面（必须单独生成！） |
| 小红书封面 | 1440×2560 | 小红书 |

#### 5.2 封面生成方案（PIL 唯一路径）

> **⚠️ 2026-05-14 更新**：封面图统一使用 `generate_cover.py` PIL 脚本生成，三平台独立渲染，不再使用 Remotion still。
> **关键**：三平台封面各自独立生成（vertical / wechat / xhs），不再从 vertical 级联裁剪。

```bash
SKILL_DIR="{SKILL_DIR}"
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"

# 三平台封面各自独立生成
python3 "$SKILL_DIR/scripts/generate_cover.py" "主标题" "副标题" "$PROJECT_DIR/docs/assets" vertical
python3 "$SKILL_DIR/scripts/generate_cover.py" "主标题" "副标题" "$PROJECT_DIR/docs/assets" wechat
python3 "$SKILL_DIR/scripts/generate_cover.py" "主标题" "副标题" "$PROJECT_DIR/docs/assets" xhs
```

**字号安全上限**（generate_cover.py 内部强制约束）：
| 类型 | vertical | wechat | xhs |
|------|----------|--------|-----|
| 主标题 | 130px | 100px | 180px |
| 副标题 | 60px | 48px | 80px |

#### 5.3 字号规范（Remotion 渲染）

> Remotion 渲染时字号由 CSS/JSX 控制，参考值：竖屏主标题 72-96px，副标题 28-36px。

#### 5.4 视频分辨率规范

| 平台 | 分辨率 | 帧率 | 码率 |
|------|--------|------|------|
| 视频号/抖音/小红书 | 1080×1920 | 60fps | H.264 |

#### 5.5 自校验机制（Remotion 封面）

| 检查项 | 标准 |
|--------|------|
| 封面尺寸 | 1080×1920 / 900×383 / 1440×2560 |
| 文件大小 | > 20KB |

#### 5.6 视频渲染流程（Remotion Native 字幕烧录）

```bash
# Remotion 渲染（含 CaptionOverlay 字幕，TikTok 逐字高亮风格）
npx remotion render VerticalVideo out/final.mp4 \
  --concurrency=4 --fps=60 --log=error

# 音频在 Remotion 内嵌（<Audio> 组件），无需 ffmpeg 混流
# captions.json 由 launch.sh Step 3 直接生成（比例分配算法），无需 ASS 转换
```

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

渲染完成后**立即删除所有中间文件**（Remotion Native 无中间视频文件）：

```
（Remotion Native 方案无中间文件，渲染直接输出 final.mp4）
```

只保留：
```
final.mp4  ← 最终视频（Remotion Native，含音频轨道和字幕）
```

### 8. 渲染流程（Remotion Native）

```bash
# Remotion 直出（含 Audio 组件内嵌音频 + CaptionOverlay 字幕）
npx remotion render VerticalVideo out/final.mp4 \
  --concurrency=4 --fps=60 --log=error
# 无需 ffmpeg 混流，无需 ASS 字幕烧录
```

**注意**：Remotion 组件中已集成字幕（`<CaptionOverlay captions={captions}>`），字幕通过 Remotion 渲染而非 ffmpeg 烧录。

---

## 🔢 参数速查表

| 参数 | 值 | 说明 |
|------|------|------|
| 分辨率 | 1080×1920 | 竖屏9:16 |
| 帧率 | 60fps | 固定 |
| 字幕大小 | 72px | ≥36px，推荐72px |
| 字幕颜色 | #00FFFF | 黄色 |
| 字幕距底边 | 50px | MarginV=50px（距底边），MarginL/MarginR=30px |
| 音频码率 | 128kbps | AAC |
| 视频码率 | CRF 22 | H.264 |

---

## 🚫 禁止事项

1. **禁止**字幕 < 72px
2. **禁止**场景帧数之和 < 总帧数（会导致黑屏）
3. **禁止**使用 `top: xxx px` 硬编码布局
4. **必须**使用 Remotion `<Audio>` 组件（音频内嵌，headless 环境正常工作）
5. **必须**在 Remotion 中集成字幕（`CaptionOverlay` + `captions.json` 同期烧录）
6. **禁止**使用旧版 ffmpeg 混流（Remotion Native 方案无需混流）
7. **禁止**使用 `-c:a copy` 复制 Remotion 内嵌的静音空音频轨道
8. **禁止**封面使用级联裁剪（必须三平台独立生成）

---

## ✅ 质量检查清单

渲染完成后**必须验证**：
- [ ] 视频总时长 = 音频时长（允许 ±0.5秒误差）
- [ ] 字幕清晰可读（≥72px）
- [ ] 无黑屏（最后帧 = 延续场景）
- [ ] 只有 final.mp4 一个视频文件
- [ ] 封面图存在且尺寸正确（1080×1920 / 900×383 / 1440×2560）
- [ ] 封面由 PIL generate_cover.py 生成，三平台各自独立

---

## 📝 经验总结

### 为什么封面使用 PIL 独立生成？

PIL generate_cover.py 生成封面：
- 不依赖 Remotion 项目，可在视频渲染前独立运行
- 三平台封面各自独立生成，不再级联裁剪
- smart_resize_text() 自动处理长标题，字号安全上限已定义
- 无需等待视频渲染完成，可提前生成预览封面

### 为什么字幕要在 ffmpeg 烧录？

Remotion 字幕集成问题：
- 字幕样式控制不精确
- 渲染速度慢
- 与音频同步复杂

ffmpeg 烧录优势：
- 字幕样式精确控制（72px、PingFang SC）
- 渲染速度快
- 字幕与音频完美同步
