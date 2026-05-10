# Remotion CLI 在 headless Mac M-series 环境的渲染问题

> **最后更新**：2026-05-10  
> **问题级别**：架构性限制，非版本 bug  
> **状态**：已知无官方解决方案，ffmpeg 兜底方案已验证通过

---

## 问题描述

`@remotion/renderer` 的 `getCompositions()` / `selectComposition()` API 在 headless 环境（Mac M-series，无 GUI Chrome）需要传入 `serveUrl` 参数。该参数指向 bundler 启动的 HTTP dev server。实际运行时：

1. `remotion render` CLI 内部调用 `getCompositions({ entryPoint: './src/index.ts' })`
2. `getCompositions` 内部调用 `bundler.getServer()` 启动 webpack dev server
3. Mac arm64 环境下 dev server 无法响应，60 秒超时
4. 输出：`Could not find composition with ID VerticalVideo. Available compositions: []`

**注意**：即使 `remotion bundle` 成功生成了完整的 `bundle.js`（535KB），CLI 仍然会因为 `selectComposition()` 超时而失败。

---

## 已知影响环境

- macOS（所有 M-series 芯片：M1/M2/M3/M4）
- CI/CD 环境（Linux headless，无 Chrome/GUI）
- 任何无法启动 webpack dev server 的环境

---

## 判断方法

```bash
cd video-project
timeout 30 npx remotion compositions --entry-point src/index.ts 2>&1
```

- 输出包含 `VerticalVideo` 等 composition 列表 → **Remotion CLI 可用**
- 超时或 `Could not find composition` → **必须使用 ffmpeg 兜底**

---

## ffmpeg 兜底渲染命令（已验证）

```bash
PROJ=/Volumes/OpenClawDrive/.hermes/workspace/llama-index-intro

ffmpeg -y -loop 1 \
  -i "${PROJ}/docs/assets/cover.png" \
  -i "${PROJ}/audio/neural_1_2x.m4a" \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,subtitles='${PROJ}/audio/subtitles.ass':fontsdir='/System/Library/Fonts/Supplemental':force_style='Fontsize=72,MarginV=50,Outline=2'" \
  -shortest \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 192k \
  "${PROJ}/video-project/out/final_with_subs.mp4"
```

**参数说明**：
- `loop 1` + `shortest`：图片循环直到音频结束
- `scale + pad`：确保 1080×1920 无拉伸
- `subtitles=...ass:force_style`：强制覆盖 ASS 内置样式（字号/边距/描边）
- `fontsdir`：必须存在，ASS 字幕渲染依赖系统字体目录

**验证通过**（2026-05-10 实测）：
- 输出：H.264 + AAC，1080×1920，44.832 秒，279kbps，1.5MB
- 音频：有效（非静音），ffprobe RMS > -40dB
- 字幕：Fontsize=72，MarginV=50，Outline=2，2 位厘秒时间戳

---

## 渲染路径选择（ONEPASS_WORKFLOW.md Step 7 修正）

```
Step 7: 渲染
    │
    ├─ Remotion CLI 可用？ ──→ 是 → npx remotion render VerticalVideo ...
    │                          │
    │                          └─ Remotion 渲染失败（超时）→ 触发 ffmpeg 兜底
    │
    └─ 否（headless Mac）────→ 直接执行 ffmpeg 兜底命令
                                    │
                                    └─ Step 9 混流命令跳过（ffmpeg 已含音频+字幕）
```

**修正**：`launch.sh cmd_all()` 中的 Step 7 需要添加 fallback 检测：

```bash
# Step 7: Remotion 渲染
npx remotion render VerticalVideo \
  --output out/video_noaudio.mp4 \
  --fps "$FPS" --concurrency=8 2>&1 | tail -3

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  warn "Remotion CLI 渲染失败，切换 ffmpeg 兜底方案..."
  ffmpeg -y -loop 1 \
    -i "${PROJ}/docs/assets/cover.png" \
    -i "${PROJ}/audio/neural_1_2x.m4a" \
    -vf "scale=1080:1920,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,subtitles='${PROJ}/audio/subtitles.ass':fontsdir='/System/Library/Fonts/Supplemental':force_style='Fontsize=72,MarginV=50,Outline=2'" \
    -shortest -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k \
    "${VP_DIR}/out/final_with_subs.mp4"
  # 跳到 Step 10（门禁 D）
  node "${GATE}" "${proj_dir}" "final"
  exit $?
fi
```

---

## 长期解决方案（待研究）

1. **`@remotion/renderer` API 直接调用**：绕过 CLI，手动 require `bundle.js`，用 `renderFrames()` API 直接渲染帧，不依赖 bundler dev server
2. **Remotion 3.x 回退**：调查 Remotion 3.x 是否解决了 headless 环境问题
3. **Docker + Chrome**：在容器内运行有头 Chrome（`--headless=new` 在某些场景下等同于有头）

---

## 相关文件

- `scripts/launch.sh` — `cmd_all()` 包含完整流程（含 Remotion 尝试 + ffmpeg fallback）
- `scripts/fix-text-component.js` — 自动将 `<Text>` 替换为 `<div>`
- `references/remotion-package-discovery.md` — 包名/版本问题汇总
- `ONEPASS_WORKFLOW.md` — 标准 10 步流程（Step 7 需要本 reference 补充 headless 决策）
