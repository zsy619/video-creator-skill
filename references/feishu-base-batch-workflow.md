# Feishu Base 批量视频项目工作流
#
# ⚠️ 已废弃：本文档描述的是旧版手动流程，与 video-creator SKILL.md v5.x 不兼容。
# ⚠️ 请勿使用本文档的工作流命令，否则会导致：无文档、无封面、音频命名混乱、帧数硬编码。
#
# 正确工作流：执行 `launch.sh all`（Step 0-11 全自动），不要手动执行 edge-tts/ffmpeg/Remotion 命令。
#
# 如果 launch.sh all 不可用，按 SKILL.md 完整工作流执行 Step 0-11。
#
## 概述
从 Feishu Base 表格筛选 `video-creator=null` 的待处理记录，批量为 GitHub 开源项目生成竖屏推广视频（1080×1920, 60fps, ~35秒），完成后标记 `video-creator=是`。

## 前置条件
- lark-cli 已配置（`lark-cli auth login`）
- Base token 和 table-id 已获取
- edge-tts、ffmpeg、node、git 可用

## ⚠️ 关键警告：音频命名规范（已废弃旧版 source.mp3/speech.mp3）

| 阶段 | 正确文件名 | 错误文件名（已废弃） |
|------|-----------|---------------------|
| edge-tts 原始 | `audio/neural_full.mp3` | `source.mp3` |
| atempo 处理后 | `audio/neural_1_2x.m4a` | `speech.mp3` |
| Remotion 引用 | `staticFile("audio/neural_1_2x.m4a")` | `staticFile("audio/speech.mp3")` |

## 完整工作流

### Step 0: 生成全部11个文档（强制，RuView之后的问题根源）

使用 `generate_docs.js` 生成标准 docs/：

```bash
node {SKILL_DIR}/scripts/generate_docs.js "{project-dir}"
```

生成的文件：
- `docs/article.md` — 原始内容
- `docs/narration.txt` — **配音文本（必须100-175中文字）**
- `docs/video-script.md` — 视频脚本
- `docs/copy.md` — 推广文案
- `docs/wechat-copy.md` — 微信公众号文案
- `docs/posting-guide.md` — 发布指南
- `docs/report.json` — 项目报告
- `docs/article-page.html` — 文章页 HTML
- `docs/landing-page.html` — 着陆页 HTML
- `docs/wechat-page.html` — 微信页 HTML
- `docs/assets/` — 资源目录

> ⚠️ **narration.txt 字数检查（强制）**：
> 35秒视频的 narration.txt 应含 100-175 个中文字符。
> 若不足，需手动重写。generate_docs.js 对中文提取能力弱，100%需要检查/重写。

> ⚠️ **video-config.json 必须在项目根目录**（不是 docs/），否则 generate_docs.js 报错。

### Step 1: 查询 Feishu Base 待处理记录

```bash
lark-cli base +record-list --base-token <token> --table-id <table-id> --as user > /tmp/lark_records.json
```

解析 JSON（data.data.data 是行数组，data.data.record_id_list 是 ID 数组，data.data.fields 是列名数组）：

```javascript
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/tmp/lark_records.json','utf8'));
const fields = data.data.fields;
const recs = data.data.data;
const ids = data.data.record_id_list;
const vcIdx = fields.indexOf('video-creator');
const linkIdx = fields.indexOf('链接');
recs.forEach((r,i) => {
  if (r && (r[vcIdx] === null || r[vcIdx] === '')) {
    console.log(ids[i], r[linkIdx]);
  }
});
"
```

### Step 2: Clone 项目并创建工作目录

```bash
git clone https://github.com/<owner>/<repo> <repo>-repo
mkdir -p <repo>-video/docs <repo>-video/audio <repo>-video/video-project/src/components <repo>-video/video-project/public/audio
```

### Step 3: 生成 TTS 并调整语速

```bash
# 读取配音文本
NARRATION=$(cat docs/narration.txt)

# 生成中文 TTS（zh-CN-YunxiNeural，温和男声）
edge-tts --voice zh-CN-YunxiNeural --text "$NARRATION" --write-media audio/neural_full.mp3

# 获取时长并计算 atempo
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 audio/neural_full.mp3)
TARGET=35
ATEMPO=$(python3 -c "print(round($DURATION / $TARGET, 4))")
# 例：DURATION=23.5s → ATEMPO=0.6714

# 调整到目标35秒，输出为 neural_1_2x.m4a
ffmpeg -y -i audio/neural_full.mp3 -af "atempo=$ATEMPO" -ar 44100 -ac 2 -ab 256k audio/neural_1_2x.m4a
```

