#!/bin/bash
# video-creator 一键启动脚本
# 带完整质量门禁的视频创作流程
#
# 用法:
#   cd ~/VideoProjects/my-project
#   bash $HOME/.hermes/skills/video-creator/scripts/launch.sh
#
# 环境变量:
#   SKILL_DIR   — 技能根目录（默认 ~/.hermes/skills/video-creator）
#   PROJECT_DIR — 项目根目录（默认当前目录的上一级）
#   DRY_RUN     — 设为 1 则只做检查不执行

set -euo pipefail

SKILL_DIR="${SKILL_DIR:-$HOME/.hermes/skills/video-creator}"
SCRIPT_DIR="${SKILL_DIR}/scripts"
GATE="${SCRIPT_DIR}/video-quality-gate.js"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

log() { echo -e "${BLUE}[→]${RESET} $1"; }
ok()  { echo -e "${GREEN}[✓]${RESET} $1"; }
err() { echo -e "${RED}[✗]${RESET} $1" >&2; }
warn(){ echo -e "${YELLOW}[!]${RESET} $1"; }

# 显示用法
usage() {
  cat << EOF
用法: $0 <命令>

命令:
  init <项目名>   创建新项目目录结构
  gate [节点]     运行质量门禁检查
  audio          生成音频（Step 7）
  subtitle       生成字幕（Step 8）
  render         渲染视频（Step 10）
  all            完整流程（init → audio → subtitle → render）
  help           显示此帮助

节点 (gate 子命令):
  audio    检查音频节点
  subtitle 检查字幕节点
  render   检查渲染节点
  final    检查最终视频
  all      全部检查（默认）

示例:
  $0 init my-video-project
  $0 gate audio
  $0 gate all
  $0 all
EOF
}

# ── 子命令: init ──────────────────────────────────────────────────────────────
cmd_init() {
  local name="$1"
  local workspace="${PROJECT_DIR:-$(cd .. && pwd)}"
  local proj_dir="${workspace}/${name}"

  log "初始化项目: ${proj_dir}"

  mkdir -p "${proj_dir}/docs/assets/imgs"
  mkdir -p "${proj_dir}/docs/assets/illustrations"
  mkdir -p "${proj_dir}/audio"
  mkdir -p "${proj_dir}/video-project/src/components"
  mkdir -p "${proj_dir}/video-project/src/themes"
  mkdir -p "${proj_dir}/video-project/out"
  mkdir -p "${proj_dir}/video-project/public/audio"

  # 创建基础 README.md
  cat > "${proj_dir}/docs/README.md" << 'EOF'
# {project-name}

## 项目状态
- 状态: 初始化
- 创建时间: {timestamp}

## 平台
- [ ] 视频号
- [ ] 小红书
- [ ] 抖音

## 文件清单
- [ ] `docs/article.md` — 原始内容
- [ ] `docs/video-script.md` — 分镜脚本
- [ ] `docs/copy.md` — 营销文案
- [ ] `docs/wechat-copy.md` — 公众号文案
- [ ] `docs/posting-guide.md` — 发布指南
- [ ] `docs/landing-page.html` — 落地页
- [ ] `docs/article-page.html` — 文章阅读页
- [ ] `docs/wechat-page.html` — 公众号适配页
- [ ] `docs/session-log.md` — 会话日志
- [ ] `docs/report.json` — 执行报告
- [ ] `docs/assets/cover.png` — 封面图
- [ ] `audio/neural_1_2x.m4a` — 处理后音频
- [ ] `audio/subtitles.ass` — 字幕文件
- [ ] `video-project/out/final-video.mp4` — 最终视频
EOF

  sed -i '' "s/{project-name}/${name}/g" "${proj_dir}/docs/README.md"
  sed -i '' "s/{timestamp}/$(date '+%Y-%m-%d %H:%M')/" "${proj_dir}/docs/README.md"

  ok "项目初始化完成: ${proj_dir}"
  echo "下一步: 复制内容到 docs/article.md，然后运行 $0 all"
}

# ── 子命令: gate ──────────────────────────────────────────────────────────────
cmd_gate() {
  local node="${1:-all}"
  local proj_dir="${PROJECT_DIR:-$(pwd)}"

  log "运行质量门禁: ${proj_dir} [${node}]"

  if [ ! -f "${GATE}" ]; then
    err "找不到质量门禁脚本: ${GATE}"
    exit 1
  fi

  local result
  result=$(node "${GATE}" "${proj_dir}" "${node}" 2>&1)
  echo "$result"
  local status=$?

  if [ $status -eq 0 ]; then
    ok "质量门禁通过"
    return 0
  else
    err "质量门禁未通过，请修复上述问题"
    return 1
  fi
}

# ── 子命令: audio ─────────────────────────────────────────────────────────────
cmd_audio() {
  local proj_dir="${PROJECT_DIR:-$(pwd)}"

  log "生成音频（Step 7）..."

  # 检查前置条件
  if [ ! -f "${proj_dir}/docs/video-script.md" ]; then
    err "缺少 video-script.md，请先创建内容"
    exit 1
  fi

  # 检查封面
  if [ ! -f "${proj_dir}/docs/assets/cover.png" ]; then
    err "缺少封面图 docs/assets/cover.png"
    exit 1
  fi

  ok "音频生成就绪（请参考 VOICE.md 配置 edge-tts）"
  echo ""
  echo "请在 AI 对话中执行以下步骤:"
  echo "  1. 读取 ${proj_dir}/docs/video-script.md 获取配音文本"
  echo "  2. 使用 text_to_speech 工具生成音频"
  echo "  3. 执行 ffmpeg 后处理（去静音 + 1.2x + AAC 256k）"
  echo "  4. 运行 $0 gate audio 验证"
}

