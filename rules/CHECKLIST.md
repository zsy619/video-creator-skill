# Video Creator 执行清单 (CHECKLIST)

> 所属模块：video-creator / SKILL.md → 执行检查清单
> **最后更新**：2026-05-23（动态 N 场景 + Remotion Native 方案）

## ⚠️ 重要说明

本文档是 video-creator 技能的**强制执行清单**。每个 Step 完成后必须运行相应的检查命令，确保没有遗漏。

---

## Step 0: 创建文档（完成后必须验证）

### 验证命令
```bash
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"
for f in README.md article.md video-script.md copy.md wechat-copy.md posting-guide.md landing-page.html article-page.html wechat-page.html session-log.md report.json narration.txt; do
  if [ ! -f "$PROJECT_DIR/docs/$f" ]; then
    echo "❌ 缺失: $f"
    exit 1
  fi
done
echo "✅ Step 0 完成，所有12个文档已创建"
```

### 检查项
- [ ] README.md 存在
- [ ] article.md 存在
- [ ] narration.txt 存在（内容干净，无控制字符/乱码）
- [ ] video-script.md 存在
- [ ] copy.md 存在
- [ ] wechat-copy.md 存在
- [ ] posting-guide.md 存在
- [ ] landing-page.html 存在
- [ ] article-page.html 存在
- [ ] wechat-page.html 存在
- [ ] session-log.md 存在
- [ ] report.json 存在

---

## Step 6: 生成视觉（封面强制优先）

### 封面尺寸要求

| 封面类型 | 文件名 | 尺寸 | 比例 |
|---------|--------|------|------|
| 竖屏视频 | `cover.png` | 1080×1920 | 9:16 |
| 公众号 | `cover-wechat.png` | 900×383 | 约2.35:1 |
| 小红书 | `cover-xhs.png` | 1440×2560 | 9:16 |

### 验证命令
```bash
# 验证封面尺寸
ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
  -of csv=s=x:p=0 "$PROJECT_DIR/docs/assets/cover.png"
# 应输出: 1080x1920

ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
  -of csv=s=x:p=0 "$PROJECT_DIR/docs/assets/cover-wechat.png"
# 应输出: 900x383

ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
  -of csv=s=x:p=0 "$PROJECT_DIR/docs/assets/cover-xhs.png"
# 应输出: 1440x2560
```

### 检查项
- [ ] `docs/assets/cover.png` 存在，尺寸 1080×1920
- [ ] `docs/assets/cover-wechat.png` 存在，尺寸 900×383
- [ ] `docs/assets/cover-xhs.png` 存在，尺寸 1440×2560
- [ ] 封面图片文件大小 > 10KB（确保不是空白图）

---

## Step 7: 生成音频

### 音频命名规范
- **标准文件名**: `audio/neural_1_2x.m4a`
- 禁止使用: `neural_processed.m4a`, `audio.m4a`, `voice.mp3` 等非标准命名

### 音频参数要求
- 格式: AAC
- 码率: 256kbps
- 采样率: 48000Hz
- 声道: 立体声
- 语速: 1.2x

### 验证命令
```bash
# 验证音频参数
ffprobe -v error -select_streams a:0 \
  -show_entries stream=codec_name,bit_rate,sample_rate,channels \
  -of default=noprint_wrappers=1 "$PROJECT_DIR/audio/neural_1_2x.m4a"

# 验证音频时长
ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1 "$PROJECT_DIR/audio/neural_1_2x.m4a"
```

### 检查项
- [ ] `audio/neural_1_2x.m4a` 存在
- [ ] 音频编码为 AAC
- [ ] 码率为 256kbps
- [ ] 采样率为 48000Hz
- [ ] 时长与视频时长匹配 (±0.5秒)

---

## Step 8: 生成字幕

### 字幕规范
> ⚠️ **已迁移至 Remotion Native 方案**：不再使用 ASS 文件，改用 `audio/captions.json` + `@remotion/captions`

- **格式**: JSON（Remotion Native）
- **文件名**: `audio/captions.json`（同步备份至 `video-project/public/audio/captions.json`）
- **结构**: `[{startMs, endMs, text}]`
- **末段 endMs**: 必须等于视频实际时长（毫秒），由 launch.sh Step 7.5 自动同步
- **禁止**: `audio/subtitles.ass`（旧 ASS 方案已废弃）

### 验证命令
```bash
# 验证 captions.json 格式
node -e "var c=require('$PROJECT_DIR/audio/captions.json');console.log('段落数:',c.length,'末段endMs:',c[c.length-1].endMs);"
# 验证视频时长一致性
python3 -c "import subprocess; v=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0','$PROJECT_DIR/video-project/out/final.mp4']).strip()); print(f'视频: {v*1000:.0f}ms / 字幕末段: {float(open('$PROJECT_DIR/audio/captions.json').read().split()[-2]) if False else 0}ms')"
```

