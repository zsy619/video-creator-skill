---
name: video-creator
description: 自动化视频创作技能：从文章/URL/主题生成竖屏社交媒体视频（小红书/视频号/抖音）。整合宝玉技能生态进行内容获取、图片生成、HTML构建和Remotion视频渲染。集成字幕生成、质量检查、自动修复功能，支持批量处理多个视频项目。
homepage: https://github.com/zsy619/video-creator-skill
metadata:
    tags:
      - "video-creator"
      - "video creator"
      - "创建视频"
      - "生成视频"
      - "视频创作"
      - "竖屏视频"
      - "make video"
      - "create video"
      - "检查视频质量"
      - "修复字幕字体"
      - "批量处理视频"
      - "发布公众号"
      - "公众号封面图"
      - "wechat-cover"
      - "微信公众号"
      - "企业级文案"
      - "Remotion音频隔离"
      - "ffmpeg-map音频"
      - "静音音频轨道"
      - "Remotion Native渲染"
      - "@remotion/captions"
      - "音频内嵌视频"
      - "60fps视频"
    "clawdbot":
        "emoji": "🎬"
        "requires":
            "bins": ["node"]
            "env": []
---

## 何时使用

当用户要求以下操作时立即使用本技能：

- "创建视频" / "生成视频" / "视频创作" / "竖屏视频" / "创作视频"
- "把这篇文章做成视频"
- "制作竖屏视频" / "小红书视频" / "抖音视频"
- "video-creator" / "make video" / "create video" / "video creator"
- "检查视频质量" / "修复字幕字体" / "批量处理视频"
- "大字体" / "大字体视频" / "字体要大"
- **"发布公众号" / "微信公众号" / "微信文章" / "发到公众号"** → 执行 Step 12.5
- **"生成公众号封面图" / "wechat-cover" / "微信封面"** → 执行 Step 6.2
- **"企业级文案" / "优化 wechat-copy" / "优化 wechat-page"** → 执行 B/C 优化

> 详见 [rules/INPUT.md](rules/INPUT.md) - 内容输入模式

---

## ⚠️ 限制（铁律，违者必败）

> 渲染前先执行 `references/G-WORKFLOW/video-optimization.md` 中的 4 项预检。问题在起点修复，不是终点补救。
> 用户明确要求：**每次生成视频必须一次到位**，不接受"渲染→发现问题→修复→重新渲染"的返工循环。

### Step 0 铁律
- **禁止跳过 Step 0**（文档生成）。11个文档必须在 Remotion 渲染前全部创建完毕
- **禁止不生成封面图**。封面未生成，不得进入音频生成和视频渲染步骤
- Step 0 完成后必须验证所有文件存在，包括 `session-log.md`（详见 `rules/CHECKLIST.md`）

### 音频铁律
- **禁止分段拼接配音**：必须整段连续生成
- **禁止跳过音频后处理**：必须执行去静音 + atempo + AAC 256k
- **禁止使用旧版 ffmpeg 混流**：Remotion Native 方案（`<Audio>` 直接内嵌 MP4）
- **禁止 edge-tts rate=+20% + atempo=1.2x 叠加**：使用 `--rate +0%` + `VOICE_ATEMPO` 配置值（从 video-config.json `voice.atempo` 读取，默认 1.2）。音频 pipeline 流程：`edge-tts --rate +0%` 生成原始音频 → `ffmpeg atempo ${VOICE_ATEMPO}` 后处理。
- **用户指定 atempo**：从 `video-config.json` 的 `voice.atempo` 字段读取（如 1.2），工作流直接使用该值。若字段不存在则使用默认值 1.2。
- **atempo 仅在后处理生效**：atempo 在 ffmpeg 后处理阶段对音频文件操作，不影响 TTS 生成速率。Remotion 直接播放 `audioFile` 路径的文件，该文件已经过 atempo 处理。
- **音频文件命名**：`audio/neural_full.mp3`（原始）→ `audio/neural_1_2x.m4a`（atempo后）
- **目标时长从 video-config.json 获取**：从 `scenes[-1]['endMs']/1000` 动态计算，禁止硬编码（如 `TARGET_DUR=52`）
- **ffmpeg pad/truncate 必须用 /tmp/ 中转**：直接 `ffmpeg ... output.m4a` 覆盖输入文件会触发 returncode=234（OpenClawDrive 挂载卷特有）；必须先写 `/tmp/` 再 `cp` 覆盖

### 渲染铁律
- **Root.tsx TOTAL_FRAMES**：必须用 `calculateMetadata` 动态计算（`getAudioDuration(staticFile("audio/neural_1_2x.m4a")) × fps`），禁止在 JSX 中硬编码帧数（硬编码值会覆盖 CLI 的 `--duration-in-frames` 参数）。若直接硬编码帧数，必须用 `round(实测秒数 × 60)` 而非 `ceil()`（Remotion 内部用 round()，ceil 会导致多 1 帧偏差）。帧数配置有 4 种形式（`durationInFrames={N}`、`durationInFrames={60*N}`、`TOTAL_FRAMES` const、`DURATION` const），正则必须全覆盖。详见 `references/B-REMOTION/frame-round-calculation.md`。
- **caption.json 末段 endMs** 必须等于视频实际时长（毫秒），而非音频时长
- **video-config.json 必须在项目根目录**（不是 `docs/`）
- **所有 .json 配置文件**必须符合 JSON 语法，禁止重复键名
- **⚠️ `video-config.json` 两项为 CRITICAL 失败条件**（缺少则拒绝渲染）：
  - `totalMs`：数字字段，等于音频实际时长（毫秒），控制视频总帧数
  - `scenes`：非空数组，每条含 `startMs/endMs`，控制场景时间边界
  - 验证命令：`node video-quality-gate.js <project> render` 或 `node video-quality-gate.js <project> config`
  - 若缺失，**必须先补全再渲染**，不得跳过或使用 DEFAULT_SCENES 硬编码蒙混过关
- **⚠️ `captions.json` 条数 < 10 → 拒绝渲染**：条数不足会导致场景时间边界错误，必须扩充 narration.txt 后重新生成字幕
- **⚠️ narration.txt 句数 <10 → 视频质量不达标**：4-6句=4帧，7-9句=5帧，10+句=6帧（最低要求）。低于6帧不符合最低规格。若句数不足，手动补充过渡句确保 ≥10 句。
- **⚠️ `--props` 必须传入 scenes/title/subtitle/theme**：不传则 `scenes: []`，触发 `DEFAULT_SCENES` 回退，全部场景显示"视频标题/痛点场景/解决方案"等占位符。props 对象结构：
  ```json
  {"scenes":[{"id":1,"name":"Cover","duration":7.4,"title":...,...},...],"title":"...","subtitle":"...","theme":"..."}
  ```
  **⚠️ 每条 scene 必须含内容字段**（`painPoints`/`features`/`steps`/`url`/`license`），只传 title/subtitle 会导致场景内容为空（PainPoint 无痛点列表、Features 无功能卡片、Start 无命令步骤、Ending 无链接）。
  ```
  scenes 从 captions.json 的 N 句 narration 等比分配到动态数量的场景（规则见上）；title/subtitle 从 video-config.json 的 cover.title / cover.subtitle 读取

**⚠️ narration.txt 句数不足触发 6 帧的致命后果**：
- 若 narration 只有 7-9 句 → 5 帧场景（无 Start 场景）
- 若 narration 只有 4-6 句 → 4 帧场景（无 Features + Start）
- **低于 6 帧的视频不符合最低质量要求**
- 防护：**手动补充过渡句到 narration.txt**，确保中文字数 ≥420（N ≥10 句）后再进入音频阶段

**动态 N 场景规则（launch.sh Step 7 自动推断）：**
- 2-3 句 → Cover + Ending（首尾）→ **2 帧**
- 4-6 句 → Cover + PainPoint + Solution + Ending → **4 帧**
- 7-9 句 → Cover + PainPoint + Solution + Features + Ending → **5 帧**
- **10+ 句 → Cover + PainPoint + Solution + Features + Start + Ending → 6 帧（最低要求）**

> ⚠️ **narration.txt 中文字数下限**：约 420 字（10 句 × 42 字/句），经 `⌊audio_dur × 3.37⌋` 门禁验证。若句数不足 10 句，视频将只有 4-5 帧，低于最低 6 帧要求。**必须确保 narration ≥10 句**。

**场景类型（scene.name）决定 DynamicScene.tsx 渲染组件：**
- `Cover` / `PainPoint` / `Solution` / `Features` / `Start` / `Ending` / `Generic`（兜底）

**场景数量计算与音频同步（百分比等分，绝对正确公式）：**

```javascript
// captions.json 句数 N → types[] 推断
const types = n<=3  ? ['Cover','Ending']
             : n<=6  ? ['Cover','PainPoint','Solution','Ending']
             : n<=9  ? ['Cover','PainPoint','Solution','Features','Ending']
             :         ['Cover','PainPoint','Solution','Features','Start','Ending'];

