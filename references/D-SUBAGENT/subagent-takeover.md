# Subagent 超时接管流程

> **最后更新**：2026-05-28
> **来源**：oh-my-pi 项目实战

---

## 核心原则

**Subagent 报告 status=completed 不可信。** 主进程必须独立验证产出物，不能依赖 subagent 的自我报告。

**Subagent 超时后，主进程必须接管并验证**。

---

## 超时后的强制验证步骤

```bash
# 1. 视频是否存在
ls video-project/out/final.mp4

# 2. 视频时长验证（必须 ≈ 音频时长）
ffprobe -v quiet -show_entries format=duration -of csv=p=0 video-project/out/final.mp4
ffprobe -v quiet -show_entries format=duration -of csv=p=0 audio/neural_full.mp3
# 误差必须 ≤1s

# 3. 字幕末段 endMs 验证（必须 ≤ 视频时长×1000）
python3 -c "import json; c=json.load(open('audio/captions.json')); print(f'末段 endMs: {c[-1][\"endMs\"]}')"

# 4. video-config.json totalMs 验证
python3 -c "import json; c=json.load(open('video-config.json')); print(f'totalMs: {c.get(\"totalMs\")}')"

# 5. narration.txt 中文字数验证（≥175）
python3 -c "
text = open('docs/narration.txt', encoding='utf-8').read()
cn = sum(1 for c in text if '\u4e00'<=c<='\u9fff')
print(f'中文字数: {cn}')
"
```

## 不合格时的修复步骤

| 问题 | 修复 |
|------|------|
| 视频 35s ≠ 音频 75s | 重新渲染，或检查 atempo 配置 |
| captions 末段 endMs >> 视频时长 | 按比例缩放所有字幕时间戳 |
| totalMs 缺失 | 回写 `video-config.json` |
| narration 中文字数 <175 | 重新生成 narration.txt |

## 项目结构恢复

Subagent 超时后目录结构可能不完整，标准化布局：

```
oh-my-pi/
├── video-project/out/final.mp4   ← Remotion Native 输出（含音频轨道）
├── audio/
│   ├── neural_full.mp3           ← Remotion 渲染用音频
│   └── captions.json             ← 字幕
├── docs/narration.txt            ← 复制自根目录
└── video-config.json
```

## 清理后更新 Base

```bash
# 1. 清理 Git 仓库
rm -rf oh-my-pi-repo/

# 2. 更新飞书 Base（使用 +record-batch-update）
lark-cli base +record-batch-update \
  --base-token "DTjXbS3tcaLVlqss6mHcmTwrnMg" \
  --table-id "tblks7R5MCE03xlS" \
  --json '{"record_id_list":["{record-id}"],"patch":{"video-creator":"是}}'
```

## 教训（2026-05-28）

1. **Subagent max_iterations=48 次 API 调用后超时**，不是等所有步骤完成
2. **Remotion 输出文件名**：`video-project/out/final.mp4`（Remotion Native 方案，直接指定文件名）
3. **音频 75.5s vs 视频 35s**：subagent 在音频未完成处理前就触发了渲染，导致音视频完全脱节
4. **narration 字数必须受控**：179 字（10句）通过；超过 337 字会导致 atempo 异常