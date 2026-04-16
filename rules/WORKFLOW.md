# 视频创作工作流程 (Video Creator Workflow)

> **所属模块**: video-creator / SKILL.md → 核心工作流
> **版本**: v3.0.0
> **相关模块**: [INPUT.md](INPUT.md) · [COPY.md](COPY.md) · [THEMES.md](THEMES.md) · [VOICE.md](VOICE.md) · [QUALITY.md](QUALITY.md)

本文档定义了使用 Remotion 和 baoyu 技能体系创建专业级社交媒体视频的完整工作流程。

---

## 📋 工作流程概览

```
Step 1        Step 2        Step 3        Step 4        Step 5
内容获取   →   分析内容   →   构建项目   →   生成文案   →   构建HTML

Step 6        Step 7        Step 8        Step 9        Step 10
生成视觉   →   生成音频   →   生成字幕   →   质量检查   →   生成视频
                                                                      ↓
                                                              Step 11
                                                              生成报告
```

---

## Step 1: 内容获取

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

3. **记录 Session 日志**
   ```bash
   # 记录本次内容获取的 token 消耗
   session_status
   ```
   > 详见 [SESSION_LOG.md](SESSION_LOG.md) - 追踪输入/输出 token、数量、请求模型、处理时长

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

---

## Step 2: 分析内容

**质量检查**: 详见 [QUALITY.md](QUALITY.md)

### 内容质量验证

- **长度检查**：建议 500-2000 字
- **结构完整性**：验证标题、段落、结论
- **可读性评分**：评估内容是否适合视频化

### 内容结构化

```javascript
{
  "title": "文章标题",
  "summary": "100-200字摘要",
  "keywords": ["关键词1", "关键词2", ...],
  "sections": [
    { "heading": "小标题1", "content": "段落内容", "emphasis": true },
    { "heading": "小标题2", "content": "段落内容", "emphasis": false }
  ],
  "suggestedDuration": 45, // 秒
  "platform": "xhs|wechat|all"
}
```

### 时长规划

根据内容长度自动计算建议时长：
- 500字以下：10-20秒
- 500-1000字：20-40秒
- 1000-2000字：40-60秒
- 2000字以上：60-90秒

---

## Step 3: 构建项目

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
mkdir -p workspace/${PROJECT_NAME}/fonts
```

### 📁 目录结构说明

| 目录 | 用途 | 关键文件 |
|------|------|---------|
| `docs/` | 文档和素材 | `article.md`, `video-script.md`, `wechat.md` |
| `docs/assets/` | 视觉素材 | `cover.webp`, `illustration-*.webp` |
| `video-project/` | Remotion 项目 | `src/`, `out/`, `package.json` |
| `audio/` | 音频文件 | `raw/`, `processed/`, `final.mp3` |
| `fonts/` | 字体文件 | 自定义字体 |

### 🎯 命名规范

- **项目名称**: 拼音或英文，使用连字符分隔（如 `ai-trends-2024`）
- **素材文件**: 小写字母和连字符（如 `cover-image.webp`）
- **组件文件**: PascalCase（如 `VerticalVideo.tsx`）

---

## Step 4: 生成文案

**调用 baoyu 技能生成文案**（详见 [COPY.md](COPY.md)）

### 4.1 原始内容处理

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

3. **记录 Session 日志**
   ```bash
   # 记录本次文案生成的 token 消耗
   session_status
   ```
   > 详见 [SESSION_LOG.md](SESSION_LOG.md)

### 4.2 视频脚本生成

**生成文件**: `docs/video-script.md`

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
---

# 视频脚本

## 场景 1: 开场（0-3秒）
- **画面**: 封面图动画进入
- **文字**: 主标题
- **音频**: 开场音效
```

### 4.3 公众号文案生成

**生成文件**: `docs/wechat.md`

```markdown
---
title: "公众号标题（吸引眼球、带emoji）"
summary: "公众号摘要（100-200字、带emoji）"
tags:
  - 标签1
  - 标签2
  - 标签3
---

# 公众号正文
```

### 4.4 发布指南生成

**生成文件**: `docs/posting-guide.md`

```markdown
---
title: "发布指南"
platforms: [xhs, wechat, douyin, youtube]
---

## 📱 小红书
| 项目 | 内容 |
|------|------|
| 标题 | （吸引眼球、不超过20个字符）|
| 摘要 | （100-200字）|
| 标签 | #标签1 #标签2 #标签3 |

## ⏰ 最佳发布时间
| 平台 | 最佳时段 |
|------|----------|
| 小红书 | 19:00-22:00 |
| 视频号 | 12:00-13:00, 20:00-22:00 |
```

