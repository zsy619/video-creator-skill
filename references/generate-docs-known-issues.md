# generate_docs.js 已知问题与修复

> **最后更新**：2026-05-17
> **配套**：`scripts/generate_docs.js`

---

## extractNarration() 截断逻辑缺陷（已修复 2026-05-17）

### 旧版问题

`extractNarration()` 截断使用 `maxChars`（总字符数）与 `narration.length` 比较，但安全上限 `maxChineseChars` 是**中文字符数**，单位不一致。每次都生成字数不足或超限的 narration.txt（hermeshub 项目 344 字超限 175 字上限）。

### 旧版截断逻辑

```javascript
const chineseChars = (narration.match(/[\u4e00-\u9fa5]/g) || []).length;
if (chineseChars > maxChars) {  // maxChars 是中文字数，但和 narration.length 比较
    let acc = 0;
    for (let i = 0; i < narration.length; i++) {
        if (/[\u4e00-\u9fa5]/.test(narration[i])) acc++;
        if (acc > maxChars && /[。！？]/.test(narration[i])) {
            breakIdx = i + 1;
            break;
        }
    }
    narration = narration.slice(0, breakIdx) || narration.slice(0, Math.floor(maxChars * 1.5));
    // ⚠️ maxChars * 1.5 对中文 175 字上限 = 262 总字符，反而比 175 中文字数上限还大
}
```

### 修复后逻辑（2026-05-17）

```javascript
function extractNarration(scriptContent, maxChineseChars) {
    // ...
    const countChinese = (text) => (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    let chineseChars = countChinese(narration);

    // 第一层：在自然断点处截断
    if (chineseChars > maxChineseChars) {
        let acc = 0, breakIdx = narration.length;
        for (let i = 0; i < narration.length; i++) {
            if (/[\u4e00-\u9fa5]/.test(narration[i])) acc++;
            if (acc > maxChineseChars && /[。！？]/.test(narration[i])) {
                breakIdx = i + 1;
                break;
            }
        }
        narration = narration.slice(0, breakIdx) || narration.slice(0, Math.floor(maxChineseChars * 1.5));
        chineseChars = countChinese(narration);
    }

    // 第二层安全网：若截断后仍超限，强制在 95% 上限截断（不抛错，避免阻断）
    if (chineseChars > maxChineseChars) {
        let acc = 0, breakIdx = narration.length;
        for (let i = 0; i < narration.length; i++) {
            if (/[\u4e00-\u9fa5]/.test(narration[i])) {
                acc++;
                if (acc >= Math.floor(maxChineseChars * 0.95)) {
                    breakIdx = i + 1;
                    break;
                }
            }
        }
        narration = narration.slice(0, breakIdx);
    }

    return narration + "。";
}
```

### 关键教训

- `narration.length`（总字符）vs `maxChineseChars`（中文字符数）是**不同单位**，不能直接比较
- 必须统一用中文字符数 `countChinese()` 进行截断判断
- 增加第二层安全网强制截断，确保输出永远不超过上限

---

## 11 个文档必须全部生成（Step 0 铁律）

`generate_docs.js` 负责生成以下 11 个文件，任意一个缺失都会导致后续流程失败：

| # | 文件 | 说明 |
|---|------|------|
| 1 | `article.md` | 原始内容（拷贝） |
| 2 | `video-script.md` | 分镜脚本 |
| 3 | `narration.txt` | 配音文本（**需验证字数**） |
| 4 | `copy.md` | 小红书营销文案 |
| 5 | `wechat-copy.md` | 公众号文案 |
| 6 | `posting-guide.md` | 多平台发布指南 |
| 7 | `session-log.md` | 会话日志 |
| 8 | `landing-page.html` | 落地页 |
| 9 | `article-page.html` | 文章阅读页 |
| 10 | `wechat-page.html` | 公众号适配页 |
| 11 | `report.json` | 执行报告 |

---

## 验证命令（Step 0 完成后必执行）

```bash
PROJECT_DIR="{WORKSPACE_DIR}/{project-name}"
for f in article.md video-script.md narration.txt copy.md wechat-copy.md posting-guide.md session-log.md landing-page.html article-page.html wechat-page.html report.json; do
  if [ ! -f "$PROJECT_DIR/docs/$f" ]; then
    echo "❌ 缺失: $f"
  fi
done

# narration.txt 字数验证（目标秒数 × 3.37）
python3 -c "
text = open('$PROJECT_DIR/docs/narration.txt').read()
chinese = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
max_chars = int(52 * 3.37)
print(f'中文字数: {chinese} / 上限: {max_chars}')
assert chinese <= max_chars, f'字数超限: {chinese} > {max_chars}'
print('✅ 字数检查通过')
"
```