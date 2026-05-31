# Remotion --props JSON 生成技术

> **最后更新**：2026-05-30
> **来源**：notebooklm-py 项目实战

---

## 问题背景

`npx remotion render` 的 `--props` 参数传递 JSON 时，shell 引号嵌套导致语法错误：

```bash
# ❌ 失败 - shell 引号冲突
npx remotion render VerticalVideo out/final.mp4 --props "{\"scenes\":[{...}],...}"
```

## 解决方案：预写 JSON 文件 + cat

**两步法**：
1. Node.js 生成 `render-props.json` 文件
2. `--props "$(cat render-props.json)"` 读取文件内容

```bash
# Step 1: 生成 props JSON
node -e "
const fs=require('fs');
const c=JSON.parse(fs.readFileSync('video-config.json'));
const caps=JSON.parse(fs.readFileSync('video-project/public/audio/captions.json'));
const dur=58.4;  // 实际音频时长（秒）
const ms=dur*1000;
const types=['Cover','PainPoint','Solution','Features','Start','Ending'];
const scenes=types.map((n,i)=>({
  id:i+1, name:n,
  startMs:Math.round(i/types.length*ms),
  endMs:Math.round((i+1)/types.length*ms),
  duration:(1/types.length*ms)/1000,
  title:n==='Cover'?c.cover.title:n==='Solution'?'程序化API访问':n==='Features'?'核心功能':n==='Start'?'pip install':n==='PainPoint'?'痛点场景':n==='Ending'?'立即开始':n,
  subtitle:n==='Cover'?c.cover.subtitle:'',
  painPoints:['Web UI 功能有限','批量操作繁琐','API 访问困难'],
  features:[{name:'Python API',icon:'🐍'},{name:'CLI 工具',icon:'💻'},{name:'AI Agent',icon:'🤖'},{name:'批量下载',icon:'📦'}],
  steps:[{cmd:'pip install notebooklm-py',desc:'安装库'},{cmd:'notebooklm login',desc:'认证'},{cmd:'notebooklm create',desc:'创建笔记本'}]
}));
fs.writeFileSync('video-project/render-props.json',JSON.stringify({scenes,title:c.cover.title,subtitle:c.cover.subtitle,theme:c.theme}));
"

# Step 2: 渲染时引用文件
npx remotion render VerticalVideo out/final.mp4 \
  --concurrency=4 --fps=60 --disable-gpu --log=error \
  --props "$(cat video-project/render-props.json)"
```

## props 对象必须包含的字段

| 字段 | 说明 | 缺失后果 |
|------|------|---------|
| `scenes` | 场景数组，每条含 startMs/endMs | 触发 DEFAULT_SCENES 回退，全部显示占位符 |
| `scenes[].painPoints` | PainPoint 场景痛点列表 | PainPoint 场景内容为空 |
| `scenes[].features` | Features 场景功能卡片 | Features 场景内容为空 |
| `scenes[].steps` | Start 场景命令步骤 | Start 场景内容为空 |
| `title` | 从 video-config.json cover.title 读取 | 封面标题为空 |
| `subtitle` | 从 video-config.json cover.subtitle 读取 | 封面副标题为空 |
| `theme` | 主题配置对象 | 主题动画异常 |

## scenes 数量计算规则（百分比等分）

```
N ≤ 3  句 → 2 帧：Cover + Ending
N ≤ 6  句 → 4 帧：Cover + PainPoint + Solution + Ending
N ≤ 9  句 → 5 帧：Cover + PainPoint + Solution + Features + Ending
N ≥ 10 句 → 6 帧：Cover + PainPoint + Solution + Features + Start + Ending
```

每帧时长 = 视频总时长 / 场景数

## 注意事项

1. **totalMs 来源**：从 captions.json 末段 startMs 读取，或 ffprobe 视频实际时长 × 1000
2. **动态时长**：不能用硬编码帧数，必须从实际音频/视频文件获取
3. **Python 替代方案**：复杂 JSON 可用 Python 生成后写入文件，再由 Node.js 读取验证