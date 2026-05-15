# TTS 语音生成与 edge-tts 使用

> **最后更新**：2026-05-15
> **配套文档**：`audio-production.md`（音频验证与处理）、`ass-subtitle-production.md`（字幕生成）

---

## 1. edge-tts CLI 正确用法

### 正确语法

```bash
# ✅ 正确：--write-media（不是 --output）
edge-tts \
  --voice zh-CN-YunjianNeural \
  --rate "+20%" \
  --text "$(cat narration.txt)" \
  --write-media audio/neural_1_2x.m4a
```

```bash
# ❌ 错误：--output 不存在
edge-tts --voice ... --output audio/out.m4a
# → edge-tts: error: unrecognized arguments: --output
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `--voice` | 声音名称 |
| `--rate` | 语速百分比，如 +20%（不是倍数） |
| `--text` | 直接传递文本 |
| `--write-media` | 输出音频文件路径（不是 --output） |
| `-f, --file` | 从文件读取文本 |

### 速率与时长关系

edge-tts 直接按目标语速生成，不需要 atempo 后处理：
- `+20%` = 1.2x 语速
- `+0%` = 1.0x 语速
- `-10%` = 0.9x 语速

### 常见错误

```
edge-tts: error: unrecognized arguments: --output audio/out.m4a
```
原因：误用 --output，正确参数是 --write-media。

---

## 2. 服务不可用：诊断与备用方案（2026-05-15）

### 本次发现（2026-05-15）

**症状**：
- `zh-CN-YunjianNeural` 调用失败：`NoAudioReceived: No audio was received`
- 同时检测到 `speech.platform.bing.com` 返回 "Our services aren't available right now"
- `edge-tts --list-voices` 正常（不依赖语音合成）

**根因**：Microsoft edge-tts 语音合成服务暂时不可用，但边缘列表功能正常。

### 已知可用的中文 voices（2026-05-15 实测）

| Voice | 性别 | 状态 | 备注 |
|-------|------|------|------|
| zh-CN-YunjianNeural | 男 | ✅ 可用 | **用户首选男声（默认）** |
| zh-CN-YunxiNeural | 男 | ✅ 可用 | 科技/工具类备选 |
| zh-CN-XiaoxiaoNeural | 女 | ✅ 可用 | **禁用**（用户不接受女声） |

> **2026-05-15 补充**：
> 1. `zh-CN-YunjianNeural` 实测成功（用户确认温和男声效果满意）
> 2. 用户永久偏好：`zh-CN-YunjianNeural`（默认）> `zh-CN-YunxiNeural` > `zh-CN-YunyangNeural`
> 3. **禁止降级到女声**（XiaoxiaoNeural 等）

### 建议流程

生成音频时实现自动备用逻辑：

```python
async def generate_audio(text, output_path, primary_voice="zh-CN-YunjianNeural"):
    # 男声优先：YunjianNeural → YunxiNeural → YunyangNeural
    # 禁止降级到女声（XiaoxiaoNeural 等）
    voices_to_try = ["zh-CN-YunjianNeural", "zh-CN-YunxiNeural", "zh-CN-YunyangNeural"]

    for voice in voices_to_try:
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(output_path)
            print(f"✅ {voice} 成功")
            return
        except edge_tts.exceptions.NoAudioReceived:
            print(f"⚠️ {voice} 不可用，尝试下一个...")
            continue

    raise Exception("所有男声均不可用，请检查网络或 Microsoft 服务状态")
```

> **⚠️ 重要**：禁止将 `zh-CN-XiaoxiaoNeural`（女声）加入备用列表。用户默认使用男声，不接受女声配音。

### 服务恢复检测

```bash
# 检测 speech.platform.bing.com 是否恢复
curl -s --max-time 5 https://speech.platform.bing.com 2>&1 | head -1
# 返回 HTML 表示服务不可用
# 无响应或超时可能表示网络问题
```

> **⚠️ 语速实测修正（2026-05-13）**：
> `zh-CN-YunjianNeural` + `atempo 1.2x` 在实际视频旁白（长复合句，含英文/符号）中实测：
> - 294字 → 78.9秒 = **3.73 字/秒**
> - 184字 → 52.8秒 = **3.73 字/秒**
>
> **安全字数上限**：`⌊目标时长 × 3.37⌋`（3.37 = 3.73 × 0.9）
>
> ⚠️ 6.45 字/秒基准来自高密度短句测试，与实际视频旁白（含英文/符号/URL、长复合句）差异显著。**实际项目必须用 3.37 安全上限。**
>
> | 场景 | 文本长度 | 生成时长 | 结果 |
> |------|---------|---------|------|
> | 长文本（完整旁白） | ~300字 | 23.9s | 截断，文本后半部分丢失 |
> | 短文本（单场景） | ~50字 | 4-6s | 正常生成 |
>
> **不要依赖 text_to_speech 生成精确时长的音频** — 它会自动截断。最可靠流程：先生成原始音频 → 后处理（atempo/apad）→ 确认最终时长 → 生成字幕。

### 应对策略

**策略一：ffmpeg atempo 拉伸（推荐）** — 配音文本一次生成，需要加速时用 atempo。

**策略二：apad 补齐** — 视频 > 音频时，用 `ffmpeg -af "apad=whole_dur=TARGET"` 补齐静音。

**策略三：分段生成 + 拼接** — 每段 < 24s 后拼接（实测可能有静音或杂音）。

---

## 3. 语音优先级规范

> **来源**：VOICE.md（权威）

| 优先级 | 语音 | 风格 | 适用场景 |
|--------|------|------|----------|
| 1 | `zh-CN-YunjianNeural` | 温和男声，自然流畅 | **通用默认** |
| 2 | `zh-CN-YunxiNeural` | 年轻男声，清晰有力 | 科技/工具类 |
| 3 | `zh-CN-YunyangNeural` | 新闻男声，稳重 | 新闻/资讯类 |

**Fallback 规则**：首选不可用时，必须选择另一个男声，**禁止降级到女声**。

### 语音推断规则

从音频文件名无法区分 Yunyang/Yunjian/Yunxi，核心判断依据是 `video-config.json` 的 `voice` 字段（显式覆盖优先）。若无覆盖，按主题推断：
- 科技/工具/GitHub 项目 → `zh-CN-YunxiNeural`
- 新闻/资讯类 → `zh-CN-YunyangNeural`
- 通用/其他 → `zh-CN-YunjianNeural`

> ⚠️ **推断不等于强制**：用户可以在任意项目中选择非主题对应的声音，**voice 字段值 = 最终答案**。
