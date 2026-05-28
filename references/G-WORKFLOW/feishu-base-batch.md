# Feishu Base 批量视频处理知识库

> **最后更新**：2026-05-18
> **配套文档**：`D-SUBAGENT/subagent-timeout.md`（超时恢复）、`C-CONTENT/audio-tts.md`（atempo 计算）

---

## 1. 问题概述

> ⚠️ **2026-05-17 上午 RuView-video 之后的所有 Feishu Base 项目（micracode、OmniVoice-Studio、vscode-ai-toolkit、openhuman、awesome-finance-skills、interest-radar、hermes-deployer、hermes-tablestore-memory、felo-skills、fzf、cronalytics 等）全部存在以下问题：**

| 问题 | 根因 |
| --- | --- |
| 无 docs/ 目录 | 跳过 Step 0（创建全部11个文档）和 Step 4-5（生成文案/HTML） |
| 无封面图 | 跳过 Step 6（generate_cover.py） |
| 音频命名 `source.mp3` / `speech.mp3` | 未使用 `neural_full.mp3` / `neural_1_2x.m4a` 规范 |
| Root.tsx TOTAL_FRAMES=2100（35×60硬编码） | 未根据实际音频时长计算 |
| atempo 随机或固定 1.2 | 未按 `source_duration / target_duration` 公式计算 |

**致命错误**：执行者用手动 `edge-tts + ffmpeg atempo` 命令绕过了 video-creator 完整工作流程。`launch.sh` 的 atempo=1.2 仅适用于 source≈40-45s 场景；当 source=20-25s 时，正确 atempo 应该是 0.57~0.71，而不是 1.2。

---

## 2. 受影响项目列表

以下项目使用旧版错误流程生成（手动 edge-tts + source.mp3/speech.mp3 + 无 docs/），需用 `launch.sh all` 或完整 Step 0-11 重新处理：

| 项目 | 主要问题 |
| --- | --- |
| micracode-video | 缺 docs/（仅 article.md）、缺 narration.txt、缺封面、音频名错误 |
| OmniVoice-Studio-video | 同上 |
| vscode-ai-toolkit-video | 同上 |
| opskat-video | 同上 |
| openhuman-video | 同上 |
| awesome-finance-skills-video | 同上 |
| interest-radar-video | 同上 |
| hermes-deployer-video | 同上 |
| hermes-tablestore-memory-video | 同上 |
| felo-skills-video | 同上 |
| fzf-video | 同上 |

---

## 3. 音频命名规范

> ⚠️ **Feishu Base 批量音频命名规范（强制）**

| 阶段 | 正确文件名 | 错误文件名 |
| --- | --- | --- |
| edge-tts 原始 | `audio/neural_full.mp3` | `source.mp3` |
| atempo 处理后 | `audio/neural_1_2x.m4a` | `speech.mp3` |
| Remotion 引用 | `staticFile("audio/neural_1_2x.m4a")` | `staticFile("audio/speech.mp3")` |

---

## 4. atempo 动态计算规则

> ⚠️ **atempo 不是固定值 1.2，必须根据 source 时长计算：**

```
atempo = source_duration / target_duration
```

例：source=23.784s，目标=35s → atempo=0.68

**禁止**：所有项目都用 atempo=1.2（那是 launch.sh 默认值，不是批量处理的正确值）

---

## 5. launch.sh atempo Bug 已修复（2026-05-17）

```bash
# 错误（固定 1.2）：
ffmpeg ... -af "...",atempo=1.2" ...

# 正确（动态计算，2026-05-17 已修复）：
SOURCE_DURATION=$(ffprobe ... neural_full.mp3)
ATEMPO=$(python3 -c "print(${SOURCE_DURATION} / ${TARGET_DURATION})")
ffmpeg ... -af "...",atempo=${ATEMPO}" ...
```

launch.sh 中的 atempo 现在按公式 `source_duration / target_duration` 动态计算。

---

## 6. Root.tsx TOTAL_FRAMES 计算

> ⚠️ **Root.tsx TOTAL_FRAMES 必须从实际音频计算：**

```
TOTAL_FRAMES = ⌊实际音频时长(atempo后) × 60⌋
禁止：TOTAL_FRAMES = 35 * 60（硬编码）
```

---

## 7. 封面图规范（强制必填）

封面图是强制项，**生成顺序不可跳**：

```
Step 6.1 generate_cover.py → cover.png (1080×1920)
Step 6.2 PIL resize/裁剪 → cover-wechat.png (900×383)
Step 6.3 PIL resize/裁剪 → cover-xhs.png (1440×2560)
```

禁止：
- ❌ 只生成 cover.png 不生成 wechat/xhs 版本
- ❌ 用 Baoyu-imagine 生成一张图后手动改名
- ❌ 跳过 generate_cover.py 直接生成 PIL 代码

---

## 9. Feishu Base 记录更新语法（必须使用 +record-upsert）
> ⚠️ **Feishu Base 更新语法与此文档旧版冲突，以此为准。**

**正确语法**：
```bash
lark-cli base +record-upsert \
  --base-token DTjXbS3tcaLVlqss6mHcmTwrnMg \
  --table-id tblks7R5MCE03xlS \
  --record-id {record-id} \
  --json '{"video-creator":"是"}'
```

