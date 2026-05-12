# video-creator × remotion-best-practices 冲突审计报告

> 日期：2026-05-11
> 触发：全面审查 30+ remotion-best-practices 规则文件 vs video-creator 核心脚本

---

## 审计方法（四步法）

1. **加载两个技能**：`skill_view video-creator` + `skill_view remotion-best-practices`
2. **逐条读规则文件**：remotion-best-practices 有 30+ 个 `rules/*.md`，至少读关键的 8 个：
   - `rules/audio.md`、`rules/calculate-metadata.md`、`rules/sequencing.md`
   - `rules/subtitles.md`、`rules/compositions.md`、`rules/animations.md`
   - `rules/fonts.md`、`rules/ffmpeg.md`、`rules/voiceover.md`
   - `rules/transitions.md`、`rules/text-animations.md`、`rules/get-audio-duration.md`
3. **全文搜索关键模式**：`import.*Video.*from`、`@remotion/captions`、`mediabunny`、`bunx remotion`
4. **按 ID 打 patch**：冲突点编号记录，完成一条划掉一条

---

## 发现的 9 个冲突（C1-C9）

| ID | 优先级 | 文件 | 行 | 冲突描述 | 修复方案 |
|----|--------|------|-----|----------|----------|
| C1 | P0 | video-composer.js | 182,257 | `<Audio>` 组件导入并使用（headless 禁止） | 移除 Audio 导入；注释掉 `<Audio>` 标签 |
| C2 | P0 | video-composer.js | generateRootComponent | Root.tsx 无 `calculateMetadata` | 新增 `CalculateMetadataFunction` + ffprobe 动态时长 |
| C3 | P1 | video-composer.js | 268 | entry 导入路径 `'./src/Root'` | 改为 `'./Root'`（entry 与 Root 同在 src/） |
| C4 | P1 | video-composer.js | generateRootComponent | 无 calculateMetadata 函数生成逻辑 | 在 generateRootComponent 中生成完整函数 |
| C5 | P1 | gen_frames_template.py | 11,459 | 音频路径确认（neural_1_2x.m4a） | 已正确，无需修改 |
| C6 | P2 | video-quality-gate.js | 全文 | 门禁检查 `neural_1_2x.m4a`（ffmpeg 用，非 Audio 组件） | 已正确，无需修改 |
| C7 | P2 | rules/VOICE.md | 第3条 | "禁止在 Remotion 内嵌音频" 规范已存在 | 无冲突 |
| C8 | P2 | remotion-entrypoint-fix.md | 全文 | entry 模式（Composition 包装）与 composer 一致 | 无冲突 |
| C9 | P3 | video-composer.js | 363 | render 命令缺少 `--concurrency=4` | 添加 `--concurrency=4` |

---

## 关键规范（remotion-best-practices 核心规则）

### Audio 组件禁用（headless 环境）
```
Remotion 渲染在 headless 环境下 Audio 组件不工作。
所有音频必须通过 ffmpeg 外部注入。
```
**例外**：Remotion Studio UI 预览环境可以使用 `<Audio>` 组件。

### calculateMetadata 规范
```tsx
// ✅ 正确：从 remotion 包导入 CalculateMetadataFunction
import { Composition, CalculateMetadataFunction } from 'remotion';

// ✅ 正确：ffprobe 获取音频时长
const calculateMetadata: CalculateMetadataFunction = async () => {
  const result = execSync(`ffprobe -v error -show_entries format=duration ...`);
  const audioDuration = parseFloat(result.trim());
  return { durationInFrames: Math.ceil(audioDuration * 60) };
};
```

### 音频路径规范
```
视频项目音频路径：video-project/audio/neural_1_2x.m4a
                         ↑_________↑
                   ffmpeg 1.2x 加速处理后
```

### 并发数规范
```
M1 芯片实测：--concurrency=4 最优（c1=260s, c2=174s, c4=157s, c8=timeoutOOM）
```

### 字幕规范
```
字幕字号：72px（ASS Fontsize=72，视觉约40px）
注意：技能规范中的 10px/12px 是旧值，72px 是经过多次迭代确定的正确值
```

---

## 已验证无冲突的模块

- **gen_frames_template.py**：帧生成 + PIL fallback，已符合 sequencing 规范
- **launch.sh**：PIL+ffmpeg 单次混流，concurrency=4，已符合
- **video-quality-gate.js**：门禁检查 ffmpeg 外部注入的音频，不检查 Remotion Audio
- **rules/VOICE.md**：已有"禁止 Remotion 内嵌音频"规范
- **rules/REMOTION.md**：上一轮已修订 8 处冲突（字幕72px、竖屏1080×1920、Audio组件禁用等）
- **rules/LAYOUT.md**：上一轮已修订 1 处 Audio 组件注释化
- **references/remotion-entrypoint-fix.md**：entry 模式与 composer 一致

