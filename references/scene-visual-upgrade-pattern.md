# Scene Visual Upgrade Pattern (2026-05-15)

> seomachine-video 6场景系统性重绘实战：从"有内容"到"内容丰富美观"。

## 何时使用

- 用户说"优化画面"/"丰富场景"/"更美观"/"视觉效果差"
- 当前场景使用纯色背景 + 静态文字，视觉单薄
- Remotion 视频产出偏"功能性 Demo 感"而非"成品感"

## 通用增强模式（每个场景必选）

每场景按需叠加以下视觉层，从背景到前景排序：

```
背景层（最底层）
  ├── 渐变光斑（radial-gradient，绝对定位）
  ├── 网格线（background-image: linear-gradient，60px刻度）
  └── 粒子光点（30-50个，随机位置，opacity动画）

内容层（中间层）
  ├── 入场动画（opacity 0→1 + translateY）
  ├── 霓虹边框（box-shadow多层：10px/20px/40px递进）
  ├── 顶部高光条（gradient，左→右）
  └── 脉冲光效（box-shadow intensity 随帧周期变化）

装饰层（最顶层）
  ├── 四角HUD装饰（可选）
  └── 扫描线（可选）
```

## 6场景增强清单

### Scene1_Cover（封面）

- 动态粒子背景（30-50个漂浮光点）
- 径向渐变遮罩（中心亮→边缘暗）
- 标题缩放入场（scale 0.6→1 + opacity）
- 扫描线从上到下循环

### Scene2_Intro（痛点/问题）

- 痛点卡片加霓虹光晕（box-shadow多层递进）
- 左边缘渐变光条（4px，左→右）
- 左上/右下霓虹圆装饰（radial-gradient）
- 卡片入场：opacity + translateY + 延迟错开

### Scene3_Feature1（命令卡片）

- 背景网格线（60px刻度，rgba弱化）
- 右侧大尺寸光斑（radial-gradient，400px）
- 命令行霓虹色文字（#00FFFF / #FF00FF / #FFFF00）
- 卡片box-shadow：3层递进发光（20px/40px）
- 顶部高光条（gradient，命令色）

### Scene4_Feature2（代理网格）

- 顶部脉冲光条（3px height，随帧opacity变化）
- 代理卡片box-shadow：根据代理颜色设置glow
- 背景光斑动画（radial-gradient，随帧移动）
- 3列网格布局（gap: 18px）

### Scene5_Feature3（数据源）

- 数据源圆形图标（150px，radial-gradient + border + ringPulse）
- 左侧连接线装饰（gradient，左→右消失）
- SEO评分框（霓虹边框 + inset shadow）
- 圆形图标内圈虚线（border: dashed）

### Scene6_Ending（结尾）

- Glitch标题效果（红/青叠层 + clipPath裁切）
- 终端窗口（macOS红绿灯按钮 + SF Mono字体）
- 打字机特效（逐字显示 + 光标闪烁）
- 粒子爆发背景（30个，随机颜色）
- 背景霓虹渐变（双radial-gradient）

## 渲染命令

```bash
cd video-project
npx remotion render VerticalVideo out/final.mp4 --fps=60 --concurrency=4
```

## 验证

```bash
# 文件大小：增强后应比原来大（更多视觉元素）
ls -la out/final.mp4

# 时长不变（纯视觉增强，不改音频/字幕）
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 out/final.mp4
```
