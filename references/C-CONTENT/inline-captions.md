# 内联 captions 方案（2026-05-29 实测）

## 背景

CaptionOverlay.tsx 在 Remotion bundler 启动后通过 `fetch(staticFile("audio/captions.json"))` 访问 `public/` 下的 JSON 文件时会 404，即使该文件在渲染前已正确复制到 `public/audio/`。

根因：Remotion bundler 在服务启动时预编译 `public/` 目录内容，服务启动后不再重新读取文件系统。

## 解决方案

将 captions 数据以内联 JS 常量形式嵌入 CaptionOverlay.tsx，彻底消除网络依赖：

```typescript
// CaptionOverlay.tsx 顶部添加
const INLINE_CAPTIONS: Array<{text: string; startMs: number; endMs: number}> = [
  { text: "第一句字幕文本", startMs: 0, endMs: 2960 },
  { text: "第二句字幕文本", startMs: 2960, endMs: 5833 },
  // ... 全部 captions，末段 endMs = 视频实际总时长（毫秒）
];

export const CaptionOverlay: React.FC = () => {
  // 删除所有 fetch 逻辑，直接使用常量
  const captions = INLINE_CAPTIONS;
  // ... 后续逻辑不变
};
```

## 验证

```bash
grep -c "INLINE_CAPTIONS" video-project/src/components/CaptionOverlay.tsx
# 返回 >0 表示已使用内联方案
```

## 使用场景

- captions.json 已生成（Step 8 完成），渲染前检测到 CaptionOverlay 使用 `fetch(staticFile(...))`
- 渲染时字幕不显示（404）或 `captions.map is not a function`
- 任何 subagent 返回后字幕异常的情况

## 末段 endMs 必须同步

内联时注意：末段 `endMs` 必须等于**视频实际总时长（毫秒）**，不是音频时长。

```typescript
// 视频实际 35.24s
const VIDEO_MS = 35240;
// 内联 captions 末段
{ text: "最后一帧字幕文本", startMs: 31406, endMs: 35240 }
```

## 相关 SKILL.md 段落

此文件是 `references/C-CONTENT/subtitle-production.md` 第6节"404 根因与正确流程"的补充。