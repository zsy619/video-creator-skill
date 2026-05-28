# lark-cli Base 记录更新命令参考

> **最后更新**：2026-05-28
> **来源**：oh-my-pi 项目实战验证

---

## 唯一可靠的更新命令

`+record-batch-update`（非 `+record-upsert`）：

```bash
lark-cli base +record-batch-update \
  --base-token "DTjXbS3tcaLVlqss6mHcmTwrnMg" \
  --table-id "tblks7R5MCE03xlS" \
  --json '{"record_id_list":["{record-id}"],"patch":{"video-creator":"是"}}'
```

**响应**：`{"ok": true, "data": {"update": {"video-creator": ["是"]}}}`

## 参数说明

| 参数 | 值 | 说明 |
|------|-----|------|
| `--base-token` | Bearer token | 用户 token，非 app token |
| `--table-id` | `tblks7R5MCE03xlS` | 表 ID |
| `--json` | JSON | 含 `record_id_list`（数组）+ `patch`（字段映射） |

**多选字段**（如 `video-creator`）：值为数组 `["是"]`
**单选/文本字段**：值为字符串 `"是"`

## 验证成功的响应字段

- ✅ `ok: true`
- ❌ `"msg":"Invalid access token"` → token 过期或权限不足

## 已验证不可用的方案

| 方案 | 错误原因 |
|------|---------|
| `+record-upsert --json '{"video-creator":"是"}'` | 该子命令签名不支持单条更新 |
| `curl PUT .../records/{id}` | 需要 tenant_access_token，不支持 user_access_token |
| 直接传 `{"video-creator":"是"}` 而非数组 | 多选字段必须用数组格式 |

## 完整 Python 示例

```python
import subprocess, json

def update_feishu_base(record_id: str) -> bool:
    result = subprocess.run([
        'lark-cli', 'base', '+record-batch-update',
        '--base-token', 'DTjXbS3tcaLVlqss6mHcmTwrnMg',
        '--table-id', 'tblks7R5MCE03xlS',
        '--json', json.dumps({
            "record_id_list": [record_id],
            "patch": {"video-creator": "是"}
        })
    ], capture_output=True, text=True)
    try:
        data = json.loads(result.stdout)
        return data.get('ok') is True
    except json.JSONDecodeError:
        return False
```