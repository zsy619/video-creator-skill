# edge-tts CLI 正确用法

## 正确语法

```bash
# ✅ 正确：--write-media（不是 --output）
edge-tts \
  --voice zh-CN-YunjianNeural \
  --rate "+20%" \
  --text "$(cat narration.txt)" \
  --write-media audio/neural_1_2x.m4a
```

```bash
# ❌ 错误：--output 不存在
edge-tts --voice ... --output audio/out.m4a
# → edge-tts: error: unrecognized arguments: --output
```

## 参数说明

| 参数 | 说明 |
|------|------|
| `--voice` | 声音名称，如 zh-CN-YunjianNeural |
| `--rate` | 语速百分比，如 +20%（不是倍数） |
| `--text` | 直接传递文本 |
| `--write-media` | 输出音频文件路径（不是 --output） |
| `-f, --file` | 从文件读取文本 |

## 速率与时长关系

edge-tts 直接按目标语速生成，不需要 atempo 后处理：
- `+20%` = 1.2x 语速
- `+0%` = 1.0x 语速
- `-10%` = 0.9x 语速

## 常见错误

```
edge-tts: error: unrecognized arguments: --output audio/out.m4a
```

原因：误用 --output，正确参数是 --write-media。
