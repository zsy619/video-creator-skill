---
name: video-creator
description: 自动化视频创作技能：从文章/URL/主题生成竖屏社交媒体视频（小红书/视频号/抖音）。整合宝玉技能生态进行内容获取、图片生成、HTML构建和Remotion视频渲染。集成字幕生成、质量检查、自动修复功能，支持批量处理多个视频项目。
homepage: https://github.com/zsy619/video-creator-skill
metadata: 
    tags: "video-creator", "创建视频", "生成视频", "视频创作", "竖屏视频", "make video", "create video", "检查视频质量", "修复字幕字体", "批量处理视频"
    "clawdbot":
        "emoji":"🎬"
        "requires":
            "bins":["node"]
            "env":[]
---

## 何时使用

### 标签匹配
当用户要求以下操作时立即使用本技能：
- "创建视频" / "生成视频" / "视频创作" / "竖屏视频" / "创作视频"
- "把这篇文章做成视频"
- "制作竖屏视频" / "小红书视频" / "抖音视频"
- "video-creator" / "make video" / "create video" / "video creator"
- "检查视频质量" / "修复字幕字体" / "批量处理视频"
- "大字体" / "大字体视频" / "字体要大"

## ⚠️ 铁律：封面图是强制必选项

> **封面图是视频的门面，是用户第一眼看到的内容。封面未生成，不得进入音频生成和视频渲染步骤。**
>
> 生成优先级：
> 1. **baoyu-imagine**（AI绘图）→ 生成 9:16 竖屏封面
> 2. **Remotion 单帧渲染** → 用视频第45帧或固定帧输出 PNG
> 3. **PIL/Pillow 代码生成** → 纯字体排版封面（所有 API 不可用时的最终兜底）
>
> 封面尺寸（必填）：
> - 视频号 / 抖音 / 公众号：**1080×1920**（9:16）
> - 小红书：**1440×2560**（9:16）
>
> **禁止跳过封面生成步骤。** 如果 baoyu-imagine 报错，必须按以下顺序重试：
> 1. 检查 `~/.baoyu-skills/baoyu-imagine/EXTEND.md` 确认 provider 配置
> 2. 尝试其他 provider（openrouter / replicate / dashscope / minimax）
> 3. 所有 API 不可用时 → 使用 PIL 代码生成（见 rules/TROUBLESHOOTING.md 方案二）

### 输入模式
- [rules/INPUT.md](rules/INPUT.md) - 内容输入模式

## 构建流程

1. **Step 0: 创建文档（强制）** → 必须先创建全部11个文档，禁止跳过
2. **Step 1: 获取内容**
3. **Step 2: 分析内容**
4. **Step 3: 构建项目**
5. **Step 4: 生成文案**
6. **Step 5: 构建HTML**
7. **Step 6: 生成视觉**（封面强制优先）
8. **Step 7: 生成音频**
9. **Step 8: 生成字幕**
10. **Step 9: 质量检查**
11. **Step 10: 生成视频**
12. **Step 11: 生成报告 + 强制清单检查**

---

## 📋 输出文件清单（强制全部生成）

> ⚠️ **铁律：以下 11 个文档文件必须在 Step 0 全部创建，禁止跳过任何一个。**
> 这是预防遗漏的第一道防线。视频渲染前必须确认所有文件存在。

### 文档文件（11个）

| # | 文件 | 路径 | 说明 |
|---|------|------|------|
| 1 | 项目首页 | `docs/README.md` | 项目概览、规格、文件清单 |
| 2 | 原始内容 | `docs/article.md` | 内容分析文档 |
| 3 | 视频脚本 | `docs/video-script.md` | 分镜脚本 |
| 4 | 营销文案集 | `docs/copy.md` | 短/中/长文案 |
| 5 | 公众号文案 | `docs/wechat-copy.md` | 公众号正文 |
| 6 | 发布指南 | `docs/posting-guide.md` | 多平台发布参数 |
| 7 | 落地页 | `docs/landing-page.html` | Tailwind深色科技风 |
| 8 | 文章页 | `docs/article-page.html` | 深色竖屏阅读页 |
| 9 | 微信适配页 | `docs/wechat-page.html` | 公众号白底适配页 |
| 10 | **会话日志** | `docs/session-log.md` | **Token消耗追踪（必须写入文件）** |
| 11 | 执行报告 | `docs/report.json` | JSON格式完整报告 |

### 资源文件