---

## Step 5: 构建HTML

**参考**: [HTML.md](HTML.md) - HTML页面规范

### 落地页

```bash
# 输出：docs/landing-page.html
```

### 文章阅读页

```bash
# 输出：docs/article-page.html
```

### 公众号适配页

```bash
# 输出：docs/wechat-page.html
```

### 模板选择

| 平台 | 模板 | 说明 |
|------|------|------|
| 小红书 | `article-page.html` | 文章阅读页 |
| 视频号 | `wechat-page.html` | 公众号适配页 |
| 落地推广 | `landing-page.html` | 宣传落地页 |

---

## Step 6: 生成视觉

**调用 baoyu 技能生成图片**（详见 [THEMES.md](THEMES.md)）

### 6.1 封面图生成

```bash
# 使用 baoyu-cover-image 生成封面
# 参数：
# - 类型：article/hero/summary
# - 调色板：根据主题选择
# - 渲染风格：modern/tech/elegant

# 输出：docs/assets/cover.webp (9:16 竖屏比例)
```

### 6.1.2 记录 Session 日志

```bash
# 记录本次视觉生成的 token 消耗
session_status
```
> 详见 [SESSION_LOG.md](SESSION_LOG.md)

### 6.1.1 封面图生成容错方案

> ⚠️ 当 baoyu 图像生成 API（Seedream / MiniMax / DashScope / OpenAI / OpenRouter）均不可用时，必须使用以下容错方案之一，禁止跳过或留空。详见 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)。

#### 方案一：Remotion 代码生成（推荐）

**适用场景**：需要动画效果、已有 Remotion 项目、需要与视频风格一致。

**核心步骤**：
1. 创建独立 `cover-project/` 项目（参考 TROUBLESHOOTING.md）
2. 使用 `frame = 60`（固定帧）避免 `useCurrentFrame` 报错
3. 必须通过 `Composition` 注册组件
4. 渲染后用 ffmpeg 提取单帧 PNG

```bash
# 渲染封面视频
npx remotion render CoverImage --output out/cover.mp4 --fps=60 --height=1920 --width=1080
# 提取第45帧为PNG
ffmpeg -y -i out/cover.mp4 -vf "select=eq(n\,45)" -vsync 0 -frames:v 1 docs/assets/cover.png
```

#### 方案二：PIL/Pillow 纯代码生成

**适用场景**：API 全部不可用、快速生成、无需 AI 绘图能力。

**核心步骤**：
1. 参考模板创建 `docs/assets/generate_cover.py`
2. 使用系统字体（macOS: `/System/Library/Fonts/STHeiti Medium.ttc`）
3. 垂直居中布局：先计算总高度，再计算起始 Y 坐标
4. 输出分辨率：1080×1920（竖屏 9:16）

**参考实现**：
```bash
# 运行封面生成脚本
python3 docs/assets/generate_cover.py
# 输出：docs/assets/cover.png
```

**关键字体路径（macOS）**：
| 字体         | 路径                                       |
| ------------ | ------------------------------------------ |
| 黑体（中等） | `/System/Library/Fonts/STHeiti Medium.ttc` |
| 苹方         | `/System/Library/Fonts/PingFang.ttc`       |
| 黑体（细）   | `/System/Library/Fonts/STHeiti Light.ttc`  |


### 6.2 内容插图生成

```bash
# 使用 baoyu-article-illustrator 生成插图
# 智能识别插图位置：
# - 每个主要段落配 1 张插图
# - 数据和统计配信息图

# 输出：docs/assets/illustration-1.webp, illustration-2.webp, ...
```

### 6.3 信息图生成（如适用）

```bash
# 使用 baoyu-infographic 生成数据可视化
# 适用于：统计数据、对比信息、流程图等

# 输出：docs/assets/infographic.webp
```

---

## Step 7: 生成音频

> **⚠️ 详细说明**: 请参考 [VOICE.md](VOICE.md) - Azure Neural TTS 自然语音合成最佳实践

### 7.1 音频生成流程

