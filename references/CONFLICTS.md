# video-creator 冲突登记册（2026-05-14）

> 本文档是 video-creator 技能冲突修复的单一记录源。
> 每次修复冲突后，在此登记，禁止再在不同文件中出现冲突的路径/参数。

---

## 修复铁律（永久规则）

1. **输出文件名**：统一为 `final.mp4`，禁止出现 `final_with_subs.mp4` / `final-video.mp4`
2. **字幕 JSON 路径**：`video-project/public/audio/captions.json`（Remotion 运行时读取位置）
3. **帧率**：统一 `60fps`（禁止 `60fps`）
4. **音频方案**：Remotion Native（`<Audio>` 组件内嵌），禁止 ffmpeg 混流
5. **caps 文件来源**：由 launch.sh Step 3 直接生成到 `video-project/public/audio/captions.json`，无需 ASS 中转

---

## 输出文件路径规范

| 文件 | 路径 |
|------|------|
| 最终视频 | `video-project/out/final.mp4` |
| 字幕 JSON | `video-project/public/audio/captions.json` |
| 处理后音频 | `{project}/audio/neural_1_2x.m4a` |
| 封面（vertical） | `docs/assets/cover.png` |
| 封面（wechat） | `docs/assets/cover-wechat.png` |
| 封面（xhs） | `docs/assets/cover-xhs.png` |

---

## 已修复的冲突清单

### 冲突 1：captions.json 路径错误 ✅ 2026-05-14
- **问题**：launch.sh Step 3 写到 `${proj_dir}/audio/captions.json`，Remotion CaptionOverlay 读 `video-project/public/audio/captions.json`
- **根因**：create-remotion-project.js 的 ASS→JSON 转换块（死代码）从未触发，且目录不匹配
- **修复**：launch.sh Step 3 直接写到 `${VP_DIR}/public/audio/captions.json`
- **受影响文件**：launch.sh, create-remotion-project.js

### 冲突 2：输出文件名不一致 ✅ 2026-05-14
- **问题**：`final_with_subs.mp4` / `final.mp4` / `final-video.mp4` 三种文件名散布在 7+ 文件中
- **根因**：Remotion 渲染技术迭代（Native → PIL fallback → 再切回 Native）遗留
- **修复**：统一为 `final.mp4`
- **受影响文件**：launch.sh, SKILL.md, WORKFLOW.md, video-quality-gate.js, video-composer.js, generate_docs.js, SUBTITLES.md, QUALITY.md, TROUBLESHOOTING.md, ONEPASS_WORKFLOW.md, audio-validation-protocol.md, video-creation-performance-optimizations.md, pil-frame-generation.md, remotion-package-discovery.md, ffmpeg-subtitle-burnin-font-fix.md, remotion-entrypoint-fix.md

### 冲突 3：Remotion Native vs ffmpeg 混流架构冲突 ✅ 2026-05-14
- **问题**：WORKFLOW.md Step 10 使用"Remotion 渲染无音频视频 + ffmpeg 混流"，launch.sh 使用"Remotion `<Audio>` 组件内嵌"
- **根因**：WORKFLOW.md 长期未同步 Remotion Native 升级
- **修复**：WORKFLOW.md Step 10 改为 Remotion Native 渲染命令，删除 ffmpeg 混流段落
- **受影响文件**：WORKFLOW.md

### 冲突 4：FPS 不一致 ✅ 2026-05-14
- **问题**：WORKFLOW.md Step 10 用 `fps=60`，launch.sh 用 `fps=60`
- **修复**：WORKFLOW.md 改为 `--fps=60`，ONEPASS_WORKFLOW.md Gate D 帧率改为 60fps
- **受影响文件**：WORKFLOW.md, ONEPASS_WORKFLOW.md

### 冲突 5：AUDIO_DURATION 缺失 ✅ 2026-05-14
- **问题**：`cmd_all` Step 7 渲染帧数计算引用 `${AUDIO_DURATION}`，但该变量未在 Step 7 内定义
- **根因**：`cmd_audio` 里定义过，但 `cmd_all` 跳过了 cmd_audio 直接进入后续步骤
- **修复**：cmd_all Step 7 开头添加 ffprobe 获取 AUDIO_DURATION
- **受影响文件**：launch.sh

### 冲突 6：ASS→JSON 死代码块 ✅ 2026-05-14
- **问题**：`create-remotion-project.js` 包含 ASS→captions.json 转换逻辑，依赖 `subtitles.ass` 文件，但 launch.sh 从不生成 ASS
- **根因**：Remotion Native 方案下 captions.json 直接由 launch.sh Step 3 生成，跳过 ASS 中转
- **修复**：删除该死代码块及 `assToCaptions` 导出
- **受影响文件**：create-remotion-project.js

### 冲突 7：cmd_render vs cmd_all 渲染输出不一致 ✅ 2026-05-14
- **问题**：`cmd_render` 声称输出 `final_with_subs.mp4`，`cmd_all` Step 7 输出 `final.mp4`
- **修复**：cmd_render 统一输出 `final.mp4`，完成消息同步
- **受影响文件**：launch.sh

---

## 受影响文件清单

| 文件 | 冲突数 |
|------|--------|
| `scripts/launch.sh` | 6 |
| `rules/WORKFLOW.md` | 9 |
| `SKILL.md` | 5 |
| `scripts/video-quality-gate.js` | 1 |
| `scripts/video-composer.js` | 1 |
| `scripts/create-remotion-project.js` | 2 |
| `scripts/generate_docs.js` | 1 |
| `rules/SUBTITLES.md` | 1 |
| `rules/QUALITY.md` | 1 |
| `rules/TROUBLESHOOTING.md` | 2 |
| `references/ONEPASS_WORKFLOW.md` | 3 |
| `references/audio-validation-protocol.md` | 2 |
| `references/video-creation-performance-optimizations.md` | 1 |
| `references/pil-frame-generation.md` | 1 |
| `references/remotion-package-discovery.md` | 1 |
| `references/ffmpeg-subtitle-burnin-font-fix.md` | 1 |
| `references/remotion-entrypoint-fix.md` | 1 |

---

## 如何避免未来冲突

1. **任何输出文件路径修改**：必须同步更新本登记册 + 所有引用文件
2. **Remotion 方案切换**：必须先更新 launch.sh → WORKFLOW.md → SKILL.md → 本登记册
3. **参数修改（fps/audio/codec）**：在 UNIFIED_RULES.md 中定义一次，launch.sh 和 WORKFLOW.md 均引用
4. **新增子命令**（cmd_render 等）：检查是否与其他子命令输出文件名一致