// 末 caption startMs = 视频总时长（毫秒），不是音频时长
const totalMs = captions[n - 1].startMs;

types.forEach((name, i) => {
  const pctStart = i / types.length;         // 0/6, 1/6, ... 5/6
  const pctEnd   = (i + 1) / types.length;    // 1/6, 2/6, ... 6/6
  scenes.push({
    id:       i + 1,
    name:     name,
    startMs:  Math.round(pctStart * totalMs),
    endMs:    Math.round(pctEnd   * totalMs),
    duration: (pctEnd - pctStart) * totalMs / 1000,  // 秒
  });
});
// Σ scenes[].duration = totalMs / 1000（精确，无越界）
```

**⚠️ 渲染前必须验证（4 项预检）：**

```bash
# ① narration 质量（控制字符 / 中文字数 ≥20）
python3 -c "
text=open('docs/narration.txt',encoding='utf-8').read()
bad=sum(1 for c in text if ord(c)<32 and c not in '\n\r\t')
cn=sum(1 for c in text if '\u4e00'<=c<='\u9fff')
print(f'控制字符:{bad}, 中文字数:{cn}')
if bad>0 or cn<20: exit(1)
"

# ② Caption 句数 ≥10
python3 -c "import json; n=len(json.load(open('audio/captions.json'))); print(f'句数:{n}'); assert n>=10"

# ③ article.md 无占位符
python3 -c "assert '请在此处' not in open('docs/article.md').read()"

# ④ DynamicScene.tsx 无 literal \n
head -3 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e && echo "❌" || echo "✅"
```

### 清理铁律
- **渲染成功后必须立即清理** `*-repo/` 目录：`rm -rf "${PROJECT_DIR}/*-repo"`
- Git 内容对视频生成无用，删除节省存储空间

### Feishu Base 批量任务铁律
- **禁止使用"快速路径"**：不得用手动 edge-tts + ffmpeg 命令绕过完整工作流程
- **必须完整执行** video-creator 的 Step 0-11（launch.sh all 或等效分步）
- 详见 `references/G-WORKFLOW/feishu-base-batch.md`

### video-config.json cover 字段空对象或缺 attrs 检测
**症状**：`video-config.json` 的 `cover` 字段为 `{}`（完全空），或仅有 `title`+`subtitle` 缺少 `attrs` 数组，导致封面图生成时无属性标签显示。
**检测**：
```bash
python3 -c "import json; c=json.load(open('video-config.json'))['cover']; print('EMPTY' if not c.get('title') else 'attrs='+str(bool(c.get('attrs'))))"
```
**修复**：补充完整字段：
```json
"cover": {
  "title": "<真实标题>",
  "subtitle": "<真实副标题>",
  "attrs": ["<属性1>", "<属性2>", ...]
}
```
> `attrs` 数组是封面图底部属性标签的数据源。封面图 attrs 和视频内嵌封面帧 attrs 共用 `video-config.json cover.attrs`，但分属两个独立渲染环节（详见 `references/E-VISUAL/pil-cover.md`）。
### Root.tsx scenes 必须填充
生成的 Root.tsx 中 `defaultProps.scenes` 默认为空数组 `[]`，导致 Video.tsx 回退到 DEFAULT_SCENES（6 个通用场景，内容与项目无关）。**必须在渲染前将实际 scenes 配置填入 Root.tsx defaultProps**。

### narration.txt 句数门禁
**narration.txt 必须 ≥10 句**：每句约 5-6s，10 句音频约 52s，6 场景每段 8.6s → 满足最低 6 帧要求。9 句以下会导致场景数不足。检测：
```bash
python3 -c "
import re
text=open('docs/narration.txt').read()
sentences=[s.strip() for s in re.split(r'(?<=[。！？])', text) if s.strip()]
print(f'句数: {len(sentences)} (需≥10)')
"
- `generate_docs.js` 生成的 11 个文件中，7 个存在严重质量问题（详见 `references/F-GENDOCS/generate-docs-deep-analysis.md`）
- **Step 0 后强制检查**：narration.txt 必须干净（无 `---`、`|`、反引号），中文字数 ≥20
- 仅 `article.md`、`report.json`、HTML 三件套可直接使用

### ⚠️ 已确认致命 Bug：article.md 占位符内容导致全链路数据损坏
**症状**：视频每帧显示的内容与实际项目无关（CF-Hero 显示为通用占位符文本）。根因追溯：
- `article.md` 包含 `"请在此处粘贴原始文章内容..."` 等占位符文本
- `stripMarkdown()` 解析占位符后，`extractKeywords()` 提取出垃圾碎片（如"为安全研"、"这是一款专"）
- `extractNarration()` 生成乱码 narration，音频配音变成无意义文本
- `DynamicScene.tsx` 编译后包含损坏数据，导致视频内容全错

**5个已确认的 generate_docs.js Bug**（必须修复后才能得到正确内容）：

1. **`[字符类]` 内 `|` 是字面字符非或运算**（第 359 行附近）
   - 错误：`/([^.！？]{8,30}[问题|困难|麻烦...]/)` — `[]` 内的 `|` 是字面字符
   - 修复：改为 `(?:问题|困难|麻烦...)` 非捕获组

2. **关键词去重优先保留短词**（第 158-166 行）
   - 原逻辑：短词先加入后，长词因被 `r.includes(w)` 包含而被过滤
   - 修复：对 sorted 数组迭代时反向检查 — 已有词包含当前词则丢弃当前词

3. **`STOP_WORD_MULTI` 使用 `startsWith` 而非 `includes`**（第 168 行附近）
   - 错误：仅过滤词首匹配（如"为安全研"作为开头才算过滤）
   - 修复：改为 `sw.includes(w)` — 停用词出现在任意位置都过滤

4. **`extractNarration()` 字节/字符边界混淆**
   - `acc++` 按 UTF-8 字符计数，但 `slice(0, breakIdx)` 按字节截断
   - 修复：使用字符感知的截断方式（详见 `references/F-GENDOCS/generate-docs-deep-analysis.md`）

5. **主题漂移（Topic Drift）**
   - 症状：`narration.txt` 跑题（如编程课程讲成"社交氛围感"）
   - 修复：不重跑 `generate_docs.js`，直接手动重写 narration + video-script → 重新生成音频+字幕
   - 详见 `references/F-GENDOCS/generate-docs-deep-analysis.md`（Bug 5）

**防护检查（Step 0 后必做）**：
```bash
python3 -c "
text = open('docs/narration.txt', encoding='utf-8').read()
bad = sum(1 for c in text if ord(c) < 32 and c not in '\n\r\t')
cn = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
print(f'控制字符数: {bad}, 中文字数: {cn}')
if bad > 0 or cn < 20: exit(1)
"
```