# ── 子命令: subtitle ─────────────────────────────────────────────────────────
cmd_subtitle() {
  local proj_dir="${PROJECT_DIR:-$(pwd)}"

  log "生成字幕（Step 8）..."

  # 前置检查
  if ! node "${GATE}" "${proj_dir}" "audio" > /dev/null 2>&1; then
    err "音频节点未通过，请先修复音频问题"
    err "运行: $0 gate audio 查看详情"
    exit 1
  fi

  local audio_file="${proj_dir}/audio/neural_1_2x.m4a"
  if [ ! -f "$audio_file" ]; then
    err "找不到音频文件: ${audio_file}"
    exit 1
  fi

  local duration
  duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$audio_file" 2>/dev/null)
  ok "音频时长: ${duration}s"

  echo ""
  echo "请在 AI 对话中执行以下步骤:"
  echo "  1. 从 video-script.md 提取配音文本"
  echo "  2. 使用 SubtitleGenerator 生成 ASS 字幕（Fontsize=72）"
  echo "     const generator = new SubtitleGenerator();"
  echo "     const subtitles = await generator.generateFromText(text, ${duration});"
  echo "     await generator.generateASS(subtitles, '${proj_dir}/audio/subtitles.ass');"
  echo "  3. 运行 $0 gate subtitle 验证"
}

# ── 子命令: render ────────────────────────────────────────────────────────────
cmd_render() {
  local proj_dir="${PROJECT_DIR:-$(pwd)}"

  log "渲染视频（Step 10）..."

  # 前置检查
  if ! node "${GATE}" "${proj_dir}" "audio" > /dev/null 2>&1; then
    err "音频节点未通过"
    exit 1
  fi
  if ! node "${GATE}" "${proj_dir}" "subtitle" > /dev/null 2>&1; then
    err "字幕节点未通过"
    exit 1
  fi

  # ⚠️【2026-05-10新增】渲染前必须通过 render 节点检查
  if ! node "${GATE}" "${proj_dir}" "render" > /dev/null 2>&1; then
    err "渲染前检未通过（见上），常见问题:"
    err "  1. package.json 使用 @remotion/core（应改为 remotion）"
    err "  2. Video.tsx 存在 <Text> 组件（应改为 <div>）"
    err "  3. node_modules/remotion 未安装"
    exit 1
  fi

  echo ""
  echo "渲染命令参考（请在 AI 对话中执行）:"
  echo "  cd ${proj_dir}/video-project"
  echo "  npx remotion render VerticalVideo --output out/video_noaudio.mp4 --fps 60 --height 1920 --width 1080"
  echo ""
  echo "混流命令:"
  echo "  ffmpeg -y -i out/video_noaudio.mp4 -i ../audio/neural_1_2x.m4a \\"
  echo "    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest \\"
  echo "    out/final.mp4"
  echo ""
  echo "字幕烧录:"
  echo "  ffmpeg -y -i out/final.mp4 \\"
  echo "    -vf \"subtitles=../audio/subtitles.ass:force_style='Fontsize=72,Outline=2,MarginV=50'\" \\"
  echo "    out/final_with_subs.mp4"
}

# ── 子命令: all ────────────────────────────────────────────────────────────────
cmd_all() {
  local proj_dir="${PROJECT_DIR:-$(pwd)}"
  local GATE="${SKILL_DIR}/scripts/video-quality-gate.js"

  log "开始完整流程（CI模式：所有节点必须通过）..."

  # CI强制模式：所有 gate 节点退出码≠0 → 立即失败，不交互
  echo ""
  echo "=== 节点 A: audio ==="
  if ! node "${GATE}" "${proj_dir}" "audio"; then
    err "❌ audio 节点未通过，终止"
    exit 1
  fi

  echo ""
  echo "=== 节点 B: subtitle ==="
  if ! node "${GATE}" "${proj_dir}" "subtitle"; then
    err "❌ subtitle 节点未通过，终止"
    exit 1
  fi

  echo ""
  echo "=== 节点 C: render ==="
  if ! node "${GATE}" "${proj_dir}" "render"; then
    err "❌ render 节点未通过，终止"
    exit 1
  fi

  echo ""
  echo "=== 节点 D: final ==="
  if ! node "${GATE}" "${proj_dir}" "final"; then
    err "❌ final 节点未通过，终止"
    exit 1
  fi

  ok "✅ 所有门禁节点通过！"
  echo ""
  echo "渲染命令参考（请在 AI 对话中执行）:"
  echo "  cd ${proj_dir}/video-project"
  echo "  npx remotion render VerticalVideo --output out/video_noaudio.mp4 --fps 60 --height 1920 --width 1080"
  echo ""
  echo "混流命令:"
  echo "  ffmpeg -y -i out/video_noaudio.mp4 -i ../audio/neural_1_2x.m4a \\"
  echo "    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest \\"
  echo "    out/final.mp4"
  echo ""
  echo "字幕烧录:"
  echo "  ffmpeg -y -i out/final.mp4 \\"
  echo "    -vf \"subtitles=../audio/subtitles.ass:force_style='Fontsize=72,Outline=2,MarginV=50'\" \\"
  echo "    out/final_with_subs.mp4"
}

# ── 主入口 ────────────────────────────────────────────────────────────────────
COMMAND="${1:-help}"
shift 2>/dev/null || true

case "$COMMAND" in
  init)   cmd_init "$@";;
  gate)   cmd_gate "$@";;
  audio)  cmd_audio "$@";;
  subtitle) cmd_subtitle "$@";;
  render) cmd_render "$@";;
  all)    cmd_all "$@";;
  help|--help|-h) usage;;
  *)      err "未知命令: $COMMAND"; usage; exit 1;;
esac
