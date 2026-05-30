# DynamicScene 架构（2026-05-23）

> **最后更新**：2026-05-23

## 背景

原架构：6个硬编码场景文件（Scene1_Cover ~ Scene6_Ending），Video.tsx 用 `SceneComponents[i]` 按索引路由。
问题： narration 句数不同时场景数量固定，导致末场景越界（alphaanalyst 6 captions → 4 scenes，末场景 43s vs 预期 10.8s）。

## 新架构

### 核心设计原则
1. **一个组件**：所有场景类型由 `DynamicScene.tsx` 统一渲染，通过 `scene.name` 字段路由
2. **枚举驱动**：场景类型定义在 `SCENE_TYPES` 枚举常量，值用内联字符串字面量
3. **动态 N**：场景数量由 caption 数量自动推断（2-3→2, 4-6→4, 7-9→5, 10+→6）
4. **百分比等分**：时间按 `totalMs` 的百分比分配，Sum=totalMs 精确匹配

### SCENE_TYPES 枚举（create-remotion-project.js）

```javascript
const SCENE_TYPES = {
  COVER:     'Cover',     // 封面
  PAIN_POINT:'PainPoint',  // 痛点
  SOLUTION:  'Solution',   // 解决方案
  FEATURES:  'Features',   // 特性
  START:     'Start',      // 开始使用
  ENDING:    'Ending',     // 结尾
  GENERIC:   'Generic'     // 兜底（未知类型）
};
```

⚠️ **枚举序列化 bug**：在模板字符串中 `JSON.stringify(DEFAULT_SCENES)` 会将 `SCENE_TYPES.COVER` 序列化为 `"[object Object]"`。必须用内联字符串值：

```javascript
// ❌ 错误
const DEFAULT_SCENES = [
  { id: 1, name: SCENE_TYPES.COVER, ... },
];

// ✅ 正确
const DEFAULT_SCENES = [
  { id: 1, name: 'Cover', ... },
];
```

### Video.tsx 动态路由

```javascript
import { DynamicScene } from './scenes';

// 移除硬编码 SceneComponents 数组
// 改为 name 字段路由
scenes.map((scene) => (
  <DynamicScene
    key={scene.id}
    scene={scene}
    theme={theme}
    totalDuration={totalDuration}
  />
))
```

### DynamicScene.tsx 渲染逻辑

```typescript
switch (scene.name) {
  case 'Cover':     return <CoverContent />;
  case 'PainPoint': return <PainPointContent />;
  case 'Solution': return <SolutionContent />;
  case 'Features': return <FeaturesContent />;
  case 'Start':    return <StartContent />;
  case 'Ending':   return <EndingContent />;
  default:         return <GenericContent />; // GENERIC 兜底
}
```

### 动态 N 场景时间分配（launch.sh SCENES_JSON）

```javascript
// 百分比等分法（避免末场景越界）
const types = n<=3  ? ['Cover','Ending']
             : n<=6  ? ['Cover','PainPoint','Solution','Ending']
             : n<=9  ? ['Cover','PainPoint','Solution','Features','Ending']
             :         ['Cover','PainPoint','Solution','Features','Start','Ending'];

const totalMs = captions[n-1].startMs; // 末 caption 的 startMs = 视频总时长

types.forEach((name, i) => {
  const pctStart = i / types.length;
  const pctEnd   = (i + 1) / types.length;
  scenes.push({
    id:       i + 1,
    name:     name,
    startMs:  Math.round(pctStart * totalMs),
    endMs:    Math.round(pctEnd   * totalMs),
    duration: (pctEnd - pctStart) * totalMs / 1000,
    title,
    subtitle
  });
});
```

⚠️ **索引等分 bug（已修复）**：最初用 `captions[Math.ceil((i+1)/types.length) - 1]` 按 caption 索引等分，alphaanalyst（6 captions / 4 scenes）末场景越界：43s vs 10.8s。改用百分比等分后，Sum=totalMs 精确匹配。

### 验证数据

| 项目 | captions | 场景 | Sum | totalMs | 结果 |
|------|----------|------|-----|---------|------|
| agency-agents | 9 | 5 | 40.5s | 40.5s | ✅ |
| alphaanalyst | 6 | 4 | 43.3s | 43.3s | ✅ |
| claude-howto | 7 | 5 | 34.1s | 34.1s | ✅ |

### 被删除的旧代码

- `Scene2_PainPoint.tsx` ~ `Scene6_Ending.tsx`（6个硬编码场景文件）
- `scenes/index.ts` 中的多组件导出（改为只导出 `DynamicScene`）
- `launch.sh` 中硬编码6场景的 `map` 数组（改为动态 types 推断）

### 维护注意事项

1. `create-remotion-project.js` 生成 `DynamicScene.tsx` 时，使用 `SCENE_TYPES` 枚举的值（内联字符串，不是 JS 对象引用）
2. `launch.sh` 的 SCENES_JSON 用百分比分配，不用索引等分
3. 如果新增场景类型（如 `Testimonial`），只需三处修改：
   - `SCENE_TYPES` 枚举加条目
   - `DynamicScene.tsx` 的 switch 加 case
   - `launch.sh` 动态推断的 types 数组加类型
