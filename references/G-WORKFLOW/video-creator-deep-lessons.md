# video-creator 深度经验总结（2026-05-30）
> **最后更新**：2026-05-30
> 来源：VibeVoice-video + synapse-ai + CF-Hero 调试会话 + SKILL.md 迁移（2026-05-30）

---

## 1. article.md 占位符问题是致命根因

**症状**：视频每帧内容与项目无关（CF-Hero 项目显示为通用占位符文本），`generate_docs.js` 提取出垃圾关键词（"为安全研"、"这是一款专"）。
**根因**：`article.md` 被 Subagent 写入占位符模板文本，不是真实内容。后续所有 extract 函数基于占位符生成垃圾数据 → narration 乱码 → 音频配音无意义 → 视频内容全错。
**防护检查（Step 0 后必做）**：
```python
text = open('docs/article.md').read()
assert '请在此处' not in text, "占位符内容！"
cn = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
assert cn >= 100, f"中文字数不足: {cn}"
```

---

## 2. narration.txt 必须手写，不得依赖 generate_docs.js

**症状**：生成器输出的 narration 含英文句号（`.`）、控制字符、或过短（<100字），导致音频时长异常或内容空洞。

**正确做法**：
- 根据 README 真实内容手写 150-200 字纯中文 narration
- 用中文 `。` 分割，不用 ASCII `.`
- 控制字符数 = 0
- 写入后验证：
```python
text = open('docs/narration.txt').read()
bad = sum(1 for c in text if ord(c) < 32 and c not in '\n\r\t')
dots = text.count('.')
cn = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
print(f'控制字符:{bad}, 英文句号:{dots}, 中文字数:{cn}')
assert bad == 0 and dots == 0 and 100 <= cn <= 350
```

---

## 3. 动态 N 场景 + 百分比等分是标准解法

**场景数量规则**（caption 句数 N）：
- N ≤ 3 → 2 场景：Cover + Ending
- N ≤ 6 → 4 场景：Cover + PainPoint + Solution + Ending
- N ≤ 9 → 5 场景：+ Features
- N > 9 → 6 场景：+ Start

**百分比等分时间轴**（避免末场景越界）：
```python
total_ms = captions[-1]['endMs']  # 视频总时长
types = ['Cover', 'PainPoint', 'Solution', 'Features', 'Start', 'Ending']
for i, name in enumerate(types):
    pct_start = i / len(types)
    pct_end = (i + 1) / len(types)
    scenes.append({
        'startMs': round(pct_start * total_ms),
        'endMs': round(pct_end * total_ms),
        'duration': round((pct_end - pct_start) * total_ms / 1000, 2),
    })
```

---

## 4. DynamicScene.tsx 三层修复流程（2026-05-29 更新）

**问题层**（同时存在，缺一不可修复）：
1. `create-remotion-project.js` 生成的 JS 模板字符串中，换行符写成 `\\n`（字面反斜杠+n），写入 TSX 后文件变成 1 行超长串（字节 `5c 6e`），esbuild 无法解析
2. JSX 中 `{{ hLines }}{{ vLines }}` 双花括号 → React error #31（被识别为对象字面量而非数组 children）
3. `Root.tsx` 的 `scenes: []` 为空，未从 `video-config.json` 注入场景数据

**修复流程**（每次创建项目后必须执行）：

### Step A：检测
```bash
LINES=$(wc -l < video-project/src/scenes/DynamicScene.tsx)
[ "$LINES" -lt 50 ] && echo "❌ 仅 ${LINES} 行（含 literal \\n 损坏）"
head -1 video-project/src/scenes/DynamicScene.tsx | xxd | grep -q "5c6e" && echo "❌" || echo "✅"
grep -c '{{ hLines }}' video-project/src/scenes/DynamicScene.tsx  # 必须为 0
grep "scenes: \[\]" video-project/src/Root.tsx && echo "❌ scenes 为空" || echo "✅"
```