### 检查项
- [ ] `audio/captions.json` 存在
- [ ] 末段 `endMs` 等于视频实际时长（毫秒）
- [ ] 每段 `startMs < endMs`
- [ ] 无重复段落

---

## Step 10: 生成视频

### 视频参数要求
- **分辨率**: 1080×1920 (竖屏)
- **帧率**: 60fps
- **编码**: H.264
- **音频**: AAC
- **文件名**: `video-project/out/final.mp4`（Remotion Native 方案，音频内嵌，无需 ffmpeg 混流）

### 验证命令
```bash
# 验证视频参数
ffprobe -v error -select_streams v:0,a:0 \
  -show_entries stream=codec_name,width,height \
  -show_entries format=duration,size \
  -of default=noprint_wrappers=1 "$PROJECT_DIR/video-project/out/final.mp4"
```
...
- [ ] `video-project/out/final.mp4` 存在
- [ ] 视频编码为 H.264
- [ ] 分辨率为 1080×1920
- [ ] 帧率为 60fps
- [ ] 包含音频轨道 (AAC)
- [ ] 时长与配音时长匹配
- [ ] 文件大小 > 500KB

---

## Step 11: 生成报告

### 报告内容要求
report.json 必须包含：
- 项目名称
- 创建时间
- 视频规格（分辨率、帧率、时长）
- 文件清单（所有资源文件路径）
- 字幕规格
- 音频参数

### 验证命令
```bash
# 验证 report.json 存在且格式正确
cat "$PROJECT_DIR/docs/report.json" | python3 -m json.tool > /dev/null
echo $?  # 应输出 0
```

---

## 一键验证脚本

### 完整项目验证
```bash
# 使用 video-creator-validator.js 验证完整项目
node {SKILL_DIR}/scripts/video-creator-validator.js \
  "$PROJECT_DIR"
```

### 快速检查（仅关键文件）
```bash
#!/bin/bash
PROJECT_DIR="$1"
PASS=0
FAIL=0

check_file() {
  if [ -f "$1" ]; then
    echo "✅ $1"
    PASS=$((PASS+1))
  else
    echo "❌ $1"
    FAIL=$((FAIL+1))
  fi
}

# 文档
for f in "$PROJECT_DIR/docs/"{README,article,video-script,copy,wechat-copy,posting-guide,landing-page,article-page,wechat-page,session-log,report}".md"; do
  [ -f "$f" ] || [ -f "${f%.md}.html" ] || [ -f "${f%.md}.json" ] && PASS=$((PASS+1)) || FAIL=$((FAIL+1))
done

# 封面
check_file "$PROJECT_DIR/docs/assets/cover.png"
check_file "$PROJECT_DIR/docs/assets/cover-wechat.png"
check_file "$PROJECT_DIR/docs/assets/cover-xhs.png"

# 音频
check_file "$PROJECT_DIR/audio/neural_1_2x.m4a"

# 字幕
check_file "$PROJECT_DIR/audio/subtitles.ass"

# 视频
check_file "$PROJECT_DIR/video-project/out/final-with-subs.mp4"

echo ""
echo "========================================"
echo "通过: $PASS | 失败: $FAIL"
```

---

## 常见错误与修复

| 错误 | 原因 | 修复方法 |
|------|------|----------|
| 封面尺寸错误 | 使用了错误的分辨率 | 重新生成正确尺寸的封面 |
| 音频命名为 neural_processed.m4a | 未遵循命名规范 | `mv audio/neural_processed.m4a audio/neural_1_2x.m4a` |
| 字幕为 .srt 格式 | 生成了错误的格式 | 使用 ASS 格式重新生成 |
| 字幕 Fontsize≠72 | 使用了错误的字号 | 修改为 Fontsize=72（竖屏必须≥72px） |
| 视频无音频 | Remotion 渲染问题 | 使用 ffmpeg 混流音频 |
| 视频尺寸错误 | 渲染时分辨率设置错误 | 修改 Remotion 配置为 1080×1920 |

---

## 执行流程总结

```
Step 0 → Step 6 → Step 7 → Step 8 → Step 10 → Step 11
  ↓        ↓        ↓        ↓        ↓        ↓
文档   封面   音频   字幕   视频   报告
 ↓        ↓        ↓        ↓        ↓        ↓
验证   验证   验证   验证   验证   完成
```

每个 ↓ 箭头处都必须运行对应的验证命令，确保没有遗漏后再进入下一步。
