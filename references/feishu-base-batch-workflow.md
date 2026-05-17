# Feishu Base 批量视频项目工作流

## 概述
从 Feishu Base 表格筛选 `video-creator=null` 的待处理记录，批量为 GitHub 开源项目生成竖屏推广视频（1080×1920, 60fps, ~35秒），完成后标记 `video-creator=是`。

## 前置条件
- lark-cli 已配置（`lark-cli auth login`）
- Base token 和 table-id 已获取
- edge-tts、ffmpeg、node、git 可用

## 完整工作流

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
# 生成中文 TTS（默认 YunxiNeural）
edge-tts --voice zh-CN-YunxiNeural --text "<文案>" --write-media <repo>-video/audio/source.mp3

# 获取时长
ffprobe -v quiet -print_format json -show_format source.mp3 | jq '.format.duration'
# 例：22.5s → atempo = 22.5/35 = 0.643

# 调整到目标35秒
ffmpeg -y -i source.mp3 -af "atempo=<atempo>" -ar 44100 -ac 2 -ab 256k speech.mp3
```

### Step 4: 写字幕文件

```json
[
  {"startMs": 0, "endMs": 8000, "text": "第一段字幕"},
  {"startMs": 8000, "endMs": 16000, "text": "第二段字幕"}
]
```

时间戳 = 累积时间 × 1000（毫秒），总时长约35000ms。

### Step 5: 创建/复制 Remotion 项目

复用模板文件（从已完成项目复制）：
- `src/Video.tsx` — 主组件（每项目需重写场景内容）
- `src/Root.tsx` — Composition 入口
- `src/index.ts` — Remotion 入口
- `src/components/CaptionOverlay.tsx` — 字幕渲染
- `package.json`

**关键**：从其他项目复制 node_modules 后，必须重新 npm install：

```bash
cp -r <template>/video-project/node_modules <repo>-video/video-project/
cd <repo>-video/video-project && npm install remotion@4.0.459 @remotion/cli@4.0.459 --ignore-scripts
```

原因：直接复制 node_modules 会导致 `.bin/remotion` 的 symlink 指向损坏的路径，必须重新 link。

### Step 6: 渲染视频

```bash
cd <repo>-video/video-project
npx remotion render VerticalVideo --output out/<repo>.mp4
```

### Step 7: 更新 Feishu Base

```bash
lark-cli base +record-upsert --base-token <token> --table-id <table-id> --record-id <id> --json '{"video-creator": ["是"]}' --as user
```

### Step 8: 清理 repo 目录

```bash
rm -rf <repo>-repo
```

## 跳过条件
- 纯代理/VPN安装类工具（如 XHTTP-Installer）不适合竖屏推广
- 无明确功能描述的项目需人工判断