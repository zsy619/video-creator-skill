# Node.js execSync { encoding: 'utf8' } 返回值 bug

> **平台**：macOS arm64, Node.js 24（其他版本也可能受影响）
> **发现时间**：2026-05-13，Hysteria 视频项目

## 问题现象

`video-quality-gate.js` 的 `getAudioMeta()` 函数解析 ffprobe 输出始终得到 `undefined`，导致音频元数据读取失败。

## 根因

`child_process.execSync()` 的行为在 Node.js 24 中因 `encoding` 参数不同而改变：

```javascript
// ❌ 错误假设：返回 { stdout, stderr } 对象
const r = execSync(`ffprobe ...`, { encoding: 'utf8' });
console.log(r.stdout); // undefined — r 是字符串，不是对象

// ✅ 正确：encoding:'utf8' 直接返回字符串
const raw = execSync(`ffprobe ...`, { encoding: 'utf8' });
const output = typeof raw === 'string' ? raw : (raw.stdout || '');
```

## 症状

- `r.stdout === undefined`
- ffprobe 输出被整体解析为第一行（duration 或 bit_rate 的其中一个）
- 音频码率门禁误判

## 修复模式

所有使用 `execSync` + `{ encoding: 'utf8' }` 后再访问 `.stdout` 的代码，必须改为直接使用返回值（因为它就是字符串）：

```javascript
// 通用安全模式
function execOutput(cmd, args = []) {
  const raw = execSync(cmd, args, { encoding: 'utf8' });
  if (typeof raw === 'string') return raw;
  return raw.stdout || '';
}
```

## 涉及脚本

- `video-quality-gate.js` — `getAudioMeta()` 函数（已修复）
- 其他使用相同模式的脚本需自查
