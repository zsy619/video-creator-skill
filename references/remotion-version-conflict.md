# Remotion 4.x 版本冲突导致 EISDIR 错误

## 症状
```
Error: EISDIR: illegal operation on a directory, read
    at async readFileHandle (node:internal/fs/promises:556:24)
    at async validateEntryPoint (.../bundler/dist/bundle.js:153:22)
```

## 根因
`@remotion/bundler` 与 `@remotion/renderer` 等其他包的版本不一致（如 bundler=4.0.449 但 renderer=4.0.448）。

## 诊断
```bash
cd video-project && npx remotion versions
# 输出应显示所有 remotion/* 包均为同一版本
```

## 修复
```bash
# 1. 清除缓存
rm -rf node_modules/.cache

# 2. 重新安装同版本（以 4.0.448 为例）
npm install remotion@4.0.448 @remotion/cli@4.0.448 @remotion/bundler@4.0.448 --save-exact

# 3. 重新渲染
npx remotion render out /tmp/video.mp4 --timeout=300
```

## 预防
- 所有 remotion/* 包必须用 `--save-exact` 锁定同一版本
- 禁止只更新部分包
