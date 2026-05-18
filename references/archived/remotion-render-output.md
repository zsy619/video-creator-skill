# Remotion Render Output Filename Issue

## 问题

`npx remotion render VerticalVideo --output out/` 会在 `out/` 目录下生成 `out/.mp4`（无文件名），而不是 `out/VerticalVideo.mp4` 或用户期望的项目名。

验证：
```bash
ls -la video-project/out/
# 输出: -rw-r--r--  1 zhushuyan  staff  5502035 May 18 09:37 .mp4
#                              ↑ 文件名为 .mp4（前导点）
```

## 原因

Remotion 的 `--output` 参数接受目录路径时会自动写入 `out.mp4`，但当路径以 `/` 结尾时文件名处理异常。

## 解决方案

**方案一（推荐）**：指定完整文件名
```bash
cd video-project
npx remotion render VerticalVideo --output out/hermes-deployer.mp4
# 直接生成正确命名的文件
```

**方案二**：渲染后重命名
```bash
cd video-project
npx remotion render VerticalVideo --output out/
mv out/.mp4 out/hermes-deployer.mp4
```

## 渲染后必须操作

1. **检查文件名**：确认 `out/` 下文件不是 `.mp4`
2. **重命名为项目名**：统一为 `{project-name}.mp4` 格式
3. **验证 ffprobe**：检查时长、分辨率、码率是否符合预期

```bash
# 验证命令
ffprobe -v error -show_entries format=duration,size,bit_rate \
  -show_entries stream=codec_name,width,height \
  -of default=noprint_wrappers=1 out/hermes-deployer.mp4
```

## 标准渲染命令模板

```bash
cd video-project
npx remotion render VerticalVideo \
  --output out/${PROJECT_NAME}.mp4 \
  --fps 60 \
  --log error
```

其中 `${PROJECT_NAME}` 替换为项目名（如 `hermes-deployer`、`meigen-ai-design-mcp`）。