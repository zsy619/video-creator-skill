# 飞书多维表格 API 参考

## 读取记录

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

Python 解析 pending 记录：
```python
import json, subprocess, re

subprocess.run(['lark-cli', 'base', '+record-list',
                '--base-token', 'DTjXbS3tcaLVlqss6mHcmTwrnMg',
                '--table-id', 'tblks7R5MCE03xlS',
                '--limit', '200', '--format', 'json',
                '--out', '/tmp/feishu_records.json'], check=True)

with open('/tmp/feishu_records.json') as f:
    raw = json.load(f)

data = raw['data']
rows = data['data']
record_ids = data.get('record_id_list', [])

pending = []
for i, row in enumerate(rows):
    vc = row[2]  # video-creator 字段索引
    vc_val = vc[0] if vc else ''
    if vc_val != '是':
        url_field = row[1]  # github URL 字段索引
        url_match = re.search(r'https://github\.com/[^\s\)\]]+', url_field)
        url = url_match.group(0) if url_match else url_field
        rid = record_ids[i] if i < len(record_ids) else 'N/A'
        pending.append((rid, url))
```

## 更新记录状态

```bash
lark-cli base +record-batch-update \
  --base-token DTjXbS3tcaLVlqss6mHcmTwrnMg \
  --table-id tblks7R5MCE03xlS \
  --json '{"record_id_list":["RECORD_ID"],"patch":{"video-creator":"是"}}'
```

> 注意：`+record-update` 命令有问题，应使用 `+record-batch-update` 配合 `record_id_list` 数组。

## 表格信息

- base token: `DTjXbS3tcaLVlqss6mHcmTwrnMg`
- table ID: `tblks7R5MCE03xlS`
- 字段: title, github, video-creator
- 筛选条件: video-creator != "是"