**⚠️ 已确认致命 Bug：Root.tsx `durationInFrames={0}` 导致渲染失败**
**症状**：`TypeError: The "durationInFrames" prop in <Composition id="VerticalVideo"> must be positive, but got 0.`
**根因**：使用 `calculateMetadata` 时，`durationInFrames` 初始值必须为正数，Remotion 在 bundle 阶段校验初始值是否 >0，而非等 `calculateMetadata` 执行完再判断。
**正确方案（二选一）**：
1. **直接硬编码** `durationInFrames={3120}`（音频 52s × 60fps = 3120帧），放弃 `calculateMetadata`
2. **保留 `calculateMetadata` 但 `durationInFrames` 设为正数**：`durationInFrames={1}` + `calculateMetadata` 返回真实帧数（Remotion 会在 bundle 后覆盖）
> ⚠️ `@remotion/media-utils` 的 `getAudioDuration` 在 subagent 渲染时可能不存在（`is not a function`），导致 `calculateMetadata` 方案不稳定。**推荐方案 1**：直接用 ffprobe 获取音频时长 × 60fps，硬编码到 Root.tsx。
**检测命令**（渲染前必做）：
```bash
# 检查帧数配置是否为 4 种模式之一
grep -rE 'durationInFrames|TOTAL_FRAMES|DURATION_FRAMES' video-project/src/ || echo "⚠️ 未找到帧数配置"
```
```bash
### 冲突 9：CoverScene attrs 配置层到渲染层断连 ✅ 2026-05-27
- **问题**：`video-config.json cover.attrs` 字段完整（如 `["WebGL渲染引擎","15层数据可视化","60fps流畅体验","MIT开源协议"]`），但渲染的封面标签是 hard-coded 的 `["🛩️ 航空追踪","🚢 海事监控","🔒 RECON工具包"]`，与配置完全脱节
- **根因**：`CoverScene` 组件声明为 `({ title, subtitle })`，接收参数中无 `attrs`，内部直接引用 hard-coded 标签数组
- **受影响文件**：DynamicScene.tsx（CoverScene + DynamicScene）、Video.tsx（无 attrs 透传）、Root.tsx（scenes[0] 无 attrs 字段）
- **修复链路（5个环节必须全部贯通）**：
  1. `video-config.json cover.attrs` — ✅ 已有
  2. `Root.tsx scenes[0].attrs` — 需补充 Cover 场景的 attrs 字段
  3. `Video.tsx attrs={scene.attrs}` — 需补充 attrs 透传
  4. `DynamicScene.tsx` 接口 + 透传 — 需补充 `attrs` 参数接收并传 `CoverScene`
  5. `CoverScene({ title, subtitle, attrs })` — 需接收 `attrs`，fallback 为默认值
- **验证命令**：
```bash
grep "attrs" video-project/src/scenes/DynamicScene.tsx | grep -E "interface|CoverScene|scene.attrs"
grep "attrs" video-project/src/Video.tsx
grep "attrs" video-project/src/Root.tsx | grep scenes
cd video-project && npm run build  # 2819帧 ✅
```
> ⚠️ `npx remotion render --dry-run` 只做 bundle 不渲染，无法验证帧级别错误。必须 `npm run build` 才能确认渲染成功。
> ⚠️ **本节内容与封面图生成（`generate_cover.py`）是完全独立的两个环节**：
> - 封面图生成：创建 `cover.png` / `cover-wechat.png` / `cover-xhs.png` 图片文件，用于发布平台配图
> - CoverScene 视频内嵌标签：Remotion 渲染时在视频封面帧内显示 title + subtitle + attrs 标签，是视频画面的一部分
> 两者数据源均为 `video-config.json cover` 字段，但渲染位置和时机不同。

### 冲突 10：voice.atempo 字段说明（2026-05-28 澄清）
- **背景**：`video-config.json` 的 `voice.atempo` 字段用于 ffmpeg 后处理阶段，对 `neural_full.mp3` 原始音频执行 atempo 变速（1.2x），输出到 `neural_1_2x.m4a`
- **受影响文件**：`video-config.json`（写入 voice.atempo）、`launch.sh`（读取 voice.atempo 并传给 ffmpeg atempo）
- **检测脚本**：
```bash
python3 -c "
import json
cfg = json.load(open('video-config.json'))
ate = cfg.get('voice', {}).get('atempo')
print(f'atempo: {ate}' if ate else '✅ 无 atempo 字段')
"
```
- **用途**：atempo 在 ffmpeg 后处理阶段生效，不影响 TTS 生成速率。Remotion 直接播放已处理的 `neural_1_2x.m4a`，该文件已经过 atempo 变速
- **注意**：若音频 pipeline 改为直接使用原始音频（无 ffmpeg atempo），需同步删除此字段避免误导

### 冲突 11：video-config.json duration/scenes 与 Root.tsx 帧数不一致 ✅ 2026-05-27
- **问题**：`video-config.json` 的 `duration: 47`（秒）和 `scenes[].duration: 7.83s`（6场景）是近似值，但 Root.tsx 的 `DURATION_FRAMES = 2819` 基于精确的 `46968ms / 60fps` 计算，两者数值不精确对应
- **根因**：duration=47 是 `⌊46968/1000⌋` 的向下取整，7.83s 是 `46968/6/1000` 的近似值，两者均非精确值
- **实际精确值**：`46968ms ÷ 6 = 7828ms/场景`，`46968ms ÷ 60fps = 782.8frames/场景`，`2819frames` 总帧数（`⌈46968/60⌉`）
- **原则**：以 `ffprobe` 测得的视频实际时长和 `Root.tsx DURATION_FRAMES` 为准，`video-config.json` 的 duration 是展示用近似值
- **检测命令**：
```bash
# 获取精确视频时长
ffprobe -i video-project/out/final.mp4 -show_entries format=duration -v quiet -of csv=p=0
# Root.tsx 帧数验证
python3 -c "import math; ms=46968; fps=60; frames=math.round(ms/1000*fps); print(f'DURATION_FRAMES={frames}')"
```
> 详见 `references/G-WORKFLOW/frame-sync.md`（帧数反推 / caption 重叠 / 同步脚本）

### ⚠️ 【核心修正 2026-05-27】DURATION_FRAMES 正则必须覆盖 4 种模式
**症状**：上一轮 `batch-duration-fix-20260527.md` 正则只匹配 `DURATION_FRAMES = xxx`，漏掉了 135 个项目实际使用的 JSX `durationInFrames={3610}` 格式，导致误判 135 个项目"帧数未找到"。

**根因**：Remotion 项目帧数配置至少有 4 种形式：
1. `durationInFrames={3610}` — JSX 硬编码（135 个项目，最常见）
2. `durationInFrames={60 * 53}` — 乘法表达式（少数）
3. `const TOTAL_FRAMES = 844` — 常量别名（needle-video 等）
4. `const DURATION = 48` — Video.tsx 导出常量（andrej-karpathy-video）

**正确正则**（必须 4 模式全覆盖）：
```python
import re

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

**验证脚本**（批量 135 项目，8-10s 完成）：
```python
import os, re, subprocess, json
workspace = "/Volumes/OpenClawDrive/.hermes/workspace"
valid = [p for p in os.listdir(workspace)
         if os.path.exists(f"{workspace}/{p}/video-project/out/final.mp4")]
errors = []
for p in sorted(valid):
    for fp in [f"{workspace}/{p}/video-project/src/Root.tsx",
               f"{workspace}/{p}/video-project/src/index.tsx",
               f"{workspace}/{p}/video-project/src/Video.tsx"]:
        if os.path.exists(fp):
            with open(fp) as f: c = f.read()
            frames = extract_frames(c)
            if frames is not None: break
    else:
        frames = None
    r = subprocess.run(['ffprobe','-v','quiet','-print_format','json','-show_format',
                       f"{workspace}/{p}/video-project/out/final.mp4"],
                      capture_output=True, text=True, timeout=10)
    actual = float(json.loads(r.stdout)['format']['duration'])
    if frames and abs(frames/60 - actual) >= 1.0:
        errors.append((p, frames, actual))
    elif frames is None:
        errors.append((p, None, actual))
print(f"有问题: {len(errors)}/{len(valid)}")
```

### ⚠️ 【核心修正 2026-05-27】DURATION_FRAMES 必须从渲染后视频实测值反推
**症状**：所有"3119帧模板项目"（≈52s）实际渲染出 52.032s，DURATION_FRAMES=3119 对应 51.983s，差 49ms导致末帧被切。
**根因**：DURATION_FRAMES 错误地基于音频时长计算（atempo 后音频 51.975s），而 Remotion 渲染的实际视频时长略长（52.032s）。
**正确公式**：`DURATION_FRAMES = round(ffprobe 实测视频秒数 × 60)` — **永远用 round()，不用 ceil()！**
```bash
# 必须用 ffprobe 测渲染后的实际视频文件
VIDEO_S=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 video-project/out/final.mp4)
python3 -c "import math; frames=round(float('$VIDEO_S') * 60); print(f'DURATION_FRAMES={frames}')"
```
> ⚠️ 绝对不能基于 `neural_1_2x.m4a` 时长（51.975s）计算帧数。必须基于渲染出的 MP4 实际时长。
> ⚠️ 用 round() 而非 ceil()：实测 47082ms，ceil(47.082×60)=2826，但 Remotion 渲染出 2825 帧（Remotion 内部用 round(47082/1000×60)=round(2824.92)=2825）。
**批量修复（141项目经验）**：
- 并发 ffprobe 12 线程，约 10s 扫描全部项目
- `video-config.json` 补充 `durationInSeconds: 实测秒数` 或 `totalMs: 实测毫秒`
- 143 个项目修复后全部 100% 帧数正确

**⚠️ 【核心修正 2026-05-27】captions.json endMs 必须基于渲染后视频时长等比缩放**
**问题本质**：neural_1_2x.m4a 标注"1.2x 加速"，但渲染时可能使用原始音频（neural_full.mp3）、BGM 变体（neural_30pct_bgm.m4a）等，导致：
- 音频时长 ≠ 视频时长（如 hermes-web-search-plus: neural_1_2x=44.5s，视频=28.7s）
- captions.json 由 neural_1_2x 驱动，endMs 基于错误时长

**判断规则**（三种情况）：
1. neural_1_2x 时长 ≈ 视频时长：字幕正确，无需修改
2. neural_1_2x 时长 = 视频时长 × 1.2：字幕由 atempo 音频驱动 → **需要缩放**
3. neural_1_2x 时长 ≠ 视频时长（差异较大）：渲染用了其他音频 → **需要缩放**

**缩放公式**：scale = video_ms / cap_endms，所有字幕时间戳乘以 scale：
```python
scale = video_ms / cap_endms
for cap in captions:
    cap['startMs'] = round(cap['startMs'] * scale)
    cap['endMs'] = round(cap['endMs'] * scale)
```

**7 个问题项目实测修复**：
| 项目 | 原始 endMs | 视频 ms | scale | 修复结果 |
|------|-----------|---------|-------|---------|
| CF-Hero | 85163 | 60160 | 0.7064 | ✅ 60160ms |
| hermes-paperclip-adapter-video | 25204 | 21056 | 0.8354 | ✅ 21056ms |
| hermes-web-search-plus-video | 44522 | 28650 | 0.6435 | ✅ 28650ms |
| markdown-nice-video | 27285 | 29440 | 1.0790 | ✅ 29440ms |
| workshop | 26124 | 50048 | 1.9158 | ✅ 50048ms |
| SenseNova-U1 | 51136 | 47082 | 0.9207 | ✅ 47082ms |
| xhttp-installer-video | 51978 | 55680 | 1.0712 | ✅ 55680ms |

