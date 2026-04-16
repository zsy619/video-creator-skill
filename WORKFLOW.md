---
name: video-creator-workflow
description: Video Creator 技能的核心工作流模块，定义从内容获取到视频发布的完整自动化流程。
parent: SKILL.md
version: 2.4.0
last_updated: 2026-04-04
---

# 视频创作工作流程 (Video Creator Workflow)

> **所属模块**: video-creator / SKILL.md → 核心工作流
> **版本**: v2.4.0
> **相关模块**: [INPUT.md](INPUT.md) · [COPY.md](COPY.md) · [THEMES.md](THEMES.md) · [VOICE.md](VOICE.md) · [QUALITY.md](QUALITY.md)

本文档定义了使用 Remotion 和 baoyu 技能体系创建专业级社交媒体视频的完整工作流程。

---

## 📋 工作流程概览

```
Step 1        Step 2        Step 3        Step 4        Step 5
内容获取   →   项目创建   →   内容处理   →   脚本生成   →   公众号文案
              (自动)                   (baoyu)       (video-script)
     ↓
Step 8        Step 7        Step 6        (wechat.md)
发布指南   ←   音频合成   ←   Remotion构建 ←
(posting-guide)  (混流)       (竖屏视频)
```

---

## Step 1: 内容获取与分析

**输入模式**: 根据用户提供的内容形式选择对应处理方式

### 🔗 链接模式

当用户提供网址时执行：

1. **使用 baoyu-url-to-markdown 抓取内容**
   ```bash
   bun $SKILL_DIR/scripts/vendor/baoyu-fetch/src/cli.ts <url> --output docs/article.md
   ```

2. **解析 Markdown 提取关键信息**
   - 标题（title）
   - 正文内容（body）
   - 元数据（metadata）
   - 关键段落和论点

3. **内容质量验证**（详见 [QUALITY.md](QUALITY.md)）
   - 长度检查：建议 500-2000 字
   - 结构完整性
   - 可读性评分

### 🔍 主题模式

当用户提供主题关键词时执行：

1. **多关键词组合搜索**
   ```bash
   # 使用 web_search 搜索相关内容
   # 建议搜索组合：
   # - 主关键词 + 行业词
   # - 主关键词 + 应用场景
   # - 主关键词 + 数据/案例
   ```

2. **搜索结果整合**
   - 提取重复出现的主题和观点
   - 识别权威来源
   - 构建内容摘要框架

3. **内容深度扩展**
   - 补充相关数据和研究
   - 添加行业案例
   - 确保内容全面性

### 📝 内容模式

当用户直接提供内容时执行：

1. **直接解析提供的内容**
   - 识别标题结构
   - 提取关键段落
   - 标记重要引用和数据

2. **内容结构化处理**
   - 重组为适合视频的叙事结构
   - 划分可独立呈现的要点
   - 添加过渡和连接语句

3. **内容增强**（详见 [COPY.md](COPY.md)）
   - 优化标题吸引力
   - 添加情感元素
   - 补充视觉描述

---

## Step 2: 项目目录创建

**执行方式**: 自动创建，无需手动干预

```bash
# 定义项目名称（建议使用拼音或英文，避免空格和特殊字符）
PROJECT_NAME="项目名称"

# 创建完整的项目目录结构
mkdir -p workspace/${PROJECT_NAME}/docs/assets
mkdir -p workspace/${PROJECT_NAME}/video-project/src/components
mkdir -p workspace/${PROJECT_NAME}/video-project/src/themes
mkdir -p workspace/${PROJECT_NAME}/video-project/out
mkdir -p workspace/${PROJECT_NAME}/audio/raw
mkdir -p workspace/${PROJECT_NAME}/audio/processed
```

### 📁 目录结构说明

| 目录 | 用途 | 关键文件 |
|------|------|---------|
| `docs/` | 文档和素材 | `article.md`, `video-script.md`, `wechat.md` |
| `docs/assets/` | 视觉素材 | `cover.webp`, `illustration-*.webp` |
| `video-project/` | Remotion 项目 | `src/`, `out/`, `package.json` |
| `audio/` | 音频文件 | `raw/`, `processed/`, `final.mp3` |

### 🎯 命名规范

- **项目名称**: 拼音或英文，使用连字符分隔（如 `ai-trends-2024`）
- **素材文件**: 小写字母和连字符（如 `cover-image.webp`）
- **组件文件**: PascalCase（如 `VerticalVideo.tsx`）

---

## Step 3: 内容处理与增强

### 3.1 原始内容处理

**调用 baoyu 技能生成文案**（详见 [COPY.md](COPY.md)）

1. **生成内容文件**: `docs/article.md`

   ```markdown
   ---
   title: "文章标题（吸引眼球、带emoji）"
   summary: "摘要（100-200字）"
   tags:
     - 标签1
     - 标签2
     - 标签3
   platform: all
   ---

   # 文章正文内容
   ```

