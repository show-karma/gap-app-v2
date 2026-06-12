# Privy auth on Vercel preview deployments

Runbook for the recurring "login is impossible on a PR preview" failure
(show-karma/gap-app-v2#1193, prior recurrence #1176).

## Failure signature

On a Vercel preview deployment, Sign In opens but login never completes:

- The Privy email field renders inline, but the **subsequent OTP / wallet iframe
  step fails** (per #1176 — the SDK initializes and the bridge reaches `ready=true`
  before the block manifests, so this is not a "SDK failed to load" stall).
- The browser blocks the auth iframe with a **`frame-ancestors` CSP violation** and
  the `auth.privy.io` subresource returns **403** (or shows as `chrome-error://`
  in DevTools).
- No app-level error is shown — the failure is otherwise silent.

The blocking CSP is served **by Privy, not by gap-app-v2**. `auth.privy.io` emits a
`Content-Security-Policy: frame-ancestors …` header generated from the **Allowed
Origins** list configured in the Privy dashboard for the app identified by
`NEXT_PUBLIC_PRIVY_APP_ID`. Our own CSP is not the problem: `next.config.ts` already
grants `frame-src` to `https://auth.privy.io`, `https://*.privy.io`, and
`https://privy.karmahq.xyz`, and our `frame-ancestors 'self'` governs who may frame
**us**, not whether we may frame Privy.

## Root cause

The app passes a single, environment-unscoped Privy app ID
(`utilities/enviromentVars.ts` `PRIVY_APP_ID` → `PrivyProvider appId`), so
production, staging, localhost, and **every** Vercel preview authenticate against the
same Privy app and therefore the same finite, manually-curated origin allowlist.

Vercel preview deployments mint unbounded unique hostnames
(`gap-app-v2-git-<branch>-karma-devs.vercel.app`), so each new PR preview is, by
construction, **absent** from the allowlist and gets blocked.

#1176 was an exact prior occurrence on a different preview URL
(`gap-app-v2-git-fix-pin-axios-supply-chain-attack-karma-devs.vercel.app`). It was
closed by **manually adding that one URL** to the Privy dashboard — which is precisely
why it recurred as #1193 on the next PR's preview. Per-URL fixes do not hold; the
allowlist must be mapped onto a **stable, registrable origin**.

## The durable fix (operational — Privy + Vercel dashboards)

This collapses the unbounded preview-hostname space into one stable, Karma-owned
wildcard origin and isolates preview auth from production:

1. **Create a dedicated Privy development app** (Privy's own environment-separation
   guidance). Preview origin policy then never touches the production app's allowlist.
2. **Scope `NEXT_PUBLIC_PRIVY_APP_ID` per Vercel environment**: Production → prod
   Privy app; Preview/Development → dev Privy app.
3. **Configure a Vercel Preview Deployment Suffix** on a Karma-owned domain
   (e.g. `preview.karmahq.xyz`) so every preview is served from
   `<deployment>.preview.karmahq.xyz`. (Requires a Pro/Enterprise plan and a DNS
   record on `karmahq.xyz`.)
4. **Register `https://*.preview.karmahq.xyz`** (and `http://localhost:3000` for local
   dev) once in the **dev** Privy app's Allowed Origins. From then on every new PR
   preview is allowlisted by construction — zero per-PR dashboard work.
5. **Scope a dev `PRIVY_APP_ID` / `PRIVY_APP_SECRET` on staging gap-indexer** so JWTs
   minted by the dev Privy app verify correctly (see super-gap
   `docs/architecture/authentication.md`). Otherwise preview API calls return **401**.

### Why `*.vercel.app` must never go on the prod app

`https://*.preview.karmahq.xyz` is safe because **only Karma's Vercel project can
serve that subdomain**. `*.vercel.app` is different: any third-party Vercel tenant
could frame the auth iframe, which is a **phishing surface**. If the Preview
Deployment Suffix feature is unavailable on the current plan, the documented fallback
is `https://*.vercel.app` **on the DEV app only** — acceptable because that app holds
zero production users — and **never** on the prod app.

### Rejected alternative

A per-deployment build hook calling Privy's API to add each preview URL (floated in
#1176) was considered and rejected: it depends on a non-guaranteed API surface, grows
the allowlist without bound, races the first page load, and adds a write-scoped Privy
secret to CI.

## localStorage note (`privy:token` is app-unscoped)

`components/Utilities/PrivyProviderWrapper.tsx` reads
`localStorage.getItem("privy:token")` with **no app-ID qualifier**. Switching preview
deployments to a different app ID is still session-safe, but the real mechanism is
**origin isolation**: production (`karmahq.xyz`) and previews
(`*.preview.karmahq.xyz` / `*.vercel.app`) are distinct web origins, so their
localStorage never crosses.

On any **single origin** repointed between app IDs (e.g. `localhost` switched from the
prod to the dev app), a stale unscoped `privy:token` will truthy-trigger the eager SDK
load path — harmless (Privy rejects the stale token and the bridge settles
unauthenticated), but documented here so the eager-load path stays auditable.

## In-repo guardrail: `PrivyOriginDiagnostic`

`components/Utilities/PrivyOriginDiagnostic.tsx` is a **preview-only** advisory
(`envVars.VERCEL_ENV === "preview"`) that makes the silent failure visible until a
deployment is allowlisted. It arms only after a real login attempt —
`PrivyBridgeProvider` wraps the bridge `login()` so **every** sign-in path in the app
sets the `usePrivyLoginAttempted()` flag — then trips **only** on an
explicit, parent-observable `auth.privy.io` HTTP 403
(`PerformanceResourceTiming.responseStatus`, Chromium 109+) — the origin rejection — and
renders a dismissible `role="alert"` banner linking back to this runbook. It does **not**
trip on a bare timeout or on `responseStatus === 0`: a slow-but-working emailed-OTP flow
routinely outlasts any reasonable timeout, and `0` is the normal cross-origin value for a
successful subresource without `Timing-Allow-Origin`, so either would fire spuriously
during ordinary preview QA. The diagnostic is fail-safe toward silence: if Privy changes
its iframe semantics or the browser lacks `responseStatus`, it simply never fires rather
than risk a false positive.

`frame-ancestors` violations are **not** observable from the embedding page —
`SecurityPolicyViolationEvent` fires inside the blocked iframe's own browsing context —
which is why detection relies on the parent-observable 403 subresource rather than a CSP
listener.

## Re-validating the failure signature (spike)

If Privy changes init/iframe behavior, re-run the spike on a deliberately
non-allowlisted origin (a fresh preview, or a local hosts-alias origin absent from the
allowlist): load the app, click Sign In, attempt email login, and record (a) whether
`usePrivyBridge().ready` stalls at `false` or flips `true`, and (b) whether the
`auth.privy.io` 403 is visible via `PerformanceObserver` resource entries. Update the
diagnostic's trigger to whatever the spike confirms.

### Spike result (2026-06-11): the 403 IS parent-observable

Run against the current Privy app from a non-allowlisted origin
(`http://127.0.0.1:8923`, plus `curl` with spoofed `Origin` headers):

- `OPTIONS /api/v1/passwordless/init` (CORS preflight) → **204**, with
  `access-control-allow-origin` **echoing the disallowed origin** and
  `access-control-allow-credentials: true`. Privy's CORS layer reflects any origin;
  origin enforcement happens at the application layer, not in CORS.
- `POST /api/v1/siwe/init` and `POST /api/v1/passwordless/init` from a disallowed
  origin → **403** `{"error":"Origin not allowed","code":"invalid_origin"}`, again
  with the disallowed origin echoed in `access-control-allow-origin`. The same calls
  from an allowlisted origin (`https://gap.karmahq.xyz`) → **200**.
- Because the 403 response **passes the CORS check**, headless Chromium (145) exposes
  it through Resource Timing: `performance.getEntriesByType("resource")` for the
  `auth.privy.io` entry reports `responseStatus: 403`, `initiatorType: "fetch"`.
  This is exactly the signal `PrivyOriginDiagnostic` trips on.
- The iframe document (`GET /apps/<app-id>`) is a no-cors navigation: it returns
  **200** with the `frame-ancestors` CSP and its resource entry reports
  `responseStatus: 0` — which is why the diagnostic keys on the API 403, not the
  iframe load.

## Verification checklist

- [ ] Dedicated dev Privy app created.
- [ ] `NEXT_PUBLIC_PRIVY_APP_ID` scoped per Vercel environment (prod vs preview/dev).
- [ ] Vercel Preview Deployment Suffix on `preview.karmahq.xyz` (or documented
      `*.vercel.app`-on-dev-app fallback).
- [ ] `https://*.preview.karmahq.xyz` + `http://localhost:3000` in the dev app's
      Allowed Origins.
- [ ] Staging gap-indexer verifies JWTs against the dev app's `PRIVY_APP_ID/SECRET`.
- [ ] On the next PR preview: Sign In, complete email + OTP — no `frame-ancestors`
      violation, a 200 from the `auth.privy.io` iframe, and no diagnostic banner.
