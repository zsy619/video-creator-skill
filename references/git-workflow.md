# Git 仓库工作流

## 克隆模式

```bash
cd /Volumes/OpenClawDrive/.hermes/workspace
git clone --depth 1 https://github.com/AUTHOR/REPO
```

克隆后自动生成目录 `{REPO}`（与 github 路径一致）。

## 项目目录结构

- Git 仓库: `/Volumes/OpenClawDrive/.hermes/workspace/{REPO}`
- 视频项目: `/Volumes/OpenClawDrive/.hermes/workspace/{REPO}-video`

视频项目初始化：

```bash
mkdir -p "$PROJECT_DIR"/{audio,docs/assets,video-project/src/components,video-project/public/audio}
```

## 清理规则

完成后删除 git 仓库：

```bash
rm -rf /Volumes/OpenClawDrive/.hermes/workspace/{REPO}
```

> 注意：是 `{REPO}` 不是 `{REPO}-repo`。例如：
> - RuView 仓库 → `rm -rf .../RuView`
> - obsidian-skills 仓库 → `rm -rf .../obsidian-skills`
> - scientific-agent-skills 仓库 → `rm -rf .../scientific-agent-skills`