# Workspace 项目三封面完整性审计脚本

> 对 workspace 项目执行系统性 video-creator 质量审计。
> 触发条件：用户要求"根据 video-creator 技能核对"或"补全封面和文档"。

## 快速 TODO 清单（必须逐项验证）

| TODO | 检查项 | 规格要求 | 修复命令 |
|------|--------|---------|---------|
| TODO-1 | article.md 内容 | >500B，无 `"请在此处粘贴"` 占位符 | 手动填充真实内容 |
| TODO-2 | narration.txt | 中文字符 ≥175，句数 ≥10 | 手动重写 narration |
| TODO-3 | `docs/assets/cover.png` | 1080×1920，>10KB | `python3 .../generate_cover.py vertical "标题" "副标题" {dir}` |
| TODO-3 | `docs/assets/cover-wechat.png` | 900×383，>10KB | `python3 .../generate_cover.py wechat "标题" "副标题" {dir}` |
| TODO-3 | `docs/assets/cover-xhs.png` | 1440×2560，>10KB | `python3 .../generate_cover.py xhs "标题" "副标题" {dir}` |
| TODO-4 | `audio/neural_full.mp3` | 存在，>0字节 | `edge-tts --text "$(cat docs/narration.txt)" --write-media audio/neural_full.mp3` |
| TODO-4 | `audio/neural_1_2x.m4a` | atempo 处理后音频，**必须比原始短**（1.2x 压缩） | `ffmpeg -i audio/neural_full.mp3 -filter:a "atempo=1.2" -codec:a aac audio/neural_1_2x.m4a` |
| TODO-4 | `video-project/public/audio/neural_full.mp3` | 必须存在（Remotion 渲染必需） | `cp audio/neural_full.mp3 video-project/public/audio/` |
| TODO-5 | `audio/captions.json` | ≥10句，末句 endMs = 音频时长(毫秒) | Python 等比分段脚本 |
| TODO-5 | `video-project/public/audio/captions.json` | 同上，Remotion 渲染必需 | `cp audio/captions.json video-project/public/audio/` |
| TODO-6 | Root.tsx `durationInFrames` | `round(音频秒数×60)`，误差≤5帧 | `patch Root.tsx -r durationInFrames={N}` |
| TODO-7 | Remotion 项目结构 | Video.tsx / DynamicScene.tsx / package.json / 无 literal \n | `wc -l` + Python 字节检测 |
| TODO-8 | video-config.json | 含 `cover.title` / `cover.subtitle` / `theme` | 读取并更新 |

## ⚠️ 陷阱警示

### atempo 音频异常检测
**症状**：`audio/neural_1_2x.m4a` 时长 ≥ `audio/neural_full.mp3`（应该更短）
**根因**：上一次 ffmpeg atempo 处理可能失败，生成了与原始相同或更长的文件
**修复**：重新执行 `ffmpeg -i neural_full.mp3 -filter:a "atempo=1.2" -codec:a aac neural_1_2x.m4a`

### 三封面缺失检测
**症状**：workspace 项目只有 `cover.png`，缺少 `cover-wechat.png` 和/或 `cover-xhs.png`
**根因**：`generate_cover.py` 被调用时只传了 `vertical`，未传 `wechat` 和 `xhs`
**修复**：分别调用三次 generate_cover.py，传入正确的 canvas_type

### Workspace 路径混淆
**症状**：检查旧路径 `/Users/zhushuyan/.hermes/workspace/` 时文件都存在，但用户项目仍然报错缺失
**根因**：用户 workspace 实际路径是 `/Volumes/OpenClawDrive/.hermes/workspace/`
**处理**：必须以用户指定的 `/Volumes/OpenClawDrive/` 路径为准，不要使用旧路径

## Python 批量审计脚本

```python
import subprocess, re, os, json

WORKSPACE = '/Volumes/OpenClawDrive/.hermes/workspace'
SKILL = '/Users/zhushuyan/.hermes/skills/video-creator'
projects = ['project1', 'project2']

def get_dur(path):
    return float(subprocess.check_output(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], text=True).strip())

def get_img_size(path):
    out = subprocess.check_output(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=s=x:p=0', path], text=True).strip()
    w, h = map(int, out.split('x'))
    return w, h

for proj in projects:
    d = f'{WORKSPACE}/{proj}'
    print(f'\n=== {proj} ===')
    
    # 三封面
    for fname, w, h, label in [
        ('cover.png', 1080, 1920, '视频号'),
        ('cover-wechat.png', 900, 383, '公众号'),
        ('cover-xhs.png', 1440, 2560, '小红书'),
    ]:
        path = f'{d}/docs/assets/{fname}'
        if os.path.exists(path):
            actual_w, actual_h = get_img_size(path)
            sz = os.path.getsize(path)
            ok = actual_w == w and actual_h == h and sz > 10000
            print(f'  {fname} ({label}): {actual_w}×{actual_h} {sz//1024}KB {"✅" if ok else "❌"}')
        else:
            print(f'  {fname}: ❌ 缺失')
    
    # atempo 检测
    if os.path.exists(f'{d}/audio/neural_1_2x.m4a'):
        orig = get_dur(f'{d}/audio/neural_full.mp3')
        tempo = get_dur(f'{d}/audio/neural_1_2x.m4a')
        ok = tempo < orig
        print(f'  atempo音频: {tempo:.2f}s vs 原始{orig:.2f}s {"✅" if ok else "❌ 应更短"}')
    
    # 帧数同步
    root = f'{d}/video-project/src/Root.tsx'
    if os.path.exists(root) and os.path.exists(f'{d}/audio/neural_full.mp3'):
        content = open(root).read()
        m = re.search(r'durationInFrames=\{(\d+)\}', content)
        if m:
            dur = get_dur(f'{d}/audio/neural_full.mp3')
            diff = abs(int(m.group(1)) - round(dur * 60))
            print(f'  帧数同步: {int(m.group(1))}帧 vs 应有{round(dur*60)}帧 {"✅" if diff<=5 else "❌"}')
```

## 标题/副标题来源优先级

若项目缺少封面，需要知道正确的标题和副标题：

1. **优先**：`video-config.json` → `cover.title` / `cover.subtitle`
2. **次之**：从 `docs/article.md` 提取项目名和一句话描述
3. **GitHub 项目**：从 `*-repo/README.md` 提取

> ⚠️ 封面标题不能含有 `github.com/xxx` 等占位符（见 SKILL.md 占位符污染警告）