### Step B：Python 修复 literal \n（若检测到）
```python
with open('video-project/src/scenes/DynamicScene.tsx', 'rb') as f:
    data = f.read()
count = data.count(b'\x5c\x6e')
if count > 0:
    fixed = data.replace(b'\x5c\x6e', b'\x0a')
    with open('video-project/src/scenes/DynamicScene.tsx', 'wb') as f:
        f.write(fixed)
    print(f'Fixed {count} literal \\n → {len(fixed.split(chr(10)))} lines')
```

### Step C：Patch 修复 JSX double brace（若检测到）
```python
# ❌ 不能用 fix-all-tsx.js（会破坏 create-remotion-project.js 自身）
# ✅ 直接 patch
content = open('video-project/src/scenes/DynamicScene.tsx').read()
content = content.replace('{{ hLines }}', '{hLines}')
content = content.replace('{{ vLines }}', '{vLines}')
open('video-project/src/scenes/DynamicScene.tsx', 'w').write(content)
print('Fixed double curly braces')
```

### Step D：Root.tsx 场景数据注入（若 scenes: []）
```python
import json
cfg = json.load(open('video-config.json'))
scenes = cfg['scenes']
# 从 cfg.cover 读取 title/subtitle/attrs，构建完整 scenes 数组
# 包含 painPoints/features/steps/url/license
# 写入 Root.tsx defaultProps.scenes（替换 scenes: []）
```

### Step E：音频和字幕复制
```bash
mkdir -p video-project/public/audio
cp audio/neural_1_2x.m4a video-project/public/audio/
cp audio/captions.json video-project/public/audio/
cd video-project && npm install
```

### Step F：渲染前最终验证
```bash
wc -l video-project/src/scenes/DynamicScene.tsx  # 必须 > 200
head -1 video-project/src/scenes/DynamicScene.tsx | xxd | grep "5c6e" && echo "❌" || echo "✅"
grep -c '{{ hLines }}' video-project/src/scenes/DynamicScene.tsx  # 必须为 0
grep "scenes: \[\]" video-project/src/Root.tsx && echo "❌" || echo "✅ scenes 已注入"
ls video-project/public/audio/neural_1_2x.m4a video-project/public/audio/captions.json
```

**已知 bug 组合**（必然同时触发）：
- ✅ 双花括号 bug → `fix-all-tsx.js` 可修复（但会破坏 create-remotion-project.js）
- ❌ literal `\n` bug → `fix-all-tsx.js` **无效**
- **正确组合**：Python 字节替换（Step B）+ patch（Step C）

---

## 5. `lark-cli` 每次调用必须带完整认证参数

**症状**：首次执行成功，后续执行同一命令时报错 `required flag(s) "base-token", "table-id" not set`。

**原因**：`--base-token` 和 `--table-id` 不会跨调用持久化。

**正确做法**：每次都显式传入：
```bash
lark-cli base +record-upsert \
  --base-token "DTjXbS3tcaLVlqss6mHcmTwrnMg" \
  --table-id "tblks7R5MCE03xlS" \
  --record-id recvkjoKmNxTJM \
  --json '{"video-creator":"是"}'
```

---

## 6. 封面图 base64 data URL 是最终可靠方案

**症状**：`staticFile("assets/cover.png")` 404、`import Cover from "./cover.png"` 失败、CSS gradient 无法达到亮度要求。
**根因**：Remotion 服务端渲染时 Chromium file:// 协议限制 + SVG `<line stroke>` 不渲染。

**最终解决方案**：base64 data URL
```python
import base64
with open('docs/assets/cover.png', 'rb') as f:
    data = base64.b64encode(f.read()).decode()
with open('video-project/src/assets/coverData.js', 'w') as f:
    f.write(f'export const coverDataUrl = "data:image/png;base64,{data}";\n')
```
在 DynamicScene.tsx 中：
```tsx
import { coverDataUrl } from '../assets/coverData';
// 使用：
<img src={coverDataUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
```

---

## 7. Remotion 渲染后必须验证的内容

