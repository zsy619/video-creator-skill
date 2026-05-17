# video-creator Changelog

## 2026-05-17 18:25 (opskat session)
- 修复 `launch.sh all` 渲染失败：Bus error 根因是 CWD 在渲染时被删除导致，`all` 中渲染命令需要先 `cd "${VP_DIR}"` 再执行
- 记录 Remotion Composition ID (`VerticalVideo`) ≠ 组件注册名 (`RemotionRoot`)，两者是不同命名空间，render 时必须用 `VerticalVideo`
- 添加 `launch.sh render` 子命令中 `cd "${VP_DIR}"` 的修复

## 2026-05-17 上午
- 发现 RuView-video 之后 11 个项目存在系统性质量问题（缺 docs/、无封面、音频命名错误）
- 修复 atempo 动态计算（`source_duration / target_duration` 替代固定 1.2）
- 修复 `launch.sh render` 中 `cd "${VP_DIR}"` 逻辑

## 2026-05-15
- 用户确认默认语音为 `zh-CN-YunjianNeural`（永久偏好，不接受女声）
- 修复 edge-tts rate=+0% 与 atempo 1.2x 叠加问题（禁止叠加使用）
- Remotion Native 渲染成功：音频内嵌 + 字幕烧录 + 60fps + 1080×1920

## 2026-05-14
- 8 个项目（oh-my-codex、deer-flow、claude-hud、OpenViking、openscreen、open-swe、impeccable、deepagents）全部 narration.txt 字数不足，需手动重写
- 确认 `generate_docs.js` 对中文内容提取能力极弱

## 2026-05-13
- Remotion Native 渲染首战成功，弃用 ffmpeg 混流方案
- edge-tts 实测语速 3.37~3.73 中文字符/秒（安全上限取 3.37）