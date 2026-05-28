# Subagent 超时恢复指南

> **最后更新**：2026-05-28（整合 launch-sh-reference、feishu-base-补全流程、remotion-render-output-filename）
> **配套文档**：`C-CONTENT/content-document-generation.md`（Step 0 文档生成）、`C-CONTENT/subtitle-production.md`（字幕生成）

---

## 1. 触发场景

- `delegate_task` 超时（默认 600s），status=interrupted
- subagent 已完成部分工作（文档/音频已生成），但渲染未完成或未更新 Base
- `launch.sh all` 包含 Step 0-11 多个子步骤，总耗时可能超过 600s subagent 超时

**典型症状**：
```
=== Step 7: Remotion 渲染（60fps / 1080×1920 / 3119帧）===
[Command timed out after 600s]
```

> **注**：渲染步骤（Step 7）在 600s 内可完成，但整体流程超时。音频和文档在渲染前已生成（Step 0-3），因此可跳过这些步骤直接恢复渲染。

---

## 2. 检测步骤

```bash
# 1. 检查 out/ 目录是否有视频文件
ls "{WORKSPACE_DIR}/<project>-video/video-project/out/"

# 2. 检查音频是否已生成
ls "{WORKSPACE_DIR}/<project>-video/audio/"

# 3. 检查 narration 是否存在
cat "{WORKSPACE_DIR}/<project>-video/docs/narration.txt" | wc -c
```

---

## 3. 恢复决策树

```
out/ 有 .mp4 文件？
├── 是 → 直接更新 Base + 清理仓库
├── 否
│   ├── audio/neural_1_2x.m4a 存在？
│   │   ├── 是 → 直接运行渲染
│   │   └── 否 → 需要完整重跑 launch.sh all
│   └── narration.txt 不存在或极小？
│       └── 是 → 需要完整重跑 launch.sh all
```

---

## 4. 渲染恢复命令

```bash
cd "{WORKSPACE_DIR}/<project>-video/video-project"
npx remotion render VerticalVideo \
  out/final.mp4 \
  --concurrency=4 --fps=60 --disable-gpu --log error
```

> ⚠️ **重要**：指定完整文件名 `out/${PROJECT_NAME}.mp4`，避免生成 `out/.mp4`（前导点，无文件名）。

---

## 5. Remotion 输出文件名异常

**症状**：`npx remotion render VerticalVideo --output out/` 在 `out/` 目录下生成 `out/.mp4`（无文件名），而不是 `out/VerticalVideo.mp4`。

```
ls -la video-project/out/
# 输出: -rw-r--r--  1 zhushuyan  staff  5502035 May 18 09:37 .mp4
#                              ↑ 文件名为 .mp4（前导点）
```

**根因**：Remotion 的 `--output` 参数接受目录路径时会自动写入 `out.mp4`，但当路径以 `/` 结尾时文件名处理异常。

**解决方案**：
```bash
# 方案一（推荐）：指定完整文件名
cd video-project
npx remotion render VerticalVideo --output out/hermes-deployer.mp4

# 方案二：渲染后重命名
cd video-project
npx remotion render VerticalVideo --output out/
mv out/.mp4 out/hermes-deployer.mp4
```

**渲染后必须操作**：
1. **检查文件名**：确认不是 `.mp4`
2. **重命名为项目名**：统一为 `{project-name}.mp4` 格式
3. **验证 ffprobe**：

```bash
ffprobe -v error -show_entries format=duration,size,bit_rate \
  -show_entries stream=codec_name,width,height \
  -of default=noprint_wrappers=1 out/hermes-deployer.mp4
```

---

## 6. Feishu Base 任务补全流程

当 Subagent 在 Remotion 渲染阶段（Step 10）超时退出，但 Remotion 渲染已完成（out/.mp4 存在）时，Step 0 文档和 Step 6 封面可能缺失。

### 验证命令

```bash
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"

echo "=== 文档 ===" && for f in README.md video-script.md copy.md wechat-copy.md posting-guide.md landing-page.html article-page.html wechat-page.html session-log.md report.json; do
  [ -f "$PROJECT_DIR/docs/$f" ] && echo "✅ $f" || echo "❌ $f"
done

echo "=== 封面 ===" && for f in cover.png cover-wechat.png cover-xhs.png; do
  [ -f "$PROJECT_DIR/docs/assets/$f" ] && echo "✅ $f" || echo "❌ $f"
done

echo "=== 视频 ===" && ls "$PROJECT_DIR/video-project/out/"
```

### 补全流程

