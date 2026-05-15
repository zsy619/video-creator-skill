# Audio Voice Identification Technique

## Problem

Given an existing video project's audio file (e.g., `neural_1_2x.m4a`), determine which edge-tts voice was used, without access to session logs or the original TTS command.

## Voice Priority (Authoritative — from VOICE.md)

| 优先级 | 语音 | 风格 | 适用场景 |
|--------|------|------|----------|
| 1 | `zh-CN-YunjianNeural` | 温和男声，自然流畅 | **通用默认** |
| 2 | `zh-CN-YunxiNeural` | 年轻男声，清晰有力 | 科技/工具类 |
| 3 | `zh-CN-YunyangNeural` | 新闻男声，稳重 | 新闻/资讯类 |

**Fallback 规则**：首选不可用时，必须选择另一个男声，**禁止降级到女声**。

## Identification Technique: Audio Fingerprinting

### Step 1: Check filename pattern

```
neural_1_2x.m4a  → edge-tts Neural series (Azure Neural TTS)
```

The `neural_` prefix is the standard output filename from `edge-tts --write-media output.mp3`, then processed through:
```bash
ffmpeg -i input.mp3 -af "silenceremove=start_periods=1:detection=peak,atempo=1.2" -c:a aac -b:a 256k neural_1_2x.m4a
```

| Filename pattern | Voice type | Example voice |
|---|---|---|
| `neural_1_2x.m4a` | Neural 男声 | 需要结合项目主题判断 |
| `neural_full.mp3` | Neural 男声（未加速） | 同上 |
| `*_yunjian_*` | 温和男声 | zh-CN-YunjianNeural |
| `*_yunxi_*` | 年轻男声 | zh-CN-YunxiNeural |
| `*_xiaoxiao_*` | 女声 | zh-CN-XiaoxiaoNeural |

**重要**：从文件名无法区分 Yunyang/Yunjian/Yunxi，核心判断依据是 `video-config.json` 的 `voice` 字段（显式覆盖优先）。若无覆盖，按主题推断：
- 科技/工具/GitHub 项目 → `zh-CN-YunxiNeural`
- 新闻/资讯类 → `zh-CN-YunyangNeural`
- 通用/其他 → `zh-CN-YunjianNeural`

> ⚠️ **推断不等于强制**：用户可以在任意项目中选择非主题对应的声音（如 markdown-nice 科技工具类项目使用 YunjianNeural），**voice 字段值 = 最终答案**。

### Step 2: Check audio format (ffprobe)

```bash
ffprobe -v quiet -print_format json -show_streams "audio/neural_1_2x.m4a" 2>/dev/null | \
  python3 -c "import json,sys; d=json.load(sys.stdin); s=d['streams'][0]; \
  print(f'codec: {s[\"codec_name\"]}, rate: {s[\"sample_rate\"]}, ch: {s[\"channels\"]}, dur: {s[\"duration\"]}')"
```

edge-tts Neural voice output characteristics:
- **codec**: aac (m4a container)
- **sample_rate**: 24000 Hz
- **channels**: 1 (mono)
- **duration**: varies

### Step 3: Cross-reference with project theme and VOICE.md priority

```python
# Python 3: detect voice from project characteristics
def identify_voice(project_dir):
    import json
    with open(f"{project_dir}/video-config.json") as f:
        config = json.load(f)
    
    theme = config.get("theme", "")
    voice_override = config.get("voice", "")
    
    if voice_override:
        return voice_override  # explicit override takes priority
    
    # Infer from theme
    if theme in ["cyberpunk", "tech-dark"]:
        return "zh-CN-YunxiNeural"  # tech/tools
    else:
        return "zh-CN-YunjianNeural"  # general
```

### Step 4: Confirm via captions.json format

captions.json with `start`/`end` float fields (not `startMs/endMs`) indicates older Python generation script:
```json
{"start": "0.0", "end": "4.5", "text": "..."}  # older format
{"startMs": 0, "endMs": 4324, "text": "..."}  # newer format
```

Both formats are compatible with Remotion Native CaptionOverlay.

## Quick Identification Checklist

1. `neural_1_2x.m4a` filename → Neural voice (Azure edge-tts)
2. AAC / 24kHz / mono → edge-tts Neural standard output
3. **Read `video-config.json` — `voice` field = definitive answer**（显式覆盖优先）
4. If no `voice` field: infer from `theme` field (cyberpunk → YunxiNeural; else → YunjianNeural)
5. Fallback: check report.json / session-log.md if available

## Permanent User Voice Preference

**Default**: `zh-CN-YunjianNeural` (温和男声，自然流畅)
- Set 2026-05-15
- For tech/tools projects (GitHub repos, AI tools): use `zh-CN-YunxiNeural`
- For news/info projects: use `zh-CN-YunyangNeural`
- Fallback to other male Neural voices if unavailable (Yunjian → Yunxi → Yunyang)
- Female voices only used if explicitly requested by user
