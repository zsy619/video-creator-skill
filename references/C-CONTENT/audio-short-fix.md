# 音频时长异常修复手册

> **最后更新**：2026-05-31
> **配套**：`audio-tts.md`（edge-tts 规范）、`subtitle-production.md`（字幕时间轴）

---

## 核心原则

音频时长长的根本原因是 **narration 文字不够**，不是 atempo 太小。
- atempo 的作用是微调（±30%），不是将 20s 音频拉伸到 60s
- 若 atempo 计算值 < 0.7 或 > 1.3，说明 narration 需要重写，不是调整 atempo

---

## 失败模式 1：音频过短（最常见）

**症状**：
- narration.txt 字数正常（如 150+ 字）
- edge-tts 生成的音频只有 20-30s，目标 52s
- atempo 计算值极小（如 0.56）

**根因**：narration 口语化程度低，标点短句少，edge-tts 读得快（实际语速 5-6 chars/s）

**检测**：
```bash
ACTUAL=$(ffprobe -v error -show_entries format=duration -of csv=p=0 audio/neural_full.mp3)
TARGET=52
ATEMPO=$(python3 -c "print(round($ACTUAL / $TARGET, 4))")
echo "atempo=$ATEMPO (合理范围 0.75-1.25)"
```

**修复**：重写 narration.txt，增加：
1. 完整句子（句号结尾）
2. 连接词和过渡语
3. 适当重复关键词
4. 目标：字符数 / 3.37 ≤ TARGET_DURATION（留 5% 余量）

---

## 失败模式 2：音频时长远超目标（少见）

**症状**：atempo 计算值 > 1.3

**修复**：在 narration 末尾添加内容总结或重复核心信息，延长音频

---

## 失败模式 3：narration 文字数量正常但音频偏短

**根因**：中文复合句多，英文/URL/符号多，导致实际语速 > 3.37 chars/s

**检测**：
```python
text = open('docs/narration.txt').read()
chars = len(text)
actual_dur = float(subprocess.check_output(...))  # ffprobe
actual_rate = chars / actual_dur
print(f"实际语速: {actual_rate:.2f} chars/s")
```

**修复**：
- 减少 URL 和英文技术词汇
- 将长复合句拆成多个短句
- 增加感叹词和连接词

---

## 经验记录（2026-05-31 codeburn 项目）

| narration 特征 | edge-tts 时长 | atempo → 最终时长 |
|---|---|---|
| 154字，标点少 | 24.7s | 0.56 → ~44s（不足） |
| 177字，过短 | 29.2s | 0.56 → ~52s（不足） |
| 200字，口语化 | 44.3s | 0.85 → ~52s（✅） |
| 402字，口语化 | 58.3s | 1.12 → ~52s（✅） |

---

## 快速自检流程（音频生成后立即执行）

```bash
# Step 1: 检查原始音频时长
ACTUAL=$(ffprobe -v error -show_entries format=duration -of csv=p=0 audio/neural_full.mp3)
TARGET=52
ATEMPO=$(python3 -c "print(round($ACTUAL / $TARGET, 4))")
echo "原始: ${ACTUAL}s → atempo: ${ATEMPO}"

# Step 2: 判断是否需要重写 narration
if (( $(echo "$ATEMPO < 0.7 || $ATEMPO > 1.3" | bc -l) )); then
    echo "⚠️ atempo 异常: $ATEMPO"
    echo "建议: 重写 narration.txt（添加内容/过渡/重复核心词）"
else
    echo "✅ atempo 正常，继续处理"
fi
```