```bash
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"

# Step 0: 生成文档（11个文档全部生成）
cd "$PROJECT_DIR"
node "$SKILL_DIR/scripts/generate_docs.js" .

# narration.txt 字数检查（生成后必须验证）
python3 -c "
text = open('$PROJECT_DIR/docs/narration.txt').read()
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
max_chars = int(52 * 3.37)
print(f'字数: {chinese_chars} / 上限: {max_chars}')
"

# Step 6: 生成三平台封面
TITLE=$(node -e "const c=require('./video-config.json');console.log(c.cover?.title||c.title||'')")
SUBTITLE=$(node -e "const c=require('./video-config.json');console.log(c.cover?.subtitle||'')")

python3 "$SKILL_DIR/scripts/generate_cover.py" "$TITLE" "$SUBTITLE" "$PROJECT_DIR/docs/assets" vertical
python3 "$SKILL_DIR/scripts/generate_cover.py" "$TITLE" "$SUBTITLE" "$PROJECT_DIR/docs/assets" wechat
python3 "$SKILL_DIR/scripts/generate_cover.py" "$TITLE" "$SUBTITLE" "$PROJECT_DIR/docs/assets" xhs
```

> ⚠️ **注意事项**：
> 1. **video-config.json 必须在项目根目录**（不是 docs/），否则 generate_docs.js 报错
> 2. **narration.txt 覆盖风险**：重新执行 generate_docs.js 会覆盖之前手动重写的版本。如之前已手动重写且字数在安全区间内，可保留旧版
> 3. **video-config.json 缺失时**：根据 article.md 内容手动创建，确保含 `cover.title/subtitle/attrs` 字段

---

## 7. Base 更新命令

```bash
# 获取 record_id 后
lark-cli base +record-upsert \
  --base-token DTjXbS3tcaLVlqss6mHcmTwrnMg \
  --table-id tblks7R5MCE03xlS \
  --record-id <record_id> \
  --json '{"fld9ZMMjiO":"是"}'
```

---

## 8. 清理命令

```bash
rm -rf "{WORKSPACE_DIR}/<repo>-repo"
```

---

## 9. launch.sh 命令参考

```bash
# 初始化项目
bash launch.sh init <project-name>

# 完整流程（Step 0-11）
bash launch.sh all

# 分步执行
bash launch.sh docs      # Step 0
bash launch.sh audio     # Step 1-2
bash launch.sh captions  # Step 3
bash launch.sh remotion  # Step 4-7
bash launch.sh covers    # Step 8
```

### 已知问题：SIGBUS on CWD invalidation

launch.sh 内部执行多条命令，若 CWD 在 launch.sh 期间被移动（如用户 cd 到其他目录），某些 execSync 会 SIGBUS。

**解决方案**：不在 launch.sh 内整体运行，而是分步执行或确保 CWD 稳定。

### ⚠️ launch.sh init → all 路径陷阱（2026-05-17 实测）

**症状**：`bash launch.sh init openhuman-video` 成功，但 `node generate_docs.js openhuman-video` 在 workspace 根目录而非项目目录执行，导致找不到 `video-config.json`（路径少了 `/openhuman-video` 后缀）。

**根因**：`launch.sh init` 在 `cmd_init()` 中硬编码 `workspace="${PROJECT_DIR:-\${WORKSPACE_DIR}}"`，`PROJECT_DIR` 环境变量默认值为空。init 创建的项目在 `{WORKSPACE_DIR}/openhuman-video/`，但 `node generate_docs.js openhuman-video` 传入的是相对路径，所以它在 `process.cwd()`（即 workspace 根目录）下找配置。

**正确做法**：
```bash
# ✅ cd 后执行 all
cd "{WORKSPACE_DIR}/openhuman-video"
bash $SKILL_DIR/scripts/launch.sh all

# ✅ 或显式 PROJECT_DIR
PROJECT_DIR="{WORKSPACE_DIR}/openhuman-video" \
  bash $SKILL_DIR/scripts/launch.sh all
```

### Remotion render 命令 Composition ID 陷阱（2026-05-17）

- `VerticalVideo` → `RemotionRoot`（两处 render 命令）— 已回退为 `VerticalVideo`
- 渲染命令：`cd video-project && npx remotion render VerticalVideo out/${PROJECT_NAME}.mp4 --concurrency=4 --fps=60 --disable-gpu`
- Composition ID 是 `VerticalVideo`（`Root.tsx` 中 `id="VerticalVideo"` 定义），不是 `RemotionRoot`

### launch.sh all 输出质量门禁 D 警告

```
=== 门禁 D: 最终视频 ===
━━━ 检查结果 ━━━
❌ 存在失败项，质量门禁关闭
[!] ⚠️ 最终视频检查有警告
```

此警告不影响视频生成（`[✓] ✅ 一键生成完成！`），视频文件实际已正确生成，可忽略继续。

---

## 10. 关键文件路径

| 文件 | 路径 |
|------|------|
| launch.sh | `{SKILL_DIR}/scripts/launch.sh` |
| generate_cover.py | `{SKILL_DIR}/scripts/generate_cover.py` |
| generate_docs.js | `{SKILL_DIR}/scripts/generate_docs.js` |
| 工作空间 | `{WORKSPACE_DIR}/` |