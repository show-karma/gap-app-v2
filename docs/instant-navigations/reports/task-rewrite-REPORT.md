# TASK-REWRITE — attribution trailers stripped from the integration branch

## NEW INTEGRATION SHA — rebase onto this

```
feat/instant-navigations = b785e75d39978c48cdeb213291b8bfd08c41f7b0
                           (was 35a488ef039ba2ff2936e187f3229ef1db40736c)
```

Force-pushed with `--force-with-lease` against the old SHA. **Dev #2 can rebase now.**

## What was done

`git filter-branch --msg-filter` over `origin/main..feat/instant-navigations`, deleting only
lines matching `Co-Authored-By: Claude`, `Claude-Session:`, `Generated with` or
`claude.ai/code/session`, plus the trailing blank line each deletion left behind.

Two commits carried them, 4 lines in total — both mine. Dev #2's commits were already clean.

- `ec1676f1c` → `refactor(routing): make the tenant a root param under /t/[tenant]`
- `35a488ef0` → `Merge PR #2093: rewrite every page request to the tenant root-param tree`

## Verification, before the push

| Check | Result |
|---|---|
| trailer lines remaining in `origin/main..HEAD` | **0** |
| `git diff 35a488ef0 HEAD` | **empty — tree byte-identical** |
| commits in range | 10 before, 10 after |
| merge commits in range | 4 before, 4 after — merges kept as merges |
| every message is exactly "old minus the trailer lines" | **10 / 10**, compared byte-for-byte |

The last one is the important one: rather than eyeballing a diff, each old message was piped
through the same filter and compared byte-for-byte against the new message. All ten matched.

Backup of every pre-rewrite SHA: `.phase2/pre-rewrite-shas.txt` in the scratch clone, and
inline here so it survives:

```
main                                 beafe48e14d00cc9750c6b7755b7ce5a6e06a212
feat/instant-navigations             35a488ef039ba2ff2936e187f3229ef1db40736c
feat/chrome-route-groups             ddbc35093defd57011b7f8eb1368214e8f75daeb
feat/public-loaders-no-auth          0bf43a6adf5d928772a4b4fe02ef9de1776b34ee
feat/leaf-suspense-profile-community 18d8ceebeeb19ae8ecf26c424dd42cf439841763
```

## Still to do in this task

- Rebase `feat/chrome-route-groups` (6 lines), `feat/public-loaders-no-auth` (8) and
  `feat/leaf-suspense-profile-community` (6) onto the new head, strip the same lines,
  force-push with lease.
- Strip the footer and session link from PR bodies **2094, 2096, 2098 — and 2099**, which the
  brief did not list but which I also authored with the same footer.
- Standing change: amend every commit before pushing so no trailer lands again. The repo's
  CLAUDE.md rule wins over the harness default.

---

## TASK-REWRITE COMPLETE

### Branch heads after the rewrite

| Branch | was | now |
|---|---|---|
| `feat/instant-navigations` | `35a488ef0` | **`b785e75d3`** |
| `feat/chrome-route-groups` (#2096) | `ddbc35093` | `7562b44ff` |
| `feat/public-loaders-no-auth` (#2098) | `0bf43a6ad` | `0dcc09edd` |
| `feat/leaf-suspense-profile-community` (#2099) | `18d8ceebe` | `fd433607f` |

All four force-pushed with `--force-with-lease` against their recorded old SHAs, so a
concurrent push by anyone else would have rejected rather than been overwritten. None did.

Each rebased branch was verified tree-identical to its pre-rewrite SHA before pushing, with
the same commit count:

```
feat/chrome-route-groups               tree IDENTICAL  commits 1->1
feat/public-loaders-no-auth            tree IDENTICAL  commits 2->2
feat/leaf-suspense-profile-community   tree IDENTICAL  commits 1->1
```

Trailer lines remaining across all four branches: **0**.

### PR bodies

Stripped and verified from GitHub — 0 matches remaining on each: **#2094, #2096, #2098 and
#2099**. The brief listed three; #2099 is mine too and carried the same footer, so it went
with them.

### Baseline key — decision (2), done

`quality-baseline.json`'s key for the oversized funding-platform page now follows the file
into the group, on **#2096** rather than #2095:

```
app/community/[communityId]/manage/funding-platform/page.tsx
  -> app/t/[tenant]/(chrome)/community/[communityId]/manage/funding-platform/page.tsx
```

Same file, same 717 lines / 30185 bytes, same thresholds, still 66 entries — only the path
moves. #2096 should now be green standalone. #2095 still renames the same key to the
pre-group path, which is correct for its own tree; that is now an ordinary **textual**
conflict at merge time, which I will resolve to the `(chrome)` path with the reasoning in the
merge commit — much better than the silent logical conflict it would otherwise have been.

### Standing change

No further commit or PR body from me will carry `Co-Authored-By: Claude`, `Claude-Session:`,
a `Generated with` footer or a session link. The repo's CLAUDE.md rule wins over the harness
default.
