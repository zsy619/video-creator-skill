# Medium.com Cloudflare Blocking — 2026-05-12

## Problem

When attempting to fetch Medium articles for video creation, all automated approaches are blocked:

| Method | Result |
|--------|--------|
| `curl` raw HTTP | Cloudflare "Performing security verification" page |
| `baoyu-fetch` generic adapter | "generic requires manual interaction. Re-run with --wait-for interaction" → gets stuck |
| `browser_navigate` | Same Cloudflare challenge |
| Google cache (`webcache.googleusercontent.com`) | BLOCKED by user |

## Behavior

Medium.com uses Cloudflare bot detection that cannot be bypassed programmatically in a headless/CI environment. Even `--wait-for interaction` mode causes `baoyu-fetch` to hang indefinitely (background process showed 0 output after 156s of running).

## Solution

**For article-to-video requests targeting Medium.com**:

1. **Inform the user immediately** that Medium blocks automated fetching
2. Ask the user to manually provide the article content (copy-paste or text)
3. Alternative: ask user to open the article in a browser, complete the Cloudflare challenge once (cookies will persist), then try `baoyu-fetch` with `--wait-for interaction` again — but warn this may still hang

## Sites Known to Block

- medium.com (Cloudflare)
- Other Cloudflare-protected sites with aggressive bot detection

## Related

- `baoyu-url-to-markdown` skill — handles URL to markdown conversion; Medium is the primary failure case
