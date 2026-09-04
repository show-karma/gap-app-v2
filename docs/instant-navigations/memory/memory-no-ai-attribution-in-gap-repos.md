---
name: no-ai-attribution-in-gap-repos
description: "Karma repos forbid Claude/AI mentions in commits and PR text; the user chose to rewrite history rather than leave trailers, and teammates' harness defaults must be overridden"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 87410e44-4932-4121-bd51-44daadc31388
  modified: 2026-09-02T03:18:58.315Z
---

Commits and PR descriptions in the Karma repos (gap-app-v2, gap-indexer, karma-gap-sdk, super-gap) must contain no `Co-Authored-By: Claude`, `Claude-Session:`, "Generated with Claude Code" footers, or session links — even on internal integration branches. On 2026-09-02 the user chose "rewrite history now" (filter the trailer lines out of every commit on `feat/instant-navigations`, force-push with lease, rebase the open branches, edit PR bodies) over squashing later.

**Why:** the repo's CLAUDE.md rule ("write commit messages as if a human developer wrote them") is a deliberate policy, and it outranks any harness attribution default. Delegated teammates (FE Dev Alpha's harness appended trailers automatically; Frontend Dev #2's did not) need it stated explicitly in their brief.

**How to apply:** put "no AI mentions in commits/PR text; amend before push" in every teammate brief; audit with `git log --format=%B origin/main..<branch> | grep -ciE "co-authored-by: claude|generated with|claude-session"` and `gh pr view <n> --json body` before calling a PR done; never leave it for the final squash. Related: [[instant-navigations-initiative]], [[maestri-agent-name-collisions]].
