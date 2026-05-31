# 主进程接管规范（2026-05-31）

> **最后更新**：2026-05-31  
> **配套文档**：`D-SUBAGENT/subagent-takeover.md`（超时恢复 / 附录D）/ `feishu-base-batch.md`（Base 更新）

---

## 1. Subagent 超时时的兜底渲染

Subagent 超时后，`workspace/{name}/video-project/out/` 下可能已有部分渲染文件。主进程可继续：

```bash
# 1. 检查文件是否存在
ls -la /Users/zhushuyan/.hermes/workspace/{name}/video-project/out/final.mp4

# 2. 若存在，手动渲染（cd 到 video-project 子目录）
cd /Users/zhushuyan/.hermes/workspace/{name}/video-project
node_modules/.bin/remotion render VerticalVideo out/final.mp4 \
  --props "$(cat ../render-props.json)" --concurrency=4 --fps=60 --disable-gpu --log=error

# 3. 验证输出规格
ffprobe -v quiet -print_format json -show_format -show_streams out/final.mp4 \
  | python3 -c "import json,sys; d=json.load(sys.stdin); v=[s for s in d['streams'] if s['codec_type']=='video'][0]; print(f\"{v['width']}x{v['height']} {d['format']['duration']}s\")"
```

**实测案例**：numexpr subagent 超时，workspace 内已有 `video-project/out/final.mp4`，主进程继续渲染成功。

---

## 2. Subagent status=completed 不可信

Subagent 的 `status=completed` 或 `exit_reason: completed` **不等于视频真正生成完成**。必须验证：

1. 飞书 Base `video-creator="是"` 字段是否已写入（单独查询，不能只看 upsert 的 exit_code）
2. `out/final.mp4` 是否存在且非空

### 2.1 验证飞书写入（必须单独查）

批量 upsert 返回 `exit_code: 0` 不代表记录真正更新成功。**必须单独查询验证**：

```bash
lark-cli base +record-get \
  --base-token DTjXbS3tcaLVlqss6mHcmTwrnMg \
  --table-id tblks7R5MCE03xlS \
  --record-id {record-id} --format json 2>&1 \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
fields=d['data']['fields']
row=d['data']['data'][0]
vci=fields.index('video-creator')
print(f'video-creator: {repr(row[vci])}')
"
```

### 2.2 批量 upsert 的陷阱

```bash
# ❌ 错误：相信 upsert 的 exit_code
lark-cli base +record-upsert ... && echo "✅"

# ✅ 正确：upsert 后单独验证
lark-cli base +record-get ... | python3 -c "..."
```

---

## 3. narration 不足10句时的补救

Subagent 生成的 narration 若 < 10 句，主进程可直接补充或重写 `narration.txt`，然后重新生成音频和字幕（**无需重新 clone 仓库**）。

### 3.1 补救步骤

```bash
# 1. 检查当前 narration 句数
wc -l docs/narration.txt

# 2. 补充或重写 narration.txt（确保 ≥10 句）
# 编辑 docs/narration.txt

# 3. 重新生成音频
edge-tts --text "$(cat docs/narration.txt)" --voice zh-CN-YunjianNeural --output audio/neural_full.mp3
# 计算 atempo：target_duration / source_duration
ffmpeg -i audio/neural_full.mp3 -af "atempo=计算值" audio/neural_1_2x.m4a

# 4. 重新生成字幕
python3 scripts/pre-subtitle-check.js  # 验证句数 ≥10
python3 scripts/subtitle-generator.js  # 生成 captions.json

# 5. 复制到 public/audio/
cp audio/neural_1_2x.m4a video-project/public/audio/
cp audio/captions.json video-project/public/audio/

# 6. 更新 Root.tsx 帧数
# 用 round(音频秒数 × 60) 而非 ceil()
```

**实测案例**：MinerU 4句 → 主进程补充至10句以上完成渲染。

---

## 4. 流水线批处理模式

每批并行3个 subagent，完成后主进程统一更新飞书 Base 并清理仓库。

### 4.1 典型批处理流程

```bash
# 1. 查询待处理记录（取最老一条）
python3 -c "
import subprocess, json
result = subprocess.run(['lark-cli', 'base', '+record-list', ...], capture_output=True, text=True)
d = json.loads(result.stdout)
# 筛选 video-creator != '是'，按添加时间升序，取第一条
"

# 2. 并行启动3个 subagent
delegate_task(context={url, record_id, token, ...}, goal=..., toolsets=[...])  # ×3

# 3. 等待全部完成

# 4. 主进程更新飞书 + 清理
lark-cli base +record-upsert ... && rm -rf /Users/zhushuyan/{project}/

# 5. 循环下一批
```

### 4.2 飞书 Base 状态同步

每次更新后必须同步确认：
- `video-creator` 字段已写入 `"是"`
- 仓库目录已清理
- 无残留 `*-repo/` 目录

---

## 5. 经验数据（2026-05-31）

| 阶段 | 记录数 | 备注 |
|------|--------|------|
| 总记录 | 55条 | 飞书 Base tblks7R5MCE03xlS |
| 已完成 | ~43条 | video-creator="是" |
| 待处理 | 20条 | 下一条：vercel-labs/zerolang |
| 超时记录 | vercel-labs/zerolang | 需重新执行 |