2. **内容规范检查**
   - 标题：不超过 23 个字符
   - 摘要：100-200 字
   - 标签：不少于 5 个相关标签
   - 正文：结构清晰，逻辑连贯

### 3.2 视觉素材生成

**调用 baoyu 技能生成图片**（详见 [THEMES.md](THEMES.md)）

#### 封面图生成

```bash
# 使用 baoyu-cover-image 生成封面
# 参数：
# - 类型：article/hero/summary
# - 调色板：根据主题选择
# - 渲染风格：modern/tech/elegant
# - 情绪：professional/energetic/calm

# 输出：docs/assets/cover.webp (9:16 竖屏比例)
```

#### 内容插图生成

```bash
# 使用 baoyu-article-illustrator 生成插图
# 智能识别插图位置：
# - 每个主要段落配 1 张插图
# - 数据和统计配信息图
# - 关键概念配解释图

# 输出：docs/assets/illustration-1.webp, illustration-2.webp, ...
```

#### 信息图生成（如适用）

```bash
# 使用 baoyu-infographic 生成数据可视化
# 适用于：统计数据、对比信息、流程图等

# 输出：docs/assets/infographic.webp
```

---

## Step 4: 视频脚本生成

**生成文件**: `docs/video-script.md`

### 脚本结构

```markdown
---
metadata:
  platform: [xhs|wechat|all]
  duration: <秒数>
  theme: <主题名称>
  fps: 60
  resolution: [1080x1920]
cover: docs/assets/cover.webp
illustrations:
  - path: docs/assets/illustration-1.webp
    scenes: [1, 2]
  - path: docs/assets/illustration-2.webp
    scenes: [3, 4]
---

# 视频脚本

## 场景 1: 开场（0-3秒）
- **画面**: 封面图动画进入
- **文字**: 主标题
- **音频**: 开场音效

## 场景 2: 引言（3-8秒）
- **画面**: 淡入介绍内容
- **文字**: 副标题/引言
- **音频**: 旁白或背景音乐

## 场景 N: 详细内容
- **画面**: 插图 + 关键文字
- **文字**: 要点列表
- **音频**: 旁白

## 场景结束: 结尾（最后3秒）
- **画面**: 封面图 + CTA
- **文字**: 关注/点赞提示
- **音频**: 结尾音效
```

### 脚本生成规范

1. **时长规划**: 根据内容长度自动计算（建议 10-60 秒）
2. **场景划分**: 每个场景 3-8 秒，包含明确的画面描述
3. **文字规范**: 大字体居中显示（详见 [FONTS.md](FONTS.md)）
4. **音频同步**: 提前规划音频时长，配置帧边界（详见 [VOICE.md](VOICE.md)）

---

## Step 5: 公众号文案生成

**生成文件**: `docs/wechat.md`

### 文案结构（详见 [COPY.md](COPY.md)）

```markdown
---
title: "公众号标题（吸引眼球、带emoji）"
summary: "公众号摘要（100-200字、带emoji）"
tags:
  - 标签1
  - 标签2
  - 标签3
  - 标签4
  - 标签5
---

# 公众号正文

（完整的公众号文章内容，支持 Markdown 格式）

## 小标题1

正文内容...

## 小标题2

正文内容...
```

### 平台适配规范

| 平台 | 标题限制 | 摘要限制 | 标签数量 |
|------|----------|----------|----------|
| 小红书 | ≤20 字符 | 100-200 字 | 5-10 个 |
| 视频号 | ≤20 字符 | 100-200 字 | 5-10 个 |
| 抖音 | ≤20 字符 | 100-200 字 | 5-10 个 |
| YouTube | ≤100 字符 | 300-500 字 | 3-5 个 |

---

## Step 6: Remotion 视频构建

### 6.1 项目初始化

**参考**: [remotion-best-practices](remotion-best-practices) 技能 + [REMOTION.md](REMOTION.md)

```bash
# 进入视频项目目录
cd workspace/${PROJECT_NAME}/video-project

# 初始化 Remotion 项目（如果尚未创建）
npx create-video@latest . --template vertical

# 安装依赖
npm install
```

### 6.2 主题配置

**参考**: [THEMES.md](THEMES.md) - 12种主题的色板和字体规范

```typescript
// src/themes/theme.ts
export const theme = {
  name: 'tech-modern',
  colors: {
    primary: '#3B82F6',
    secondary: '#1E40AF',
    background: '#0F172A',
    text: '#F8FAFC',
    accent: '#22D3EE'
  },
  fonts: {
    heading: 'Noto Sans SC',
    body: 'Noto Sans SC'
  }
}
```

### 6.3 竖屏视频组件

**参考**: [REMOTION.md](REMOTION.md) - 居中场景模板和竖屏配置

```typescript
// src/VerticalVideo.tsx
import { AbsoluteFill } from 'remotion'

export const VerticalVideo: React.FC<{
  scenes: Scene[]
}> = ({ scenes }) => {
  return (
    <AbsoluteFill
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: theme.colors.background
      }}
    >
      {/* 场景内容，居中布局 */}
      {scenes.map((scene, index) => (
        <Scene key={index} {...scene} />
      ))}
    </AbsoluteFill>
  )
}
```

