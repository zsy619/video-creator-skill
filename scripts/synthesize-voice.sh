#!/bin/bash
#===============================================================================
# Voice Synthesis Automation Script
# 封装 VOICE.md 最佳实践，一键生成自然人声
#
# 用法:
#   ./synthesize-voice.sh --project ./workspace/my-project --voice zh-CN-YunjianNeural --speed 1.2
#
# 依赖:
#   - edge-tts (Python): /opt/homebrew/bin/python3.13 -m pip install --user edge-tts
#   - ffmpeg (音频处理)
#
# 流程:
#   1. 读取 audio/full_narration.txt 完整配音文本
#   2. 使用 edge-tts 整段连续生成（禁止分段拼接）
#   3. 音频后处理：去静音 + atempo 语速调整
#   4. 输出处理后的音频到 audio/neural_${SPEED}x.m4a
#===============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认参数
DEFAULT_VOICE="zh-CN-YunjianNeural"
DEFAULT_SPEED="1.2"
PYTHON_BIN="/opt/homebrew/bin/python3.13"
FFMPEG_BIN="ffmpeg"

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --project|-p)
            PROJECT_DIR="$2"
            shift 2
            ;;
        --voice|-v)
            VOICE="$2"
            shift 2
            ;;
        --speed|-s)
            SPEED="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 --project <project_dir> [--voice <voice>] [--speed <speed>]"
            echo ""
            echo "Arguments:"
            echo "  --project, -p    项目目录（必需）"
            echo "  --voice, -v      语音名称（默认: $DEFAULT_VOICE）"
            echo "  --speed, -s      语速倍数（默认: $DEFAULT_SPEED）"
            echo ""
            echo "Available voices:"
            echo "  男声: zh-CN-YunjianNeural (温和), zh-CN-YunxiNeural (年轻), zh-CN-YunyangNeural (新闻)"
            echo "  女声: zh-CN-XiaoxiaoNeural (温柔), zh-CN-XiaoyiNeural (活泼)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# 验证必需参数
if [ -z "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ 错误: 需要指定项目目录 --project${NC}"
    echo "使用 --help 查看帮助"
    exit 1
fi

# 设置默认值
VOICE="${VOICE:-$DEFAULT_VOICE}"
SPEED="${SPEED:-$DEFAULT_SPEED}"

# 路径设置
AUDIO_DIR="$PROJECT_DIR/audio"
RAW_DIR="$AUDIO_DIR/raw"
PROCESSED_DIR="$AUDIO_DIR/processed"
NARRATION_FILE="$AUDIO_DIR/full_narration.txt"
RAW_AUDIO="$RAW_DIR/neural_full.mp3"
PROCESSED_AUDIO="$PROCESSED_DIR/neural_${SPEED}x.m4a"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Voice Synthesis 自动化脚本${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}📋 配置:${NC}"
echo "   项目目录: $PROJECT_DIR"
echo "   语音: $VOICE"
echo "   语速: ${SPEED}x"
echo ""

# 创建目录
mkdir -p "$RAW_DIR"
mkdir -p "$PROCESSED_DIR"

# 检查输入文件
if [ ! -f "$NARRATION_FILE" ]; then
    echo -e "${RED}❌ 错误: 配音文本文件不存在${NC}"
    echo "   路径: $NARRATION_FILE"
    echo ""
    echo "请先创建配音文本文件，内容应包含完整视频文案。"
    exit 1
fi

# 检查 Python 和 edge-tts
echo -e "${YELLOW}🔍 检查依赖...${NC}"
if ! command -v $PYTHON_BIN &> /dev/null; then
    echo -e "${RED}❌ Python 3.13 未找到: $PYTHON_BIN${NC}"
    exit 1
fi

if ! $PYTHON_BIN -c "import edge_tts" &> /dev/null; then
    echo -e "${YELLOW}⚠️  edge-tts 未安装，正在安装...${NC}"
    $PYTHON_BIN -m pip install --user edge-tts
fi
echo -e "${GREEN}✅ 依赖检查通过${NC}"
echo ""

# Step 1: 生成音频（整段连续生成）
echo -e "${YELLOW}🎙️  Step 1: 生成配音...${NC}"
echo "   语音: $VOICE"
echo "   文本: $NARRATION_FILE"

$PYTHON_BIN << 'PYTHON_EOF'
import asyncio
import edge_tts
import sys

async def main():
    voice = "VOICE_PLACEHOLDER"
    output = "OUTPUT_PLACEHOLDER"
    narration_file = "NARRATION_PLACEHOLDER"
    
    try:
        with open(narration_file, 'r', encoding='utf-8') as f:
            text = f.read()
        
        if not text or len(text.strip()) == 0:
            print("❌ 配音文本为空", file=sys.stderr)
            sys.exit(1)
        
        print(f"   文本长度: {len(text)} 字符")
        
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output)
        
        print(f"✅ 音频已生成: {output}")
        
    except Exception as e:
        print(f"❌ 生成失败: {e}", file=sys.stderr)
        sys.exit(1)

asyncio.run(main())
PYTHON_EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 音频生成失败${NC}"
    exit 1
fi

if [ ! -f "$RAW_AUDIO" ]; then
    echo -e "${RED}❌ 音频文件未生成${NC}"
    exit 1
fi

# 获取原始时长
ORIGINAL_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$RAW_AUDIO")
echo -e "${GREEN}   原始音频时长: ${ORIGINAL_DUR}s${NC}"
echo ""

# Step 2: 音频后处理
echo -e "${YELLOW}🎚️  Step 2: 音频后处理...${NC}"
echo "   去静音 + 语速调整 (${SPEED}x)"

# 检查 ffmpeg
if ! command -v $FFMPEG_BIN &> /dev/null; then
    echo -e "${RED}❌ ffmpeg 未找到${NC}"
    exit 1
fi

$FFMPEG_BIN -y \
    -i "$RAW_AUDIO" \
    -af "silenceremove=start_periods=1:start_duration=0.2:start_threshold=-50dB:detection=peak,\
         silenceremove=stop_periods=-1:stop_duration=0.2:stop_threshold=-50dB:detection=peak,\
         atempo=${SPEED}" \
    -c:a aac -b:a 256k -ar 48000 -ac 2 \
    "$PROCESSED_AUDIO" 2>/dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 音频后处理失败${NC}"
    exit 1
fi

if [ ! -f "$PROCESSED_AUDIO" ]; then
    echo -e "${RED}❌ 处理后音频文件未生成${NC}"
    exit 1
fi

# 获取处理后时长
FINAL_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$PROCESSED_AUDIO")
echo -e "${GREEN}   ✅ 处理后音频时长: ${FINAL_DUR}s${NC}"
echo ""

# 计算帧数（60fps）
TOTAL_FRAMES=$(echo "$FINAL_DUR * 60" | bc | awk '{print int($1+0.5)}')
echo -e "${YELLOW}📊 视频参数计算:${NC}"
echo "   最终时长: ${FINAL_DUR}s"
echo "   帧率: 60fps"
echo "   总帧数: ${TOTAL_FRAMES}"
echo ""

# 总结
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✅ 语音合成完成${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}📁 输出文件:${NC}"
echo "   原始音频: $RAW_AUDIO"
echo "   处理后音频: $PROCESSED_AUDIO"
echo ""
echo -e "${YELLOW}📝 下一步:${NC}"
echo "   1. 使用 ${FINAL_DUR}s 作为总时长生成字幕"
echo "   2. Remotion 渲染: 帧数=${TOTAL_FRAMES}"
echo ""
echo -e "${BLUE}============================================${NC}"