### ⚠️ video-quality-gate.js h264x 误判为失败（2026-05-29 新增）
**症状**：npm run build 成功渲染（5.77MB），但门禁报告 ❌ 视频编码: h264x（期望 h264）。
**根因**：Remotion 4.x 在不同 OS/arch 下输出不同的 H.264 编码名：h264（Linux）、h264x（macOS ARM64）、libx264（部分配置）。旧检查 codecOut === 'h264' 不覆盖 h264x。
**修复**：将 h264x 和 libx264 加入白名单 validH264 = ['h264', 'h264x', 'libx264']。
**实测验证**：Nova3D 项目（60条批处理第2条）渲染输出 h264x，门禁报告 ❌，实际视频正常。修复后门禁通过。

### ⚠️ Subagent status=completed ≠ 项目完成（2026-05-29 新增）
**症状**：飞书 Base 标记 video-creator="是"，但 video-config.json 缺少 totalMs/scenes 关键字段，渲染时走了 DEFAULT_SCENES fallback，视频内容全错。
**根因**：Subagent 报告 "完成" 时只验证了文件存在性（final.mp4 存在），未验证 video-config.json 的字段完整性。
**防护**：主进程强制验证产出，不依赖 subagent status。两条强制性检查：
1. node {SKILL_DIR}/scripts/video-quality-gate.js <project-dir> config — totalMs 必须为正数，scenes 必须非空且每条含 startMs/endMs
2. node {SKILL_DIR}/scripts/video-quality-gate.js <project-dir> all — 全部通过后才认为项目完整
**关联风险：video-config.json patch 损坏**
症状：JSON 解析错误（`Expecting ':' delimiter`），根因是 patch 操作同时匹配 cover 块的多行内容并替换，导致 `attrs` 字段或逗号被意外删除，留下孤立内容。
**防御**：patch JSON 文件时每次只改一个字段，验证 `python3 -c "import json; json.load(open('x.json'))"` 后再继续。

### ⚠️ Remotion 项目复制后 node_modules 依赖失效（2026-05-29 新增）
**症状**：从旧项目复制 video-project 到新项目后，node_modules/.bin/remotion 引用原绝对路径（如 /Volumes/.../node_modules/.bin/remotion），导致 `MODULE_NOT_FOUND`。
**场景**：Nova3D 从 sub2api 复制 video-project 模板后渲染失败。
**根因**：node_modules 内脚本含硬编码绝对路径，重新 npm install 可解决。
**修复**：不复制 node_modules，直接在新项目执行：
```bash
cd video-project && npm install remotion@4.0.459 @remotion/captions@4.0.459
```
**防护**：launch.sh 复制模板时自动执行 npm install，无需手动干预。

### ⚠️ Python 3.9 严格拒绝 JSON trailing comma
**症状**：video-config.json 解析失败，Expecting property name enclosed in double quotes 指向文件末尾 } 附近。
**根因**：Python 3.9 的 json.load() 严格遵循 RFC 8259，不允许 trailing comma（如 "totalMs": 141035, 后的逗号）。
**检测**：python3 -c "import json; json.load(open('video-config.json'))"
**修复**：删除 trailing comma。Python 3.9/3.11 均严格拒绝 trailing comma，必须符合 RFC 8259。
> ⚠️ 单行 JSON 如 {"a": 1,} 也会失败。检查所有 ,} 和 ,] 模式。

### ⚠️ audio/neural_1_2x.m4a 不一定是渲染用音频（2026-05-27 新增）
**症状**：neural_1_2x.m4a 时长与视频实际时长不匹配（差 >0.5s），但 captions.json 基于 neural_1_2x 生成，导致字幕与视频对不上。
**根因**：渲染管线可能使用其他音频文件：
- `neural_full.mp3`（原始速率）
- `neural_30pct_bgm.m4a`（30%背景音乐版）
- `neural_processed.m4a`
- `original.m4a`

**识别规则**：
```bash
# 对比所有音频文件时长与视频时长，差异最小者为渲染用音频
for f in audio/*.m4a audio/*.mp3; do
  echo "$f: $(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$f")s"
done
# 视频: ffprobe -v quiet -show_entries format=duration -of csv=p=0 video-project/out/final.mp4
```

**结论**：永远不要假设 `neural_1_2x.m4a` 是渲染用音频。字幕同步的唯一可靠基准是**渲染后的实际视频时长**。

#### 冲突 8：文档时长过期引用（52s→47s 脱节）✅ 2026-05-27

- **问题**：`posting-guide.md` / `session-log.md` 含 `52秒` 过期引用未更新，`video-config.json` / `report.json` 含 `inferredTheme` 残留字段（与实际 `theme` 不一致）
- **根因**：视频时长从 52s 优化至 47s 后，自动生成的文档未同步更新
- **受影响文件**：posting-guide.md, session-log.md, video-script.md, video-config.json, report.json
- **检测脚本**：
```bash
python3 -c "
import os, re
for root, dirs, files in os.walk('docs'):
    for f in files:
        if f.endswith(('.md', '.html')):
            path = os.path.join(root, f)
            content = open(path).read()
            if re.search(r'\d{2,3}\s*秒', content):
                print(f'⚠️  {path}')
"

python3 -c "
import json
cfg = json.load(open('video-config.json'))
if 'inferredTheme' in cfg:
    print(f'⚠️  video-config.json 含 inferredTheme: {cfg[\"inferredTheme\"]}')
else:
    print('✅ 无 inferredTheme')
"
```
- **修复原则**：
  - 视频时长以 Remotion 渲染后 `ffprobe` 测得的实际秒数为准
  - `inferredTheme` 是自动分析残留字段，应删除；保留 `theme` 字段即可

#### 冲突 10：voice.atempo 字段说明（2026-05-28 澄清）
- **背景**：`video-config.json` 的 `voice.atempo` 字段用于 ffmpeg 后处理阶段，对 `neural_full.mp3` 原始音频执行 atempo 变速（1.2x），输出到 `neural_1_2x.m4a`
- **受影响文件**：`video-config.json`（写入 voice.atempo）、`launch.sh`（读取 voice.atempo 并传给 ffmpeg atempo）
- **检测脚本**：
```bash
python3 -c "
import json
cfg = json.load(open('video-config.json'))
ate = cfg.get('voice', {}).get('atempo')
print(f'atempo: {ate}' if ate else '✅ 无 atempo 字段')
"
```
- **用途**：atempo 在 ffmpeg 后处理阶段生效，不影响 TTS 生成速率。Remotion 直接播放已处理的 `neural_1_2x.m4a`，该文件已经过 atempo 变速
- **注意**：若音频 pipeline 改为直接使用原始音频（无 ffmpeg atempo），需同步删除此字段避免误导

#### 冲突 11：video-config.json duration/scenes 近似值与 Root.tsx 精确帧数不匹配 ✅ 2026-05-27
- **问题**：`video-config.json` 的 `duration: 47` 和 `scenes[].duration: 7.83s` 是近似值，`Root.tsx` 的 `DURATION_FRAMES: 2819` 基于精确 `46968ms / 60fps` 计算，两者数值不一致
- **根因**：`duration: 47` 是 `⌊46968/1000⌋` 向下取整，`7.83s` 是 `46968/6/1000` 的近似值
- **实际精确值**：`46968ms ÷ 6 = 7828ms/场景`，总帧数 `2819`
- **原则**：以 `ffprobe` 实际视频时长和 `Root.tsx DURATION_FRAMES` 为准，`video-config.json` 的 duration 为展示用近似值，无需强制对齐
> ⚠️ Remotion 渲染误差约 ±1 帧（2819 vs 2818），属正常容差，无需修复。

#### 冲突 9：CoverScene attrs 配置层到渲染层断连 ✅ 2026-05-27

- **问题**：`video-config.json cover.attrs` 字段完整（如 `["WebGL渲染引擎","15层数据可视化","60fps流畅体验","MIT开源协议"]`），但渲染的封面标签是 hard-coded 的 `["🛩️ 航空追踪","🚢 海事监控","🔒 RECON工具包"]`，与配置完全脱节
- **根因**：`CoverScene` 组件声明为 `({ title, subtitle })`，接收参数中无 `attrs`，内部直接引用 hard-coded 标签数组
- **受影响文件**：DynamicScene.tsx（CoverScene + DynamicScene）、Video.tsx（无 attrs 透传）、Root.tsx（scenes[0] 无 attrs 字段）
- **修复链路**（5个环节必须全部贯通）：
  1. `video-config.json cover.attrs` — ✅ 已有
  2. `Root.tsx scenes[0].attrs` — 需补充 Cover 场景的 attrs 字段
  3. `Video.tsx attrs={scene.attrs}` — 需补充 attrs 透传
  4. `DynamicScene.tsx` 接口 + 透传 — 需补充 `attrs` 参数接收并传 `CoverScene`
  5. `CoverScene({ title, subtitle, attrs })` — 需接收 `attrs`，fallback 为默认值
