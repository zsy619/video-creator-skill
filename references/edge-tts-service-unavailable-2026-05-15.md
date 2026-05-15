# edge-tts 服务不可用：诊断与备用方案

## 本次发现（2026-05-15）

**症状**：
- `zh-CN-YunjianNeural` 调用失败：`NoAudioReceived: No audio was received`
- 同时检测到 `speech.platform.bing.com` 返回 "Our services aren't available right now"
- `edge-tts --list-voices` 正常（不依赖语音合成）

**根因**：Microsoft edge-tts 语音合成服务暂时不可用，但边缘列表功能正常。

## 已知可用的中文 voices（2026-05-15 实测）

| Voice | 性别 | 状态 | 备注 |
|-------|------|------|------|
| zh-CN-YunjianNeural | 男 | ✅ 可用 | **用户首选男声（默认）** |
| zh-CN-YunxiNeural | 男 | ✅ 可用 | 科技/工具类备选 |
| zh-CN-XiaoxiaoNeural | 女 | ✅ 可用 | **禁用**（用户不接受女声） |

> **2026-05-15 补充**：
> 1. `zh-CN-YunjianNeural` 实测成功（用户确认温和男声效果满意）
> 2. 用户永久偏好：`zh-CN-YunjianNeural`（默认）> `zh-CN-YunxiNeural` > `zh-CN-YunyangNeural`
> 3. **禁止降级到女声**（XiaoxiaoNeural 等）

## 建议流程

生成音频时实现自动备用逻辑：

```python
async def generate_audio(text, output_path, primary_voice="zh-CN-YunyangNeural"):
    # 男声优先：YunyangNeural → YunjianNeural → YunxiNeural
    # 禁止降级到女声（XiaoxiaoNeural 等）
    voices_to_try = ["zh-CN-YunyangNeural", "zh-CN-YunjianNeural", "zh-CN-YunxiNeural"]

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

## 服务恢复检测

```bash
# 检测 speech.platform.bing.com 是否恢复
curl -s --max-time 5 https://speech.platform.bing.com 2>&1 | head -1
# 返回 HTML 表示服务不可用
# 无响应或超时可能表示网络问题
```
