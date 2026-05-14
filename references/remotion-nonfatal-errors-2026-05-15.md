# Remotion 非致命错误模式

## npx remotion still ProtocolError

**现象**: 执行 `npx remotion still` 时，Chrome Headless Shell 下载完成后报错：
```
Was not able to close puppeteer page ProtocolError: Protocol error (Target.closeTarget): No target found for targetId
```
但帧文件仍然成功生成。

**根因**: Remotion 4.x 的 Puppeteer 清理逻辑在页面关闭时抛出非致命异常，不影响实际渲染结果。

**判断方法**: 检查 out 目录是否有对应的帧文件或 MP4 输出：
```bash
ls out/*.png out/*.mp4 2>/dev/null
```

**结论**: 如果文件成功生成，忽略 ProtocolError 即可。

---

## Background Render 进程存活但无输出

**现象**: `npx remotion render` 在后台运行时，进程持续存活（数百秒 uptime），但 out/ 目录的输出文件大小和时间戳不再变化。

**可能原因**:
- Remotion 在等待某个资源（Chrome bundle、音频文件等）
- 渲染实际已完成但进程未正确退出
- 音频内嵌场景卡住

**处理**:
1. 检查 out/ 是否有完整输出（用 ffprobe 验证 duration）
2. 如果视频时长符合预期，杀死后台进程并使用已有输出
3. 如果时长不符合预期，需要重新渲染

**验证命令**:
```bash
# 检查视频实际时长
ffprobe -v error -show_entries format=duration -of csv=p=0 out/final.mp4

# 检查文件大小是否还在变化
stat -f "%Sm %z" out/final.mp4
```
