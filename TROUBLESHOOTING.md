# 故障排除

> 所属模块：video-creator / SKILL.md → 问题解决

## 常见问题

### Q: 视频渲染失败

```bash
# 清除缓存重试
rm -rf node_modules/.cache
npm install
npx remotion render
```

### Q: baoyu 技能无法获取内容

```bash
# 检查网络
curl -I https://example.com

# 使用交互模式
bun scripts/vendor/baoyu-fetch/src/cli.ts <url> --wait-for interaction
```

### Q: 字体显示异常

```html
<!-- 使用系统字体栈，无需加载外部字体 -->
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC',
                 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
  }
</style>
```

### Q: 音频有回音/重叠

- 原因：多个 `<Audio>` 组件同时播放
- 解决：只使用 1 个 `<Audio>` 组件从头播到尾。详见 `VOICE.md`

### Q: 音频有拼接感

- 原因：分段生成后拼接
- 解决：整段连续生成，不分段。详见 `VOICE.md`

### Q: Remotion 音频有编码杂音

- 解决：用 ffmpeg 混流绕过重编码。详见 `VOICE.md`

### Q: Chrome headless shell 下载失败 (UNABLE_TO_GET_ISSUER_CERT_LOCALLY)

- 原因：TLS 证书验证失败
- 解决：设置环境变量绕过验证

```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
npx remotion render VerticalVideo --output out/video.mp4
```

注意：此方法会降低安全性，仅在本地开发环境使用。
