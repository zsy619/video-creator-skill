# README Location Variants

> **最后更新**：2026-05-14

GitHub repositories don't always place README.md at the repo root. Monorepos, documentation-centric repos, and agent-focused projects commonly store it in subdirectories. Always probe multiple locations when the expected path doesn't exist.

## Common Patterns

| Pattern | Example | Finding Session |
|---------|---------|----------------|
| `README.md` at root | Most repos | — |
| README in `docs/` subdir | `nvim-treesitter` → `docs/README.md` | 2026-05-14 |
| `AGENTS.md` as real README | `ForgedCode` → `AGENTS.md` has full project overview, `README.md` is minimal | 2026-05-14 |
| Both root + subdir README | Some repos have both; subdir is often more detailed | — |

## Diagnostic Protocol

```bash
# Try root first (standard)
cat "$PROJECT_DIR/$REPO_DIR/README.md"

# If missing or minimal, probe subdirs
ls "$PROJECT_DIR/$REPO_DIR/*.md"           # all markdown at root
ls "$PROJECT_DIR/$REPO_DIR/docs/*.md"      # docs subdir
ls "$PROJECT_DIR/$REPO_DIR/" | grep -i readme  # case-insensitive

# Check for AGENTS.md (agent-focused repos)
cat "$PROJECT_DIR/$REPO_DIR/AGENTS.md"

# For monorepos: check root level markdown files
find "$PROJECT_DIR/$REPO_DIR" -maxdepth 2 -name "*.md" -not -path "*/node_modules/*"
```

## Decision Tree

```
README.md exists at root?
├── YES → Check if content is substantial (>500 chars)
│         ├── Substantial → Use it
│         └── Minimal/redirect → Check docs/README.md AND AGENTS.md
│
└── NO  → Check docs/README.md
          ├── YES → Use docs/README.md
          └── NO  → Check AGENTS.md
                    ├── YES → Use AGENTS.md (agent-focused repo)
                    └── NO  → Fall back to git clone + ls for structure
```

## ForgedCode Specifically

`ForgedCode/README.md` (root) was a one-line redirect:
```
# Agent Guidelines (redirects to AGENTS.md)
```

`ForgedCode/AGENTS.md` had the full project overview including:
- Agent Guidelines
- Error Management patterns
- Service Implementation Guidelines
- Clean Architecture principles

**Rule**: When root README is <200 chars or clearly a redirect, immediately check `AGENTS.md`.

## nvim-treesitter Specifically

`nvim-treesitter/README.md` at root was present but the real installation/usage guide was in `docs/README.md`. Both existed — root had project branding, `docs/` had the technical content.

**Rule**: Even when root README exists, if the repo has a `docs/` subdir, check `docs/README.md` for more detailed content.
