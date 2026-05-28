# Feishu Base 分页查询陷阱（2026-05-28 实测）

## 症状
首批 `limit=20, offset=0` 返回 100 条记录，全是 `video-creator="是"`。误判"暂无待处理任务"后终止流程。

## 根因
lark-cli 分页机制不走简单的 offset 偏移：
- 内部 page_size 默认 100
- `offset=0, limit=20` 实际返回前 100 条（已被其他进程/历史标记为已处理）
- pending 记录分布在 offset=100 开始的批次

## 正确做法
```bash
# 方案 1：循环拉取所有页
PAGE=0
while true; do
  lark-cli base +record-list \
    --table-id "tblks7R5MCE03xlS" \
    --base-token "DTjXbS3tcaLVlqss6mHcmTwrnMg" \
    --limit 200 \
    --offset $((PAGE * 200)) \
    --format json > /tmp/feishu_batch_${PAGE}.json
  # 检查 has_more
  node -e "const d=JSON.parse(require('fs').readFileSync('/tmp/feishu_batch_${PAGE}.json','utf8')); console.log('has_more:', d.data?.has_more, 'count:', (d.data?.data||[]).length)"
  PAGE=$((PAGE + 1))
done

# 方案 2：直接 limit=500 一次性拉取（推荐）
lark-cli base +record-list \
  --table-id "tblks7R5MCE03xlS" \
  --base-token "DTjXbS3tcaLVlqss6mHcmTwrnMg" \
  --limit 500 \
  --format json > /tmp/feishu_all.json
```

## 过滤 pending 记录
```javascript
const items = data.data.data;
const fields = data.data.fields;
const recordIds = data.data.record_id_list;
const vcIdx = fields.indexOf('video-creator');
const timeIdx = fields.indexOf('添加时间');
const linkIdx = fields.indexOf('链接');

let pending = [];
for (let i = 0; i < items.length; i++) {
  const vc = items[i][vcIdx];
  if (!vc || vc.length === 0 || vc[0] !== '是') {
    pending.push({id: recordIds[i], link: items[i][linkIdx], time: items[i][timeIdx]});
  }
}
// 按时间升序
pending.sort((a,b) => a.time.localeCompare(b.time));
console.log('Total pending:', pending.length);
```

## 记录格式（2026-05-28 实测）
```
data.data.data[i] = [链接字符串, 备注, video-creator数组, 星标, 添加时间, wechat-sticker, 修订日期, images2]
  索引:     0                1          2              3        4            5              6           7
链接字段格式: "[https://github.com/user/repo](https://github.com/user/repo)" 或纯URL
video-creator: ["是"] 或 null
添加时间: "2026-05-22 19:30:49"
```