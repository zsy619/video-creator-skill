# video-creator 路径标准规范

> **铁律**：所有文档、脚本、命令中的路径必须使用标准占位符，禁止硬编码绝对路径或用户特定路径。
> 生效日期：2026-05-14

## 标准占位符

| 变量 | 含义 | 示例 |
|------|------|------|
| `{SKILL_DIR}` | 技能根目录 | `~/.hermes/skills/video-creator` |
| `{WORKSPACE_DIR}` | 工作区根目录 | `{用户目录}/.hermes/workspace` |
| `{PROJECT_NAME}` | 项目名称 | `hysteria-video` |
| `{project-name}` | 项目名称（slug格式） | 同上，小写+连字符 |

## 目录结构

```
{WORKSPACE_DIR}/
└── {project-name}/              # 项目根目录
    ├── docs/                    # 文档目录
    │   ├── assets/
    │   │   ├── cover.png        # 视频号封面（1080×1920）
    │   │   ├── cover-wechat.png # 公众号封面（900×383）
    │   │   └── cover-xhs.png    # 小红书封面（1440×2560）
    │   ├── article.md
    │   ├── video-script.md
    │   ├── copy.md
    │   └── session-log.md
    ├── audio/                   # 音频文件
    │   └── neural_1_2x.m4a
    └── video-project/           # Remotion项目
        ├── src/
        └── out/
```

## 禁止使用的路径模式

| 禁止 | 说明 |
|------|------|
| `~/VideoProjects/` | 用户特定路径 |
| `/Users/zhushuyan/...` | 绝对用户路径 |
| `/Volumes/OpenClawDrive/...` | 卷挂载路径 |
| `{workspace_dir}` | 大小写错误，应为 `{WORKSPACE_DIR}` |
| `{project_dir}` | 应为 `{project-name}` |
| `{PROJECT_DIR}` | 应为 `{WORKSPACE_DIR}/{project-name}` |

## 正确示例

```bash
# ✅ 正确
SKILL_DIR="{SKILL_DIR}"
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"
python3 "$SKILL_DIR/scripts/generate_cover.py" "$TITLE" "$SUBTITLE" "$PROJECT_DIR/docs/assets" vertical

# ❌ 错误（已全部替换）
SKILL_DIR="/Users/zhushan/.hermes/skills/video-creator"
PROJECT_DIR="~/VideoProjects/my-project"
```

## 验证命令

```bash
# 检查技能目录下是否还有绝对路径残留
grep -r "~/VideoProjects\|/Users/\|/Volumes/OpenClawDrive" {SKILL_DIR}/ \
  --include="*.md" --include="*.sh" --include="*.js" 2>/dev/null | grep -v "^#" || echo "✅ 无绝对路径残留"
```

## 历史遗留

- 2026-05-14：全面替换 `~/VideoProjects`、`/Users/zhushuyan`、`/Volumes/OpenClawDrive` 为标准占位符