### 6.4 场景帧边界配置

```typescript
// 配置场景帧边界（60fps）
const FRAME_RATE = 60
const sceneDurations = [
  { scene: 'intro', frames: FRAME_RATE * 3 },      // 3秒
  { scene: 'content-1', frames: FRAME_RATE * 8 }, // 8秒
  { scene: 'content-2', frames: FRAME_RATE * 8 }, // 8秒
  { scene: 'outro', frames: FRAME_RATE * 3 }       // 3秒
]
```

---

## Step 7: 音频合成与混流

> **⚠️ 详细说明**: 请参考 [VOICE.md](VOICE.md) - Azure Neural TTS 自然语音合成最佳实践

### 7.1 音频生成流程

```bash
# 1. 使用 Azure Neural TTS 生成音频
# 参考 VOICE.md 中的 API 调用方式

# 2. 音频后处理
ffmpeg -i raw/audio.mp3 -af "silenceremove=start_periods=1:start_duration=0.5:start_threshold=-50dB:detection=peak,atempo=1.0" processed/audio.mp3

# 3. 获取音频时长
DURATION=$(ffprobe -i processed/audio.mp3 -show_entries format=duration -v quiet -of csv="p=0")
```

### 7.2 视频渲染

```bash
# 渲染竖屏视频
npx remotion render VerticalVideo \
  --output out/video.mp4 \
  --fps 60 \
  --height 1920 \
  --width 1080
```

### 7.3 音频混流

```bash
# 使用 ffmpeg 混流（stream copy 保持音频质量）
ffmpeg -i out/video.mp4 -i processed/audio.mp3 \
  -c:v copy -c:a aac -b:a 192k \
  -shortest \
  out/final-video.mp4
```

---

## Step 8: 发布指南生成

**生成文件**: `docs/posting-guide.md`

### 发布指南结构

```markdown
---
title: "发布指南"
platforms: [xhs, wechat, douyin, youtube]
created: <日期>
---

# 发布指南

## 📱 小红书

| 项目 | 内容 |
|------|------|
| 标题 | （吸引眼球、带emoji，不超过20个字符）|
| 摘要 | （100-200字、带emoji）|
| 标签 | #标签1 #标签2 #标签3 #标签4 #标签5 |
| 发布时间 | 建议：19:00-22:00 |
| 封面文字 | （醒目简短）|

## 📺 视频号

| 项目 | 内容 |
|------|------|
| 标题 | （简洁有力，不超过20个字符）|
| 摘要 | （100-200字）|
| 标签 | 标签1；标签2；标签3 |
| 发布时间 | 建议：12:00-13:00 或 20:00-22:00 |

## 🎵 抖音

（类似结构）

## ▶️ YouTube

（类似结构，注意标题和摘要长度限制不同）

---

## ⏰ 最佳发布时间参考

| 平台 | 最佳时段 | 原因 |
|------|----------|------|
| 小红书 | 19:00-22:00 | 用户活跃度高 |
| 视频号 | 12:00-13:00, 20:00-22:00 | 午休和晚间时段 |
| 抖音 | 12:00-14:00, 18:00-22:00 | 流量高峰期 |
| YouTube | 14:00-16:00, 20:00-22:00 | 全球受众覆盖 |

---

## 📊 输出文件清单

| 文件 | 路径 | 说明 |
|------|------|------|
| 原始内容 | `docs/article.md` | 原始抓取或整理的内容 |
| 视频脚本 | `docs/video-script.md` | 分镜脚本和场景描述 |
| 公众号文案 | `docs/wechat.md` | 微信公众号适配文案 |
| 发布指南 | `docs/posting-guide.md` | 各平台发布参数 |
| 封面图 | `docs/assets/cover.webp` | 竖屏封面（9:16） |
| 内容插图 | `docs/assets/illustration-*.webp` | 场景配图 |
| 最终视频 | `video-project/out/final-video.mp4` | 音频混流后的成品 |

---

## 🔧 质量检查清单

完成工作流程后，请对照 [QUALITY.md](QUALITY.md) 进行检查：

- [ ] 内容长度合适（500-2000字）
- [ ] 标题吸引力测试通过
- [ ] 封面图清晰醒目
- [ ] 插图与内容匹配
- [ ] 视频播放流畅（60fps）
- [ ] 音频同步正确
- [ ] 各平台尺寸符合规范
- [ ] 文件命名规范

---

**相关模块**:
- [INPUT.md](INPUT.md) - 输入模式详细说明
- [COPY.md](COPY.md) - 文案生成规范
- [THEMES.md](THEMES.md) - 主题系统
- [VOICE.md](VOICE.md) - 音频合成
- [QUALITY.md](QUALITY.md) - 质量检查
- [REMOTION.md](REMOTION.md) - Remotion 组件规范
