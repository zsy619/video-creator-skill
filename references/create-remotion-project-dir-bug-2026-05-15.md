# create-remotion-project.js --dir 路径解析 Bug

## 何时使用

创建 Remotion 项目后如果项目结构出现在错误位置，或 node 报错 "ENOENT: no such file or directory, open .../video-project/package.json"，检查是否踩中此 Bug。

---

## Bug: --dir 解析为相对路径

**文件**: `scripts/create-remotion-project.js`

**现象**: 
```
node create-remotion-project.js --dir /full/path/to/project --name my-project
# 项目实际创建在 {cwd}/video-project，而非 /full/path/to/project/video-project
```

**根因**: 脚本内部 `path.join(projectDir, 'video-project')` 使用相对路径拼接，但 `projectDir` 从 `--dir` 参数获取时，如果传入绝对路径但工作目录不在目标位置，路径解析可能出错。

**实测复现**:
```bash
cd /tmp
node $SKILL_DIR/scripts/create-remotion-project.js \
  --name hermes-agent-camel \
  --dir /Volumes/OpenClawDrive/.hermes/workspace/hermes-agent-camel-video
# 结果：video-project 被创建在 /tmp/video-project，而非目标目录
```

**影响**: 
- Remotion 项目创建在错误位置
- 后续 `npm install` / `npx remotion render` 全部失败
- 报错 `ENOENT: no such file or directory, open .../package.json`

---

## Workaround

**方案A（推荐）**: 不要从 `/tmp` 或其他非项目目录运行脚本
```bash
# ✅ 从项目父目录执行
cd /Volumes/OpenClawDrive/.hermes/workspace
node $SKILL_DIR/scripts/create-remotion-project.js --name my-project --dir .

# ✅ 从项目根目录执行
cd /Volumes/OpenClawDrive/.hermes/workspace/my-project-video
node $SKILL_DIR/scripts/create-remotion-project.js --name my-project --dir .
```

**方案B**: 直接复制已知正常的 Remotion 项目结构
```bash
# 从 gallery-video 复制（已验证可用）
cp -r /Volumes/OpenClawDrive/.hermes/workspace/gallery-video/video-project \
       /Volumes/OpenClawDrive/.hermes/workspace/my-project-video/video-project
```

---

## 修复记录

- 2026-05-15: 首次记录（hermes-agent-camel 项目实测）
  - Workaround: 改用 `cp -r` 从 gallery-video 复制已知正常结构
  - 长期修复: 待 script 修改路径解析逻辑
