# subtitle-generator.js 正确用法

## 重要：SubtitleGenerator 是类库，不是 CLI

**错误用法**:
```bash
node scripts/subtitle-generator.js <audio.m4a> <text.txt>
# → 无输出，不生成任何文件
```

`subtitle-generator.js` 导出的是一个 class（SubtitleGenerator），必须 require 后实例化调用。

**正确用法**: 写一个调用脚本：
```javascript
const { SubtitleGenerator } = require('./scripts/subtitle-generator.js');

const generator = new SubtitleGenerator({
  font: 'STHeiti Medium',  // macOS 中文粗体
  fontSize: 72,
  color: '&H00FFFF',
  outline: 2,
  marginV: 50,
});

const subs = generator.generateFromText(narrationText, totalDuration);
generator.generateASS(subs, 'audio/subtitles.ass');
```

## ASS 字幕手工生成（推荐）

当 SubtitleGenerator 类用法复杂时，直接用 Node.js 脚本生成 ASS：

```javascript
const fs = require('fs');

const text = fs.readFileSync('audio/full_narration.txt', 'utf8').trim();
const DURATION = 38.70;  // 秒
const FONT = 'STHeiti Medium';
const FONT_SIZE = 72;
const W = 1080, H = 1920;

const sentences = text.replace(/\n/g, '。').split('。').filter(s => s.trim());
const n = sentences.length;
const seg = DURATION / n;

function fmt(t) {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const cs = Math.floor((t % 1) * 100);
  return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}.${cs.toString().padStart(2,'0')}`;
}

let ass = `[Script Info]
ScriptType: v4.00+
WrapStyle: 0
PlayResX: ${W}
PlayResY: ${H}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, MarginL, MarginR, MarginV, Encoding
Style: Default,${FONT},${FONT_SIZE},&H00FFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,30,30,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

for (let i = 0; i < n; i++) {
  const start = i * seg;
  const end = (i + 1) * seg;
  const words = [...sentences[i]];
  const lines = [];
  for (let j = 0; j < words.length; j += 40) {
    lines.push(words.slice(j, j + 40).join(''));
  }
  const textFormatted = lines.join('\\N');
  ass += `Dialogue: 0,${fmt(start)},${fmt(end)},Default,,30,30,50,,${textFormatted}\n`;
}

fs.writeFileSync('audio/subtitles.ass', ass, 'utf8');
console.log(`✅ 字幕已生成: ${n}条`);
```

## 关键参数（规范值）

| 参数 | 值 | 说明 |
|------|-----|------|
| Fontsize | 72 | PlayResY=1920 时约40px视觉 |
| PlayResX | 1080 | 竖屏宽度 |
| PlayResY | 1920 | 竖屏高度 |
| MarginV | 50 | 距底边50px |
| Outline | 2 | 2px黑色描边 |
| PrimaryColour | &H00FFFF | 亮黄色 |
| Alignment | 2 | 底部居中 |

## 换行规则

- 语义换行用 `\N`（不是 `\n`）
- 每行不超过40个字符
- Dialogue 行必须是10字段格式
