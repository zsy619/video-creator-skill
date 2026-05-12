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
  echo "请参考 ONEPASS_WORKFLOW.md 的 Step 7-9 执行 Remotion 渲染"
  echo "或运行 $0 all 进行一键生成"
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

  # ── edge-tts 配音 + 帧生成 并行执行 ─────────────────────────────────
  # edge-tts：~20s（纯计算/网络），帧生成：~50s（纯计算）
  # 两者均不依赖对方，可完全并行
  echo ""
  echo "=== edge-tts 配音 + 帧生成（并行）==="

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

  mkdir -p "${proj_dir}/audio" "${VP_DIR}/frames"

  # 启动 edge-tts（后台）
  edge-tts \
    --voice "$(node -e "console.log(require('${config_file}').voice?.name || 'zh-CN-YunjianNeural')")" \
    --rate "$EDGE_RATE" \
    --text "$(cat "$narration_file")" \
    --write-media "${proj_dir}/audio/neural_1_2x.m4a" \
    > /tmp/edge_tts.$$.out 2>&1 &
  PID_TTS=$!

  # 启动帧生成（后台，与 edge-tts 并行）
  python3 "${SCRIPT_DIR}/gen_frames_template.py" "${proj_dir}" --theme "$THEME" > /tmp/frame_gen.$$.out 2>&1 &
  PID_FRAME=$!

  # 等待 edge-tts 完成
  wait $PID_TTS; STATUS_TTS=$?
  echo ""; cat /tmp/edge_tts.$$.out; echo ""

  if [ $STATUS_TTS -ne 0 ]; then
    err "❌ edge-tts 配音失败"
    kill $PID_FRAME 2>/dev/null || true
    rm -f /tmp/edge_tts.$$.out /tmp/frame_gen.$$.out
    exit 1
  fi
  ok "✅ 配音完成: audio/neural_1_2x.m4a"
  rm -f /tmp/edge_tts.$$.out

  # ── Gate A（音频）+ 字幕生成 并行执行 ─────────────────────────────
  echo ""
  echo "=== 门禁 A + 字幕生成（并行）==="

  # 启动 Gate A（后台）
  node "${GATE}" "${proj_dir}" "audio" > /tmp/gate_a.$$.out 2>&1 &
  PID_A=$!

  # 启动字幕生成（后台）
  node -e "
    const SubtitleGenerator = require('${SUBTITLE_GEN}');
    const fs = require('fs');
    const gen = new SubtitleGenerator({ maxCharsPerLine: 25 });
    const text = fs.readFileSync('${narration_file}', 'utf8');
    gen.generateFromText(text, ${TARGET_DURATION}).then(subs => {
      return gen.generateASS(subs, '${proj_dir}/audio/subtitles.ass');
    }).then(() => console.log('SUBTITLE_OK')).catch(e => { console.error(e.message); process.exit(1); });
  " > /tmp/subtitle_gen.$$.out 2>&1 &
  PID_SUB=$!

  # 等待 Gate A
  wait $PID_A; STATUS_A=$?
  echo ""; cat /tmp/gate_a.$$.out; echo ""

  if [ $STATUS_A -ne 0 ]; then
    err "❌ 门禁 A 未通过，终止"
    kill $PID_FRAME 2>/dev/null || true
    rm -f /tmp/gate_a.$$.out /tmp/subtitle_gen.$$.out /tmp/frame_gen.$$.out
    exit 1
  fi
  ok "✅ 门禁 A 通过"

  # 等待字幕生成完成
  wait $PID_SUB; STATUS_SUB=$?
  if [ $STATUS_SUB -ne 0 ]; then
    err "❌ 字幕生成失败:"; cat /tmp/subtitle_gen.$$.out; echo ""
    kill $PID_FRAME 2>/dev/null || true
    rm -f /tmp/gate_a.$$.out /tmp/subtitle_gen.$$.out /tmp/frame_gen.$$.out
    exit 1
  fi
  if grep -q "SUBTITLE_OK" /tmp/subtitle_gen.$$.out 2>/dev/null; then
    ok "✅ ASS 字幕生成完成: audio/subtitles.ass"
  else
    err "❌ 字幕生成输出异常"; cat /tmp/subtitle_gen.$$.out; echo ""
    kill $PID_FRAME 2>/dev/null || true
    rm -f /tmp/gate_a.$$.out /tmp/subtitle_gen.$$.out /tmp/frame_gen.$$.out
    exit 1
  fi

  # ── 等待帧生成完成 + Gate B ──────────────────────────────────────────
  echo ""
  echo "=== 帧生成完成 + 门禁 B ==="

  # 等待帧生成
  wait $PID_FRAME; STATUS_FRAME=$?
  echo ""; cat /tmp/frame_gen.$$.out; echo ""

  if [ $STATUS_FRAME -ne 0 ]; then
    err "❌ 帧生成失败"
    rm -f /tmp/gate_a.$$.out /tmp/subtitle_gen.$$.out /tmp/frame_gen.$$.out
    exit 1
  fi

  # 验证帧数（无需 local，shell 函数全局变量）
  FRAME_COUNT=$(find "${VP_DIR}/frames" -name 'frame_*.png' 2>/dev/null | wc -l | tr -d ' ')
  EXPECTED_FRAMES=$(python3 -c "import math; print(math.ceil(${TARGET_DURATION} * 60))")
  if [ "$FRAME_COUNT" != "$EXPECTED_FRAMES" ]; then
    err "❌ 帧数不匹配: actual=${FRAME_COUNT}, expected=${EXPECTED_FRAMES}"
    rm -f /tmp/gate_a.$$.out /tmp/subtitle_gen.$$.out /tmp/frame_gen.$$.out
    exit 1
  fi
  ok "✅ 帧数验证通过: ${FRAME_COUNT} 帧 (@60fps)"
  ok "✅ 帧序列生成完成: ${VP_DIR}/frames/frame_%04d.png"

  # Gate B（字幕质量检查）
  echo ""
  echo "=== 门禁 B: 字幕 ==="
  if ! node "${GATE}" "${proj_dir}" "subtitle"; then
    err "❌ 门禁 B 未通过，终止"
    rm -f /tmp/gate_a.$$.out /tmp/subtitle_gen.$$.out /tmp/frame_gen.$$.out
    exit 1
  fi
  ok "✅ 门禁 B 通过"

  rm -f /tmp/gate_a.$$.out /tmp/subtitle_gen.$$.out /tmp/frame_gen.$$.out

  # ── ffmpeg 单次混流（帧序列+音频+字幕 → 最终视频）─────────────────
  echo ""
  echo "=== ffmpeg 单次混流 ==="

  AUDIO_DURATION=$(ffprobe -v error -show_entries format=duration \
    -of csv=p=0 "${proj_dir}/audio/neural_1_2x.m4a" 2>/dev/null)

  mkdir -p "${VP_DIR}/out"
  ffmpeg -y \
    -framerate 60 \
    -i "${VP_DIR}/frames/frame_%04d.png" \
    -i "${proj_dir}/audio/neural_1_2x.m4a" \
    -filter_complex "[0:v]ass=${proj_dir}/audio/subtitles.ass[v]" \
    -map "[v]" -map 1:a \
    -t "${AUDIO_DURATION}" \
    -c:v libx264 -preset ultrafast -crf 22 -pix_fmt yuv420p \
    -c:a aac -b:a 192k \
    -r 60 -s 1080x1920 \
    "${VP_DIR}/out/final_with_subs.mp4" 2>/dev/null || {
    err "ffmpeg 单次混流失败"
    exit 1
  }
  ok "ffmpeg 单次混流完成: out/final_with_subs.mp4"

  # 清理帧序列（节省空间）
  rm -rf "${VP_DIR}/frames"

  # ── 门禁 D ─────────────────────────────────────────────────────────────
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
  echo "最终文件: ${VP_DIR}/out/final_with_subs.mp4"
  echo "渲染方式: PIL帧序列 + ffmpeg单次混流"
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