> ⚠️ **atempo 不是固定 1.2**：必须用公式 `DURATION / 35` 计算。source约23s时 atempo约0.66，用1.2会把音频加速到错误时长。

### Step 4: 生成 captions.json（Python，避免 Node.js 模板字符串问题）

```python
import json, subprocess, re

with open('docs/narration.txt') as f:
    text = f.read()

sentences = re.split(r'(?<=[。！？])', text)
sentences = [s.strip() for s in sentences if s.strip()]
total = len(sentences)

duration = float(subprocess.check_output(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', 'audio/neural_1_2x.m4a']
).decode().strip())
slot = duration / total

captions = []
for i, s in enumerate(sentences):
    captions.append({
        'text': s,
        'startMs': round(i * slot * 1000),
        'endMs': round((i + 1) * slot * 1000)
    })

with open('audio/captions.json', 'w') as f:
    json.dump(captions, f, ensure_ascii=False, indent=2)
```

### Step 5: 生成封面图（强制，跳过会破坏质量门禁）

```bash
# 使用 generate_cover.py（PIL，已调试正确的优先方案）
python3 {SKILL_DIR}/scripts/generate_cover.py {project-dir} --theme cyberpunk
```

会生成三张封面：
- `docs/assets/cover.png`（1080×1920，视频号/抖音）
- `docs/assets/cover-wechat.png`（900×383，微信公众号）
- `docs/assets/cover-xhs.png`（1440×2560，小红书）

### Step 6: 创建/复制 Remotion 项目

**正确 composition name 是 `RemotionRoot`**，不是 `VerticalVideo`（后者是旧版错误名称）。

```bash
# 从已完成项目复制模板（推荐）
cp -r {template}/video-project/node_modules {project}/video-project/
cd {project}/video-project
npm install remotion@4.0.459 @remotion/cli@4.0.459 --ignore-scripts

# 复制必要文件
cp {template}/video-project/src/Video.tsx {project}/video-project/src/
cp {template}/video-project/src/Root.tsx {project}/video-project/src/
cp {template}/video-project/src/index.tsx {project}/video-project/src/
cp {template}/video-project/src/components/CaptionOverlay.tsx {project}/video-project/src/components/
cp {template}/video-project/package.json {project}/video-project/
```

> ⚠️ 必须重新 npm install，直接复制 node_modules 会导致 symlink 指向错误路径。

### Step 7: 修改 TOTAL_FRAMES（必须从实际音频计算）

在 `Root.tsx` 中，修改 `TOTAL_FRAMES`：
```typescript
// 错误（硬编码）：
const TOTAL_FRAMES = 35 * 60; // 2100

// 正确（从音频计算）：
const TOTAL_FRAMES = Math.floor(actualDuration * 60);
```

### Step 8: 渲染视频

```bash
cd {project}/video-project
npx remotion render RemotionRoot --output out/{project}.mp4
```

> ⚠️ composition name 是 `RemotionRoot`（来自 `src/index.tsx` 的 `registerRoot()` 调用）。

### Step 9: 更新 Feishu Base

```bash
lark-cli base +record-upsert --base-token <token> --table-id <table-id> --record-id <id> --json '{"video-creator": ["是"]}' --as user
```

### Step 10: 清理 repo 目录

```bash
rm -rf {repo}-repo
```

## 跳过条件
- 纯代理/VPN安装类工具（如 XHTTP-Installer）不适合竖屏推广
- 无明确功能描述的项目需人工判断

---

## ⚠️ Feishu Base 批量处理门禁（必须全部通过才能继续）

执行任何批量项目前，必须验证以下文件**全部存在**：

```bash
REQUIRED_FILES=(
  "docs/article.md"
  "docs/narration.txt"
  "docs/video-script.md"
  "docs/copy.md"
  "docs/wechat-copy.md"
  "docs/posting-guide.md"
  "docs/report.json"
  "docs/assets/cover.png"
  "docs/assets/cover-wechat.png"
  "docs/assets/cover-xhs.png"
  "video-config.json"
  "audio/neural_1_2x.m4a"
  "video-project/public/audio/captions.json"
)

for f in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$PROJECT_DIR/$f" ]; then
    echo "❌ 缺失: $f — 必须先生成"
    exit 1
  fi
done
echo "✅ 门禁通过"
```

缺失任意一项即停止，禁止跳步骤。