**关键参数**：
- `--record-id`：直接指定单条记录的 ID（非 batch 模式）
- `--json`：字段名为 JSON Key，值为字符串（单选/文本类型直接传字符串）

**验证步骤**：
```bash
lark-cli base +record-upsert \
  --base-token DTjXbS3tcaLVlqss6mHcmTwrnMg \
  --table-id tblks7R5MCE03xlS \
  --record-id {record-id} \
  --json '{"video-creator":"是"}' 2>&1 | grep -q '"updated": true' && echo "✅" || echo "❌"
```

---

## 10. Git 内容隔离门禁

Git 克隆内容必须与 video-creator 生成物严格隔离，在进行任何 Step 之前必须先隔离：

```bash
# Step -0.5: Git 内容隔离确认
REPO_NAME=$(basename "$PROJECT_DIR")
if [ -f "$PROJECT_DIR/.git/config" ]; then
  echo "❌ 检测到 Git 内容未隔离：存在 .git/config"
  echo "执行 launch.sh init 或手动隔离后再继续"
  exit 1
fi
if [ -d "$PROJECT_DIR/${REPO_NAME}-repo" ]; then
  echo "✅ Git 内容已隔离至 ${REPO_NAME}-repo/"
elif [ -d "$PROJECT_DIR/$REPO_NAME" ] && [ -f "$PROJECT_DIR/$REPO_NAME/.git/config" ]; then
  echo "⚠️ 嵌套隔离未完成，手动执行隔离后再继续"
  exit 1
else
  echo "✅ 项目为纯净 video-creator 结构"
fi
```

完整 Git 隔离规范见 `G-WORKFLOW/git-workflow.md`。

---

## 11. 封面图规范（强制必填）

封面图是强制项，**生成顺序不可跳**：

```
Step 6.1 generate_cover.py → cover.png (1080×1920)
Step 6.2 PIL resize/裁剪 → cover-wechat.png (900×383)
Step 6.3 PIL resize/裁剪 → cover-xhs.png (1440×2560)
```

禁止：
- ❌ 只生成 cover.png 不生成 wechat/xhs 版本
- ❌ 用 Baoyu-imagine 生成一张图后手动改名
- ❌ 跳过 generate_cover.py 直接生成 PIL 代码

详见 `E-VISUAL/pil-cover.md`（Attrs 属性标签规范、WeChat 副标题宽度陷阱）。

### 读取记录

```bash
lark-cli base +record-list --base-token DTjXbS3tcaLVlqss6mHcmTwrnMg --table-id tblks7R5MCE03xlS --limit 200 --format json --out /tmp/feishu_records.json
```

输出结构：
```json
{
  "data": {
    "data": [[...], [...], ...],
    "record_id_list": ["rec001", "rec002", ...],
    "field_id_list": ["title", "github", "video-creator", ...]
  }
}
```

### Python 解析 pending 记录

```python
import subprocess, json

result = subprocess.run([
    'lark-cli', 'base', '+record-list',
    '--base-token', 'DTjXbS3tcaLVlqss6mHcmTwrnMg',
    '--table-id', 'tblks7R5MCE03xlS',
    '--format', 'json', '--limit', '100'
], capture_output=True, text=True)

data = json.loads(result.stdout)
records = data['data']['data']
fields = data['data']['fields']
vc_idx = fields.index('video-creator')
link_idx = fields.index('链接')
time_idx = fields.index('添加时间')
record_ids = data['data']['record_id_list']

pending = []
for i, rec in enumerate(records):
    vc = rec[vc_idx]
    if vc is None or (isinstance(vc, list) and '是' not in vc):
        rid = record_ids[i]
        link = rec[link_idx]
        time_val = rec[time_idx]
        pending.append((time_val, link, rid))

pending.sort(key=lambda x: x[0])
if pending:
    t, l, r = pending[0]
    print(f'record_id={r}')
    print(f'添加时间={t}')
    print(f'链接={l}')
else:
    print('暂无待处理任务')
```

### 更新记录状态

```python
import subprocess, json

result = subprocess.run([
    'lark-cli', 'base', '+record-upsert',
    '--base-token', 'DTjXbS3tcaLVlqss6mHcmTwrnMg',
    '--table-id', 'tblks7R5MCE03xlS',
    '--record-id', record_id,
    '--json', '{"video-creator":"是"}'
], capture_output=True, text=True)

data = json.loads(result.stdout)
print("✅ Base 更新成功" if data.get('data', {}).get('updated') else "❌ Base 更新失败")
```
### 表格信息

- base token: `DTjXbS3tcaLVlqss6mHcmTwrnMg`
- table ID: `tblks7R5MCE03xlS`
- 视图: `vewygLbwn2`
- 字段: `链接`（fldD2M6fhD）、`备注`（fld6VvfaaS）、`video-creator`（fld9ZMMjiO）、`添加时间`（fldLlHqLXu）、`wechat-sticker`（fldRv5H766）、`修订日期`（fldx53t3pw）、`images2`（fldyP1NvM4）
- 筛选条件: `video-creator != "是"`，按 `添加时间` 升序取第一条
