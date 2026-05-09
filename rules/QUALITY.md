# 质量检查清单

> 所属模块：video-creator / SKILL.md → 质量保证

## 内容检查

- [ ] 标题吸引眼球
- [ ] 内容结构清晰
- [ ] 标签相关且足够（≥5个）
- [ ] 无语法/拼写错误
- [ ] 公众号标题 ≤32字
- [ ] 公众号摘要 ≤44字

## 视觉检查

- [ ] 封面图清晰
- [ ] 内容插图相关
- [ ] 居中显示正确
- [ ] 色彩一致

## 文件检查

- [ ] 所有文档存储在 `docs/` 目录
- [ ] 视频存储在 `video-project/out/` 目录
- [ ] 素材存储在 `docs/assets/` 目录
- [ ] **session-log.md 存在**：追踪 token 消耗的审计文档

## 技术检查

- [ ] 分辨率正确 (1080x1920)
- [ ] 帧率达标 (60fps)
- [ ] 时长合理 (≥10秒)
- [ ] 文件大小合规

## 音频检查

- [ ] 音频连续无拼接感
- [ ] 音画同步（无明显偏差）
- [ ] 音量一致（无忽大忽小）
- [ ] 无回音/杂音
- [ ] **⚠️【新增】音频 RMS 验证**：最终视频每个音频样本 RMS > -60dB（禁止全 -inf）
  ```bash
  # 验证命令（0个样本表示全静音 = 无效）
  ffmpeg -i final-video.mp4 \
    -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" \
    -f null - 2>&1 | grep "RMS_level" | grep -v "\-inf" | wc -l
  # 非0个样本 = 有效音频
  ```

## 字幕检查 ⚠️ 重点

- [ ] **字幕时间轴基于最终音频时长**：atempo 压缩后必须重新生成字幕，禁止用原速时间轴
- [ ] **字幕已烧入画面**：使用 `ffmpeg -vf "ass=xxx.ass"` 烧录，MP4 不支持嵌入 ASS 轨道
- [ ] **字幕时长 ≤ 视频时长**：检查最后一条字幕的结束时间是否 ≤ 视频总时长
- [ ] **字体为 PingFang SC**：macOS 系统字体，禁止 STHeiti Medium（不存在）
- [ ] **字号 72px**：符合竖屏 1080×1920 阅读标准（Fontsize=72，约40px视觉，已验证）
- [ ] **颜色黄色**：`&H00FFFF`（底部居中，MarginV=50）

### 字幕轨道验证（独立字幕流方案）

如果需要保留独立字幕轨道（非烧录），应使用 MP4 专用格式：

```bash
# ❌ 错误：MP4 不支持 ASS 嵌入
ffmpeg -i video.mp4 -i subs.ass -c:v copy -c:a copy -c:s ass ... output.mp4

# ✅ 正确：SRT 转 UTF-8 后嵌入 MP4
ffmpeg -i video.mp4 -i subs.srt -c:v copy -c:a copy -c:s mov_text output_with_srt.mp4
```

### 字幕时间轴验证脚本

```bash
# 检查最后一条字幕是否超出视频时长
LAST_END=$(grep "^Dialogue:" subs.ass | tail -1 | awk -F',' '{print $4}')
VIDEO_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 video.mp4)
# 比较 LAST_END < VIDEO_DUR
```
