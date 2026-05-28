# 技能集成

> 所属模块：video-creator / SKILL.md → 工具集成

## baoyu 技能调用

| 技能 | 用途 | 调用方式 |
|------|------|----------|
| `baoyu-url-to-markdown` | 链接内容获取 | `bun scripts/vendor/baoyu-fetch/src/cli.ts <url>` |
| `baoyu-cover-image` | 封面图生成 | 根据 SKILL.md 使用 |
| `baoyu-article-illustrator` | 内容插图生成 | 根据 SKILL.md 使用 |
| `baoyu-slide-deck` | PPT 幻灯片生成 | 根据 SKILL.md 使用 |
| `baoyu-infographic` | 信息图生成 | 根据 SKILL.md 使用 |
| `baoyu-markdown-to-html` | Markdown 转 HTML | 根据 SKILL.md 使用 |

## 自动化脚本

```bash
#!/bin/bash
# video-creator-workflow.sh

PROJECT_NAME="my-video-project"
SKILL_DIR="{SKILL_DIR}"

mkdir -p "workspace/${PROJECT_NAME}/docs/assets/imgs"
mkdir -p "workspace/${PROJECT_NAME}/docs/assets/illustrations"
mkdir -p "workspace/${PROJECT_NAME}/video-project"
mkdir -p "workspace/${PROJECT_NAME}/audio"

# 1. 获取内容（同时下载与主题相关的图片）
bun "$SKILL_DIR/scripts/vendor/baoyu-fetch/src/cli.ts" "$URL" \
  --output "workspace/${PROJECT_NAME}/docs/article.md" \
  --download-media \
  --media-dir "workspace/${PROJECT_NAME}/docs/assets/imgs/"

# 2. 生成封面
python3 scripts/generate_cover.py --input docs/article.md --theme tech-vision --output "docs/assets/cover.png"

# 3. 渲染视频
cd "video-project" && npx remotion render VerticalVideo --output out/final.mp4

# 4. 合成语音（使用 VOICE.md 最佳实践）
# ...
```

## 依赖安装

```bash
# Remotion
npm install remotion @remotion/cli

# 图标库
npm install lucide-react

# Tailwind CSS（用于HTML页面）
npm install tailwindcss
```
