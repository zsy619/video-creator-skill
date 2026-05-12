#!/bin/bash
# video-creator 一键启动脚本
# 带完整质量门禁的视频创作流程
#
# 用法:
#   cd ~/VideoProjects/my-project
#   bash {SKILL_DIR}/scripts/launch.sh
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
  local GATE="${SCRIPT_DIR}/video-quality-gate.js"

  log "生成音频（Step 2-3）..."

  # 检查配音文本
  if [ ! -f "${proj_dir}/docs/narration.txt" ]; then
    err "缺少配音文本: docs/narration.txt"
    exit 1
  fi

  echo ""
  echo "请参考 ONEPASS_WORKFLOW.md 的 Step 2 执行 edge-tts 配音"
  echo "或运行 $0 all 进行一键生成"
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
  echo "请参考 ONEPASS_WORKFLOW.md 的 Step 5 执行字幕生成"
  echo "或运行 $0 all 进行一键生成"
}

# ── 子命令: render ────────────────────────────────────────────────────────────
cmd_render() {
  local proj_dir="${1:-.}"
  local VP_DIR="${proj_dir}/video-project"
  local GATE="${SCRIPT_DIR}/video-quality-gate.js"
  local CREATE_REMOTION="${SCRIPT_DIR}/create-remotion-project.js"

  log "Remotion Native 渲染流程..."

  # 前置检查：音频和字幕
  if [ ! -d "${proj_dir}/audio" ]; then
    err "audio 目录不存在，请先运行 audio 命令"
    exit 1
  fi

  if ! node "${GATE}" "${proj_dir}" "subtitle" > /dev/null 2>&1; then
    err "字幕节点未通过"
    exit 1
  fi

  # ⚠️ 渲染前必须通过 render 节点检查
  if ! node "${GATE}" "${proj_dir}" "render" > /dev/null 2>&1; then
    err "渲染前检未通过，常见问题:"
    err "  1. package.json 使用 @remotion/core（应改为 remotion）"
    err "  2. Video.tsx 存在 <Text> 组件（应改为 <div>）"
    err "  3. node_modules/remotion 未安装"
    exit 1
  fi

  # ── 生成 Remotion 项目 ───────────────────────────────────────────────────
  echo ""
  echo "=== 生成 Remotion 项目 ==="
  node "${CREATE_REMOTION}" "${proj_dir}"
  if [ $? -ne 0 ]; then
    err "Remotion 项目生成失败"
    exit 1
  fi

  # ── npm install ────────────────────────────────────────────────────────────
  echo ""
  echo "=== npm install ==="
  cd "${VP_DIR}" && npm install 2>&1 | tail -5
  if [ $? -ne 0 ]; then
    err "npm install 失败"
    exit 1
  fi

  # ── Remotion 渲染 ─────────────────────────────────────────────────────────
  echo ""
  echo "=== Remotion 渲染（60fps / 1080×1920 / MP4）==="

  mkdir -p "${VP_DIR}/out"

  # 计算帧数
  local AUDIO_DURATION
  AUDIO_DURATION=$(ffprobe -v error -show_entries format=duration \
    -of csv=p=0 "${proj_dir}/audio/neural_1_2x.m4a" 2>/dev/null || echo "38")
  local TOTAL_FRAMES
  TOTAL_FRAMES=$(python3 -c "import math; print(math.ceil(${AUDIO_DURATION} * 60))")

  log "音频时长: ${AUDIO_DURATION}s → ${TOTAL_FRAMES} 帧 @60fps"

  npx remotion render VerticalVideo \
    "${VP_DIR}/out/final.mp4" \
    --concurrency=4 \
    --fps=60 \
    --duration-in-frames=${TOTAL_FRAMES} \
    --disable-gpu \
    2>&1 | tail -10

  if [ $? -ne 0 ]; then
    err "Remotion 渲染失败，尝试 fallback 到 PIL 帧序列..."
    # fallback 逻辑由 cmd_all 处理
    return 1
  fi

  ok "Remotion 渲染完成: ${VP_DIR}/out/final.mp4"
  echo ""
  echo "最终文件: ${VP_DIR}/out/final.mp4"
  echo "渲染方式: Remotion Native（音频内嵌 / 字幕烧录 / MP4直出）"
  echo "尺寸: 1080×1920 | 时长: ${AUDIO_DURATION}s | 60fps"
}