```bash
# 1. 使用 Azure Neural TTS 生成音频（整段连续生成，禁止分段拼接）
# 参考 VOICE.md 中的 API 调用方式

# 2. 音频后处理
# ⚠️ atempo 值决定最终时长 → 必须记录 DURATION 供字幕生成使用
# 推荐 atempo=1.2（1.3 以上语音失真）
ffmpeg -i raw/audio.mp3 -af "silenceremove=start_periods=1:start_duration=0.5:start_threshold=-50dB:detection=peak,atempo=1.2" processed/audio.mp3

# 3. 获取音频时长（供 Step 8 字幕生成使用，禁止跳过）
DURATION=$(ffprobe -i processed/audio.mp3 -show_entries format=duration -v quiet -of csv="p=0")
echo "最终音频时长: ${DURATION}s"
```

### 7.2 推荐语音

| 语音 | 说明 | 场景 |
|------|------|------|
| `zh-CN-YunjianNeural` | 温和男声 | **通用推荐** |
| `zh-CN-YunxiNeural` | 年轻男声 | 科技/工具类 |
| `zh-CN-XiaoxiaoNeural` | 温柔女声 | 通用推荐 |

### 7.3 记录 Session 日志

```bash
# 记录本次音频生成的 token 消耗
session_status
```
> 详见 [SESSION_LOG.md](SESSION_LOG.md) |

---

## Step 8: 生成字幕

**参考**: [SUBTITLES.md](SUBTITLES.md) - 字幕生成与质量检查文档

> ⚠️ **必须先完成 Step 7.2（音频后处理）确认最终时长，再生成字幕**
> 字幕时间轴必须基于 `atempo` 处理后的最终音频时长，禁止用原速时长。

### 8.1 字幕生成

```javascript
// 先执行 Step 7.2 音频后处理，确认最终时长
const DURATION = 58.16; // 最终音频时长（atempo 1.2x 处理后）

const generator = new SubtitleGenerator();
const subtitles = await generator.generateFromText(text, DURATION); // ← 必须用最终时长
await generator.generateASS(subtitles, 'audio/subtitles.ass');
```

### 8.2 字幕格式

| 格式 | 用途 | 扩展名 |
|------|------|--------|
| ASS | 高级字幕 | `.ass` |
| SRT | 通用字幕 | `.srt` |

### 8.3 字幕规范

- **字体**: 使用系统字体栈（PingFang SC / Microsoft YaHei）
- **字号**: 40-48px
- **颜色**: 白色（#FFFFFF）带黑色描边
- **位置**: 底部居中，距底部 10-15%

### 8.4 记录 Session 日志

```bash
# 记录本次字幕生成的 token 消耗
session_status
```
> 详见 [SESSION_LOG.md](SESSION_LOG.md)

---

## Step 9: 质量检查

**参考**: [QUALITY.md](QUALITY.md) - 质量检查规范

### 检查项目

| 检查项 | 标准 | 不合格处理 |
|--------|------|-----------|
| 内容长度 | 500-2000字 | 自动调整 |
| 标题吸引力 | 通过测试 | 重新生成 |
| 封面图 | 清晰度 > 80% | 重新生成 |
| 插图匹配度 | 与内容相关 | 替换或删除 |
| 音频同步 | 误差 < 0.1秒 | 重新计算帧边界 |
| 字幕同步 | 误差 < 0.2秒 | 调整时间轴 |

### 自动修复

```javascript
const checker = new QualityChecker({
  projectDir: './my-video',
  fixIssues: true // 自动修复
});
const report = await checker.runFullCheck();
```

---

## Step 10: 生成视频

### 10.1 Remotion 项目初始化

```bash
# 进入视频项目目录
cd workspace/${PROJECT_NAME}/video-project

# 初始化 Remotion 项目
npx create-video@latest . --template vertical

# 安装依赖
npm install
```

### 10.2 主题配置

**参考**: [THEMES.md](THEMES.md) - 主题色板和字体规范

```typescript
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

### 10.3 竖屏视频组件

**参考**: [REMOTION.md](REMOTION.md) - 居中场景模板和竖屏配置

```typescript
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
      {scenes.map((scene, index) => (
        <Scene key={index} {...scene} />
      ))}
    </AbsoluteFill>
  )
}
```

### 10.4 视频渲染

```bash
# 渲染无音频视频
npx remotion render VerticalVideo \
  --output out/video_noaudio.mp4 \
  --fps 60 \
  --height 1920 \
  --width 1080
```

### 10.5 音频混流

```bash
# 使用 ffmpeg 混流（stream copy 保持音频质量）
ffmpeg -y \
  -i out/video_noaudio.mp4 \
  -i processed/audio.mp3 \
  -c:v copy -c:a copy \
  -map 0:v -map 1:a \
  -shortest \
  out/final-video.mp4
