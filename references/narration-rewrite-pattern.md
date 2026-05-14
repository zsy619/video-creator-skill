# Narration Rewriting Pattern (2026-05-14)

## Observed Pattern: 3-Attempt Cycle

Auto-generated `narration.txt` from `generate_docs.js` almost never falls in the acceptable 100–175 char range on first try. The rewrite cycle follows a consistent pattern:

| Attempt | Result | Action |
|---------|--------|--------|
| #1 | 176–223 chars (over limit) | Trim content |
| #2 | 76–91 chars (too short) | Expand with more detail |
| #3 | 100–128 chars ✅ | Done |

**Tested across**: Sherlock (115✅), LiteRT-LM (108✅), system-prompts-leaks (101✅), onyx (102✅), deepagents (163✅), timesfm (128✅), claude-howto (121✅), VibeVoice (160✅)

## Why the Pattern Exists

- `extractNarration()` uses `stripMarkdown()` which weakly handles Chinese text
- Chinese punctuation segmentation produces sentences that are too long or too short
- `maxChars` calculation uses character length (including punctuation/English), not pure Chinese char count
- Safe upper bound: `⌊duration × 3.37⌋` (实测 3.73 字/秒 × 0.9 safety factor)

## Rewriting Strategy

**When over limit (>175 for 52s video):**
- Remove detail qualifiers: "called X", "meaning Y", parenthetical notes
- Collapse parallel structures: "支持 A、B、C 和 D" → "支持 A、B、C"
- Cut repeated concepts (if already stated in title/subtitle)

**When too short (<100 chars):**
- Add specificity: "AI tool" → "Anthropic Claude Code CLI 编程助手"
- Expand installation/usage details
- Add output format / platform compatibility info
- Include version numbers or quantitative claims

## Python Validation Script

```python
python3 << 'PYEOF'
PROJECT_DIR = '/Volumes/OpenClawDrive/.hermes/workspace/{project}'
with open(f'{PROJECT_DIR}/docs/narration.txt', 'r') as f:
    text = f.read()
chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
max_chars = int(52 * 3.37)
print(f'中文字数: {chinese_chars} / 上限: {max_chars}')
if 100 <= chinese_chars <= max_chars:
    print('✅ 字数检查通过')
else:
    print('❌ 字数异常')
PYEOF
```

## Key Insight

Do not use `node -e <<'NODEEOF'` heredoc to generate or validate narration — Node.js string interpolation fails with Chinese backtick content. Use Python heredoc instead (captions.json generation also requires Python for same reason).