---

## 2026-05-11 后续审计：补充冲突修复

> 今日（2026-05-11 晚间）继续深入审查，又发现 7 处新冲突并全部修复完成。

### 新发现冲突（C10-C16）

| ID | 优先级 | 文件 | 冲突描述 | 修复方案 |
|----|--------|------|----------|----------|
| C10 | P0 | rules/VOICE.md | Step 4 代码示例含 `<Audio>` 组件 + import | 全部注释化，改为禁止说明 |
| C11 | P0 | rules/TROUBLESHOOTING.md | 第242行 `<Audio src={staticFile(...)} />` | 注释化，添加禁止说明 |
| C12 | P0 | remotion-components/VerticalVideo.tsx | 第118行 `{audioUrl && <Audio />}` | 注释化，添加禁止说明 |
| C13 | P0 | rules/REMOTION.md | 音量控制章节 Audio 导入/使用示例 | 全部移除，改为禁止说明 |
| C14 | P0 | rules/REMOTION.md | 动态音量 `<Audio>` 使用示例残留 | 完全移除（代码块残留片段） |
| C15 | P1 | rules/REMOTION.md | @remotion/media-utils 注释说明不清 | 添加"注意：@remotion/media-utils 用于 getVideoDuration / getVideoDimensions" |
| C16 | P1 | references/ONEPASS_WORKFLOW.md | 引用不存在文件 `atempo-crop-anti-pattern.md` 和 `remotion-headless-rendering.md` | 移除 atempo 引用；headless 指向 rules/REMOTION.md |

### 验证：所有 Audio 引用已清除

```bash
# 验证命令（全文搜索，未发现任何未注释的 Audio 组件使用）
grep -n "import.*Audio.*from.*remotion[^s]" ~/.hermes/skills/video-creator/**/*.md
# 结果：仅注释行（// <Audio ...）

grep -n "<Audio src=" ~/.hermes/skills/video-creator/**/*.md
# 结果：仅注释行（{/* <Audio ... */}）
```

### 冲突修订汇总（全貌）

| ID | 文件 | 状态 |
|----|------|------|
| C1 | video-composer.js | ✅ 已修复（上轮） |
| C2 | video-composer.js generateRootComponent | ✅ 已修复（上轮） |
| C3 | video-composer.js entry 路径 | ✅ 已修复（上轮） |
| C4 | video-composer.js calculateMetadata | ✅ 已修复（上轮） |
| C5 | gen_frames_template.py audio 路径 | ✅ 已验证无冲突（上轮） |
| C6 | video-quality-gate.js | ✅ 已验证无冲突（上轮） |
| C7 | rules/VOICE.md | ✅ 已修复（上轮） |
| C8 | remotion-entrypoint-fix.md | ✅ 已验证无冲突（上轮） |
| C9 | video-composer.js concurrency | ✅ 已修复（上轮） |
| C10 | rules/VOICE.md Step4 示例 | ✅ 本轮修复 |
| C11 | rules/TROUBLESHOOTING.md Audio | ✅ 本轮修复 |
| C12 | VerticalVideo.tsx Audio | ✅ 本轮修复 |
| C13 | rules/REMOTION.md 音量控制 | ✅ 本轮修复 |
| C14 | rules/REMOTION.md 动态音量残留 | ✅ 本轮修复 |
| C15 | rules/REMOTION.md @remotion/media-utils | ✅ 本轮修复 |
| C16 | ONEPASS_WORKFLOW.md 死链 | ✅ 本轮修复（已从 SKILL.md/launch.sh/REMOTION.md 移除所有引用，SKILL.md 新增强调 `launch.sh` 为唯一入口） |

---

## 下次审计检查清单

```bash
# 必查项
1. video-composer.js 是否还有 Audio 组件或 Audio 导入
2. generateRootComponent 是否包含 calculateMetadata 函数
3. entry 文件导入是否为 ./Root（不是 ./src/Root）
4. render 命令是否含 --concurrency=4
5. gen_frames_template.py 音频路径是否为 neural_1_2x.m4a

# remotion-best-practices 新规则文件（每季度检查更新）
# rules/ 下新增的 .md 文件需要逐个审查
```
