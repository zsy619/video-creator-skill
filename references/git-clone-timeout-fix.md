# Git Clone Timeout Fix

## Problem
Large GitHub repositories may cause `git clone` to timeout during video project initialization:
```
Cloning into '/path/to/repo'...
fatal: early EOF
error: RPC failed; HTTP 401 curl 22 the requested URL returned error 401
```

## Solution
Use `--depth 1` for shallow clone:
```bash
git clone --depth 1 "$REPO_URL" "$PROJECT_DIR/onyx-repo"
```

## When to Use
- First clone attempt fails/timed out
- Repository contains large binary assets (logos, demo videos, etc.)
- On shallow copy sufficient (only README.md needed for article.md extraction)

## Trade-offs
- Shallow clone excludes full history
- `git log`, `git blame`, full diff unavailable
- Sufficient for video project use (only README + top-level files needed)
