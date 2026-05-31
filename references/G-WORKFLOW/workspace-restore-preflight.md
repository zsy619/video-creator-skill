# Workspace 项目还原后预检清单

> **用途**：Git 克隆的 workspace 项目还原后、渲染前，必须强制执行本清单。
> **触发条件**：任何从飞书 Base Done 记录重新拉取的项目，或 subagent 超时后主进程接管的 workspace 项目。

---

## 快速验证命令（单行）

```bash
python3 << 'PYEOF'
import subprocess, re, json, os

WORKSPACE = '/Users/zhushuyan/.hermes/workspace'
SKILL = '/Users/zhushuyan/.hermes/skills/video-creator'

for proj in ['whichllm', 'ai-engineering-from-scratch']:
    proj_dir = f'{WORKSPACE}/{proj}'
    audio = f'{proj_dir}/audio/neural_full.mp3'
    root = f'{proj_dir}/video-project/src/Root.tsx'

    dur = float(subprocess.check_output(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'csv=p=0', audio], text=True).strip())
    expected = round(dur * 60)

    frames_in_code = None
    try:
        content = open(root).read()
        m = re.search(r'durationInFrames=\{(\d+)\}', content)
        if m:
            frames_in_code = int(m.group(1))
    except: pass

    diff = abs(frames_in_code - expected) if frames_in_code else 999
    match = '✅' if diff <= 5 else '❌'
    print(f'{proj}: audio={round(dur,1)}s expected_frames={expected} code_frames={frames_in_code} {match}')
PYEOF
```

输出 `❌` → 帧数不匹配，需修复 Root.tsx。

---

## 完整预检项（6项）

### 1. 封面图 `docs/assets/cover.png`
- **检查**：`ls -la docs/assets/cover.png`，文件 > 10KB
- **缺失**：执行 `python3 {SKILL}/scripts/generate_cover.py vertical "标题" "副标题"`
- **输出**：`docs/assets/cover.png`（1080×1920）、`cover-wechat.png`（900×383）、`cover-xhs.png`（1440×2560）

### 2. 音频 `audio/neural_full.mp3`
- **检查**：`ls -la audio/neural_full.mp3`，文件 > 100KB
- **缺失**：执行 `cd {proj} && edge-tts --voice zh-CN-YunjianNeural --text "$(cat docs/narration.txt)" --write-media audio/neural_full.mp3`
- ⚠️ narration > 1500 字符用 **inline 模式**：`--text "文本内容..."`

### 3. 公共音频 `video-project/public/audio/neural_full.mp3`
- **检查**：`ls video-project/public/audio/neural_full.mp3`
- **缺失**：执行 `cp audio/neural_full.mp3 video-project/public/audio/neural_full.mp3`
- **⚠️ 必须复制**，Remotion 从 `http://localhost:3000/public/audio/` 读取

### 4. 字幕 `video-project/public/audio/captions.json`
- **检查**：`cat audio/captions.json | jq length`
- **缺失**：用 Python 等比分段生成（见 `references/C-CONTENT/subtitle-production.md`）
- **⚠️ captions.json 末段 endMs** 必须等于 `round(音频秒数×1000)`

### 5. Root.tsx 帧数同步
- **检查**：计算期望帧数 `round(音频秒数×60)`，对比 Root.tsx 中 `durationInFrames={N}`
- **不匹配**：执行 `patch video-project/src/Root.tsx -old_string -new_string`
- **公式**：`frames = Math.round(audio_duration_seconds * 60)`
- ⚠️ 用 `round()` 而非 `Math.ceil()`

### 6. DynamicScene.tsx 完整性
- **检查**：`wc -l video-project/src/scenes/DynamicScene.tsx` 应 > 200 行
- **空文件/污染**：执行 `python3 -c "d=open('...','rb').read();open('...','wb').write(d.replace(b'\x5c\x6e',b'\x0a'))"`
- **验证**：`grep 'return <>{{' video-project/src/scenes/DynamicScene.tsx` 应无输出

---

## 常见失败模式

| 症状 | 根因 | 修复 |
|------|------|------|
| 帧数不匹配（差数百帧） | Git 项目 Root.tsx 含旧帧数 | `patch` 更新为 `round(音频秒数×60)` |
| 音频 0 字节 | `--text "$(cat)"` 超时 | inline 模式重写 |
| captions 末段 endMs 错位 | 基于旧音频生成 | 基于 atempo 后音频重新生成 |
| 渲染 404 audio | 未复制到 public/audio/ | `cp audio/neural_full.mp3 video-project/public/audio/` |
| literal `\n` 污染 | create-remotion-project.js bug | Python replace `0x5c 0x6e` → `0x0a` |