# video-config.json cover.attrs 检测与修复

## 症状
`video-config.json` 的 `cover` 字段为 `{}`（完全空），或仅有 `title`+`subtitle` 缺少 `attrs` 数组，导致封面图生成时无属性标签显示。

## 检测
```bash
python3 -c "import json; c=json.load(open('video-config.json'))['cover']; print('EMPTY' if not c.get('title') else 'attrs='+str(bool(c.get('attrs'))))"
```

## 修复
补充完整字段：
```json
"cover": {
  "title": "<真实标题>",
  "subtitle": "<真实副标题>",
  "attrs": ["<属性1>", "<属性2>", ...]
}
```

## attrs 数据源说明

`attrs` 数组是封面图底部属性标签的数据源（每个 attrs 项渲染为一个独立标签）。**封面图 attrs** 和 **视频内嵌封面帧 attrs** 共用 `video-config.json cover.attrs`，但分属两个独立渲染环节：

| 环节 | 渲染位置 | 调用方式 |
|------|---------|---------|
| 封面图生成 | `cover.png` / `cover-wechat.png` / `cover-xhs.png` 图片文件 | `generate_cover.py` 的 `attrs` 参数 |
| 视频封面帧 | Remotion 渲染的视频文件（首帧封面场景） | `Root.tsx scenes[0].attrs` → DynamicScene.tsx → CoverScene |

两者数据源相同 (`video-config.json cover.attrs`)，但渲染位置和时机不同。生成封面图前必须确保此字段存在且非空。

详见：`references/E-VISUAL/pil-cover.md`（已合并原 `pil-cover-usage.md` 内容）