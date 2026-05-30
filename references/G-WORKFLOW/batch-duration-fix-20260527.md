# 批量视频同步修复手册（2026-05-27）

> **最后更新**：2026-05-27

## 问题规模

141 个有效项目，发现并修复 4 类问题：
- DURATION_FRAMES 偏差：130 个
- video-config.json 缺 duration 字段：139 个
- 音频/视频不同步：12 个
- 字幕 endMs 偏差：10 个

## 四维检测框架

### 1. DURATION_FRAMES vs 视频实测帧数

```python
import os, re, subprocess, json, math
from concurrent.futures import ThreadPoolExecutor, as_completed

workspace = "/Volumes/OpenClawDrive/.hermes/workspace"

def check_one(name):
    try:
        out_dir = os.path.join(workspace, name, "video-project", "out")
        root_tsx = os.path.join(workspace, name, "video-project", "src", "Root.tsx")
        mp4s = [f for f in os.listdir(out_dir) if f.endswith('.mp4')]
        if not mp4s: return None
        r = subprocess.run(['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format',
                           os.path.join(out_dir, mp4s[0])],
                          capture_output=True, text=True, timeout=15)
        video_s = float(json.loads(r.stdout)['format']['duration'])
        with open(root_tsx) as f: content = f.read()
        fm = re.search(r'DURATION_FRAMES\s*=\s*(\d+)', content)
        if not fm: fm = re.search(r'durationInFrames\s*=\s*\{\s*(\d+)\s*\}', content)
        frames = int(fm.group(1)) if fm else None
        return {'name': name, 'frames': frames, 'video_s': video_s,
                'correct': round(video_s * 60)}
    except: return None

projects = sorted([n for n in os.listdir(workspace)
    if os.path.isdir(os.path.join(workspace, n, "video-project"))
    and os.path.isfile(os.path.join(workspace, n, "video-config.json"))
    and os.path.exists(os.path.join(workspace, n, "video-project", "src", "Root.tsx"))
    and os.path.isdir(os.path.join(workspace, n, "video-project", "out"))])

results = {}
with ThreadPoolExecutor(max_workers=12) as ex:
    futures = [ex.submit(check_one, n) for n in projects]
    for fut in as_completed(futures):
        r = fut.result()
        if r: results[r['name']] = r

# 修正 DURATION_FRAMES
for r in results.values():
    if r['frames'] != r['correct']:
        # patch Root.tsx: DURATION_FRAMES=xxx → correct
        pass
```

### 2. video-config.json 完整性

```python
# 补充 durationInSeconds / totalMs
for name, video_s in video_durations.items():
    vc_path = os.path.join(workspace, name, "video-config.json")
    with open(vc_path) as f: raw = f.read()
    if 'durationInSeconds' not in raw and 'totalMs' not in raw:
        # 插入 "durationInSeconds": video_s (保留 3 位小数)
        pass
```

### 3. 音频同步检测与修复

```python
# 音频时长 vs 视频时长，差 >0.1s → 需要 pad 或 truncate
audio_mismatch = [
    ("CF-Hero", 60.160, 85.123),  # 音频太长 → truncate
    ("cc-connect-video", 22.357, 20.064),  # 音频太短 → pad
]
```

**pad 音频（音频 < 视频）：**
```bash
ffmpeg -y -i audio/neural_1_2x.m4a \
  -f lavfi -t PAD秒 -i anullsrc=r=24000:cl=mono \
  -filter_complex '[0:a][1:a]concat=n=2:v=0:a=1[out]' \
  -map '[out]' -c:a aac -b:a 256k /tmp/out.m4a
cp /tmp/out.m4a audio/neural_1_2x.m4a
```

**truncate 音频（音频 > 视频）：**
```bash
ffmpeg -y -i audio/neural_1_2x.m4a -t 视频秒数 \
  -c:a aac -b:a 256k /tmp/out.m4a
cp /tmp/out.m4a audio/neural_1_2x.m4a
```

### 4. 字幕 endMs 修复

```python
# scale 公式
caption_fixes = [
    ("CF-Hero", 60160, 85163),
    ("hermes-paperclip-adapter-video", 21056, 25204),
]

for name, video_ms, cap_endms in caption_fixes:
    caps_path = os.path.join(workspace, name, "audio", "captions.json")
    with open(caps_path) as f: caps = json.load(f)
    scale = video_ms / cap_endms
    for cap in caps:
        cap['startMs'] = round(cap['startMs'] * scale)
        cap['endMs'] = round(cap['endMs'] * scale)
    with open(caps_path, 'w') as f:
        json.dump(caps, f, ensure_ascii=False, indent=2)
```

