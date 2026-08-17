# Runbook — karmahq.xyz → karmahq.org

> **Provenance.** `docs/DOMAIN_MIGRATION.md` and `CONTEXT.md` linked to this file and to a
> companion `domain-migration-deferred-work.md` from the day the migration landed, but neither
> was ever committed to any branch of any repo in this tree — the links were dead on arrival,
> and the R1–R15 risk register they advertised does not exist anywhere recoverable.
>
> This file replaces both. It is **not** a reconstruction of the lost drafts: every line below
> was re-derived on **2026-08-17** by querying production directly. Anything not verifiable that
> way is marked `UNVERIFIED`. The companion deferred-work link has been removed rather than
> pointed at a second file that would drift from this one.

Cutover shipped in gap-app-v2 `v1.8.28`; follow-ups in `#2037`. Indexer half shipped in
`production-1.48.0`.

---

## 1. Verified live state (2026-08-17)

Re-run the commands, don't trust the table.

| Host | Observed | Command |
|---|---|---|
| `www.karmahq.org` | **200** — canonical | `curl -sSI https://www.karmahq.org/` |
| `karmahq.org` | 308 → `www.karmahq.org` | `curl -sSI https://karmahq.org/` |
| `www.karmahq.xyz` | 308 → `.org`, path + query preserved | `curl -sSI 'https://www.karmahq.xyz/projects?utm_source=x'` |
| `gap.karmahq.xyz` | 308 → `.org` | `curl -sSI https://gap.karmahq.xyz/` |
| `app.karmahq.xyz` | 301 → `.org` | `curl -sSI https://app.karmahq.xyz/` |
| `app.karmahq.org` | 200 | `curl -sSI https://app.karmahq.org/` |
| `staging.karmahq.org` | 200, `robots.txt` = `Disallow: /` | `curl -sS https://staging.karmahq.org/robots.txt` |
| `api.karmahq.org` | 200 on `/communities`, `/health` | `curl -sS https://api.karmahq.org/health` |
| `stagapi.karmahq.org` | 200 on `/communities`, `/health` | `curl -sS https://stagapi.karmahq.org/health` |
| `karmahq.xyz` (apex) | ⚠️ **301 → `https://www.karmahq.xyz//`** — see §2 | `curl -sSI https://karmahq.xyz/` |

`api.karmahq.org` and `gapapi.karmahq.xyz` return byte-identical bodies (`122834b` on
`/communities`); same for `stagapi` / `gapstagapi` (`185278b`). The `.xyz` API hosts dual-serve
and must keep doing so — see §5.

SEO surface on `www.karmahq.org`: `robots.txt` 200, `sitemap.xml` 200 (5 sitemap docs / 3946
leaves), `<link rel=canonical>` and `og:url` both `https://www.karmahq.org`, GSC verification
file `googleb231020e03517669.html` 200. GA4 `G-CQ9NK20BLG` and `/_vercel/insights/script.js`
both load.

---

## 2. Open item — the `.xyz` apex is not on Vercel

`karmahq.xyz` A-records point at CloudFront (`18.67.162.28`), not Vercel, even though the domain
**is** attached to Vercel project `prj_yM6jkRWtlc8PbzV9tRA0PFG2NATX`. An S3 bucket behind that
distribution answers the apex and 301s to `https://www.karmahq.xyz//` — note the double slash.
The request never reaches `proxy.ts`, so the `karmahq.xyz` member of `ALIAS_HOSTS` has still
never executed in production.

Net effect: the apex takes **three hops** to reach `https://www.karmahq.org/`, through a
malformed intermediate URL.

**Fix:** repoint the `karmahq.xyz` apex A/ALIAS record at Vercel. The zone is Route 53
(`ns-272.awsdns-34.com`). No Vercel-side change is needed — the domain is already attached, so
`proxy.ts` picks it up the moment DNS moves, and the `ALIAS_HOSTS` entry starts doing its job.

Do this **before** the Search Console change of address (§4): that tool wants the old
site's homepage on a clean permanent redirect to the new one.

Verify after: `curl -sSL -o /dev/null -w '%{num_redirects} %{url_effective}\n' https://karmahq.xyz/`
should print `1 https://www.karmahq.org/`.

---

## 3. Open item — email

`karmahq.org` has **zero TXT records** of any kind. Confirm before doing anything else:

```bash
curl -sS -H 'accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=karmahq.org&type=TXT'
```

An empty `Answer` means no SPF, no DMARC, and no DKIM selector on the domain.

Role addresses in this repo (`info@`, `support@`, `hello@`, `engineering@`) have been flipped to
`@karmahq.org` in code. **That code must not reach production until these records exist**, or
outbound mail from `.org` degrades silently — no error, no bounce visible from this tree.

Required before deploy:

1. SPF `TXT @` authorising the sending provider.
2. DKIM selector record(s) from the provider, and the signing domain switched to `karmahq.org`.
3. DMARC `TXT _dmarc` — start at `p=none` with `rua=` reporting, tighten later.
4. Mailboxes/aliases for `info@`, `support@`, `hello@`, `engineering@` actually created on
   `karmahq.org`, and `@karmahq.xyz` kept forwarding indefinitely (§5).

