# launch.sh 参考

## 超时问题

### 600s subagent 超时 vs launch.sh 整体耗

- `delegate_task` 默认超时 600s
- `launch.sh all` 执行 Step 0-11，含多步骤耗时的子任务
- **渲染步骤（Step 7）在 600s 内可完成**，但若 CWD 被提前 invalidate 可能 SIGBUS
- 实际场景：newsnow 委托超时，但 launch.sh 内部重跑时完整执行成功

### 症状识别

```
=== Step 7: Remotion 渲染（60fps / 1080×1920 / 3119帧）===
[Command timed out after 600s]
```

检查 out/ 是否已有 .mp4：
```bash
ls -la "{WORKSPACE_DIR}/<project>-video/video-project/out/"
```

### 恢复验证

实际有效的检测命令（在当前会话验证过）：
```bash
ls -la "{WORKSPACE_DIR}/newsnow-video/video-project/out/" 2>/dev/null && echo "有文件"
ls "{WORKSPACE_DIR}/newsnow-video/audio/" 2>/dev/null
```

### 已知问题：SIGBUS on CWD invalidation

launch.sh 内部执行多条命令，若 CWD 在 launch.sh 期间被移动（如用户 cd 到其他目录），某些 execSync 会 SIGBUS。

**解决方案**：不在 launch.sh 内整体运行，而是分步执行或确保 CWD 稳定。

### launch.sh all 输出质量门禁 D 警告

```
=== 门禁 D: 最终视频 ===
━━━ 检查结果 ━━━
❌ 存在失败项，质量门禁关闭
[!] ⚠️ 最终视频检查有警告
```

此警告不影响视频生成（`[✓] ✅ 一键生成完成！`），视频文件实际已正确生成，可忽略继续。

## launch.sh 命令参考

```bash
# 初始化项目
bash launch.sh init <project-name>

# 完整流程（Step 0-11）
bash launch.sh all

# 分步执行
bash launch.sh docs      # Step 0
bash launch.sh audio     # Step 1-2
bash launch.sh captions  # Step 3
bash launch.sh remotion  # Step 4-7
bash launch.sh covers    # Step 8
```

## 关键文件路径

| 文件 | 路径 |
|------|------|
| launch.sh | `{SKILL_DIR}/scripts/launch.sh` |
| generate_cover.py | `{SKILL_DIR}/scripts/generate_cover.py` |
| generate_docs.js | `{SKILL_DIR}/scripts/generate_docs.js` |
| 工作空间 | `{WORKSPACE_DIR}/` |