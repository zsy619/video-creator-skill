# OpenHuman 视频项目 narration 参考

> **背景**：openhuman-video 项目于 2026-05-17 成功生成。此文件保留为 narration.txt 编写参考示例。
> **配套**：`content-document-generation.md`（Step 0 重写策略）、`audio-tts.md`（音频参数）

---

## 成功 narration 示例（109 字）

```
OpenHuman 是你的个人 AI 超级智能助手。它支持 118 种第三方集成，一键连接 Gmail、Notion、GitHub、Slack、日历、Drive 等服务。记忆树结合 Obsidian Wiki 本地知识库，所有内容压缩为 Markdown 片段存储在本机 SQLite。桌面吉祥物会说话、能感知环境，还能加入 Google Meet 会议。TokenJuice 智能压缩技术可降低 80% token 消耗。支持 Ollama 本地 AI 保护隐私。React 加 Tauri v2 加 Rust 技术栈，开源免费，清爽 UI 几分钟快速上手。
```

| 指标 | 值 |
|------|---|
| 中文字数 | 109 |
| 上限（52秒×3.37） | 175 |
| 原始音频 | 39.912s |
| atempo | 0.7675（39.912/52） |
| 处理后 | 51.973s ✅ |
| 语音 | zh-CN-YunjianNeural --rate +0% |

---

## 关键教训

1. **generate_docs.js narration 输出必定不足** — 每次都需要手动重写，不要依赖自动生成
2. **launch.sh all 前需 cd 进入项目目录** — init 后执行 all 命令时必须先 cd 到项目根目录
3. **atempo 动态计算** — launch.sh 已内置动态 atempo 计算逻辑（39.912s/52s=0.7675），不要手动指定固定值
4. **feishu-base 记录更新** — record-id: recvjPyj719nNA，字段 video-creator="是"

---

## 封面配置参考

```json
{
  "name": "openhuman-video",
  "platform": "微信视频号",
  "duration": 52,
  "fps": 60,
  "width": 1080,
  "height": 1920,
  "theme": "cyberpunk",
  "cover": {
    "title": "OpenHuman",
    "subtitle": "个人AI超级智能助手 · 开源 · 118+集成",
    "attrs": ["开源免费", "118+集成", "记忆树", "TokenJuice压缩", "Ollama本地AI", "隐私安全"]
  },
  "voice": {
    "name": "zh-CN-YunjianNeural",
    "rate": "+0%",
    "atempo": 1.2
  },
  "subtitle": {
    "enabled": true,
    "highlight": true
  }
}
```