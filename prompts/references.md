你是一位精通知识管理和技术文档整理的专家。

你的任务是对 `video-creator` 技能中的 `references` 目录进行系统性整理，同时确保所有现有的功能和内容完整性不受任何影响。

## 背景
`references` 目录目前存放了多个 Markdown 文件，随着时间推移，部分文件内容存在重复、结构混乱、可读性差等问题，目录整体缺乏清晰的组织，亟需彻底整理。

## 目标
1. 对现有 Markdown 文件进行分类归纳，建立清晰的文件组织结构。
2. 对内容进行规整优化，提升可读性和一致性（包括格式、标题层级、术语、代码块等）。
3. 对存在重复或关联性强的文件进行合理合并，确保信息零丢失。
4. 修订项目中所有指向 `references` 目录的引用（相对链接、嵌入引用等），保证新路径准确可用。
5. 最终使 `references` 目录的文件组织清晰直观，便于后续维护、查阅和内容扩展。

## 约束
- **内容零丢失**：严禁删除或截断任何事实信息、代码示例或配置细节。
- **功能完整**：如果某个文件被自动化脚本、Agent 或工具引用（如提示模板、知识库），必须保留其逻辑结构与元数据不变。
- **杜绝死链**：所有原本指向 reference 文件的链接，整理后必须能够正确解析，须验证交叉引用。
- **向后兼容**：若外部系统依赖特定文件路径，除非明确授权修改外部依赖，否则需保持兼容，并标记此类情况。

## 执行步骤
请严格按照以下步骤操作：

### 步骤1：审计与映射
- 列出 `references/` 目录下所有文件及其当前路径。
- 标注每个文件的主要主题、用途以及发现的任何重复或重叠。

### 步骤2：设计新结构
- 提出一个逻辑清晰的文件夹层级结构（例如按功能、按组件或按工作流阶段划分）。
- 将每个现有文件映射到其新位置或合并后的目标文件。
- 在 `references/` 根目录新建或更新 `README.md`，简要说明组织逻辑。

### 步骤3：内容规范化
- 统一改写和格式化内容，遵循一致的 Markdown 风格：
  - 标题层级以 `#` 开头
  - 代码块统一标注语言类型
  - 术语和措辞标准化
  - 删除多余空行或损坏的格式

### 步骤4：合并与去重
- 将重度重叠的同类主题文件合并为一个结构清晰的文件，吸收所有独特信息。
- 仅在用途确有明显区分时保留独立文件。

### 步骤5：更新引用
- 搜索整个 `video-creator` 项目及相关配置文件，找出所有对旧路径的引用。
- 将它们更新为新路径（尽量使用相对路径）。
- 在移动或重命名文件后验证所有链接的正确性。

### 步骤6：最终验证
- 确认所有文件均可访问且内容完整。
- 确保没有死链残留。
- 生成变更摘要，包括：新建的文件夹、合并或删除的文件、已更新的引用。

## 输出要求
1. 完整重组后的 `references/` 目录及所有更新后的文件。
2. 一份 `CHANGELOG.md` 或在最终回复中描述每一项结构调整与合并决策的变更摘要。
3. 如有无法自动更新的外部引用，请提供清单。

在未展示审计结果和拟议方案并获得确认前（自主模式除外），请勿直接修改文件。

---

You are an expert in knowledge management and technical documentation.

Your task is to systematically reorganize the `references` directory within the `video-creator` skill, while keeping ALL existing functionality and content completely intact.

## Background
The `references` directory currently contains multiple Markdown files that have grown over time. Some content is duplicated, poorly structured, or hard to read, and the directory lacks clear organization. A thorough reorganization is urgently needed.

## Objectives
1. Classify and group existing Markdown files to establish a clear folder structure.
2. Normalize and optimize content to improve readability and consistency (formatting, heading levels, terminology, code blocks, etc.).
3. Merge files that are strongly related or duplicative without losing any information.
4. Update all project references to the `references` directory (relative links, embeds, etc.) so that all paths remain correct.
5. Make the final `references` directory structure clear, intuitive, easy to maintain, and scalable for future additions.

## Constraints
- **Zero content loss**: Do not delete or truncate any factual information, code examples, or configuration details.
- **Preserve functionality**: If any file is used by automated scripts, agents, or tools (e.g., as a prompt template or knowledge base), keep its logical structure and metadata intact.
- **No broken links**: Every link that originally pointed to a reference file must resolve correctly after reorganization. Verify cross-references.
- **Backward compatibility**: If external systems depend on specific file paths, maintain compatibility unless you are explicitly authorized to change those dependencies. Flag any such cases.

## Action Plan
Follow these steps strictly:

### Step 1: Audit & Map
- List all files in `references/` with their current paths.
- Annotate each file’s primary topic, purpose, and any observed overlaps or duplicates.

### Step 2: Design New Structure
- Propose a logical folder hierarchy (e.g., by function, by component, or by workflow stage).
- Map every existing file to its new location or merged target.
- Create or update a `README.md` in the root of `references/` that briefly explains the organizational logic.

### Step 3: Content Normalization
- Rewrite and reformat content following a consistent Markdown style:
  - Use `#` for the top-level heading
  - Use fenced code blocks with language tags
  - Standardize terminology and phrasing
  - Remove excessive blank lines or broken formatting

### Step 4: Merge & Deduplicate
- Merge heavily overlapping files on the same topic into a single, well-structured file that integrates all unique information.
- Keep files separate only when their distinct use cases clearly justify it.

### Step 5: Update References
- Search the entire `video-creator` project and related configuration files for any references to the old paths.
- Update them to the new paths (use relative paths where possible).
- Verify all links after moving or renaming files.

### Step 6: Final Validation
- Confirm all files are accessible and complete.
- Ensure no broken links remain.
- Generate a summary of changes: new folders created, files merged or deleted, and references updated.

## Output Requirements
1. The fully reorganized `references/` directory with all updated files.
2. A `CHANGELOG.md` or a change summary in your final response describing every structural change and merge decision.
3. A list of any external references that could not be automatically updated, if any.

Do not modify any files before presenting your audit and proposed plan and receiving confirmation (except in autonomous mode).
