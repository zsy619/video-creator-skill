# video-creator 工作流系统性失败模式

> **用途**：本文件记录 video-creator 技能中已被实测验证的失败模式。
> 当 subagent 执行视频生成任务时，优先查阅本文件以避免已知陷阱。
> 本文件按严重程度排序。

---

## 1. generate_docs.js 被绕过（最高风险）

**症状**：11 个文件中缺 8 个（video-script.md、copy.md、wechat-copy.md、posting-guide.md、report.json、landing-page.html、article-page.html、wechat-page.html），只有 article.md 和 narration.txt 存在。

**根因**：subagent 靠"理解任务后自己写"而不是"找到并执行 generate_docs.js"。这是 subagent 的合理决策行为，不是偶发错误。

**实测案例**：clawd-on-desk（2026-05-18）— subagent 自行生成 article.md + narration.txt，跳过脚本。

**防护措施**：
```bash
# 强制执行 generate_docs.js 并验证全部 11 个文件存在
node "$SKILL_DIR/scripts/generate_docs.js"
for f in article.md video-script.md narration.txt copy.md wechat-copy.md posting-guide.md session-log.md report.json landing-page.html article-page.html wechat-page.html; do
  [ -f "docs/$f" ] || { echo "❌ docs/$f 未生成"; exit 1; }
done
echo "✅ 11个文件全部生成"
```

---

## 2. generate_docs.js 生成的 narration.txt 不可用（高频）

**症状**：narration.txt 含 `|`、`---`、反引号等 markdown 噪声；字数远超上限（含英文/符号被计入）；TTS 实际配音内容被破坏。

**根因**：stripMarkdown() 将表格列分隔符 `|` 等作为有效文本提取出来，且未过滤反引号。

**防护措施**：
```bash
# generate_docs.js 之后立即执行 markdown 噪声检测
python3 -c "
t=open('docs/narration.txt').read()
assert '|' not in t, '含表格符|'
assert '\`\`' not in t, '含反引号'
assert t.count('。')>=3, '句子不足3'
"
```

**处理方法**：每次都需要完整重写 narration.txt（100~175 字中文配音文本），不要依赖脚本输出。

---

## 3. captions.json 末段 endMs 与视频时长不同步

**症状**：最后 N 秒视频无字幕覆盖；captions.json 末段 endMs = 音频时长毫秒，而非视频时长毫秒。

**根因**：captions.json 按音频时长等比分段，但渲染后视频时长可能因帧率/编码微差与音频不同。

**实测案例**：seomachine-video（2026-05-15）— 视频 42.65s，但 captions 末段 endMs=38064（= 音频 38.064s），差 4.6s。

**防护措施**：
```bash
# 在渲染完成后立即修正 captions.json 末段 endMs
VIDEO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 video-project/out/final.mp4)
EXPECTED_MS=$(python3 -c "print(int(round($VIDEO_DUR * 1000)))")
python3 -c "
import json
caps = json.load(open('video-project/public/audio/captions.json'))
if caps[-1]['endMs'] != $EXPECTED_MS:
    caps[-1]['endMs'] = $EXPECTED_MS
    json.dump(caps, open('video-project/public/audio/captions.json','w'), ensure_ascii=False, indent=2)
    print(f'修正末段endMs: {caps[-1][\"endMs\"]} → $EXPECTED_MS')
"
```

---

## 4. Git 内容与 video-creator 生成物混杂

**症状**：rm -rf 清理时 Git 内容被一起删除；或 Git 内容残留污染项目根目录。

**根因**：subagent 在 launch.sh init 之前 clone，产生 `repo/repo/` 或 `repo/repo-repo/` 嵌套。

**实测案例**：shimmy、DeepSeek-TUI、12-factor-agents（2026-05-18）— 全部产生嵌套目录，手动展开修复。

**防护措施**：
```bash
# clone 后立即隔离
REPO_NAME=$(basename "$URL" .git)
if [ -f "$PROJ_DIR/.git/config" ]; then
  mv "$PROJ_DIR" "$PROJ_DIR-temp"
  mkdir -p "$PROJ_DIR"
  mv "$PROJ_DIR-temp" "$PROJ_DIR/${REPO_NAME}-repo"
fi
```

---

## 5. Base API 更新静默失败

**症状**：record-batch-update 超时/5xx，但脚本继续执行；Base 仍为 pending，视频被 Feishu 自动化重复拾取。

**防护措施**：
```bash
# Base 更新后必须验证
lark-cli base +record-get --base-id ... --record-id $RECORD_ID --format json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); assert '是' in str(d), 'Base更新未生效'"
```

---

## 6. node-execSync encoding bug（Node.js 24 兼容）

**症状**：`r.stdout === undefined`；音频码率检测始终失败。

**根因**：Node.js 24 中 `execSync(cmd, {encoding:'utf8'})` 直接返回字符串，不返回 `{stdout, stderr}` 对象。

**涉及文件**：video-quality-gate.js 的 getAudioMeta()（已修复），其他脚本可能有残留。

**安全模式**：
```javascript
const raw = execSync(cmd, { encoding: 'utf8' });
const output = typeof raw === 'string' ? raw : (raw.stdout || '');
```
