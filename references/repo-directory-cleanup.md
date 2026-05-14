# GitHub 项目视频：-repo 目录清理规范

> 更新日期：2026-05-14
> 来源：oh-my-codex 和 deer-flow 项目实操经验

## 背景

GitHub 项目视频制作流程中，需要克隆仓库提取 README 内容。但仓库源码在 article.md 生成后不再被后续流程使用，却占用大量存储空间。

## 规范

### 1. 目录命名

```
{WORKSPACE_DIR}/{project-name}/{repo-name}-repo/
```

例如：`deer-flow-repo`、`oh-my-codex-repo`

### 2. 生命周期

| 阶段 | 操作 |
|------|------|
| 项目初始化 | `git clone` 克隆到 `<repo>-repo` |
| 内容提取 | 读取 README.md 手动编写 article.md |
| generate_docs.js | 生成11个文档 |
| 视频渲染完成 | **删除 `<repo>-repo` 目录** |

### 3. 清理命令

```bash
rm -rf "$PROJECT_DIR/<repo>-repo"
```

### 4. 判断标准

如果满足以下全部条件，则可以清理：
- article.md 已包含仓库核心内容
- 视频已成功渲染
- 后续流程（Remotion、HTML生成等）不依赖仓库源码

## 示例

```bash
# deer-flow 项目
git clone https://github.com/bytedance/deer-flow.git "$PROJECT_DIR/deer-flow-repo"
# ... 提取内容、生成视频 ...
rm -rf "$PROJECT_DIR/deer-flow-repo"
```

## 注意事项

- 仓库克隆使用 `--depth=1` 可减少存储（可选优化）
- 如果后续需要补充内容，可保留仓库；但视频交付前应清理