## 关键发现

1. **3119 帧项目全部差 32ms**：模板复用项目，DURATION_FRAMES=3119 对应 51.983s，实际渲染 52.032s。差 3 帧。
2. **音频不一定是 neural_1_2x**：markdown-nice-video 用的是 `neural_30pct_bgm.m4a`（29.440s），seomachine-video/shadowbroker-video 用 `neural_1_2x` 但比例异常（38s vs 42s/52s vs 58s）。
3. **Python 3.9 JSON 严格模式**：trailing comma（`,}` 或 `,]`）直接报错，不只是 CPA-Helper。

## 全量验证脚本（单次扫描，2026-05-28）

```python
import os, subprocess, json

workspace = "/Volumes/OpenClawDrive/.hermes/workspace"
valid = [p for p in os.listdir(workspace)
         if os.path.exists(f"{workspace}/{p}/video-project/out/final.mp4")]

print(f"=== 最终状态汇总 ===")
print(f"有效项目: {len(valid)}")

no_cfg = [p for p in valid if not os.path.exists(f"{workspace}/{p}/video-config.json")]
no_dur = [p for p in valid if os.path.exists(f"{workspace}/{p}/video-config.json")
          and not json.load(open(f"{workspace}/{p}/video-config.json")).get('duration')
          and not json.load(open(f"{workspace}/{p}/video-config.json")).get('durationInSeconds')]
print(f"无 video-config.json: {len(no_cfg)}")
print(f"video-config 无 duration: {len(no_dur)}")

audio_issues = []
for p in valid:
    if not os.path.exists(f"{workspace}/{p}/audio/neural_1_2x.m4a"): continue
    vr = subprocess.run(['ffprobe','-v','quiet','-print_format','json','-show_format',
                       f"{workspace}/{p}/video-project/out/final.mp4"],
                      capture_output=True, text=True, timeout=10)
    vd = float(json.loads(vr.stdout)['format']['duration'])
    ar = subprocess.run(['ffprobe','-v','quiet','-print_format','json','-show_format',
                       f"{workspace}/{p}/audio/neural_1_2x.m4a"],
                      capture_output=True, text=True, timeout=10)
    ad = float(json.loads(ar.stdout)['format']['duration'])
    if abs(ad - vd) > 0.15: audio_issues.append((p, round(ad,3), round(vd,3)))
print(f"音频同步误差>0.15s: {len(audio_issues)}")

cover_issues = [p for p in valid if os.path.exists(f"{workspace}/{p}/video-config.json")
                and not json.load(open(f"{workspace}/{p}/video-config.json")).get('cover',{}).get('title')]
print(f"cover.title 缺失: {len(cover_issues)}")

repos = [d for d in os.listdir(workspace) if d.endswith('-repo')]
print(f"-repo 残留: {len(repos)}")

if not (no_cfg or no_dur or audio_issues or cover_issues or repos):
    print("\n所有检查通过 ✓")
```

## 本轮批量修复记录（2026-05-28）

| 类别 | 数量 | 说明 |
|------|------|------|
| 新建 video-config.json | 4 | react-doctor-video / 9router / freellmapi / andrej-karpathy-video |
| 补充 duration | 1 | CPA-Helper（从 scenes endMs 推算） |
| cover.image 路径修正 | 33 | `.webp` → `.png`（实际文件为 png） |
| 移除无效 image 引用 | 8 | 文件不存在，无替代 |
| 音频同步阈值 | 0.15s | 从 0.1s 上调（ffprobe ±50ms 测量误差） |

### 关键教训

1. **封面图路径以实际文件存在为准**：`docs/assets/cover.webp` 批量引用但实际全是 `.png`，修正后缀
2. **ffprobe 音频测量误差约 ±50ms**：音频同步阈值 0.15s 兼顾准确性与实用性
3. **video-config.json cover 字段空对象**：CPA-Helper 的 `{}` 从 scenes totalMs 推算补充
4. **无 article.md 但有替代内容**：freellmapi / andrej-karpathy-video 有 narration.txt/video-script.md 等，不影响渲染