- **验证命令**：
```bash
grep "attrs" video-project/src/scenes/DynamicScene.tsx | grep -E "interface|CoverScene|scene.attrs"
grep "attrs" video-project/src/Video.tsx
grep "attrs" video-project/src/Root.tsx | grep scenes
```
### ⚠️ 已确认失败模式：AbsoluteFill flex 居中在 Remotion 中完全失效（2026-05-27）
**症状**：PainPoint/Features 等多行内容场景，内容偏底部（画布中心 y=960px，内容中心 y=1848px，偏移 888px）。
**根因**：`position: absolute; inset: 0` 的父 div 内嵌套 flex 容器，`justifyContent: center` 完全不生效。Remotion AbsoluteFill 的 flex 行为异常。
**已验证的失效方案**：
- ❌ `justifyContent: "center"` on AbsoluteFill（单行内容可能OK，多行完全失效）
- ❌ `justifyContent: "center"` + 内层 div `height: "100%"`（CSS height:100% 无法获取 position:absolute 高度）
- ❌ `position: absolute; inset: 0` + flex column（flex 容器不继承外层绝对定位高度）

**✅ 唯一正确方案：transform translate(-50%, -50%) 居中**
```tsx
// ✅ 每个场景的内容根 div 必须用此模式
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
> ⚠️ transform 居中必须设置 `width: "100%"` 和 `maxWidth`（否则 transform 的基准点偏移不可预测）。
**渲染验证（osiris 项目 6 次渲染通过）**：
```bash
# 检测文字像素上下半部分布（内容中心应在画布中心 y=960px）
ffmpeg -i video-project/out/final.mp4 -vf "select=eq(n\,519)" -vframes 1 -update 1 /tmp/painpoint.png
python3 -c "
from PIL import Image; import numpy as np
img = Image.open('/tmp/painpoint.png'); arr = np.array(img)
h, w = arr.shape[:2]
top = arr[:h//2].mean(); bot = arr[h//2:].mean()
print(f'上半分布: {top:.1f}, 下半分布: {bot:.1f}')
if abs(top-bot)/(top+bot)*100 < 15: print('✅ 居中')
else: print('❌ 偏底或偏顶')
"
```

### ⚠️ 已确认失败模式：Subagent Step 0 Bypass
**症状**：Subagent 创建了 narration.txt + 音频 + 视频，但 docs/ 下缺少其余 10 个文档（README.md、video-script.md、copy.md、wechat-copy.md、posting-guide.md、session-log.md、landing-page.html、article-page.html、wechat-page.html、report.json），导致发布流程不完整。

**根因**：
1. Subagent 认为"只要有 narration.txt 就能做视频"，跳过了 generate_docs.js
2. `session_status` 在 Step 0 未完成时被误报为 completed
3. 主进程验证依赖 session_status 而非实际文件存在性

**防护**：
- `launch.sh audio` 和 `launch.sh render` 现已内置 `check_step0_docs()` 门禁，12 个文档不全则拒绝执行
- 任何 subagent 任务在 Remotion 渲染前必须调用 `bash launch.sh docs` 生成完整文档集
- narration.txt 存在 ≠ Step 0 完成；必须全部 12 个文档存在

**⚠️ 关联风险：video-config.json patch 损坏**
症状：JSON 解析错误（`Expecting ':' delimiter`），根因是 patch 操作同时匹配 cover 块的多行内容并替换，导致 `attrs` 字段或逗号被意外删除，留下孤立内容。
防御：patch JSON 文件时每次只改一个字段，验证 `python3 -c "import json; json.load(open('x.json'))"` 后再继续。

**⚠️ 封面 title/subtitle 占位符风险**
症状：video-config.json 的 cover.title 为 "视频标题"、cover.subtitle 为 "副标题"，导致视频封面显示错误标题。
防御：generate_docs.js 执行后，检查 video-config.json 的 cover.title 是否为真实项目名称，若仍为占位符则手动修复。

**Root.tsx 帧数 `round()` 而非 `ceil()`**：
- ffprobe 实测 47082ms → `ceil(47082/1000*60) = 2826`，但 Remotion 渲染出 **2825 帧**
- Remotion 用 `round()` 行为：47082/1000×60 = 2824.92 → round = **2825** ✅
- 永远用 `round(actual_ms / 1000 * 60)`，不用 `ceil()`

### ⚠️ video-quality-gate.js operator precedence Bug（2026-05-28 新增）
**症状**：音频时长偏差检测误报（`targetDuration=0.8667` 而非 52）。音频 51.9s，实际偏差仅 1.9%，但显示 57.8% 偏差。
**根因**：三元运算符优先级陷阱：
```javascript
// 错误代码（bug）
targetDuration = cfg.duration || cfg.totalFrames
  ? (cfg.duration || cfg.totalFrames / 60)
  : null;
// 等价于 cfg.duration || (cfg.totalFrames ? cfg.duration : cfg.totalFrames / 60)
// cfg.duration=52 时走左侧分支（返回52），但 cfg.duration=0 时走右侧
// 正确代码：
targetDuration = (cfg.duration != null)
  ? cfg.duration
  : (cfg.totalFrames != null ? cfg.totalFrames / 60 : null);
```
**验证**：`node --check scripts/video-quality-gate.js`

### ⚠️ Python 帧数计算：只用 `round()`，不用 `math.ceil()`
**Python 内置 `round()` 是正确的**：Python 的 `round()` 与 Remotion 内部 JS `Math.round()` 行为一致（银行家舍入：.5 时取偶数），实测误差 ≤1 帧。
**注意**：`math.ceil()` 用于**秒数估算**（`ceil(chineseChars / 400 * 60)`），不用于帧数计算。
**检测**：
```bash
grep -rn "math\.ceil.*60" scripts/*.py
# 应仅有 gen_frames_template.py 中一行，且已修复为 round()
```

### ⚠️ Python 3.9 严格拒绝 JSON trailing comma
**症状**：`video-config.json` 解析失败，`Expecting property name enclosed in double quotes` 指向文件末尾 `}` 附近。
**根因**：Python 3.9 的 `json.load()` 严格遵循 RFC 8259，不允许 trailing comma（如 `"totalMs": 141035,` 后的逗号）。
**检测**：
```bash
python3 -c "import json; json.load(open('video-config.json'))"
```
**修复**：删除 trailing comma。Python 3.9/3.11 均严格拒绝 trailing comma，必须符合 RFC 8259。
> ⚠️ 单行 JSON 如 `{"a": 1,}` 也会失败。检查所有 `,}` 和 `,]` 模式。

### ⚠️ OpenClawDrive 无法直接覆写 .m4a（需 /tmp/ 中转）
**症状**：`ffmpeg -i ... output.m4a` 报错 `Invalid argument`。
**根因**：OpenClawDrive 挂载卷不支持直接 rename/overwrite `.m4a` 文件。
**修复**：ffmpeg 输出到 `/tmp/` 再 `cp` 到目标位置：
```bash
ffmpeg -y -i audio/neural_full.mp3 -acodec aac -b:a 256k -ar 48000 -ac 2 /tmp/out.m4a
cp /tmp/out.m4a audio/neural_1_2x.m4a
```

### ⚠️ video-config.json 三字段同步原则
**必须同时存在的三个时间字段**：
```json
"duration": 141,            // 向下取整秒数（展示用）
"totalMs": 141035,          // 视频实际总时长（毫秒，精确内部值）
"durationInSeconds": 141.035  // 精确小数（≥2026.03.27新增）
```
- `scenes[-1].endMs` **必须等于** `totalMs`（毫秒）
- `scenes[-1].duration` = (totalMs - scenes[-1].startMs) / 1000
- `duration` 是给人类看的近似值；`totalMs` 是精确内部值

**video-config.json 必同步 3 项**：
1. `totalMs` = actual_ms
2. `scenes[-1].endMs` = actual_ms
3. `scenes[-1].duration` = (actual_ms - scenes[-1]['startMs']) / 1000

**注意**：captions.json 末段 endMs 在每次渲染后都必须用视频实际时长（不是音频时长）同步更新。

---

### 渲染后必须同步 captions.json 末段 endMs

**已知陷阱**：即使渲染前 captions.json 末段 endMs 是按"视频时长"计算的，Remotion 渲染的实际视频时长与音频时长仍有微小差异（通常 <100ms）。osiris 项目实测：音频 51.977s，视频 52.032s，差 55ms。

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
print(f'末段 endMs → ${EXPECTED_ENDMS}ms')
"

# 3. 同步到 Remotion public/audio/
cp audio/captions.json video-project/public/audio/captions.json
```

> ⚠️ **绝对不能跳过第1步**：caption.json 的 startMs 来自音频等比分段（渲染前），但 endMs 必须用视频实际时长（渲染后），两者有本质区别。

**⚠️ edge-tts --write-subtitles 可能输出 SRT 而非 JSON**：
> ⚠️ **核心原则**：音频时长 = 视频时长。atempo 只能用于将长音频压缩到目标时长，不能用于将短音频拉伸到视频时长（Remotion 不支持 playbackRate）。

**⚠️ edge-tts --write-subtitles 可能输出 SRT 而非 JSON**：旧版 edge-tts 的 `--write-subtitles` 参数在某些版本输出 SRT 格式（`1\n00:00:00,000 --> 00:00:05,000\n...`）而非 JSON 格式。需用 Python 解析 SRT 时间码并转换为 JSON captions 数组。检测方法：读取首行，`1` 表示 SRT，`[` 表示 JSON。
**修复**：Python 解析 SRT 并转换为 JSON captions 数组。

**⚠️ 已确认失败模式：CoverScene tags 硬编码导致配置层断连（2026-05-27）**
症状：`video-config.json` 的 `cover.attrs` 字段完整，但 Remotion 渲染的封面使用的是硬编码的 `["🛩️ 航空追踪", "🚢 海事监控", "🔒 RECON工具包"]`，与配置完全脱节。
根因：`CoverScene` 组件内部 `attrs` 参数缺失，直接引用 hard-coded 标签数组。
**配置层到渲染层的完整链路（必须全部贯通，缺一不可）：**
```
video-config.json cover.attrs
    ↓ Root.tsx scenes[0].attrs（Cover 场景配置）
    ↓ Video.tsx attrs={scene.attrs}（透传）
    ↓ DynamicScene.tsx attrs={scene.attrs}（接收）
    ↓ CoverScene.tsx attrs={attrs}（接收）
```
**缺失环节自检：**
```bash
# 检查链路是否贯通
grep -n "attrs" video-project/src/Root.tsx | grep scenes  # Root.tsx scenes 含 attrs
grep -n "attrs" video-project/src/Video.tsx               # Video.tsx 透传 attrs
grep -n "attrs" video-project/src/scenes/DynamicScene.tsx  # DynamicScene 接收 attrs
grep -n "attrs" video-project/src/scenes/DynamicScene.tsx | grep CoverScene  # CoverScene 接收 attrs
```
**验证渲染（必须通过）：**
```bash
cd video-project && npm run build  # 2819帧 ✅ — TypeScript 编译 + 渲染同时完成
```
> ⚠️ `npx remotion render --dry-run` 只做 bundle 不渲染，无法验证帧级别错误。必须 `npm run build` 才能确认渲染成功。
> ⚠️ **本节内容与封面图生成（`generate_cover.py`）是完全独立的两个环节**：
> - 封面图生成：创建 `cover.png` / `cover-wechat.png` / `cover-xhs.png` 图片文件，用于发布平台配图
> - CoverScene 视频内嵌标签：Remotion 渲染时在视频封面帧内显示 title + subtitle + attrs 标签，是视频画面的一部分
> 两者数据源均为 `video-config.json cover` 字段，但渲染位置和时机不同。

**⚠️ 已确认失败模式：Session Compaction 导致 narration.txt 内容损坏**
**症状**：narration.txt 文件存在，但内容是乱码/乱字符。Subagent 报告 status=completed，主进程看到文件存在即假定内容正确，直接进入音频步骤，生成的音频是乱码文本的配音。

**根因**：Subagent 会话压缩时，上下文窗口内的变量内容被压缩为摘要，但磁盘上的文件状态未必同步。Subagent 认为"已写入 narration.txt"，实际上写入的是压缩前残留在内存中的破损文本。

**验证方法**（每次重建项目时必做）：
```bash
python3 -c "
text = open('docs/narration.txt', encoding='utf-8').read()
bad = sum(1 for c in text if ord(c) < 32 and c not in '\n\r\t')
cn = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
print(f'控制字符数: {bad}, 中文字数: {cn}')
if bad > 0 or cn < 20: exit(1)
"
```
如果控制字符数 > 0 或中文字数为 0，立即重新生成 narration.txt。

**防护**：
- narration.txt 写入后立即用上述脚本验证内容完整性
- 乱码特征还包括：内容含反引号、`|`、`---` 等 Markdown 残留字符
- 重新生成 narration.txt 后，同步重新生成音频和字幕（避免级联错误）
- `launch.sh docs` 生成的 narration.txt 质量高于 subagent 手动写入的版本，优先使用 `node generate_docs.js`
**症状**：narration.txt 文件存在，但内容是乱码/乱字符。Subagent 报告 status=completed，主进程看到文件存在即假定内容正确，直接进入音频步骤，生成的音频是乱码文本的配音。

**根因**：Subagent 会话压缩时，上下文窗口内的变量内容被压缩为摘要，但磁盘上的文件状态未必同步。Subagent 认为"已写入 narration.txt"，实际上写入的是压缩前残留在内存中的破损文本。

**验证方法**（每次重建项目时必做）：
```bash
# 检查 narration.txt 是否为干净文本（无控制字符、无乱码）
python3 -c "
text = open('docs/narration.txt', encoding='utf-8').read()
# 乱码特征：含控制字符（\x00-\x08\x0b\x0c\x0e-\x1f）或异常多的符号
bad = sum(1 for c in text if ord(c) < 32 and c not in '\n\r\t')
print(f'控制字符数: {bad}')
if bad > 0: exit(1)
# 中文字数门禁
cn = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
print(f'中文字数: {cn}')
"
```
如果控制字符数 > 0 或中文字数为 0，立即重新生成 narration.txt。

**防护**：
- narration.txt 写入后立即用上述脚本验证内容完整性
- 乱码特征还包括：内容含反引号、`|`、`---` 等 Markdown 残留字符
- 重新生成 narration.txt 后，同步重新生成音频和字幕（避免级联错误）
- `launch.sh docs` 生成的 narration.txt 质量高于 subagent 手动写入的版本，优先使用 `node generate_docs.js`

---

## 📋 规则索引

详细内容必须阅读对应文件，以下为快速索引：

| 类别 | 必须阅读 | 核心要点 |
|------|---------|---------|
| **音频 TTS** | [references/C-CONTENT/audio-tts.md](references/C-CONTENT/audio-tts.md) | edge-tts 规范、atempo 动态计算（≠固定1.2）、语音优先级 |
| **字幕生成** | [references/C-CONTENT/subtitle-production.md](references/C-CONTENT/subtitle-production.md) | captions.json 格式、TikTokCaptionOverlay、CaptionOverlay 铁律 |
| **封面视觉** | [references/E-VISUAL/video-visual.md](references/E-VISUAL/video-visual.md) | attrs 渲染规范（白底+黑字+左侧10px彩色条纹） |
| **PIL 封面** | [references/E-VISUAL/pil-cover.md](references/E-VISUAL/pil-cover.md) | generate_cover.py 用法、WeChat 副标题宽度陷阱 |
| **Remotion 渲染** | [references/B-REMOTION/remotion-troubleshoot.md](references/B-REMOTION/remotion-troubleshoot.md) | Composition ID=VerticalVideo、Text组件、spring动画 |
| **字幕六禁止** | [rules/SUBTITLES.md](rules/SUBTITLES.md) | Fontsize=72/Outline=2/MarginV=50/\\N换行/10字段 |
| **音频规范** | [rules/VOICE.md](rules/VOICE.md) | 男声优先（YunjianNeural 默认）、禁止女声 |
| **质量检查** | [rules/QUALITY.md](rules/QUALITY.md) · [rules/CHECKLIST.md](rules/CHECKLIST.md) | 11个文档门禁、三封面尺寸 |
| **Session 追踪** | [rules/SESSION_LOG.md](rules/SESSION_LOG.md) | session_status 是工具不是命令、7个关键节点 |
| **Git 隔离** | [references/G-WORKFLOW/git-workflow.md](references/G-WORKFLOW/git-workflow.md) | `{repo}-repo/` 隔离、launch.sh init 自动隔离 |
| **Feishu Base** | [references/G-WORKFLOW/feishu-base-batch.md](references/G-WORKFLOW/feishu-base-batch.md) | 11个受影响项目、Base 记录更新语法 |
| **内容文档** | [references/C-CONTENT/content-document-generation.md](references/C-CONTENT/content-document-generation.md) | Step 0-3 完整流程 |
| **Subagent 超时** | [references/D-SUBAGENT/subagent-timeout.md](references/D-SUBAGENT/subagent-timeout.md) | launch.sh 路径陷阱、超时策略 |
| **预检流程** | [references/G-WORKFLOW/video-optimization.md](references/G-WORKFLOW/video-optimization.md) | 4项预检（narration质量/英文句点/叠速/CaptionOverlay） |

### rules/ 目录（技能规则）

[rules/WORKFLOW.md](rules/WORKFLOW.md) · [rules/UNIFIED_RULES.md](rules/UNIFIED_RULES.md) · [rules/THEMES.md](rules/THEMES.md) · [rules/PLATFORM.md](rules/PLATFORM.md) · [rules/TROUBLESHOOTING.md](rules/TROUBLESHOOTING.md) · [rules/SCRIPTS.md](rules/SCRIPTS.md) · [rules/INTEGRATION.md](rules/INTEGRATION.md) · [rules/LAYOUT.md](rules/LAYOUT.md) · [rules/FONTS.md](rules/FONTS.md) · [rules/HTML.md](rules/HTML.md) · [rules/COVER_GENERATE.md](rules/COVER_GENERATE.md) · [rules/WECHAT_COVER.md](rules/WECHAT_COVER.md) · [rules/WECHAT_PUBLISH.md](rules/WECHAT_PUBLISH.md) · [rules/QUICKSTART.md](rules/QUICKSTART.md)

### references/ 目录结构（2026-05-28 重组）

> ⚠️ **请勿使用 A-ARCHIVED/** 目录下的文件 — 已废弃。
> 快速查询入口：`references/README.md`（总入口）或 `references/index.md`（详细索引）

| 目录 | 内容 | 文件数 |
|------|------|--------|
| **B-REMOTION/** | Remotion 渲染核心 | 9 |
| **C-CONTENT/** | 内容获取与音频字幕 | 7 |
| **D-SUBAGENT/** | Subagent 超时与上下文 | 2 |
| **E-VISUAL/** | 视觉设计与封面图 | 8 |
| **F-GENDOCS/** | generate_docs.js 分析 | 2 |
| **G-WORKFLOW/** | 工作流与集成 | 13 |
| **H-CONFIG/** | 配置文件 | 3 |
| **A-ARCHIVED/** | 已废弃文档 | 3 |

> 2026-05-28 删除：`duration-zero-fix.md`、`remotion-tsx-bug.md`、`launch-sh.md`（内容已并入相关文件）
> 2026-05-28 合并：`pil-cover-usage.md` → `pil-cover.md`；`video-optimization-pitfalls.md` → `video-optimization.md`
> 2026-05-28 新增：各子目录 `README.md`（共 7 个）

### B-REMOTION — Remotion 渲染核心（必读）

| 文件 | 用途 |
|------|------|
| `remotion-troubleshoot.md` | Remotion 问题排查总入口 |
| `remotion-render-gotchas.md` | 三个致命陷阱：durationInFrames硬编码 / props传递 / atempo覆盖 |
| `remotion-props.md` | --props JSON 构造算法 + Bash 引号嵌套陷阱 |
| `dynamic-scene-template.md` | DynamicScene.tsx 完整模板（CSS 渐变封面版） |
| `dynamic-scene-vertical-center.md` | 垂直居中规范 + CSS 渐变封面 + 首帧亮度验证 |
| `dynamic-scenes-architecture.md` | SCENE_TYPES 枚举 / 百分比等分 / name 路由（详见 remotion-props.md） |
| `create-remotion-project-bugs.md` | create-remotion-project.js 三大 Bug 修复（含双花括号/literal `\n`/`key={'h'+i}` 单引号 JSX 属性） |
| `remotion-dynamic-scene-debugging.md` | hive 项目 9 次渲染调试实录 |
| `scenes-config-pattern.md` | 场景配置数据结构模式 |

> ⚠️ `duration-zero-fix.md` 和 `remotion-tsx-bug.md` 已删除，内容并入 `remotion-render-gotchas.md` 和 `create-remotion-project-bugs.md`

### C-CONTENT — 内容与音频字幕

| 文件 | 用途 |
|------|------|
| `audio-tts.md` | edge-tts 规范、atempo 动态计算、审计命令库 |
| `subtitle-production.md` | captions.json 格式、TikTokCaptionOverlay、ASS 规范 |
| `content-document-generation.md` | Step 0-3 完整流程（narration.txt 生成规范） |
| `video-workflow-failures.md` | video-creator 系统性失败模式（按严重程度排序） |
| `readme-location.md` | README 位置变体（monorepo / doc 子目录） |
| `cloudflare-medium.md` | Medium.com Cloudflare blocking |

### D-SUBAGENT — Subagent 管理

| 文件 | 用途 |
|------|------|
| `subagent-timeout.md` | 超时恢复指南（launch.sh / Base 更新 / 清理） |
| `subagent-takeover.md` | Subagent 超时后主进程接管流程（2026-05-28） |
| `subagent-context-preservation.md` | 会话压缩上下文丢失 + narration.txt 损坏防护 |

### E-VISUAL — 视觉设计

| 文件 | 用途 |
|------|------|
| `theme-palette.md` | 50 套主题配色参考（数据源：`scripts/theme-colors.js`） |
| `theme-matching.md` | sceneContent 动态化数据流 |
| `cover-font.md` | 封面字体规范 |
| `cover-image-rendering.md` | 封面图渲染失败诊断（2026-05-23 最终修订） |
| `video-visual.md` | 视觉规范、主题动画 |
| `pil-cover.md` | PIL 本地封面生成（无 AI API 时备用；已合并原 `pil-cover-usage.md` 内容） |

### ⚠️ HTML 发布页必须含 viewport + og: meta 标签（2026-05-27 新增）
所有 HTML 文件（landing-page.html / article-page.html / wechat-page.html）必须在 `<head>` 内包含以下 meta 标签：
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:title" content="<title>">
<meta property="og:description" content="<description>">
<meta property="og:type" content="website">
```
检测脚本：
```bash
python3 -c "
import os
for f in ['docs/landing-page.html','docs/article-page.html','docs/wechat-page.html']:
    c=open(f).read()
    miss=[]
    if 'viewport' not in c: miss.append('viewport')
    if 'og:title' not in c: miss.append('og:title')
    if 'og:description' not in c: miss.append('og:description')
    if 'og:type' not in c: miss.append('og:type')
    print(f'{f}: {\"✅\" if not miss else \"⚠️ \"+\",\".join(miss)}')
"
```

### ⚠️ 占位符 `github.com/xxx` 污染文档（2026-05-27 新增）
**症状**：`report.json`、`copy.md`、`session-log.md` 等文档中存在 `github.com/xxx`、`github.com/xxx/repo` 等占位符字符串。
**根因**：`generate_docs.js` 生成 `report.json` 时，将 `repository` URL 字段输出为占位符（未替换真实用户名）；`copy.md` 平台文案手动编写时引入。
**检测脚本**：
```bash
python3 -c "
import os, re
for root, dirs, files in os.walk('docs'):
    for f in files:
        path = os.path.join(root, f)
        c = open(path).read()
        if re.search(r'github\.com/xxx', c):
            print(f'⚠️  {path}')
"
```
**修复**：`github.com/xxx/repo` → `github.com/<user>/<repo>`（发布前由用户填充）。

### ⚠️ README.md 部署命令应与实际工作流一致（2026-05-27 新增）
**症状**：`docs/README.md` 含 `npm install && bash launch.sh all` 等虚构命令。
**正确命令**：根据实际 Git 工作流，应使用 `git clone + docker-compose up + npm run build`。

### F-GENDOCS — generate_docs.js 分析

| 文件 | 用途 |
|------|------|
| `generate-docs-failures.md` | 失败模式与强制重写规程 |
| `generate-docs-deep-analysis.md` | 深度知识库（stripMarkdown 问题 / 质量统计） |

### G-WORKFLOW — 工作流与集成（5文件）

| 文件 | 用途 |
|------|------|
| `git-workflow.md` | Git 隔离与目录分离规范 |
| `subagent-takeover.md` | Subagent 超时后主进程接管流程（2026-05-28） |
| `feishu-base-batch.md` | Feishu Base 批量处理（record_id 查询 / 更新） |
| `lark-cli-base-record-update.md` | lark-cli record-update 命令实测语法（2026-05-28） |
| `documentation-consistency.md` | 文档一致性维护指南 |
| `node-execsync-bug.md` | Node.js execSync 返回值 bug（macOS arm64） |
| `video-optimization.md` | 视频性能优化与质量门禁（含原 `video-optimization-pitfalls.md` 内容） |
| `captions-endms-sync.md` | captions 末段 endMs 精确同步（批量检测脚本） |
| `batch-duration-fix-20260527.md` | **【批量修复手册】** 141 项目四维同步（帧数/音频/字幕/config）实测修复全记录 |
| `audio-duration-mismatch.md` | **【核心修复手册】** atempo/audio/video 三元组不匹配根因 + atempo=1.0 恢复流程 |
| `frame-sync-regex-patterns.md` | **【正则提取】** DURATION_FRAMES 正则提取 4 种模式（JSX硬编码/乘法表达式/TOTAL_FRAMES/DURATION别名） |

### H-CONFIG — 配置文件

| 文件 | 用途 |
|------|------|
| `baoyu-config.json` | baoyu 技能配置（url-to-markdown / cover-image 等） |
| `cdn-mapping.json` | CDN 映射：中国 / 全球 / fallback 字体配置 |
| `tailwind-config.json` | Tailwind 主题扩展配置 |

### A-ARCHIVED — 已废弃文档（请勿使用）

| 文件 | 说明 |
|------|------|
| `feishu-base-completion.bak.md` | 旧版手动流程，已被 launch.sh all 替代 |
| `one-pass.bak.md` | ⚠️ 已废弃 |
| `remotion-render-output.md` | ⚠️ 已废弃 |

> ⚠️ `launch-sh.md` 已删除，内容并入 `D-SUBAGENT/subagent-timeout.md`

---

## 🔄 流程

### Step 概览

```
Step 0  → Step 1  → Step 2  → Step 3  → Step 4  → Step 5
创建文档   内容获取   分析内容   构建项目   生成文案   构建HTML

        Step 11 ← Step 10 ← Step 9  ← Step 8  ← Step 7  ← Step 6
        生成报告   生成视频   质量检查   生成字幕   生成音频   生成视觉（封面）
```

详细规范：[rules/WORKFLOW.md](rules/WORKFLOW.md)

### 强制检查清单

| 时机 | 检查内容 | 命令/文件 |
|------|---------|---------|
| Step 0 完成 | 11个文档全部存在 | `rules/CHECKLIST.md` |
| Step 6 完成 | 三封面尺寸正确（1080×1920 / 900×383 / 1440×2560） | `rules/CHECKLIST.md` |
| Step 7 完成 | 音频参数（AAC 256k / atempo后时长） | `references/C-CONTENT/audio-tts.md` |
| Step 8 完成 | captions.json 末段 endMs = 视频时长 | `references/C-CONTENT/subtitle-production.md` |
| 渲染前 | 4项预检全部通过 | `references/G-WORKFLOW/video-optimization.md` |
| 渲染后 | 视频时长=音频时长，RMS有效 | `references/C-CONTENT/audio-tts.md` |

### 核心输出文件

| `audio/neural_1_2x.m4a` · `audio/captions.json` · `video-project/out/final.mp4`

### ⚠️ narration.txt 字数上限公式（2026-05-28 修正）
**旧公式**（已废弃）：`⌊TARGET_DURATION × 6.45⌋` — 对应 `rate=+20%`，导致字数严重不足
**正确公式**：`⌊TARGET_DURATION × 3.37⌋` — 实测 `zh-CN-YunjianNeural --rate +0%`
**检测**：
```bash
grep -rn "6\.45" scripts/pre-subtitle-check.js rules/ references/
# 应无输出（有输出说明未更新）
```
**受影响文件**：`pre-subtitle-check.js:122` · `generate_docs.js:13` · `launch.sh:125,460`（均已修复）

### launch.sh 使用（2026-05-23 重要修正）

```bash
bash {SKILL_DIR}/scripts/launch.sh init <项目名>   # 初始化（自动隔离 Git 内容）
bash {SKILL_DIR}/scripts/launch.sh all              # 完整流程（Step 0→10 + 封面）
```

> ⚠️ **launch.sh init 仅创建空目录骨架，不生成 Remotion 项目代码！** `init` 创建 `video-project/src/` 等空目录，但无 `Root.tsx`、`Video.tsx`、`package.json`。必须**单独执行** `node {SKILL_DIR}/scripts/create-remotion-project.js .` 生成 Remotion 源码，否则渲染时 `video-project/src/` 为空导致失败。检测方法：`ls video-project/src/` 为空则说明缺少 Remotion 代码。

> ⚠️ **launch.sh 必须先 chmod +x**：若遇到 `Permission denied`，立即执行 `chmod +x /Users/zhushuyan/.hermes/skills/video-creator/scripts/launch.sh`

> ⚠️ **create-remotion-project.js 生成后必须验证**：
> 1. `wc -l video-project/src/scenes/DynamicScene.tsx` — 应 > 0；为 0 则文件为空，需手动从 `references/B-REMOTION/dynamic-scene-template.md` 复制模板
> 2. `head -3 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e` — 应无输出；有输出说明含 literal `\n`，用 `node -e "...(Buffer替换)..."` 修复
> 3. 修复后执行 `npm install && npx remotion render ...` 进行渲染

> ⚠️ 必须在**项目目录内**执行，且 `PROJECT_DIR` 必须指向项目根目录（不是 workspace 根目录）

> ⚠️ **create-remotion-project.js 执行后必须立即验证（3 项）：**
> 1. `wc -l video-project/src/scenes/DynamicScene.tsx` — 应 > 0；为 0 则文件为空，需手动从 `references/B-REMOTION/dynamic-scene-template.md` 复制模板
> 2. `head -3 video-project/src/scenes/DynamicScene.tsx | xxd | grep 5c6e` — 应无输出；有输出说明含 **literal `\n`**（字节 `0x5c 0x6e`，共 383 处），用 `python3 -c "data.replace(b'\x5c\x6e',b'\x0a')"` 修复
> 3. `grep 'return <>{{' video-project/src/scenes/DynamicScene.tsx` — 应无输出；有输出说明含 **JSX 双花括号语法错误**（`return <>{{ hLines }}`），用 `patch` 修复为 `return <>{hLines}{vLines}</>`
> 4. 修复后执行 `npm install && npx remotion render ...` 进行渲染

**质量门禁**：`node {SKILL_DIR}/scripts/video-quality-gate.js <project-dir> all`

### 渲染命令

```bash
# Remotion Native（音频内嵌 + 字幕同期烧录，无需 ffmpeg）
npx remotion render VerticalVideo out/final.mp4

# 封面生成（必须先执行）
python3 generate_cover.py   # 三平台：vertical/wechat/xhs
```

### 清理

```bash
# 渲染成功后立即执行
rm -rf "${PROJECT_DIR}/*-repo"
```

### Session 追踪

`session_status` 是 OpenClaw **工具调用**（不是 shell 命令），输出在 AI 对话 tool result 中（emoji 格式）。

**追加命令**（Step X 完成后在 AI 对话中调用 session_status，然后执行）：
```bash
TS=$(date '+%Y-%m-%d %H:%M %Z')
cat >> "${PROJECT_DIR}/docs/session-log.md" << 'EOF'
## Step X 完成时的 Session 快照
- 时间: TS_PLACEHOLDER
- 累计 Tokens: {emoji输出}
EOF
```

详见 [rules/SESSION_LOG.md](rules/SESSION_LOG.md)

---

## 📁 references/ 目录结构

> ⚠️ **archived/** 目录（5个废弃文件）：feishu-base-batch.md · one-pass.md · launch-sh.md（×2） · feishu-base-completion.md 已移入 A-ARCHIVED/

> ⚠️ **文档一致性陷阱**：references/ 文档间存在交叉引用。创建新文档或重命名文件后，必须检查：
> - `documentation-consistency.md`：检查所有对其他 references/ 文件的引用是否仍然有效
> - `subagent-timeout.md`：launch.sh 命令引用路径是否正确

### 规则文档一致性维护（2026-05-28 新增）
**症状**：更新 `references/` 子文档后，rules/ 目录下的规则文档未能同步更新，导致文档间引用不一致。经验证，以下内容最常遗漏：
- `subtitles.ass` / `audio/subtitles_*.ass` → `audio/captions.json`
- `gen_subtitles.py` / `gen_subtitles_template.py` → 已废弃（Remotion Native 字幕生成由 launch.sh Step 3 完成）
- `final-with-subs.mp4` → `final.mp4`（Remotion Native 输出文件名）
- 旧版 3-step ffmpeg 混流渲染流程 → Remotion Native 单步渲染
- 字幕字号 72px Fontsize 约束 → 仅对 ASS 方案有意义，captions.json 方案已不适用
- 小红书封面 1440×1920 → **1440×2560**（1440×1920 是旧错误值）

**维护检查清单**：每次更新核心 pipeline 后，扫描 rules/ 目录：
```bash
grep -rn "subtitles.ass\|final-with-subs\|gen_subtitles\|1440.*1920\|Fontsize.*72" \
  ~/.hermes/skills/video-creator/rules/
```
若有匹配，手动替换为正确值，并更新对应文件的"最后更新"时间戳。

**已确认的过时内容修复记录**（2026-05-28）：
| 文件 | 修复内容 |
|------|---------|
| `rules/CHECKLIST.md` | `.srt 格式` → `captions.json`；`Fontsize≠72` → `字幕与视频不同步`；`ffmpeg 混流` → `检查 Audio 组件` |
| `rules/WORKFLOW.md` | 6处 `subtitles_*.ass` / `gen_subtitles.py` / `final-with-subs` → `captions.json` / `final.mp4` |
| `rules/QUICKSTART.md` | 3处 `subtitles.ass` / `final-with-subs.mp4` → `captions.json` / `final.mp4` |
| `rules/UNIFIED_RULES.md` | 旧 3-step 混流渲染 → Remotion Native 单步；中间文件列表删除；更新 时间戳 |
| `README.md` | 小红书封面 1440×1920 → 1440×2560 |
| `rules/FONTS.md` | 无需修改（Fontsize 规范仅对 ASS 有意义） |
| `rules/VOICE.md` | 无需修改（音频 pipeline 描述正确） |
| `rules/SUBTITLES.md` | 保留 ASS fallback 参考文档（无害） |

> ⚠️ **CHECKLIST.md 已知问题**（2026-05-28 已修复）：
