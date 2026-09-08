TASK-P2-MERGE2 — status, and one correction to the merge plan's premise.

CHECK STATUS RIGHT NOW
  #2095  0 failing — FULLY GREEN (quality-gate, react-doctor, all 6 shards). head 219ecaef8
  #2096  1 failing — quality-gate, the stale baseline key.            head ddbc35093
  #2097  1 failing — quality-gate, the SAME stale baseline key.       head 3bda9eb43
         (Dev #2's split worked: 2097 went 8 failing -> 1, all 6 shards now pass.)

THE CORRECTION
You said 2095 already fixes the key so it resolves after the merge. It resolves for 2097,
but NOT for the merged branch. I checked the actual strings rather than assuming:

  2095 changes quality-baseline.json to the key
    "app/t/[tenant]/community/[communityId]/manage/funding-platform/page.tsx"

  but 2096 moves that file, and on ddbc35093 its real path is
    "app/t/[tenant]/(chrome)/community/[communityId]/manage/funding-platform/page.tsx"

So after merging 2095 then 2096, the baseline key and the file path still disagree, and
quality-gate fails again with the same message:
    ... is over the limit (717 lines / 30185 bytes) and is not in the baseline

This is a LOGICAL conflict git will not flag as a textual one: 2095 renames the key, 2096
renames the file, in different files. It is the same entity, and neither PR can see the
other. No single key satisfies both PRs standalone either — the (chrome) key would make 2095
itself red, because 2095 is based before P2-1.

WHAT I PROPOSE, and I want a yes before I do it
Treat the key as part of resolving the merge, exactly like the TenantFooter copyrightYear
conflict you already ruled on: after merging 2095 and 2096, update that one baseline key to
the (chrome) path in the merge commit, with the reasoning in the message. That is a rename
following a rename, not a threshold change and not a new entry — the file, its 717 lines and
its 30185 bytes are all unchanged, and the count stays 66/66.

I am NOT doing that unilaterally, since you told me not to touch the baseline. Alternatives
if you would rather it not be me:
  - Dev #2 lands the (chrome) key in 2096 instead of 2095 (2096 is the PR that moves the
    file, so the key belongs with it and it goes green on its own).
  - Or accept one red quality-gate on the integration branch and fix it in the next PR.
I recommend the second bullet of the first option — moving the key into 2096 — because it
makes each PR internally consistent and leaves the merge with nothing to decide.

READY TO GO otherwise. On your word I will merge 2095, 2096, 2097 in that order, keep
copyrightYear={COPYRIGHT_YEAR} on TenantFooter, take 2097's side on the generateStaticParams
conflict (karma only), push once, then re-run readiness and report the failing-route count
and top causes.
