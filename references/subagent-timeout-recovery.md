# Subagent 超时恢复指南

## 触发场景

- `delegate_task` 超时（默认600s），status=interrupted
- subagent 已完成部分工作（文档/音频已生成），但渲染未完成或未更新 Base

## 检测步骤

```bash
# 1. 检查 out/ 目录是否有视频文件
ls /Volumes/OpenClawDrive/.hermes/workspace/<project>-video/video-project/out/

# 2. 检查音频是否已生成
ls /Volumes/OpenClawDrive/.hermes/workspace/<project>-video/audio/

# 3. 检查 narration 是否存在
cat /Volumes/OpenClawDrive/.hermes/workspace/<project>-video/docs/narration.txt | wc -c
```

## 恢复决策树

```
out/ 有 .mp4 文件？
├── 是 → 直接更新 Base + 清理仓库
├── 否
│   ├── audio/neural_1_2x.m4a 存在？
│   │   ├── 是 → 直接运行渲染：
│   │   │   cd <project>-video/video-project
│   │   │   npx remotion render VerticalVideo out/final.mp4 --concurrency=4 --fps=60 --disable-gpu
│   │   └── 否 → 需要完整重跑 launch.sh all
│   └── narration.txt 不存在或极小？
│       └── 是 → 需要完整重跑 launch.sh all
```

## 渲染恢复命令

```bash
cd /Volumes/OpenClawDrive/.hermes/workspace/<project>-video/video-project
npx remotion render VerticalVideo out/final.mp4 --concurrency=4 --fps=60 --disable-gpu
```

## Base 更新命令

```bash
# 获取 record_id 后
lark-cli base +record-upsert \
  --base-token DTjXbS3tcaLVlqss6mHcmTwrnMg \
  --table-id tblks7R5MCE03xlS \
  --record-id <record_id> \
  --json '{"fld9ZMMjiO":"是"}'
```

## 清理命令

```bash
rm -rf /Volumes/OpenClawDrive/.hermes/workspace/<repo>-repo
```

## 根因

- `launch.sh all` 包含 Step 0-11 多个子步骤，总耗时可能超过 600s subagent 超时
- 渲染步骤（Step 7）在 600s 内完成，但整体流程超时
- 音频和文档在渲染前已生成（Step 0-3），因此可跳过这些步骤直接恢复渲染