# ── 子命令: all ────────────────────────────────────────────────────────────────
cmd_all() {
  local proj_dir="${PROJECT_DIR:-$(pwd)}"
  local GATE="${SCRIPT_DIR}/video-quality-gate.js"
  local FIX_TEXT="${SCRIPT_DIR}/fix-text-component.js"
  local SUBTITLE_GEN="${SCRIPT_DIR}/subtitle-generator.js"
  local VP_DIR="${proj_dir}/video-project"

  log "开始一键视频生成流程..."
  echo ""

  # ── 读取配置 ────────────────────────────────────────────────────────────────
  local config_file="${VP_DIR}/video-config.json"
  if [ ! -f "$config_file" ]; then
    err "找不到配置文件: ${config_file}"
    err "请先运行: $0 init <项目名>"
    exit 1
  fi

  # 读取目标时长（秒）
  local TARGET_DURATION
  TARGET_DURATION=$(node -e "console.log(require('${config_file}').duration)")
  if [ -z "$TARGET_DURATION" ]; then
    err "video-config.json 缺少 duration 字段"
    exit 1
  fi
  ok "目标时长: ${TARGET_DURATION}s"

  # 读取主题
  local THEME
  THEME=$(node -e "console.log(require('${config_file}').theme || 'cyberpunk')")
  ok "主题: ${THEME}"

  # ── edge-tts 配音（与帧生成并行，但主流程只做配音）──────────────
  echo ""
  echo "=== edge-tts 配音 ==="

  local narration_file="${proj_dir}/docs/narration.txt"
  if [ ! -f "$narration_file" ]; then
    err "找不到配音文本: ${narration_file}"
    exit 1
  fi

  local EDGE_RATE="+0%"
  local ATEMPO=$(node -e "console.log(require('${config_file}').voice?.atempo || 1.0)")
  if [ "$(echo "$ATEMPO > 1.0" | bc)" -eq 1 ]; then
    local pct
    pct=$(echo "($ATEMPO - 1) * 100" | bc)
    EDGE_RATE="+${pct}%"
  fi
  ok "语速: ${EDGE_RATE}"

  mkdir -p "${proj_dir}/audio" "${VP_DIR}/audio" "${VP_DIR}/out"

  edge-tts \
    --voice "$(node -e "console.log(require('${config_file}').voice?.name || 'zh-CN-YunjianNeural')")" \
    --rate "$EDGE_RATE" \
    --text "$(cat "$narration_file")" \
    --write-media "${proj_dir}/audio/neural_1_2x.m4a" \
    > /tmp/edge_tts.$$.out 2>&1

  if [ ${PIPESTATUS[0]} -ne 0 ]; then
    err "❌ edge-tts 配音失败"
    cat /tmp/edge_tts.$$.out; echo ""
    rm -f /tmp/edge_tts.$$.out
    exit 1
  fi
  ok "✅ 配音完成: audio/neural_1_2x.m4a"
  rm -f /tmp/edge_tts.$$.out

  # ── Gate A（音频有效性）──────────────────────────────────────────────
  echo ""
  echo "=== 门禁 A: 音频 ==="
  if ! node "${GATE}" "${proj_dir}" "audio"; then
    err "❌ 门禁 A 未通过，终止"
    exit 1
  fi
  ok "✅ 门禁 A 通过"

  # ── 字幕生成 ─────────────────────────────────────────────────────────
  echo ""
  echo "=== 字幕生成 ==="
  node -e "
    const SubtitleGenerator = require('${SUBTITLE_GEN}');
    const fs = require('fs');
    const gen = new SubtitleGenerator({ maxCharsPerLine: 25 });
    const text = fs.readFileSync('${narration_file}', 'utf8');
    gen.generateFromText(text, ${TARGET_DURATION}).then(subs => {
      return gen.generateASS(subs, '${proj_dir}/audio/subtitles.ass');
    }).then(() => console.log('SUBTITLE_OK')).catch(e => { console.error(e.message); process.exit(1); });
  " > /tmp/subtitle_gen.$$.out 2>&1

  if [ $? -ne 0 ] || ! grep -q "SUBTITLE_OK" /tmp/subtitle_gen.$$.out 2>/dev/null; then
    err "❌ 字幕生成失败:"; cat /tmp/subtitle_gen.$$.out; echo ""
    rm -f /tmp/subtitle_gen.$$.out
    exit 1
  fi
  ok "✅ ASS 字幕生成完成: audio/subtitles.ass"
  rm -f /tmp/subtitle_gen.$$.out

  # ── Gate B（字幕质量）───────────────────────────────────────────────
  echo ""
  echo "=== 门禁 B: 字幕 ==="
  if ! node "${GATE}" "${proj_dir}" "subtitle"; then
    err "❌ 门禁 B 未通过，终止"
    exit 1
  fi
  ok "✅ 门禁 B 通过"

  # ── Remotion 项目生成 ───────────────────────────────────────────────
  echo ""
  echo "=== 生成 Remotion 项目 ==="
  node "${SCRIPT_DIR}/create-remotion-project.js" "${proj_dir}"
  if [ $? -ne 0 ]; then
    err "Remotion 项目生成失败"
    exit 1
  fi

  # ── npm install ─────────────────────────────────────────────────────
  echo ""
  echo "=== npm install ==="
  cd "${VP_DIR}" && npm install 2>&1 | tail -3
  if [ $? -ne 0 ]; then
    err "npm install 失败"
    exit 1
  fi
  cd - > /dev/null

  # ── Remotion 渲染 ────────────────────────────────────────────────────
  echo ""
  echo "=== Remotion 渲染（60fps / 1080×1920 / MP4）==="

  local AUDIO_DURATION
  AUDIO_DURATION=$(ffprobe -v error -show_entries format=duration \
    -of csv=p=0 "${proj_dir}/audio/neural_1_2x.m4a" 2>/dev/null || echo "38")
  local TOTAL_FRAMES
  TOTAL_FRAMES=$(python3 -c "import math; print(math.ceil(${AUDIO_DURATION} * 60))")

  log "音频时长: ${AUDIO_DURATION}s → ${TOTAL_FRAMES} 帧 @60fps"

  cd "${VP_DIR}" && npx remotion render VerticalVideo \
    out/final.mp4 \
    --concurrency=4 \
    --fps=60 \
    --duration-in-frames=${TOTAL_FRAMES} \
    --disable-gpu \
    2>&1 | tail -5

  REMOTION_STATUS=$?
  cd - > /dev/null

  if [ $REMOTION_STATUS -ne 0 ]; then
    warn "⚠️ Remotion 渲染失败，fallback 到 PIL 帧序列..."
    echo ""
    echo "=== PIL fallback: 帧序列生成 ==="

    python3 "${SCRIPT_DIR}/gen_frames_template.py" "${proj_dir}" --theme "${THEME}" > /tmp/frame_gen.$$.out 2>&1
    if [ $? -ne 0 ]; then
      err "❌ PIL 帧生成也失败了"
      cat /tmp/frame_gen.$$.out; echo ""
      rm -f /tmp/frame_gen.$$.out
      exit 1
    fi

    # 帧数验证
    local FRAME_COUNT
    FRAME_COUNT=$(find "${VP_DIR}/frames" -name 'frame_*.png' 2>/dev/null | wc -l | tr -d ' ')
    if [ "$FRAME_COUNT" != "$EXPECTED_FRAMES" ]; then
      err "❌ 帧数不匹配: actual=${FRAME_COUNT}, expected=${EXPECTED_FRAMES}"
      rm -f /tmp/frame_gen.$$.out
      exit 1
    fi
    ok "✅ PIL 帧序列: ${FRAME_COUNT} 帧"

    echo ""
    echo "=== ffmpeg 混流（PIL fallback，不烧录 ASS）==="
    ffmpeg -y \
      -framerate 60 \
      -i "${VP_DIR}/frames/frame_%04d.png" \
      -i "${proj_dir}/audio/neural_1_2x.m4a" \
      -map 0:v -map 1:a \
      -t "${AUDIO_DURATION}" \
      -c:v libx264 -preset ultrafast -crf 22 -pix_fmt yuv420p \
      -c:a aac -b:a 256k \
      -r 60 -s 1080x1920 \
      "${VP_DIR}/out/final_with_subs.mp4" 2>/dev/null

    rm -rf "${VP_DIR}/frames"
    local FINAL_FILE="final_with_subs.mp4"
  else
    local FINAL_FILE="final.mp4"
  fi

  # ── Gate D ───────────────────────────────────────────────────────────
  echo ""
  echo "=== 门禁 D: 最终视频 ==="
  if ! node "${GATE}" "${proj_dir}" "final"; then
    err "❌ 门禁 D 未通过"
    exit 1
  fi
  ok "✅ 门禁 D 通过"
  echo ""
  echo "═══════════════════════════════════════"
  ok "✅ 一键生成完成！"
  echo "═══════════════════════════════════════"
  echo ""
  echo "最终文件: ${VP_DIR}/out/${FINAL_FILE}"
  echo "尺寸: 1080×1920 | 时长: ${AUDIO_DURATION}s | 60fps"
  echo ""
  exit 0
}

# ── Remotion 路径（当前 M1 headless 环境不可用，仅作备用）──────
remotion_available() {
  log "检测 Remotion CLI 可用性..."
  timeout 5 npx remotion compositions --entry-point src/index.ts 2>&1 \
    | grep -q "VerticalVideo" 2>/dev/null
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