**Not flipped, deliberately:** individual human mailboxes (`arthur@`, `bruno@`, `amaury@`,
`mahesh@` where it is a real recipient) and every email fixture in the test suites. Those depend
on per-user provisioning, not just domain records.

---

## 4. Open item — analytics and search consoles

None of this is verifiable from the repo; all of it is dashboard work.

**Google Analytics** — the same GA4 property (`G-CQ9NK20BLG`) already fires on `.org`, so
history is continuous and no new property is needed.

- Data stream → website URL still reads `karmahq.xyz`; set it to `https://www.karmahq.org`.
- Admin → Data Streams → *Configure your domains*: list **both** `karmahq.org` and
  `karmahq.xyz`, and check the unwanted-referrals list covers both.
- Audit every hostname-filtered object — explorations, audiences, segments, key events, content
  groupings, and any Looker Studio dashboard carrying `hostname contains karmahq.xyz`. These
  went to zero on cutover day and nothing reports it. Change them to match
  `karmahq\.(org|xyz)`.
- Add a GA4 annotation on the cutover date so the step change is explained in-report.

**Google Search Console**

- No domain property exists for `karmahq.org` (§3 shows the zone has no TXT at all). Create one
  by DNS TXT — it covers `www`, `app`, `staging`, and `api` in a single property. The URL-prefix
  property `https://www.karmahq.org/` will verify immediately, since
  `googleb231020e03517669.html` already serves 200 there.
- Run **Change of Address** from `karmahq.xyz` to `karmahq.org`. Do §2 first.
- Submit `sitemap.xml` under the new property. The four child sitemaps already emit `.org` locs.
- **Never delete the `karmahq.xyz` property.** It backs the change-of-address report, and the
  domain itself is permanent (§5).
- Bing Webmaster Tools has an equivalent Site Move tool. `UNVERIFIED` whether it was run.

**Vercel**

- Confirm the project's Production Domain is `www.karmahq.org` — Web Analytics attributes
  against it. Not readable through the API surface available here: `UNVERIFIED`.
- `staging.karmahq.org` and `testapp.karmahq.org` both resolve and serve, but neither appears in
  the `gap-app-v2` project's domain list. Confirm which project owns them.

---

## 5. Permanent constraints — do not "clean these up"

- **`karmahq.xyz` must be renewed forever.** Immutable on-chain EAS attestation payloads embed
  `karmahq.xyz` URLs, and the indexer re-derives those payloads from chain on every re-index.
  `ALIAS_HOSTS` is the only thing keeping those URLs resolvable. Any ticket proposing removal of
  `karmahq.xyz` / `www.karmahq.xyz` from `LEGACY_ROOT_DOMAINS` or `ALIAS_HOSTS` is wrong by
  construction.
- **`gapapi` / `gapstagapi.karmahq.xyz` stay served.** Moving the API origin rotates the MCP
  OAuth audience, which is checked by scalar exact-string equality — every live MCP access token
  dies instantly. The `.org` API hosts were *added* alongside, never substituted.
- **`gov` / `govstag`** — separate repository, separate schedule.
- **`docs.gap.karmahq.xyz`** — GitBook, externally hosted.
- **`privy.karmahq.xyz`** — Privy custom auth domain. `privy.karmahq.org` was *added* to the CSP
  alongside it, never substituted. (It is currently NXDOMAIN, which is fine — a CSP entry for a
  host that does not resolve is inert. A CSP *violation*, by contrast, blanks the login iframe
  with no catchable JS error.)
- **Security negative-test fixtures** (`fakekarmahq.xyz`, `karmahq.xyz.evil.com`) prove the
  anchoring of the origin regexes. They were duplicated for `.org`, never replaced. Replacing
  them preserves the assertion text while destroying the coverage.

---

## 6. Monitoring

`.github/workflows/indexability-monitor.yml` runs Wednesdays 12:00 UTC against production.

Its `Run indexability verification` step carries `continue-on-error: true` **by design** — that
lets the summary and artifact-upload steps run on failure. The final `Fail job if verification
failed` step re-reads `steps.verify.outcome` and exits 1, so the job does fail loudly. Do not
"fix" the `continue-on-error` line; removing it skips the report artifact on exactly the runs
where you need it.

Manual run:

```bash
node scripts/verify-indexability.mjs --output artifacts/indexability-report.json \
  --min-leaf-count 3800 --timeout-ms 20000
```

**Current status (2026-08-17): red, for reasons unrelated to the TLD flip.** All 16
domain-topology checks pass — `apex-alias`, `gap-alias`, both project canonicals, the roadmap
redirect, the impact noindex, `invalid-slug-gone`, `indexer-decision`. The 3 failures are
`banned-slug:test`, `banned-slug:delete_test`, and `banned-slug:qa-bug-sweep-project-1752`:
junk projects that still return 200 with no `robots` meta tag at
`/project/{test,delete_test,qa-bug-sweep-project-1752}`. That is the pre-existing content-quality
problem, tracked separately from this migration.
