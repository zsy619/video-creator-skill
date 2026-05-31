# SubtitleGenerator ASS格式 vs CaptionOverlay毫秒格式陷阱

> **最后更新**：2026-05-31
> **问题级别**：P0 — 致命，渲染失败无声

---

## 陷阱描述

`SubtitleGenerator.generateFromText()` 返回的是 **ASS 时间格式**：

```json
[
  { "start": "00:00:00.00", "end": "00:00:05.92", "text": "cliamp 是一款受 Winamp 启发的复古终端音乐播放器" }
]
```

但 `CaptionOverlay.tsx`（以及 skill 内所有使用 captions.json 的组件）使用的是 **毫秒格式**：

```json
[
  { "startMs": 0, "endMs": 5920, "text": "cliamp 是一款受 Winamp 启发的复古终端音乐播放器" }
]
```

直接用 ASS 格式的 captions.json 渲染会导致：
- 帧计算 `Math.round(("00:00:00.00" / 1000) * fps)` → **NaN**
- 报错 `TypeError: The "from" prop of a sequence must be finite, but got NaN`
- **静默失败**：视频生成但字幕全无，没有任何报错

---

## 根因分析

`SubtitleGenerator` 设计之初是为 ASS 字幕文件生成 `{start, end}` 字符串格式（SSA/ASS 标准时间格式）。

Skill 后续引入了 `CaptionOverlay`（TikTok 逐字高亮方案），它基于毫秒做帧计算，但 skill 文档从未说明两者的时间格式差异。

---

## 修复流程

生成 captions.json 后，立即转换格式：

```javascript
const SubtitleGenerator = require('{SKILL_DIR}/scripts/subtitle-generator.js');
const fs = require('fs');
const gen = new SubtitleGenerator();
const text = fs.readFileSync('docs/narration.txt', 'utf8');
const totalDuration = 54.89;  // 音频实际时长

async function main() {
  const subs = await gen.generateFromText(text, totalDuration);
  const msSubs = subs.map(s => ({
    startMs: gen.timeToMs(s.start),  // ASS "HH:MM:SS.CC" → ms
    endMs: gen.timeToMs(s.end),
    text: s.text
  }));
  fs.writeFileSync('video-project/public/audio/captions.json', JSON.stringify(msSubs, null, 2));
}
main();
```

---

## 验证命令

```bash
node -e "const c=JSON.parse(require('fs').readFileSync('video-project/public/audio/captions.json'));console.log('keys:', Object.keys(c[0]).join(','))"
# ✅ 输出 "startMs,endMs,text" = 正确毫秒格式
# ❌ 输出 "start,end,text" = ASS格式，未转换
```

---

## 预防措施

在 `references/C-CONTENT/subtitle-production.md` 的 "captions.json 格式" 节已添加 ASS→ms 转换警告。

另外，`create-remotion-project.js` 生成的 `public/audio/captions.json` 占位文件是**空数组** `[]`，不是 ASS 格式——但如果已经手动运行过 SubtitleGenerator 并覆盖了该占位文件，则需要确认格式正确。

---

## 关联文档

- `references/C-CONTENT/subtitle-production.md` — 主文档（含修复代码）
- `references/B-REMOTION/caption-overlay-readme.md` — CaptionOverlay 实现细节（如果存在）