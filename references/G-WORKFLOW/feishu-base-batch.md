# Feishu Base 批量视频处理知识库

> **最后更新**：2026-05-28
> **配套文档**：`D-SUBAGENT/subagent-timeout.md`（超时恢复）、`C-CONTENT/audio-tts.md`（atempo 计算）

---

## 1. 已知固定配置（"视频制作链接核对表"）

| 字段 | 值 |
|------|-----|
| Base Token | `DTjXbS3tcaLVlqss6mHcmTwrnMg` |
| Table ID | `tblks7R5MCE03xlS` |
| 视图 ID | `vewygLbwn2` |
| 链接字段名 | `链接` |
| 状态字段名 | `video-creator` |
| 时间字段名 | `添加时间` |

---

## 2. 查询待处理记录（必须验证全量）

> ⚠️ **必须验证全量，不能仅查首批**。飞书 Base 记录按添加时间排序后，pending 记录可能集中在后面页面。

**第一批查询（offset=0）**：
```bash
lark-cli base +record-list \
  --base-token DTjXbS3tcaLVlqss6mHcmTwrnMg \
  --table-id tblks7R5MCE03xlS \
  --view-id vewygLbwn2 \
  --filter "[{\"field_name\":\"video-creator\",\"operator\":\"!=\",\"value\":\"是\"}]" \
  --sort "[{\"field_name\":\"创建时间\",\"desc\":false}]" \
  --limit 20 --offset 0 --format json
```

**第二批查询（offset=100）**：首批无 pending 时必须查。
```bash
lark-cli base +record-list \
  --base-token DTjXbS3tcaLVlqss6mHcmTwrnMg \
  --table-id tblks7R5MCE03xlS \
  --view-id vewygLbwn2 \
  --filter "[{\"field_name\":\"video-creator\",\"operator\":\"!=\",\"value\":\"是\"}]" \
  --sort "[{\"field_name\":\"创建时间\",\"desc\":false}]" \
  --limit 20 --offset 100 --format json
```

**经验数据**：batch 1 (offset=0) 得 100 条全"是"，batch 2 (offset=100) 得 93 条含 70 条 pending。待处理记录数 > 20 时，必须翻页确认无遗漏。

---

## 3. Python 解析 pending 记录（完整版）

```python
import subprocess, json, re

TOKEN = "DTjXbS3tcaLVlqss6mHcmTwrnMg"
TABLE = "tblks7R5MCE03xlS"

def normalize(link):
    """标准化 URL：去除 Markdown 包装、尾随斜杠、转小写"""
    if not link: return ''
    link = link.strip()
    m = re.match(r'\[([^\]]+)\]\(([^\)]+)\)', link)
    if m: link = m.group(2)
    link = link.rstrip('/')
    return link.lower()

all_pending = []
offset = 0
limit = 200

while True:
    result = subprocess.run([
        'lark-cli', 'base', '+record-list',
        '--base-token', TOKEN, '--table-id', TABLE,
        '--format', 'json', '--limit', str(limit), '--offset', str(offset)
    ], capture_output=True, text=True, timeout=30)

    data = json.loads(result.stdout)
    records = data['data']['data']
    rids = data['data']['record_id_list']
    fields = data['data']['fields']
    has_more = data['data']['has_more']

    vc_idx = fields.index('video-creator')
    link_idx = fields.index('链接')
    time_idx = fields.index('添加时间')

    for i, rec in enumerate(records):
        vc = rec[vc_idx]
        if vc is None or (isinstance(vc, list) and '是' not in vc):
            all_pending.append({
                'rid': rids[i],
                'link_raw': rec[link_idx] or '',
                'link_norm': normalize(rec[link_idx] or ''),
                'added': rec[time_idx]
            })

    if not has_more: break
    offset += limit

# 按添加时间升序，取最早一条
all_pending.sort(key=lambda x: x['added'])
if all_pending:
    earliest = all_pending[0]
    print(f"record_id={earliest['rid']}")
    print(f"添加时间={earliest['added']}")
    print(f"链接={earliest['link_raw']}")
else:
    print("暂无待处理任务")
```

---

## 4. 更新记录状态

```bash
lark-cli base +record-upsert \
  --base-token DTjXbS3tcaLVlqss6mHcmTwrnMg \
  --table-id tblks7R5MCE03xlS \
  --record-id {record-id} \
  --json '{"video-creator":"是"}'
```

**验证步骤**：
```bash
lark-cli base +record-upsert \
  --base-token DTjXbS3tcaLVlqss6mHcmTwrnMg \
  --table-id tblks7R5MCE03xlS \
  --record-id {record-id} \
  --json '{"video-creator":"是"}' 2>&1 | grep -q '"updated": true' && echo "✅" || echo "❌"
```

---

## 5. 历史经验数据（2026-05-28 数据清洗）

| 阶段 | 操作 | 结果 |
|------|------|------|
| 第一轮清洗 | 精确字符串判重 | 291 条 → 117 条，删 174 条 |
| 第二轮清洗 | 标准化判重（normalize） | 117 条 → 107 条，删 10 条（models.dev、hyperframes 等） |
| 清洗后 | 验证标准化后无重复 | 107 条，0 组重复 ✅ |

**核心教训**：飞书 Base 的 URL 字段可能混合存储 Markdown 格式与裸 URL，精确字符串比对会漏判重复。URL 类字段去重必须先标准化（`normalize()` 函数去除 `[text](url)` → `url`、去除尾随 `/`、lowercase）。

详见 `references/lark-base-record-dedup.md`（lark-base skill）。

---

## 6. 受影响项目列表（旧版错误流程）

> ⚠️ 以下项目使用旧版错误流程生成（手动 edge-tts + source.mp3/speech.mp3 + 无 docs/），需用 `launch.sh all` 或完整 Step 0-11 重新处理：

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

## 7. 音频命名规范（强制）

| 阶段 | 正确文件名 | 错误文件名 |
| --- | --- | --- |
| edge-tts 原始 | `audio/neural_full.mp3` | `source.mp3` |
| atempo 处理后 | `audio/neural_1_2x.m4a` | `speech.mp3` |
| Remotion 引用 | `staticFile("audio/neural_1_2x.m4a")` | `staticFile("audio/speech.mp3")` |

---

## 8. atempo 动态计算规则

> ⚠️ **atempo 不是固定值 1.2，必须根据 source 时长计算：**

```
atempo = source_duration / target_duration
```

例：source=23.784s，目标=35s → atempo=0.68

**禁止**：所有项目都用 atempo=1.2（那是 launch.sh 默认值，不是批量处理的正确值）

---

## 9. Git 内容隔离门禁

Git 克隆内容必须与 video-creator 生成物严格隔离，在进行任何 Step 之前必须先隔离：

```bash
REPO_NAME=$(basename "$PROJECT_DIR")
if [ -f "$PROJECT_DIR/.git/config" ]; then
  echo "❌ 检测到 Git 内容未隔离：存在 .git/config"
  echo "执行 launch.sh init 或手动隔离后再继续"
  exit 1
fi
if [ -d "$PROJECT_DIR/${REPO_NAME}-repo" ]; then
  echo "✅ Git 内容已隔离至 ${REPO_NAME}-repo/"
else
  echo "✅ 项目为纯净 video-creator 结构"
fi
```

完整 Git 隔离规范见 `G-WORKFLOW/git-workflow.md`。