| # | 文件 | 路径 | 说明 |
|---|------|------|------|
| 12 | 封面图 | `docs/assets/cover.png` | **强制必填，9:16竖屏** |
| 13 | 配音 | `audio/neural_1_2x.m4a` | edge-tts生成，1.2x语速 |
| 14 | 字幕 | `audio/subtitles.ass` | ASS格式，12px黄色 |
| 15 | 最终视频 | `video-project/out/final-with-subs.mp4` | 字幕已烧录 |

### Step 0 验证命令

```bash
# 验证所有文档是否存在
PROJECT_DIR="~/VideoProjects/{project-name}"
for f in README.md article.md video-script.md copy.md wechat-copy.md posting-guide.md landing-page.html article-page.html wechat-page.html session-log.md report.json; do
  if [ ! -f "$PROJECT_DIR/docs/$f" ]; then
    echo "❌ 缺失: $f"
  fi
done
```

## 如何使用

阅读各个规则文件以获取详细说明和代码示例：
- [references/baoyu-config.json](references/baoyu-config.json) - 宝玉技能配置
- [references/cdn-mapping.json](references/cdn-mapping.json) - CDN映射配置
- [references/tailwind-config.json](references/tailwind-config.json) - Tailwind配置
- [rules/PATHS.md](rules/PATHS.md) - 规定了 video-creator 技能中项目命名、目录结构和文件命名的规范，确保输出文件统一组织在 workspace/{project-name}/ 下的 docs/ 和 video-project/ 目录中。
- [rules/REMOTION.md](rules/REMOTION.md) - 详细规定了使用 Remotion 框架创建视频组件的规范，包括组件结构、动画效果（打字机、词高亮、渐入等）、主题配置、字体选择以及视频渲染参数。
- [rules/VOICE.md](rules/VOICE.md) - 规定了使用微软 Azure Neural TTS（推荐 zh-CN-YunjianNeural）进行自然人声合成的工作流程，强调整段连续生成、音频后处理及通过 ffmpeg 混流避免 Remotion 编码杂音。
- [rules/HTML.md](rules/HTML.md) - 规定国内CDN资源引用规范，提供落地页、公众号适配页、文章阅读页三种HTML模板。
- [rules/FONTS.md](rules/FONTS.md) - 规定视频字幕和正文的字体大小规范（主标题120px/副标题44px/内容40px）、ASS字幕格式（PingFang SC/黄色/底部居中）及大字体居中设计原则。
- [rules/WORKFLOW.md](rules/WORKFLOW.md) - 定义视频创作从内容获取到报告生成的11步完整工作流程。
- [rules/COPY.md](rules/COPY.md) - 规定公众号文案的输出格式、标题规范（8-32字）、摘要规范（≤44字）及正文结构（开头→引出→解决→功能→效果→号召→结尾）。
- [rules/SUBTITLES.md](rules/SUBTITLES.md) - 集成智能字幕生成（ASS格式）、质量检查（字体/音频/字幕/视频）及自动修复功能，支持批量处理多个视频项目。
- [rules/QUALITY.md](rules/QUALITY.md) - 定义视频质量检查清单，涵盖内容、视觉、文件、技术、音频五大维度的检查标准。
- [rules/INPUT.md](rules/INPUT.md) - 定义三种内容输入模式：链接输入（baoyu-url-to-markdown抓取）、主题输入（web_search搜索）、详细内容输入（直接解析），并规定各自的处理流程。
- [rules/THEMES.md](rules/THEMES.md) - 定义20种视频主题风格（科技、创意、生活、自然、专业四大类），包含主色、辅色、背景色、字体、粒子数等视觉参数及平台规格（小红书/视频号/抖音/油管）。
- [rules/PLATFORM.md](rules/PLATFORM.md) - 定义视频号、小红书、抖音/快手的平台规格（分辨率、帧率、时长、文件大小、编码）及 Remotion 竖屏配置参数。
- [rules/TROUBLESHOOTING.md](rules/TROUBLESHOOTING.md) - 提供视频渲染失败、baoyu获取内容、字体异常、音频回音/拼接、Remotion编码杂音、Chrome下载失败等常见问题的解决方案。
- [rules/INTEGRATION.md](rules/INTEGRATION.md) - 定义 baoyu 技能调用方式（url-to-markdown/cover-image/illustrator等）及自动化脚本模板和依赖安装说明。
- [rules/SCRIPTS.md](rules/SCRIPTS.md) - 定义视频脚本的 Markdown 输出结构，包含小红书/视频号版本、场景分镜（视觉/文字/动画）、配音及时长、帧边界计算方法。
- [rules/SESSION_LOG.md](rules/SESSION_LOG.md) - 追踪每次大模型请求的输入/输出 token 数量、请求模型、处理时长及 session 数据，输出到 `docs/session-log.md` 供审计和成本分析。
