# Feishu Base 任务 Subagent 超时后补全流程

## 问题描述

Feishu Base 批量处理时，Subagent 在 Remotion 渲染阶段（Step 10）超时退出，但此时：
- ✅ Remotion 渲染已完成（out/.mp4 存在）
- ✅ 音频已生成（neural_1_2x.m4a）
- ✅ captions.json 已生成
- ❌ **Step 0 文档缺失**（10个文档未生成）
- ❌ **Step 6 封面缺失**（3张封面图未生成）

**根因**：Subagent 的 `launch.sh all` 执行流程：
```
Step 0 (generate_docs.js) → Step 1-5 → Step 6 (封面) → Step 7 (音频) → Step 8 (字幕) → Step 9 (门禁) → Step 10 (渲染)
     ↑
  超时发生在渲染阶段（Step 10），Step 0 和 Step 6 在超时前已跳过
```

## 验证命令

```bash
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"

# 检查缺失项
echo "=== 文档 ===" && for f in README.md video-script.md copy.md wechat-copy.md posting-guide.md landing-page.html article-page.html wechat-page.html session-log.md report.json; do
  [ -f "$PROJECT_DIR/docs/$f" ] && echo "✅ $f" || echo "❌ $f"
done

echo "=== 封面 ===" && for f in cover.png cover-wechat.png cover-xhs.png; do
  [ -f "$PROJECT_DIR/docs/assets/$f" ] && echo "✅ $f" || echo "❌ $f"
done

echo "=== 视频 ===" && ls "$PROJECT_DIR/video-project/out/"
```

## 补全流程

```bash
SKILL_DIR="{SKILL_DIR}"
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
# 若 <100 或 >max_chars，需手动重写 narration.txt
"

# Step 6: 生成三平台封面
TITLE=$(node -e "const c=require('./video-config.json');console.log(c.cover?.title||c.title||'')")
SUBTITLE=$(node -e "const c=require('./video-config.json');console.log(c.cover?.subtitle||'')")

python3 "$SKILL_DIR/scripts/generate_cover.py" "$TITLE" "$SUBTITLE" "$PROJECT_DIR/docs/assets" vertical
python3 "$SKILL_DIR/scripts/generate_cover.py" "$TITLE" "$SUBTITLE" "$PROJECT_DIR/docs/assets" wechat
python3 "$SKILL_DIR/scripts/generate_cover.py" "$TITLE" "$SUBTITLE" "$PROJECT_DIR/docs/assets" xhs
```

## 注意事项

1. **video-config.json 必须在项目根目录**（不是 docs/），否则 generate_docs.js 报错
2. ** narration.txt 覆盖风险**：重新执行 generate_docs.js 会覆盖之前手动重写的版本（166字 vs 209字）。如之前已手动重写且字数在安全区间内，可保留旧版
3. **video-config.json 缺失时**：根据 article.md 内容手动创建，确保含 `cover.title/subtitle/attrs` 字段