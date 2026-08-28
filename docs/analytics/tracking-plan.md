# Analytics tracking plan (frontend)

The human-readable half of `utilities/analytics/events.ts`. That file is the
source of truth for names and property shapes; this one says what each event
*means*, when it fires, and which board it feeds.

A unit test (`__tests__/unit/utilities/analytics/tracking-plan.test.ts`) asserts
that every entry in `ANALYTICS_EVENT_NAMES` appears in the table below, so an
event added to the catalog without a row here fails CI.

Server-side events — the ones a browser cannot witness — live in the indexer and
are documented separately in
[`gap-indexer/docs/analytics/server-events.md`](../../../gap-indexer/docs/analytics/server-events.md).

---

## How this works

All browser events go through `track()` in `utilities/analytics/client.ts`, the
only module in the app allowed to import `mixpanel-browser`. `track()` takes a
catalog name — `track("free_string")` does not compile — and
`scripts/check-anti-patterns.sh` rejects a raw `mixpanel.track` anywhere else.

Requests go to the same-origin proxy at `/api/mp`, not to `api.mixpanel.com`,
so tracker-blocking extensions do not silently drop a large share of the data.
Analytics is enabled by the presence of `NEXT_PUBLIC_MIXPANEL_KEY`, in **any**
environment — see [Operating it](#operating-it).

### Naming rules

- Event names are `object_action`, snake_case. Properties are snake_case.
- A `_started` leg exists **only** where intent measurably precedes completion:
  multi-step or wallet-signing flows (project create, application, donation,
  scanner scan, onboarding). A single-submit form — adding a grant, completing
  or editing a milestone — gets `_completed` / `_failed` only, because a
  `_started` fired on the same click carries no drop-off signal.
- A one-shot UI action is a single event, not a triad.
- `_failed` carries `error_code`: a stable machine code (HTTP status, SDK error
  name, domain error code). Never the error message.
- Emit from the hook or service that owns the flow — a mutation's `onSuccess` /
  `onError` — not from JSX, unless the event *is* a UI click.

### Properties never carry PII

Email addresses and wallet addresses go on the user **profile**, via
`identifyUser`. `redactSensitiveProps` is the runtime backstop: any property
whose key matches `/email|wallet|address|phone|token|secret/i`, or whose string
value looks like an email or an `0x…` address, is dropped before the event
leaves the browser.

That guard shapes the catalog. `donation_completed` carries `currencies`, not
`tokens`, because `token` would be stripped silently. Array elements are
inspected individually and only the offending ones dropped, so
`project_edited.fields_changed` — which carries field *names*, one of which is
`walletAddress` — survives intact.

---

## Events

`Board` names the funnel board an event feeds (see
[Funnel boards](#funnel-boards)); `—` means it is a diagnostic or a UI-detail
event that no board depends on.

### Identity

| Event | Fires when | Properties | Board |
|---|---|---|---|
| `login_started` | `adaptedLogin` is called, before Privy's modal opens. Only when Privy is `ready`; never queued. | `entry_point` | Activation |
| `login_completed` | Privy's `useLogin({ onComplete })` fires. | `auth_method`, `is_new_user`, `was_already_authenticated` | Activation |
| `logout` | The `authenticated` true→false transition, emitted **once**, by `AnalyticsProvider`. | `reason` | — |

`was_already_authenticated` is Privy's own `wasAlreadyAuthenticated`: `login()`
was invoked while the user was already signed in, so the callback fired without
a real sign-in. It is **not** a session-restore flag — a reload into an existing
session fires no event at all.

`logout` has one emitter on purpose. `useAuth` mounts at ~100 call sites and
every instance runs the same session-ending guards, so emitting there produced
one event per mounted instance. The guards now only *record* the reason
(`utilities/analytics/auth-transitions.ts`), bound to the identity that is
leaving and to one logout attempt; the provider reports it. `reason` is one of
`user`, `wallet_disconnect`, `cross_tab`, `user_switch`, `wallet_reconnect`.

### Project

| Event | Fires when | Properties | Board |
|---|---|---|---|
| `project_create_started` | The create form is submitted, before the wallet is touched. | `entry_point` | Activation |
| `project_create_completed` | The project attestation is indexed. | `project_id`, `chain_id`, `has_grants_prefilled` | Activation |
| `project_create_failed` | The create attestation throws. | `error_code`, `chain_id` | Activation |
| `project_edited` | An edit is persisted **and actually changed something**. | `project_id`, `fields_changed` | — |
| `project_update_posted` | A project update attestation succeeds. | `project_id`, `has_deliverables`, `word_count` | Grantee health |
| `project_update_failed` | That attestation throws. | `error_code`, `project_id` | Grantee health |
| `project_endorsed` | An endorsement is attested. | `project_id`, `endorser_is_member` | — |
| `project_merged` | Two projects are merged. | `source_project_id`, `target_project_id` | — |

`fields_changed` is a real diff against the stored project, computed **before**
`updateProject` mutates it, and the event is not emitted at all when the diff is
empty. Field names only — never their values.

### Grants and milestones

| Event | Fires when | Properties | Board |
|---|---|---|---|
| `grant_added_completed` | A grant attestation is indexed. | `project_id`, `grant_id`, `community_id`, `program_id`, `milestones_count` | Grantee health |
| `grant_added_failed` | That attestation throws. | `error_code`, `project_id`, `community_id` | Grantee health |
| `grant_update_posted` | A grant update attestation succeeds. | `grant_id`, `community_id` | Grantee health |
| `milestone_created` | A milestone attestation is indexed. | `grant_id`, `project_id`, `has_due_date` | Grantee health |
| `milestone_completed` | A completion attestation succeeds. | `milestone_id`, `grant_id`, `days_vs_due_date`, `has_proof` | Grantee health |
| `milestone_completion_failed` | That attestation throws. | `error_code`, `milestone_id` | Grantee health |
| `milestone_verified` | A reviewer verifies a completion. | `milestone_id` | Grantee health |
| `milestone_edit_requested` | An edit is submitted, before signing. | `milestone_id`, `fields_changed` | — |
| `milestone_edit_completed` | The edit attestation succeeds. | `milestone_id`, `fields_changed` | — |
| `milestone_edit_failed` | The edit attestation throws. | `error_code`, `milestone_id` | — |
| `milestone_delete_requested` | Deletion is confirmed, before signing. | `milestone_id` | — |
| `milestone_delete_completed` | The revocation succeeds. | `milestone_id` | — |
| `milestone_delete_failed` | The revocation throws. | `error_code`, `milestone_id` | — |
| `milestone_cancel_completed` | A milestone is cancelled. | `milestone_id` | — |
| `milestone_uncancel_completed` | A cancellation is undone. | `milestone_id` | — |

`days_vs_due_date` is negative when the milestone was completed early, and null
when it had no due date.

`milestone_verified` carries no `verifier_role`: the verification hook is shared
by the admin review screen and the reviewer inbox, and neither passes a role
down. The verifier's role is on their Mixpanel profile.

### Funding platform

| Event | Fires when | Properties | Board |
|---|---|---|---|
| `application_started` | The apply form mounts. | `program_id`, `community_id`, `is_authenticated` | Program conversion |
| `application_submitted` | The application POST succeeds. | `program_id`, `community_id`, `time_to_submit_s` | Program conversion |
| `application_submit_failed` | That POST throws. | `error_code`, `program_id` | Program conversion |
| `post_approval_submitted` | Post-approval details are accepted. | `application_id`, `program_id` | Program conversion |
| `post_approval_submit_failed` | That submission throws. | `error_code`, `application_id`, `program_id` | Program conversion |
| `application_status_changed` | An admin or reviewer writes a new status. | `application_id`, `to` | Program conversion |
| `reviewer_assigned` | Reviewers are assigned to an application. | `application_id`, `reviewer_type`, `reviewer_count` | — |
| `comment_posted` | A comment POST succeeds, on any of the four comment surfaces. | `target_type`, `is_public`, `is_reply` | — |

`application_started` carries `is_authenticated` rather than the originally
planned `has_project`: the apply page cannot know whether the visitor owns a
Karma project without an extra request made purely for analytics, and an
unauthenticated visitor never has one.

`time_to_submit_s` is measured within one page session and is null when the form
was not started in that session (a reload, a resumed draft).

`application_status_changed` carries no `from` and no `actor_role`. The status
write goes through one service call shared by four screens, none of which hand
it the previous status; the actor's role is on their profile; and the transition
is reconstructable from the application's own status history.

There is **no** `application_step_completed`. The apply form is single-page, so
there is no per-step drop-off to measure.

### Donations

| Event | Fires when | Properties | Board |
|---|---|---|---|
| `donation_started` | Checkout is confirmed, or an onramp session opens. | `project_count`, `entry_point`, `used_onramp` | Donation conversion |
| `donation_completed` | Every payment in the cart has confirmed. | `project_count`, `currencies`, `chain_ids`, `used_onramp` | Donation conversion |
| `donation_failed` | A payment reverts, is rejected, or the onramp fails. | `error_code`, `project_count`, `used_onramp` | Donation conversion |

These carry the checkout's own shape rather than a `community_id` or
`total_usd`. The cart is not community-scoped and the browser holds no USD
conversion, so both would have to be invented. The **value** dimension comes
from the server instead — see `donation_recorded` in the server catalog.

### Discovery and tools

| Event | Fires when | Properties | Board |
|---|---|---|---|
| `search_performed` | A site search returns, or is submitted. | `query_length`, `results_count`, `surface` | — |
| `funding_map_viewed` | The funding map list renders results. | `has_filters`, `results_count` | — |
| `funding_map_filter_applied` | A filter control changes. | `filter_type`, `value` | — |
| `funding_map_filters_cleared` | Filters are reset. | — | — |
| `funding_map_searched` | The map search is submitted. | `query_length` | — |
| `funding_map_search_cleared` | The map search is cleared. | — | — |
| `funding_map_quick_category_clicked` | A quick-category chip is clicked. | `category` | — |
| `funding_map_page_changed` | Pagination moves. | `page` | — |
| `funding_map_show_all_clicked` | "Show all" is clicked. | — | — |
| `funding_map_card_clicked` | A program card is opened. | `program_id`, `position` | — |
| `funding_map_details_opened` | The program details dialog opens. | `program_id` | — |
| `funding_map_details_closed` | That dialog closes. | `program_id`, `open_duration_s` | — |
| `funding_map_apply_clicked` | An apply CTA in the dialog is clicked. | `program_id`, `apply_target` | — |
| `funding_map_claim_program_clicked` | "Claim this program" is clicked. | `program_id` | — |
| `funding_map_bug_bounty_clicked` | The bug-bounty link is clicked. | `program_id` | — |
| `funding_map_social_link_clicked` | A program social link is clicked. | `program_id`, `network` | — |
| `funding_map_submit_program_clicked` | "Submit a program" is clicked. | — | — |
| `funding_map_create_profile_clicked` | "Create a profile" is clicked. | — | — |
| `funding_map_agent_tab_clicked` | An agent-card tab is selected. | `tab` | — |
| `funding_map_agent_prompt_copied` | The agent prompt copy is attempted. | `program_id`, `copied` | — |
| `funding_map_empty_results` | The map renders zero results. | `has_filters`, `query_length` | — |
| `funding_map_load_error` | The map's data request fails. | `error_code` | — |
| `scanner_scan_submitted` | A scan is requested. | `entry_point` | — |
| `scanner_scan_completed` | The scan returns a scorecard. | `scan_id`, `grade`, `total_score` | — |
| `scanner_scan_failed` | The scan request throws. | `error_code` | — |
| `scanner_scorecard_viewed` | A scorecard is rendered. | `variant`, `scan_id`, `grade`, `total_score`, `viewer_is_owner`, `viewer_is_authenticated` | — |
| `report_shared` | A share token or link is created. | `report_id`, `share_type` | — |
| `report_exported` | A portfolio report export succeeds. | `report_id`, `format` | — |
| `ask_karma_message_sent` | A message is sent to Ask Karma. | `persona`, `message_index` | — |

`funding_map_agent_prompt_copied.copied` is false when the clipboard API
rejected. The copy affordance is the whole point of the agent card, so a silent
failure has to be visible in the report rather than looking like a success.

### Onboarding and acquisition

| Event | Fires when | Properties | Board |
|---|---|---|---|
| `onboarding_started` | The onboarding modal opens for the first time. | `entry_point` | Activation |
| `onboarding_step_viewed` | An onboarding step is shown. | `step` | Activation |
| `onboarding_dismissed` | Onboarding is closed before finishing. | `step` | Activation |
| `ai_referral_landing` | A first visit whose referrer is an AI surface. | `ai_source`, `ai_source_medium`, `ai_landing_path` | — |

The AI first-touch properties also ride along on **every** subsequent event in
the session, merged by `track()` — see `utilities/aiReferrer.ts`.

---

## Page views

`AnalyticsProvider` sends one `page_view` per navigation, with:

| Property | Meaning |
|---|---|
| `route_pattern` | The templated route: `/project/:projectId/updates`. Never the concrete path. |
| `page_group` | The first path segment — `project`, `community`, `funding-map` — a cheap route family. |
| `community_id` | The community UID, on community routes. Null elsewhere. |

The raw pathname is deliberately **not** sent. Paths carry identifiers — a
wallet address on a profile route, a bearer share token on
`/nonprofit-research/shared/<token>` — and an analytics vendor is the last place
a bearer token should land. `utilities/analytics/route-pattern.ts` holds an
explicit template for every page route under `app/` that contains a dynamic
segment, plus the static routes that share a position with a dynamic sibling
(`/project/:projectId/funding/new` would otherwise report as a grant uid). A
test walks `app/` from the root and fails CI when a route has no template.

A length-and-character-class heuristic redacts anything that still looks like an
identifier, for the window between a route being added and its template landing.
It is deliberately conservative: `funding-opportunities` is 21 characters and is
a real, reportable slug.

**Ordering.** Identity is settled — `identifyUser` or `resetIdentity` — before
any page view or group write, in a single effect gated on Privy's `ready`.
Mixpanel restores the previous session's distinct id from localStorage
synchronously while Privy resolves asynchronously, so anything written in
between lands on the wrong person. For the same reason the provider writes
nothing at all while `authenticated` is true and the user id has not arrived.

**Dedupe.** A view is suppressed when the concrete pathname *and* the identity
behind it are unchanged, which absorbs React Strict Mode's development effect
replay. The key uses the concrete path, not the template, so navigating between
two projects is two views.

---

## Identity, profile and group contract

### Super properties

Attached to every event from the device. The `SuperProperties` type is closed —
no index signature — so a camelCase typo fails typecheck rather than registering
a second, silently-empty property beside the real one.

| Property | Set by | Meaning |
|---|---|---|
| `tenant` | `useWhitelabel` | The whitelabel community slug, or `karma`. |
| `is_whitelabel` | `useWhitelabel` | Whether this is a whitelabel domain. |
| `env` | build | `NEXT_PUBLIC_ENV`. |
| `app_version` | build | Read from `package.json` in `next.config.ts`. |
| `wallet_connected` | auth | Whether a wallet address is hydrated. |
| `auth_method` | auth | `email`, `google`, `wallet`, `farcaster`, `unknown`. |
| `community_slug` | community layout | The community's **canonical** slug, on community routes. |
| `community_id` | `set_group` | Registered by Mixpanel itself when the group is bound. |

`community_slug` is the readable label; `community_id` is authoritative. Both
come from the community the layout resolved, never from the URL segment —
`/community/[communityId]` accepts a uid too, so reading either off the path
would split one community into two groups and put uids into the property whose
whole purpose is to be readable.

`wallet_connected` and `auth_method` are identity-scoped: they are deliberately
**not** restored after a `reset()`, because carrying them across a user switch
would attribute the previous user's login method to the new one. Everything else
is re-registered by `resetAndRestoreContext`, so a signed-out visitor still
reports their tenant and their community.

### Profile (`people.set`)

Written only by `identifyUser`, only at identify time:

| Property | Source |
|---|---|
| `$email` | Privy email |
| `$name` | Privy name |
| `primary_wallet` | The hydrated wallet address |
| `auth_methods` | Linked account types |
| `first_seen_at` | `people.set_once` on first identify |

This is the **only** place an email or a wallet address reaches Mixpanel.

### Group (`community_id`)

`set_group("community_id", <uid>)` binds the device to a community while the
visitor is inside that community's subtree, and `set_group("community_id", [])`
plus an `unregister` clears it on the way out. Dropping only the super property
would leave the device permanently joined to the last community it visited, and
that binding is what community-level reports aggregate on.

The group **key** and the group **profile** are written from different places by
design: the browser binds the device, and the indexer writes the profile
(`name`, `slug`, `chain_id`) when a community's details attestation is indexed.
The two must agree on the key `community_id` or browser events will not join the
profiles the server writes.

---

## Funnel boards

### Activation

`login_started` → `login_completed` → `project_create_started` →
`project_create_completed`

Onboarding sits alongside it: `onboarding_started` → `onboarding_step_viewed` →
`onboarding_dismissed` measures where people leave the guided path.

### Grantee health

Not a linear funnel — a cohort health view over grantees:
`grant_added_completed` → `milestone_created` → `milestone_completed` →
`milestone_verified`, with `project_update_posted` and `grant_update_posted` as
the ongoing-activity signal and the `_failed` legs as the friction signal.

### Program conversion

`application_started` → `application_submitted` →
`application_status_changed (to = approved)`

There is no per-step drop-off: the apply form is single-page. Server-side,
`payout_disbursed` closes the loop from approval to money out.

### Donation conversion

`donation_started` → `donation_completed` for conversion rate.

**Value** comes from the server: the browser has no USD conversion and the cart
is not community-scoped, so the amount dimension is `donation_recorded` in the
indexer catalog, keyed by the donation's own uid.

---

## Operating it

### Tokens

`NEXT_PUBLIC_MIXPANEL_KEY` enables analytics in **any** environment, not just
production. This is deliberate: gating on `NODE_ENV === "production"` made the
pipeline unverifiable on staging, which is how it stayed broken. Point staging
and preview deploys at their own Mixpanel project token so the data can be
checked before release, and leave the variable unset locally to disable
analytics entirely.

`debug` logging turns on automatically outside production.

### The `/api/mp` proxy

`app/api/mp/[...path]/route.ts` forwards to `api.mixpanel.com`. It is
deliberately narrow:

- **POST only**, to the exact paths `track`, `engage` and `groups`.
- Body capped at 256 KB, rejected early on `Content-Length` and again by a
  streaming reader that cancels at the cap.
- Content type must be exactly `application/x-www-form-urlencoded` or
  `application/json` after parsing off parameters.
- The payload is decoded and **every** record's project token is compared
  against `NEXT_PUBLIC_MIXPANEL_KEY`; anything else is a 403. The proxy then
  forwards a canonical re-encoding of the validated payload, never the raw body,
  so the upstream cannot see a different document than the one that was checked.
- Client IP comes from `x-real-ip`, else the **rightmost** `x-forwarded-for`
  entry, validated with `node:net` `isIP()` before being forwarded as
  `X-REAL-IP` with `?ip=1`.

### Session replay

Explicitly off (`record_sessions_percent: 0`). Replay records the DOM, which on
this app means grant narratives, donor details and wallet addresses. Turning it
on has to be a deliberate, reviewed change rather than a default.

---

## Production reality

Assumptions this plan depends on, and how each was verified.

| Assumption | Status |
|---|---|
| The proxy allowlist matches what `mixpanel-browser` actually calls | Verified against the SDK's request paths: `track`, `engage`, `groups`. |
| `set_group` also registers `community_id` as a super property | Verified in `mixpanel-browser`; the group clear unregisters it explicitly. |
| Privy's `user.id` is the same DID the indexer sees | Verified: `PrivyClient.getIdentityFromJWT` returns `user.id`, now threaded into the request session. |
| The community layout resolves a community before `AnalyticsProvider` runs its effect | Verified: child effects run before parent effects, and the provider is mounted from the root layout. |
| `NEXT_PUBLIC_APP_VERSION` is set on preview deploys | Verified for builds that run `next build` from this repo: `next.config.ts` reads the version out of `package.json` rather than from `npm_package_version`, which is unset when the platform invokes the binary directly. A deploy that builds some other way reports `"unknown"` — the property is never absent, so a board grouping by it will show that bucket rather than dropping the rows. |
| The proxy allowlist is not missing a path the SDK needs | Verified by what the client does NOT enable: `/decide` is only called when feature flags are on (they are not), and the session-replay `/record` paths only when `record_sessions_percent` is above zero (it is `0`, explicitly). Turning either on means widening the allowlist in the same change, or the requests fail silently. |
| **Mixpanel project ID Merge mode** | **UNVERIFIED — no dashboard access.** Implemented for **Simplified** ID Merge: `resetIdentity()` on logout, `identify()` on sign-in. **Check Project Settings → Identity Merge before relying on cross-device user counts.** Under Original ID Merge the `reset()` on logout would fragment a user across devices instead of merging them, and the fix is to stop resetting and rely on `identify()` alone. |

## Review waivers

Findings accepted with a documented reason rather than a fix, each marked with a
`// REVIEW-WAIVED:` comment at the cited line.

| Where | Why |
|---|---|
| `app/api/mp/[...path]/route.ts` — rate limiting | Deferred to a separate PR; it needs Redis, which this change does not otherwise touch. The token check and the 256 KB cap bound the abuse surface meanwhile. |
| `app/api/mp/[...path]/route.ts` — `X-REAL-IP` derivation | A deliberate deviation from root `CLAUDE.md` §6 (no raw `X-Forwarded-For` parsing). A Next route handler has no `request.ip`; the header read is validated with `isIP()` and limited to `x-real-ip` or the rightmost XFF entry. |

## Known limitations

- **`entry_point` is partly route-derived.** `EntryPoint` is a closed union of
  named surfaces plus `` `route:${string}` `` for callers that cannot name
  theirs yet. Threading real surface ids through `useAuth`'s ~100 call sites is
  a separate change; keeping the union closed is what makes that change
  type-checked rather than free-form.
- **`time_to_submit_s` is page-session scoped.** A reload between opening and
  submitting an application reports null rather than a wrong duration.
- **Wallet-keyed server events do not merge automatically** with DID-keyed
  browser profiles. See the reconciliation note in the server catalog.
