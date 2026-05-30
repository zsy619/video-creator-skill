# Git 工作流与目录分离规范

> **最后更新**：2026-05-24
> 适用于 video-creator 技能处理 GitHub 仓库项目。

## 目录结构

```
{workspace}/{repo}/                    ← video-creator 纯净根目录（docs/ audio/ video-project/ video-config.json）
└── {repo}-repo/                       ← Git 仓库内容（src/ Cargo.toml README.md 等），用完删除
```

**原则**：Git 源码（src/、tests/、Cargo.toml 等）对视频生成无用，必须与 video-creator 生成物严格隔离。

## launch.sh init 自动隔离（2026-05-18）

`launch.sh init <name>` 会在 mkdir 之前自动检测 `.git/config` 是否存在，若存在则将已有内容移入 `{name}-repo/`：

```bash
# cmd_init() 开头新增逻辑
if [ -d "${proj_dir}" ] && [ -f "${proj_dir}/.git/config" ]; then
  mv "${proj_dir}" "${workspace}/${name}-repo-temp"
  mkdir -p "${proj_dir}"
  mv "${workspace}/${name}-repo-temp" "${proj_dir}/${name}-repo"
fi
```

**效果**：git clone 到的目录经 init 后，Git 内容在 `{repo}/{repo}-repo/`，proj_dir 根目录干净。

## 手动隔离命令

若 subagent 在 launch.sh init 之前需要手动隔离：

```bash
REPO_DIR="{WORKSPACE_DIR}/{repo-name}"
if [ -f "${REPO_DIR}/.git/config" ]; then
  mv "${REPO_DIR}" "${REPO_DIR}-temp"
  mkdir -p "${REPO_DIR}"
  mv "${REPO_DIR}-temp" "${REPO_DIR}/{repo-name}-repo"
fi
```

## 清理命令

```bash
# 完整删除 Git 内容（不删除 video-creator 生成物）
rm -rf "{WORKSPACE_DIR}/{repo}/{repo}-repo"

# 删除整个项目（video-creator 生成物 + Git 内容）
rm -rf "{WORKSPACE_DIR}/{repo}"
```

## 旧项目修复

若 Git 内容残留在 `{workspace}/{repo}/` 根目录（与 video-creator 生成物混杂），手动修复：

```bash
cd "{WORKSPACE_DIR}/{repo}"
mkdir -p {repo}-repo
# 移入所有 Git 源码目录和文件
for item in $(ls -d */ 2>/dev/null | tr -d '/' | grep -v -E '^(docs|audio|video-project|shimmy-repo|__pycache__)$'); do
  mv "$item" {repo}-repo/
done
# 移入根目录下的 Git 配置文件（README.md Cargo.toml src 等）
for item in README.md Cargo.toml Cargo.lock build.rs Makefile src/ tests/ ...; do
  [ -e "$item" ] && mv "$item" {repo}-repo/
done
```

## Subagent goal 约束

`delegate_task` 的 goal 中必须包含工作目录约束：

```
工作目录必须是 /Volumes/OpenClawDrive/.hermes/workspace/<repo-name>/
```

且 clone 目标必须使用绝对路径：

```bash
git clone <url> /Volumes/OpenClawDrive/.hermes/workspace/<repo-name>/
```

## 验证清单

- [ ] `ls {workspace}/{repo}/` 只有 docs/ audio/ video-project/ video-config.json
- [ ] `ls {workspace}/{repo}/{repo}-repo/` 包含 Git 内容（src/ Cargo.toml README.md）
- [ ] 清理后 `rm -rf {workspace}/{repo}/{repo}-repo` 完整删除 Git 内容