```

### 10.6 记录 Session 日志

```bash
# 记录本次视频渲染的 token 消耗
session_status
```
> 详见 [SESSION_LOG.md](SESSION_LOG.md)

---

## Step 11: 生成报告

### 报告内容

```json
{
  "title": "Video Creator 执行报告",
  "generatedAt": "2026-04-16T12:00:00Z",
  "project": {
    "name": "project-name",
    "path": "workspace/project-name"
  },
  "content": {
    "title": "内容标题",
    "words": 1200,
    "duration": 45
  },
  "quality": {
    "score": 95,
    "issues_fixed": 2
  },
  "files": {
    "video": "video-project/out/final-video.mp4",
    "audio": "audio/processed/final.mp3",
    "subtitles": "audio/subtitles.ass"
  }
}
```

### 输出文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 执行报告 | `report.json` | JSON格式完整报告 |
| Markdown报告 | `report.md` | 可读性报告 |
| 质量检查报告 | `quality-report.json` | 详细质量数据 |

### 清理无用文件

```bash
# 清理 Remotion 临时文件
rm -rf video-project/node_modules/.cache
rm -rf video-project/out/temp

# 清理中间视频文件（保留最终视频）
find video-project/out -name "*.mp4" ! -name "final-video.mp4" -delete

# 清理重复/低质量素材
rm -f docs/assets/illustration-*_low.webp

# 清理临时音频文件
rm -f audio/raw/temp_*.mp3
```

### 生成文件清单

| 文件类型 | 处理方式 |
|---------|---------|
| `out/temp/` | 删除整个临时目录 |
| `out/*.mp4` (非final) | 删除中间渲染文件 |
| `node_modules/.cache` | 删除缓存目录 |
| `raw/*.mp3` (temp_*) | 删除临时音频 |

### 记录 Session 日志

```bash
# 记录本次报告生成的 token 消耗，并追加到项目日志
session_status
```
> 详见 [SESSION_LOG.md](SESSION_LOG.md)

---

## 📊 输出文件清单

| 文件 | 路径 | 说明 |
|------|------|------|
| 项目首页 | `docs/README.md` | 项目概览、规格、时间轴、文件清单 |
| 原始内容 | `docs/article.md` | 原始抓取或整理的内容 |
| 视频脚本 | `docs/video-script.md` | 分镜脚本和场景描述 |
| 营销文案集 | `docs/copy.md` | 小红书/视频号/抖音三版本文案 |
| 公众号文案 | `docs/wechat-copy.md` | 公众号正文（hook→功能→号召→结尾） |
| 发布指南 | `docs/posting-guide.md` | 各平台发布参数 + 检查清单 |
| 落地页 | `docs/landing-page.html` | Tailwind 深色科技风宣传页 |
| 文章阅读页 | `docs/article-page.html` | 深色竖屏阅读页 |
| 公众号适配页 | `docs/wechat-page.html` | 公众号白底适配页 |
| 会话日志 | `docs/session-log.md` | token 消耗、模型、处理时长追踪 |
| 执行报告 | `docs/report.json` | JSON 格式完整报告 |
| 封面图 | `docs/assets/cover.png` | 竖屏封面（9:16） |
| 封面生成脚本 | `docs/assets/generate_cover.py` | PIL 封面生成模板 |
| 内容插图 | `docs/assets/illustration-*.webp` | 场景配图 |
| 音频文件 | `audio/neural_1_2x.m4a` | 处理后音频（atempo 后） |
| 字幕文件 | `audio/subtitles_58s.ass` | ASS 格式字幕（基于最终音频时长） |
| 最终视频 | `video-project/out/final-video.mp4` | 音频混流后的成品 |

> ⚠️ **文档必须全部生成**，禁止跳过任何一个文件。参考 [PATHS.md](PATHS.md) 查看完整目录结构。

> ⚠️ **音频和字幕文件名**必须反映实际内容，如 `neural_1_2x.m4a`（1.2x 语速）、`subtitles_58s.ass`（58s 时长），禁止使用 `final.mp3` / `subtitles.ass` 等泛泛名称。

---

**相关模块**:
- [INPUT.md](INPUT.md) - 输入模式详细说明
- [COPY.md](COPY.md) - 文案生成规范
- [THEMES.md](THEMES.md) - 主题系统
- [VOICE.md](VOICE.md) - 音频合成
- [QUALITY.md](QUALITY.md) - 质量检查
- [REMOTION.md](REMOTION.md) - Remotion 组件规范
- [SESSION_LOG.md](SESSION_LOG.md) - Session 日志追踪
