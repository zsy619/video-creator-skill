---
name: generate-docs-issues
title: generate_docs.js 已知问题
description: generate_docs.js 的行为与文档描述不一致之处
tags:
  - video-creator
  - generate_docs
  - narration.txt
  - video-config.json
  - 已知问题
---

# generate_docs.js 已知问题

> session-specific detail: generate_docs.js 的行为与文档描述不一致之处

## 问题1: video-config.json 路径

**现象**: `generate_docs.js` 报错 "缺少配置文件: video-config.json"，但文件存在于 `{project}/docs/video-config.json`

**根因**: `generate_docs.js` 读取 `{project-root}/video-config.json`，而非 `{project-root}/docs/video-config.json`

**正确位置**:
```
{workspace}/{project-name}/         ← video-config.json 在这里（项目根目录）
├── docs/
│   └── video-config.json           ← ❌ 不在这里
└── video-project/
```

**解决方案**: 始终将 `video-config.json` 创建在项目根目录

## 问题2: narration.txt 自动生成质量差

**现象**: `generate_docs.js` 生成的 narration.txt 内容不连贯，字数过少或不符合口语化要求

**根因**: 
1. 从 article.md 提取内容时，表格内容被拆成碎片
2. 代码块标题残留（如 "核心亮点"、"特性 说明"）
3. 按句号分割时，长复合句被错误截断

**实测数据**:
| 项目 | 自动生成字数 | 手动重写字数 |
|------|------------|------------|
| LLMs-from-scratch | 33字 | 157字 |
| MiroFish | 122字 | ( borderline ) |

**解决方案**: 
1. `generate_docs.js` 生成 narration.txt 后，必须检查内容质量
2. 如果字数 < 目标时长的 50%，或内容明显碎片化，立即手动重写
3. 手动重写时，保持口语化、适合 TTS 朗读的风格

**手动重写检查标准**:
```python
text = open('docs/narration.txt').read()
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
target_dur = 52  # 或 video-config.json 中的 duration
max_chars = int(target_dur * 3.37)
min_chars = int(target_dur * 3.37 * 0.5)  # 最低50%

if chinese_chars < min_chars:
    print(f"❌ 字数过少({chinese_chars})，需要手动重写")
elif chinese_chars > max_chars:
    print(f"❌ 字数超限({chinese_chars})，需要精简")
else:
    print(f"✅ 字数合适({chinese_chars}/{max_chars})")
```

**实测数据(本 session)**:
| 项目 | 自动字数 | 重写后 | 问题类型 |
|------|---------|--------|---------|
| claude-hud | 74字 | 154字 | 严重偏少 |
| tegaki | 74字 | 141字 | 严重偏少 |
| OpenViking | 74字 | 157字 | 严重偏少 |
| openscreen | 91字 | 152字 | 偏少 |
| open-swe | 50字 | 153字 | 严重偏少 |
| impeccable | 79字 | 167字 | 偏少 |
| deepagents | 183字 | 163字 | 偏多超限 |
| timesfm | 176字 | 128字 | 超限精简 |
| claude-howto | 177字 | 121字 | 超限精简 |

**结论**: 本 session 9个项目，100% 需手动重写。根因是 article.md 内容不足或格式不匹配 generate_docs.js 的提取逻辑。

**标准工作流**:

Step 1: 执行 generate_docs.js
Step 2: 立即运行字数验证
```python
python3 << 'PYEOF'
PROJECT_DIR = '/Volumes/OpenClawDrive/.hermes/workspace/<项目>-video'
with open(f'{PROJECT_DIR}/docs/narration.txt', 'r') as f:
    text = f.read()
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
target_dur = 52
max_chars = int(target_dur * 3.37)
print(f'中文字数: {chinese_chars} / 上限: {max_chars}')
if chinese_chars < 100 or chinese_chars > max_chars:
    print('❌ 需要手动重写')
else:
    print('✅ 字数合适')
PYEOF
```
Step 3: 手动重写时，口语化+每句完整+100-175字范围内
Step 4: 再次验证，通过后再继续

## 修复记录

- 2026-05-14: 首次记录这两个问题
- 2026-05-14 (晚): 更新实测数据，8个项目全部返工，100% 失败率
- 2026-05-14 (深夜): 更新第9个项目(claude-howto)，最终确认9/9全部手动重写
