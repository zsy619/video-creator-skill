# Git 仓库工作流

## 目录规范

| 用途 | 路径 |
|------|------|
| **视频项目**（执行目录） | `{WORKSPACE_DIR}/{repo}-video/` |
| **Git 仓库**（临时，用完删除） | `{WORKSPACE_DIR}/{repo}-repo/` |

> 视频项目目录 和 Git仓库目录 必须严格分离。禁止将视频产物（docs/、audio/、video-project/）放入 Git仓库目录。

## 克隆

```bash
cd "{WORKSPACE_DIR}"
git clone --depth 1 https://github.com/AUTHOR/REPO {REPO}-repo
```

克隆后仓库在 `{REPO}-repo/`，视频项目在 `{REPO}-video/`。

## 项目初始化（video-creator）

```bash
PROJECT_DIR="{WORKSPACE_DIR}/{REPO}-video"
mkdir -p "$PROJECT_DIR"/{audio,docs/assets,video-project/src/components,video-project/public/audio}
```

## 清理规则

**视频生成完成后，删除 Git仓库目录**：

```bash
rm -rf "{WORKSPACE_DIR}/{REPO}-repo"
```

注意是 `{REPO}-repo` 后缀（不是 `-repo` 之前）。