# Remotion `--props` 传递与 Bash 引号陷阱

## 问题症状

渲染出来的视频所有场景标题都是占位符："视频标题"、"痛点场景"、"解决方案"、"核心功能"、"快速上手"、"行动号召"，而不是 video-config.json 中的真实标题和字幕内容。

## 根因

`npx remotion render VerticalVideo ...` 调用时没有传 `--props`，导致 Remotion 使用 `defaultProps`：

```tsx
// VerticalVideo.tsx 中的问题逻辑
const sceneList = scenes.length > 0 ? scenes : DEFAULT_SCENES.map(s => ({...}))
```

`scenes: []` → 触发 DEFAULT_SCENES 回退 → 全部占位符标题。

## 正确做法

必须在 `--props` 中传入完整配置对象：

```bash
npx remotion render VerticalVideo out/final.mp4 \
  --props='{"scenes":[...],"title":"MiaoYan","subtitle":"macOS轻量级Markdown笔记应用","theme":"cyberpunk"}' \
  --fps=60 --duration-in-frames=3118 --concurrency=4 --disable-gpu
```

## scenes 数组构造算法

6个场景对应7句 narration，按时间比例分配：

| 场景 | 字幕句号 | title 来源 |
|------|---------|-----------|
| Cover | 句1 | 句1文本（截断15字） |
| PainPoint | 句2 | 句2文本 |
| Solution | 句3 | 句3文本 |
| Features | 句4+5 | 句4文本 |
| Start | 句6 | 句6文本 |
| Ending | 句7 | 句7文本 |

```javascript
// 构造 scenes JSON（用 function() 而非箭头函数，避免 shell 解析问题）
const SCENES_JSON=$(node -e "
const d=parseFloat('${AUDIO_DURATION}');
const captions=require('${proj_dir}/audio/captions.json');
const total=captions.length;
const map=[
  {id:1,name:'Cover',     range:[0,1]},
  {id:2,name:'PainPoint', range:[1,2]},
  {id:3,name:'Solution',  range:[2,3]},
  {id:4,name:'Features',  range:[3,5]},
  {id:5,name:'Start',     range:[5,6]},
  {id:6,name:'Ending',    range:[6,total]},
];
const scenes=map.map(function(m){
  const startMs=m.range[0]<total?captions[m.range[0]].startMs:0;
  const endMs=m.range[1]<total?captions[m.range[1]].startMs:d*1000;
  const dur=(endMs-startMs)/1000;
  const titleText=m.range[0]<total?captions[m.range[0]].text.slice(0,15):'';
  return {id:m.id,name:m.name,duration:Math.max(dur,1),title:titleText,subtitle:''};
});
console.log(JSON.stringify(scenes));
")

# 一次性构造完整 props JSON（避免嵌套 shell subshell）
local PROPS
PROPS=$(node -e "
var c=require('${config_file}');
var t=c.cover&&c.cover.title||c.title||'MiaoYan';
var sub=c.cover&&c.cover.subtitle||c.subtitle||'';
console.log(JSON.stringify({scenes:JSON.parse('${SCENES_JSON}'),title:t,subtitle:sub,theme:'${THEME}'}));
")

npx remotion render VerticalVideo out/final.mp4 \
  --props="${PROPS}" \
  ...
```

## ⚠️ Bash 引号嵌套陷阱

**错误写法**（`$(...)` 内嵌 `$(...)`）：

```bash
# 错误：第一个 ) 导致 subshell 提前关闭
log "场景配置: $(echo $SCENES_JSON | node -e "const d=JSON.parse(...); ...")"
--props="{\"scenes\":${SCENES_JSON},\"title\":\"$(node -e "process.stdout.write(...)")\"}"
```

**正确写法**：
1. 用 `function(){}` 替代 `()=>{}` 箭头函数（避免 `>` 被 shell 解析）
2. props JSON 整体在 node 中构造，不在 shell string 中拼接
3. 用单引号 `'${VAR}'` 包裹含 `${SCENES_JSON}` 的 shell 变量展开

## 验证方法

渲染后用 ffprobe 检查视频时长是否等于音频时长：

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 out/final.mp4
# 正确值: 约等于 audio/neural_1_2x.m4a 时长（如 52.01）
```

视频内容正确性只能通过视觉检查确认（字幕文件中的真实内容是否出现在对应时间点的画面上）。
