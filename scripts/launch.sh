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

  # 创建 video-config.json（必须）
  cat > "${proj_dir}/video-config.json" << 'EOF'
{
  "name": "{project-name}",
  "platform": "微信视频号",
  "duration": 52,
  "fps": 60,
  "width": 1080,
  "height": 1920,
  "theme": "cyberpunk",
  "cover": {
    "title": "视频标题",
    "subtitle": "副标题"
  },
  "voice": {
    "name": "zh-CN-YunjianNeural",
    "rate": "+0%",
    "atempo": 1.2
  },
  "subtitle": {
    "enabled": true,
    "highlight": true
  }
}
EOF
  sed -i '' "s/{project-name}/${name}/g" "${proj_dir}/video-config.json"

  # 创建 article.md（占位内容）
  cat > "${proj_dir}/docs/article.md" << 'EOF'
# {project-name}

请在此处粘贴原始文章内容。AI 将根据此内容生成视频脚本和配音。

## 如何使用

1. 将你的文章/内容粘贴到上方
2. 运行 `bash launch.sh all` 开始一键生成视频
3. 生成完成后查看 `docs/narration.txt` 确认配音文本
EOF
  sed -i '' "s/{project-name}/${name}/g" "${proj_dir}/docs/article.md"

  ok "项目初始化完成: ${proj_dir}"
  echo ""
  echo "已创建文件:"
  echo "  video-config.json    — 项目配置（必填，请先编辑）"
  echo "  docs/article.md      — 原始内容（请粘贴文章内容）"
  echo "  docs/README.md       — 项目说明"
  echo ""
  echo "下一步:"
  echo "  1. 编辑 video-config.json（设置平台、时长、主题等）"
  echo "  2. 粘贴内容到 docs/article.md"
  echo "  3. 运行 bash launch.sh all 开始生成"
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
  local SUBTITLE_GEN="${SCRIPT_DIR}/subtitle-generator.js"
  local PRE_RENDER="${SCRIPT_DIR}/pre-render-check.js"
  local GEN_DOCS="${SCRIPT_DIR}/generate_docs.js"
  local GEN_COVER="${SCRIPT_DIR}/generate_cover.py"
  local VP_DIR="${proj_dir}/video-project"

  log "开始一键视频生成流程..."
  echo ""

  # ── Step 0: 生成文档（11个）────────────────────────────────────────────
  echo "=== Step 0: 生成文档 ==="
  if [ ! -f "${proj_dir}/docs/narration.txt" ]; then
    log "narration.txt 不存在，调用 generate_docs.js..."
    node "${GEN_DOCS}" "${proj_dir}"
    ok "文档生成完成"
  else
    ok "narration.txt 已存在，跳过文档生成"
    log "（如需重新生成，请先删除 docs/ 目录）"
  fi

  # ── 读取配置 ────────────────────────────────────────────────────────────────
  local config_file="${proj_dir}/video-config.json"
  if [ ! -f "$config_file" ]; then
    err "找不到配置文件: ${config_file}"
    err "请先创建 video-config.json（platform/duration/fps/theme 等字段）"
    exit 1
  fi

  local TARGET_DURATION
  TARGET_DURATION=$(node -e "console.log(require('${config_file}').duration || 52)")
  local THEME
  THEME=$(node -e "console.log(require('${config_file}').theme || 'cyberpunk')")
  local VOICE_NAME
  VOICE_NAME=$(node -e "console.log(require('${config_file}').voice?.name || 'zh-CN-YunjianNeural')")
  ok "配置: ${TARGET_DURATION}s / ${THEME} / ${VOICE_NAME}"

  local narration_file="${proj_dir}/docs/narration.txt"
  if [ ! -f "$narration_file" ]; then
    err "找不到配音文本: ${narration_file}"
    exit 1
  fi

  # 字数检查
  local CHAR_COUNT
  CHAR_COUNT=$(wc -c < "$narration_file" | tr -d ' ')
  local MAX_CHARS
  MAX_CHARS=$(python3 -c "import math; print(math.floor(${TARGET_DURATION} * 6.45))")
  if [ "$CHAR_COUNT" -gt "$MAX_CHARS" ]; then
    warn "⚠️ narration.txt ${CHAR_COUNT}字 > 上限 ${MAX_CHARS}字，可能会超出目标时长"
    warn "   建议精简到 ${MAX_CHARS}字以内"
  else
    ok "字数检查: ${CHAR_COUNT}字 / ${MAX_CHARS}字上限"
  fi

  # ── Step -1: 生成封面图（3个尺寸）────────────────────────────────────
  echo ""
  echo "=== Step -1: 生成封面图 ==="
  local COVER_TITLE
  COVER_TITLE=$(node -e "console.log(require('${config_file}').cover?.title || require('${config_file}').title || '视频标题')")
  local COVER_SUBTITLE
  COVER_SUBTITLE=$(node -e "console.log(require('${config_file}').cover?.subtitle || require('${config_file}').subtitle || '')")
  local cover_out="${proj_dir}/docs/assets"

  python3 "${GEN_COVER}" \
    "$COVER_TITLE" \
    "$COVER_SUBTITLE" \
    "$cover_out" \
    vertical wechat xhs \
    > /tmp/cover.$$.out 2>&1

  if [ $? -eq 0 ]; then
    ok "封面图生成完成（vertical / wechat / xhs）"
  else
    warn "⚠️ AI封面生成失败，尝试 PIL 兜底..."
    cat /tmp/cover.$$.out | tail -3
  fi
  rm -f /tmp/cover.$$.out

  # ── Step 1: edge-tts 配音 ───────────────────────────────────────────────
  echo ""
  echo "=== Step 1: edge-tts 配音（--rate +0%）==="

  mkdir -p "${proj_dir}/audio" "${VP_DIR}/audio" "${VP_DIR}/out"

  edge-tts \
    --voice "${VOICE_NAME}" \
    --rate "+0%" \
    --text "$(cat "$narration_file")" \
    --write-media "${proj_dir}/audio/neural_full.mp3" \
    > /tmp/edge_tts.$$.out 2>&1

  if [ ${PIPESTATUS[0]} -ne 0 ]; then
    err "❌ edge-tts 配音失败"
    cat /tmp/edge_tts.$$.out; echo ""
    rm -f /tmp/edge_tts.$$.out
    exit 1
  fi
  ok "✅ TTS 原始音频: audio/neural_full.mp3"
  rm -f /tmp/edge_tts.$$.out

  # ── Step 2: ffmpeg 后处理（atempo 1.2x + AAC 256k）────────────────────
  echo ""
  echo "=== Step 2: ffmpeg 后处理（去静音 + atempo 1.2x + AAC 256k）==="

  ffmpeg -y \
    -i "${proj_dir}/audio/neural_full.mp3" \
    -af "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.3,atempo=1.2" \
    -c:a aac -b:a 256k \
    "${proj_dir}/audio/neural_1_2x.m4a" \
    > /dev/null 2>&1

  if [ $? -ne 0 ]; then
    err "❌ ffmpeg 后处理失败"
    exit 1
  fi

  local AUDIO_DURATION
  AUDIO_DURATION=$(ffprobe -v error -show_entries format=duration \
    -of csv=p=0 "${proj_dir}/audio/neural_1_2x.m4a" 2>/dev/null || echo "0")
  ok "✅ 处理后音频: audio/neural_1_2x.m4a（${AUDIO_DURATION}s）"

  # ── Gate A（音频有效性）──────────────────────────────────────────────
  echo ""
  echo "=== 门禁 A: 音频 ==="
  if ! node "${GATE}" "${proj_dir}" "audio" 2>&1 | tail -5; then
    err "❌ 门禁 A 未通过，终止"
    exit 1
  fi
  ok "✅ 门禁 A 通过"

  # ── Step 3: 字幕生成（maxCharsPerLine=50）──────────────────────────────
  echo ""
  echo "=== Step 3: 字幕生成 ==="
  node -e "
    const SubtitleGenerator = require('${SUBTITLE_GEN}');
    const fs = require('fs');
    const gen = new SubtitleGenerator({ maxCharsPerLine: 50 });
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

  # 字体修复：PingFang SC → STHeiti Medium
  sed -i '' 's/PingFang SC/STHeiti Medium/g' "${proj_dir}/audio/subtitles.ass" 2>/dev/null || true

  # ── Gate B（字幕质量）───────────────────────────────────────────────
  echo ""
  echo "=== 门禁 B: 字幕 ==="
  # --target-duration 传给 pre-subtitle-check 的文本长度门禁（字数上限 = TARGET_DURATION × 6.45）
  if ! node "${GATE}" "${proj_dir}" "subtitle" --target-duration="${TARGET_DURATION}" 2>&1 | tail -5; then
    err "❌ 门禁 B 未通过，终止"
    exit 1
  fi
  ok "✅ 门禁 B 通过"

  # ── Step 4: Remotion 项目生成 ─────────────────────────────────────────
  echo ""
  echo "=== Step 4: 生成 Remotion 项目 ==="
  node "${SCRIPT_DIR}/create-remotion-project.js" "${proj_dir}"
  if [ $? -ne 0 ]; then
    err "Remotion 项目生成失败"
    exit 1
  fi
  ok "✅ Remotion 项目生成完成"

  # ── Step 5: npm install ─────────────────────────────────────────────────
  echo ""
  echo "=== Step 5: npm install ==="
  cd "${VP_DIR}" && npm install 2>&1 | tail -3
  if [ $? -ne 0 ]; then
    err "npm install 失败"
    exit 1
  fi
  cd - > /dev/null
  ok "✅ npm install 完成"

  # ── Step 6: pre-render-check ───────────────────────────────────────────
  echo ""
  echo "=== Step 6: 渲染前检查 ==="
  # --target-duration 传给 pre-subtitle-check 的文本长度门禁（字数上限 = TARGET_DURATION × 6.45）
  # 注意：pre-render-check 支持目录自动检测（无需手动指定 fps/duration）
  if node "${PRE_RENDER}" "${proj_dir}" --target-duration="${TARGET_DURATION}" 2>&1 | tail -10; then
    ok "✅ 渲染前检查通过"
  else
    warn "⚠️ 渲染前检查有警告，继续渲染..."
  fi

  # ── Step 7: Remotion 渲染 ──────────────────────────────────────────────
  local TOTAL_FRAMES
  TOTAL_FRAMES=$(python3 -c "import math; print(math.ceil(${AUDIO_DURATION} * 60))")
  echo ""
  echo "=== Step 7: Remotion 渲染（60fps / 1080×1920 / ${TOTAL_FRAMES}帧）==="

  cd "${VP_DIR}" && npx remotion render VerticalVideo \
    out/final.mp4 \
    --concurrency=4 \
    --fps=60 \
    --duration-in-frames=${TOTAL_FRAMES} \
    --disable-gpu \
    > /tmp/remotion.$$.out 2>&1

  REMOTION_STATUS=$?
  cd - > /dev/null

  if [ $REMOTION_STATUS -ne 0 ]; then
    warn "⚠️ Remotion 渲染失败，fallback 到 PIL 帧序列..."
    echo ""
    echo "=== PIL fallback ==="

    python3 "${SCRIPT_DIR}/gen_frames_template.py" "${proj_dir}" --theme "${THEME}" \
      > /tmp/frame_gen.$$.out 2>&1

    if [ $? -ne 0 ]; then
      err "❌ PIL 帧生成也失败了"
      cat /tmp/frame_gen.$$.out; echo ""
      rm -f /tmp/frame_gen.$$.out
      exit 1
    fi

    local FRAME_COUNT
    FRAME_COUNT=$(find "${VP_DIR}/frames" -name 'frame_*.png' 2>/dev/null | wc -l | tr -d ' ')
    ok "✅ PIL 帧序列: ${FRAME_COUNT} 帧"

    echo ""
    echo "=== ffmpeg 混流（PIL fallback，不含字幕）==="
    ffmpeg -y \
      -framerate 60 \
      -i "${VP_DIR}/frames/frame_%04d.png" \
      -i "${proj_dir}/audio/neural_1_2x.m4a" \
      -map 0:v -map 1:a \
      -t "${AUDIO_DURATION}" \
      -c:v libx264 -preset ultrafast -crf 22 -pix_fmt yuv420p \
      -c:a aac -b:a 256k \
      -r 60 -s 1080x1920 \
      "${VP_DIR}/out/final_no_subs.mp4" 2>/dev/null

    rm -rf "${VP_DIR}/frames"
    local FINAL_FILE="final_no_subs.mp4"
    warn "⚠️ PIL fallback 输出不含 ASS 字幕（如需字幕请使用 Remotion 渲染）"
  else
    ok "✅ Remotion 渲染完成"
    local FINAL_FILE="final.mp4"
  fi
  rm -f /tmp/remotion.$$.out /tmp/frame_gen.$$.out

  # ── Gate D ───────────────────────────────────────────────────────────
  echo ""
  echo "=== 门禁 D: 最终视频 ==="
  if node "${GATE}" "${proj_dir}" "final" 2>&1 | tail -5; then
    ok "✅ 门禁 D 通过"
  else
    warn "⚠️ 最终视频检查有警告"
  fi

  echo ""
  echo "═══════════════════════════════════════"
  ok "✅ 一键生成完成！"
  echo "═══════════════════════════════════════"
  echo ""
  echo "最终文件: ${VP_DIR}/out/${FINAL_FILE}"
  echo "尺寸: 1080×1920 | 时长: ${AUDIO_DURATION}s | 60fps | AAC 256k"
  echo "封面: docs/assets/cover.png (vertical) / cover-wechat.png / cover-xhs.png"
  echo "字幕: audio/subtitles.ass（含逐字高亮特效）"
  echo ""
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