| 检查项 | 命令 | 合格标准 |
|--------|------|---------|
| 首帧亮度 | `ffmpeg -i out/final.mp4 -vf "select=eq(n\\,0)" -vframes 1 /tmp/f.png && python3 -c "from PIL import Image; img=Image.open('/tmp/f.png'); print(sum(p[0]+p[1]+p[2] for p in img.getdata())/len(list(img.getdata()))/3)"` | 均值 > 25 |
| 视频时长 | `ffprobe -v quiet -show_entries format=duration -of csv=p=0 out/final.mp4` | 误差 < 1s |
| 尺寸 | `ffprobe -v quiet -show_entries stream=width,height -of csv=p=0 out/final.mp4` | 1080×1920 |
| 帧率 | `ffprobe -v quiet -show_entries stream=r_frame_rate -of csv=p=0 out/final.mp4` | 60/1 |
| 音频 | `ffprobe -v quiet -show_entries stream=codec_name -of csv=p=0 out/final.mp4` | aac |

---

## 8. Subagent 超时接管：强制验证项目结构

Subagent 报告 `status=completed` 后，主进程**必须**执行以下门禁：
```bash
for f in \
  video-project/src/Root.tsx \
  video-project/src/Video.tsx \
  video-project/src/scenes/DynamicScene.tsx \
  video-project/public/audio/captions.json \
  | video-project/public/audio/neural_1_2x.m4a; do
    if [ ! -s "$f" ]; then echo "❌ 空文件: $f"; exit 1; fi
  done
  LINES=$(wc -l < video-project/src/scenes/DynamicScene.tsx)
  if [ "$LINES" -lt 50 ]; then echo "❌ DynamicScene.tsx 仅 $LINES 行"; exit 1; fi
  echo "✅ Remotion 项目结构完整"
  ```

  ---

  ## 9. SKILL.md 迁移 Bug 记录（2026-05-30）

  > 来源：SKILL.md 第 203-702 行 Confirmed Bugs 和失败模式段落  
  > 目的：将已确认 Bug 从 SKILL.md 迁移到 references/ 知识库，实现零丢失集中管理

  ### 9.1 article.md 占位符 + generate_docs.js 5个 Bug

  **症状**：视频每帧显示的内容与实际项目无关（CF-Hero 显示为通用占位符文本）。根因追溯：
  - `article.md` 包含 `"请在此处粘贴原始文章内容..."` 等占位符文本
  - `stripMarkdown()` 解析占位符后，`extractKeywords()` 提取出垃圾碎片（如"为安全研"、"这是一款专"）
  - `extractNarration()` 生成乱码 narration，音频配音变成无意义文本
  - `DynamicScene.tsx` 编译后包含损坏数据，导致视频内容全错

  **5个已确认的 generate_docs.js Bug**（必须修复后才能得到正确内容）：

  1. **`[字符类]` 内 `|` 是字面字符非或运算**
     - 错误：`/([^.！？]{8,30}[问题|困难|麻烦...]/)` — `[]` 内的 `|` 是字面字符
     - 修复：改为 `(?:问题|困难|麻烦...)` 非捕获组

  2. **关键词去重优先保留短词**
     - 原逻辑：短词先加入后，长词因被 `r.includes(w)` 包含而被过滤
     - 修复：对 sorted 数组迭代时反向检查 — 已有词包含当前词则丢弃当前词

  3. **`STOP_WORD_MULTI` 使用 `startsWith` 而非 `includes`**
     - 错误：仅过滤词首匹配（如"为安全研"作为开头才算过滤）
     - 修复：改为 `sw.includes(w)` — 停用词出现在任意位置都过滤

  4. **`extractNarration()` 字节/字符边界混淆**
     - `acc++` 按 UTF-8 字符计数，但 `slice(0, breakIdx)` 按字节截断
     - 修复：使用字符感知的截断方式

  5. **主题漂移（Topic Drift）**
     - 症状：`narration.txt` 跑题（如编程课程讲成"社交氛围感"）
     - 修复：不重跑 `generate_docs.js`，直接手动重写 narration + video-script → 重新生成音频+字幕

  **防护检查（Step 0 后必做）**：
  ```python
  text = open('docs/narration.txt', encoding='utf-8').read()
  bad = sum(1 for c in text if ord(c) < 32 and c not in '\n\r\t')
  cn = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
  print(f'控制字符数: {bad}, 中文字数: {cn}')
  if bad > 0 or cn < 20: exit(1)
  ```

  ### 9.2 Root.tsx `durationInFrames={0}` 导致渲染失败

  **症状**：`TypeError: The "durationInFrames" prop in <Composition id="VerticalVideo"> must be positive, but got 0.`
  **根因**：使用 `calculateMetadata` 时，`durationInFrames` 初始值必须为正数，Remotion 在 bundle 阶段校验初始值是否 >0，而非等 `calculateMetadata` 执行完再判断。
  **正确方案（二选一）**：
  1. **直接硬编码** `durationInFrames={3120}`（音频 52s × 60fps = 3120帧），放弃 `calculateMetadata`
  2. **保留 `calculateMetadata` 但 `durationInFrames` 设为正数**：`durationInFrames={1}` + `calculateMetadata` 返回真实帧数

  > ⚠️ `@remotion/media-utils` 的 `getAudioDuration` 在 subagent 渲染时可能不存在。**推荐方案 1**：直接用 ffprobe 获取音频时长 × 60fps，硬编码到 Root.tsx。

  ### 9.3 冲突 9：CoverScene attrs 配置层到渲染层断连

  **问题**：`video-config.json cover.attrs` 字段完整（如 `["WebGL渲染引擎","15层数据可视化","60fps流畅体验","MIT开源协议"]`），但渲染的封面标签是 hard-coded 的 `["🛩️ 航空追踪","🚢 海事监控","🔒 RECON工具包"]`，与配置完全脱节
  **根因**：`CoverScene` 组件声明为 `({ title, subtitle })`，接收参数中无 `attrs`，内部直接引用 hard-coded 标签数组
  **修复链路（5个环节必须全部贯通）**：
  1. `video-config.json cover.attrs` — ✅ 已有
  2. `Root.tsx scenes[0].attrs` — 需补充 Cover 场景的 attrs 字段
  3. `Video.tsx attrs={scene.attrs}` — 需补充 attrs 透传
  4. `DynamicScene.tsx` 接口 + 透传 — 需补充 `attrs` 参数接收并传 `CoverScene`
  5. `CoverScene({ title, subtitle, attrs })` — 需接收 `attrs`，fallback 为默认值

  ### 9.4 冲突 10：voice.atempo 字段说明

  **背景**：`video-config.json` 的 `voice.atempo` 字段用于 ffmpeg 后处理阶段，对 `neural_full.mp3` 原始音频执行 atempo 变速（1.2x），输出到 `neural_1_2x.m4a`
  **用途**：atempo 在 ffmpeg 后处理阶段生效，不影响 TTS 生成速率。Remotion 直接播放已处理的 `neural_1_2x.m4a`
  **注意**：若音频 pipeline 改为直接使用原始音频（无 ffmpeg atempo），需同步删除此字段避免误导

  ### 9.5 冲突 11：video-config.json duration/scenes 与 Root.tsx 帧数不一致

  **问题**：`video-config.json` 的 `duration: 47`（秒）和 `scenes[].duration: 7.83s`（6场景）是近似值，但 Root.tsx 的 `DURATION_FRAMES = 2819` 基于精确的 `46968ms / 60fps` 计算，两者数值不精确对应
  **原则**：以 `ffprobe` 测得的视频实际时长和 `Root.tsx DURATION_FRAMES` 为准，`video-config.json` 的 duration 是展示用近似值

  ### 9.6 DURATION_FRAMES 正则必须覆盖 4 种模式

  **症状**：旧正则只匹配 `DURATION_FRAMES = xxx`，漏掉了 135 个项目实际使用的 JSX `durationInFrames={3610}` 格式。

  **Remotion 项目帧数配置4种形式**：
  1. `durationInFrames={3610}` — JSX 硬编码（135 个项目，最常见）
  2. `durationInFrames={60 * 53}` — 乘法表达式（少数）
  3. `const TOTAL_FRAMES = 844` — 常量别名（needle-video 等）
  4. `const DURATION = 48` — Video.tsx 导出常量（andrej-karpathy-video）

  **正确正则（4模式全覆盖）**：
  ```python
  def extract_frames(content: str):
      # 模式 1: durationInFrames={数字}
      m = re.search(r'durationInFrames\s*[=:]\s*\{?\s*(\d+)\s*\}?', content)
      if m: return int(m.group(1))
      # 模式 2: durationInFrames={数字 * 数字}
      m = re.search(r'durationInFrames\s*[=:]\s*\{?\s*(\d+)\s*\*\s*(\d+)\s*\}?', content)
      if m: return int(m.group(1)) * int(m.group(2))
      # 模式 3: const TOTAL_FRAMES / DURATION_FRAMES = 数字
      m = re.search(r'const\s+(?:TOTAL_FRAMES|DURATION_FRAMES)\s*=\s*(\d+)', content)
      if m: return int(m.group(1))
      # 模式 4: const DURATION = 数字（Video.tsx）
      m = re.search(r'const\s+DURATION\s*=\s*(\d+)', content)
      if m: return int(m.group(1))
      return None
  ```

  ### 9.7 DURATION_FRAMES 必须从渲染后视频实测值反推

  **正确公式**：`DURATION_FRAMES = round(ffprobe 实测视频秒数 × 60)` — **永远用 round()，不用 ceil()！**
  > ⚠️ 绝对不能基于 `neural_1_2x.m4a` 时长计算帧数。必须基于渲染出的 MP4 实际时长。
  > ⚠️ 实测 47082ms，`ceil(47.082×60)=2826`，但 Remotion 渲染出 2825 帧（Remotion 内部用 round(47082/1000×60)=round(2824.92)=2825）。

  ### 9.8 captions.json endMs 必须基于渲染后视频时长等比缩放

  **判断规则**：
  - neural_1_2x 时长 ≈ 视频时长：字幕正确，无需修改
  - neural_1_2x 时长 = 视频时长 × 1.2：字幕由 atempo 音频驱动 → **需要缩放**
  - neural_1_2x 时长 ≠ 视频时长（差异较大）：渲染用了其他音频 → **需要缩放**

  **缩放公式**：`scale = video_ms / cap_endms`，所有字幕时间戳乘以 scale：
  ```python
  scale = video_ms / cap_endms
  for cap in captions:
      cap['startMs'] = round(cap['startMs'] * scale)
      cap['endMs'] = round(cap['endMs'] * scale)
  ```

  ### 9.9 video-quality-gate.js h264x 误判为失败

  **症状**：npm run build 成功渲染（5.77MB），但门禁报告 ❌ 视频编码: h264x（期望 h264）。
  **根因**：Remotion 4.x 在不同 OS/arch 下输出不同的 H.264 编码名：h264（Linux）、h264x（macOS ARM64）、libx264（部分配置）。
  **修复**：将 h264x 和 libx264 加入白名单 `validH264 = ['h264', 'h264x', 'libx264']`。

  ### 9.10 Subagent status=completed ≠ 项目完成

  **症状**：飞书 Base 标记 video-creator="是"，但 video-config.json 缺少 totalMs/scenes 关键字段，渲染时走了 DEFAULT_SCENES fallback，视频内容全错。
  **防护**：主进程强制验证产出，不依赖 subagent status。两条强制性检查：
  1. `node {SKILL_DIR}/scripts/video-quality-gate.js <project-dir> config` — totalMs 必须为正数，scenes 必须非空
  2. `node {SKILL_DIR}/scripts/video-quality-gate.js <project-dir> all` — 全部通过后才认为项目完整

  ### 9.11 Remotion 项目复制后 node_modules 依赖失效

  **症状**：从旧项目复制 video-project 到新项目后，`MODULE_NOT_FOUND`。
  **场景**：Nova3D 从 sub2api 复制 video-project 模板后渲染失败。
  **修复**：不复制 node_modules，直接在新项目执行：
  ```bash
  cd video-project && npm install remotion@4.0.459 @remotion/captions@4.0.459
  ```

  ### 9.12 Python 3.9 严格拒绝 JSON trailing comma

  **症状**：`video-config.json` 解析失败，`Expecting property name enclosed in double quotes` 指向文件末尾 `}` 附近。
  **根因**：Python 3.9 的 `json.load()` 严格遵循 RFC 8259，不允许 trailing comma（如 `"totalMs": 141035,` 后的逗号）。
  **检测**：`python3 -c "import json; json.load(open('video-config.json'))"`
  > ⚠️ 单行 JSON 如 `{"a": 1,}` 也会失败。检查所有 `,}` 和 `,]` 模式。

  ### 9.13 audio/neural_1_2x.m4a 不一定是渲染用音频

  **症状**：neural_1_2x.m4a 时长与视频实际时长不匹配（差 >0.5s），但 captions.json 基于 neural_1_2x 生成，导致字幕与视频对不上。
  **渲染管线可能使用其他音频**：`neural_full.mp3`、`neural_30pct_bgm.m4a`、`neural_processed.m4a`、`original.m4a`
  **识别规则**：
  ```bash
  for f in audio/*.m4a audio/*.mp3; do
    echo "$f: $(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$f")s"
  done
  ```
  **结论**：永远不要假设 `neural_1_2x.m4a` 是渲染用音频。字幕同步的唯一可靠基准是**渲染后的实际视频时长**。

  ### 9.14 冲突 8：文档时长过期引用（52s→47s 脱节）

  **问题**：`posting-guide.md` / `session-log.md` 含 `52秒` 过期引用未更新，`video-config.json` 含 `inferredTheme` 残留字段（与实际 `theme` 不一致）
  **检测**：
  ```python
  import re, os
  for root, dirs, files in os.walk('docs'):
      for f in files:
          if f.endswith(('.md', '.html')):
              path = os.path.join(root, f)
              content = open(path).read()
              if re.search(r'\d{2,3}\s*秒', content):
                  print(f'⚠️  {path}')
  ```
  **原则**：视频时长以 Remotion 渲染后 `ffprobe` 测得的实际秒数为准；`inferredTheme` 应删除，保留 `theme` 字段。

  ### 9.15 AbsoluteFill flex 居中在 Remotion 中完全失效

  **症状**：PainPoint/Features 等多行内容场景，内容偏底部（画布中心 y=960px，内容中心 y=1848px，偏移 888px）。
  **已验证的失效方案**：
  - ❌ `justifyContent: "center"` on AbsoluteFill（单行内容可能OK，多行完全失效）
  - ❌ `justifyContent: "center"` + 内层 div `height: "100%"`
  - ❌ `position: absolute; inset: 0` + flex column

  **✅ 唯一正确方案：transform translate(-50%, -50%) 居中**：
  ```tsx
  <div style={{
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "100%",
    maxWidth: 900,
    textAlign: "center",
  }}>
    {/* 内容 */}
  </div>
  ```
  > ⚠️ transform 居中必须设置 `width: "100%"` 和 `maxWidth`（否则基准点偏移不可预测）。

  ### 9.16 Subagent Step 0 Bypass

  **症状**：Subagent 创建了 narration.txt + 音频 + 视频，但 docs/ 下缺少其余 10 个文档（README.md、video-script.md、copy.md 等）。
  **根因**：Subagent 认为"只要有 narration.txt 就能做视频"，跳过了 generate_docs.js。
  **防护**：
  - `launch.sh audio` 和 `launch.sh render` 现已内置 `check_step0_docs()` 门禁，12 个文档不全则拒绝执行
  - narration.txt 存在 ≠ Step 0 完成；必须全部 12 个文档存在

  ### 9.17 video-quality-gate.js operator precedence Bug

  **症状**：音频时长偏差检测误报（`targetDuration=0.8667` 而非 52）。音频 51.9s，实际偏差仅 1.9%，但显示 57.8% 偏差。
  **根因**：三元运算符优先级陷阱：
  ```javascript
  // 错误（bug）
  targetDuration = cfg.duration || cfg.totalFrames
    ? (cfg.duration || cfg.totalFrames / 60)
    : null;
  // 等价于 cfg.duration || (cfg.totalFrames ? cfg.duration : cfg.totalFrames / 60)
  // 正确：
  targetDuration = (cfg.duration != null)
    ? cfg.duration
    : (cfg.totalFrames != null ? cfg.totalFrames / 60 : null);
  ```

  ### 9.18 Python 帧数计算：只用 `round()`，不用 `math.ceil()`

  **Python 内置 `round()` 是正确的**：Python 的 `round()` 与 Remotion 内部 JS `Math.round()` 行为一致（银行家舍入：.5 时取偶数），实测误差 ≤1 帧。
  **注意**：`math.ceil()` 用于**秒数估算**（`ceil(chineseChars / 400 * 60)`），不用于帧数计算。

  ### 9.19 OpenClawDrive 无法直接覆写 .m4a（需 /tmp/ 中转）

  **症状**：`ffmpeg -i ... output.m4a` 报错 `Invalid argument`。
  **根因**：OpenClawDrive 挂载卷不支持直接 rename/overwrite `.m4a` 文件。
  **修复**：ffmpeg 输出到 `/tmp/` 再 `cp` 到目标位置：
  ```bash
  ffmpeg -y -i audio/neural_full.mp3 -acodec aac -b:a 256k -ar 48000 -ac 2 /tmp/out.m4a
  cp /tmp/out.m4a audio/neural_1_2x.m4a
  ```

  ### 9.20 video-config.json 三字段同步原则

  **必须同时存在的三个时间字段**：
  ```json
  "duration": 141,            // 向下取整秒数（展示用）
  "totalMs": 141035,          // 视频实际总时长（毫秒，精确内部值）
  "durationInSeconds": 141.035  // 精确小数
  ```
  - `scenes[-1].endMs` **必须等于** `totalMs`（毫秒）
  - `scenes[-1].duration` = (totalMs - scenes[-1].startMs) / 1000
  - `duration` 是给人类看的近似值；`totalMs` 是精确内部值

  **video-config.json 必同步 3 项**：
  1. `totalMs` = actual_ms
  2. `scenes[-1].endMs` = actual_ms
  3. `scenes[-1].duration` = (actual_ms - scenes[-1]['startMs']) / 1000

  ### 9.21 渲染后 captions.json 末段 endMs 校准

  **已知陷阱**：Remotion 渲染的实际视频时长与音频时长仍有微小差异（通常 <100ms）。osiris 项目实测：音频 51.977s，视频 52.032s，差 55ms。
  **正确流程**：
  ```bash
  # 1. 渲染完成后立即获取实际视频时长
  VIDEO_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 video-project/out/final.mp4)
  EXPECTED_ENDMS=$(python3 -c "print(int(round(${VIDEO_DUR} * 1000)))")

  # 2. 更新 captions.json 末段 endMs
  python3 -c "
  import json
  with open('audio/captions.json') as f:
      caps = json.load(f)
  caps[-1]['endMs'] = ${EXPECTED_ENDMS}
  with open('audio/captions.json', 'w') as f:
      json.dump(caps, f, ensure_ascii=False, indent=2)
  "
  # 3. 同步到 Remotion public/audio/
  cp audio/captions.json video-project/public/audio/captions.json
  ```

  > ⚠️ **绝对不能跳过第1步**：caption.json 的 startMs 来自音频等比分段（渲染前），但 endMs 必须用视频实际时长（渲染后），两者有本质区别。

  ### 9.22 edge-tts --write-subtitles 可能输出 SRT 而非 JSON

  旧版 edge-tts 的 `--write-subtitles` 参数在某些版本输出 SRT 格式（`1\n00:00:00,000 --> 00:00:05,000\n...`）而非 JSON 格式。需用 Python 解析 SRT 时间码并转换为 JSON captions 数组。检测方法：读取首行，`1` 表示 SRT，`[` 表示 JSON。

  ### 9.23 video-config.json patch 损坏风险

  **症状**：JSON 解析错误（`Expecting ':' delimiter`），根因是 patch 操作同时匹配 cover 块的多行内容并替换，导致 `attrs` 字段或逗号被意外删除。
  **防御**：patch JSON 文件时每次只改一个字段，验证 `python3 -c "import json; json.load(open('x.json'))"` 后再继续。

  ### 9.24 封面 title/subtitle 占位符风险

  **症状**：video-config.json 的 cover.title 为 "视频标题"、cover.subtitle 为 "副标题"，导致视频封面显示错误标题。
  **防御**：generate_docs.js 执行后，检查 video-config.json 的 cover.title 是否为真实项目名称，若仍为占位符则手动修复。