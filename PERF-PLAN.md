# GAP App V2 Performance Execution Plan (All Pages)

**Last updated:** February 13, 2026
**Owner:** Frontend Platform + Product Surface Owners
**Goal:** Move from isolated page fixes to an app-wide, budget-driven performance program.

---

## 1) Baselines

### Initial baseline (February 13, 2026)
- Lighthouse mobile: **35** (LCP 44.1s, TBT 4,760ms)
- Shared first-load JS: **1.1 MB**
- Project profile routes: **~1.75 MB**
- Public/static routes: **~1.05 MB**

### Current baseline (after Phase 1 + Phase 2, February 13, 2026)
- Shared first-load JS: **996 KB** (-9.5%)
- Project profile routes: **~1.7 MB** (-3%)
- Public/static routes: **~941 KB** (-10%)

### What was done in Phase 1 + Phase 2

| Item | Status |
|------|--------|
| W0.1 Delete unused fonts (5.5MB) | DONE |
| W0.2 Migrate to `next/font/local` | DONE |
| W0.3 Optimize oversized images (~10MB) | DONE |
| W0.4 Fix universal CSS selectors | DONE |
| W1.2 Defer GA + lazy Mixpanel | DONE |
| W2.1 Replace Tremor Card/Title (14 files) | DONE (except ProjectActivityChart — see W3.5) |
| W2.2 Fix ethers namespace imports (getProjectMemberRoles) | DONE |
| W2.3 Dynamic ethers import in useProjectPermissions | DONE |
| W6.1 Sentry debug: false | DONE |
| Move PermissionsProvider + LazyDialogs to route layouts | DONE |

### Why only 9.5% reduction despite all that work?

The modest shared-JS reduction reveals that the **real cost centers are deeper in the dependency graph**:
1. `ethers` is still statically imported in `eas-wagmi-utils.ts` (shared bundle path via useAuth hooks)
2. `@headlessui/react` and `@radix-ui` both ship, duplicating accessible primitive functionality (~30KB)
3. `react-virtualized` (~100KB) coexists with `@tanstack/react-virtual` (~5KB)
4. `moment.js` (~70KB) is used in exactly 1 file
5. `store/index.ts` uses `export *` defeating tree-shaking for all stores
6. Multiple heavy modals/forms eagerly imported on every project page

---

## 2) Target State

### User-facing targets (P75 mobile field data)
- LCP <= **2.5s**
- INP <= **200ms**
- CLS <= **0.10**

### Lab targets (Lighthouse mobile)
- Performance >= **90** on critical route templates
- TBT <= **200ms**
- LCP <= **2.5s**

### Bundle targets
- Shared first-load JS: **<= 400 KB** (from 996KB)
- Public routes: **<= 500 KB**
- Project/community app routes: **<= 800 KB**

### Asset targets
- Total CSS: **<= 80 KB** (gzipped)
- Font payload: **<= 100 KB**
- No image in `/public/` exceeds **500 KB**

---

## 3) Remaining Workstreams (Prioritized by Impact)

---

### W3: Shared Bundle — Kill Duplicate and Unnecessary Libraries

#### W3.1 Dynamic-import ethers in `eas-wagmi-utils.ts`
**CRITICAL — highest remaining shared-bundle cost.**

`utilities/eas-wagmi-utils.ts` statically imports 4 ethers classes: `BrowserProvider`, `FallbackProvider`, `JsonRpcProvider`, `JsonRpcSigner`. This file is on the shared bundle path via wagmi/useAuth hooks — **every single page pays ~50-100KB for ethers even though most pages never call these utils.**

**Action:**
1. Convert `eas-wagmi-utils.ts` to export async factory functions that dynamically import ethers:
```typescript
// Before (loads on every page)
import { BrowserProvider, FallbackProvider, JsonRpcProvider, JsonRpcSigner } from "ethers";
export function clientToSigner(client) { ... }

// After (loads only when called)
export async function clientToSigner(client) {
  const { BrowserProvider } = await import("ethers");
  ...
}
```
2. Update all callers (hooks that use these utils) to `await` the result.

**Files:** `utilities/eas-wagmi-utils.ts`, callers in hooks/
**Impact:** ~50-100KB off shared bundle. Every page benefits.

#### W3.2 Replace `moment.js` with `date-fns`
`moment.js` (~70KB minified, not tree-shakeable) is imported in exactly **1 file**: `utilities/fillDateRangeWithValues.ts`.

`date-fns` is already in the project and fully tree-shakeable.

**Action:** Replace `moment()` calls with `date-fns` equivalents (`addDays`, `format`, `differenceInDays`). Remove `moment` from `package.json`.

**Files:** `utilities/fillDateRangeWithValues.ts`, `package.json`
**Impact:** ~70KB removed from bundle.

#### W3.3 Replace `react-virtualized` with `@tanstack/react-virtual`
`react-virtualized` (~100KB) is used in **5 files**. `@tanstack/react-virtual` (~5KB) is already installed and actively maintained.

**Files using react-virtualized:**
- Search for `import.*react-virtualized` to identify all 5 files.

**Action:** Migrate each usage to `@tanstack/react-virtual`'s `useVirtualizer` hook. Remove `react-virtualized` from `package.json`.

**Impact:** ~95KB removed from bundle.

#### W3.4 Eliminate `@headlessui/react` duplication
`@headlessui/react` is used in **~70 files**. `@radix-ui` is used in **~50 files**. Both provide the same accessible primitives (Dialog, Popover, Menu, Switch, Tabs, etc.). Shipping both is ~30KB of duplication.

**Action:**
1. Audit which Headless UI components are used: likely `Dialog`, `Menu`, `Popover`, `Tab`, `Switch`, `Transition`.
2. Map each to its Radix equivalent (already in the project).
3. Migrate incrementally — start with least-used components.
4. Remove `@headlessui/react` from `package.json` when done.

**Impact:** ~30KB removed. Simplifies component library story.
**Risk:** High effort (70 files). Do incrementally over multiple PRs.

#### W3.5 Fix Tremor Card still eager in `ProjectActivityChart.tsx`
`ProjectActivityChart.tsx` still has `import { Card } from "@tremor/react"` as a direct eager import. Only `AreaChart` is dynamically imported. The eager `Card` import pulls Tremor's module graph into the bundle.

**Action:** Replace `import { Card } from "@tremor/react"` with `import { DataCard as Card } from "@/src/components/ui/data-card"`.

**Files:** `components/Pages/Project/v2/MainContent/ProjectActivityChart.tsx`
**Impact:** Removes last eager Tremor import from project pages.

---

### W4: Route-Level Code Splitting (Project Page Focus)

#### W4.1 Dynamic-import `SingleProjectDonateModal`
`components/Pages/Project/v2/SidePanel/DonateSection.tsx` **eagerly imports** `SingleProjectDonateModal`, which pulls in the entire donation flow: Stripe OnrampFlow, token selectors, form validation, `SetChainPayoutAddressModal`. This loads **~50-100KB** on every project page even though the modal only opens on button click.

**Action:**
```typescript
const SingleProjectDonateModal = dynamic(
  () => import("@/components/Donation/SingleProject/SingleProjectDonateModal"),
  { ssr: false }
);
const SetChainPayoutAddressModal = dynamic(
  () => import("@/components/Pages/Project/ProjectOptionsMenu/SetChainPayoutAddressModal"),
  { ssr: false }
);
```

**Files:** `components/Pages/Project/v2/SidePanel/DonateSection.tsx`
**Impact:** ~50-100KB off project page initial load.

#### W4.2 Dynamic-import `ProjectOptionsMenu`
`ProjectOptionsMenu` is eagerly imported in `ProjectProfileLayout`. It imports 11 Heroicons, `AdminTransferOwnershipDialog` (which itself imports heavy SDK utilities), 6+ store imports, and multiple modal components.

**Action:**
1. Dynamic-import `ProjectOptionsMenu` in the layout.
2. Gate rendering behind `isProjectOwner || isProjectAdmin` so the chunk never loads for regular visitors.

```typescript
const ProjectOptionsMenu = dynamic(
  () => import("@/components/Pages/Project/ProjectOptionsMenu"),
  { ssr: false }
);
// Only render when permissions are confirmed
{(isProjectOwner || isProjectAdmin) && <ProjectOptionsMenu />}
```

**Files:** `components/Pages/Project/v2/Layout/ProjectProfileLayout.tsx`
**Impact:** ~30-50KB off project page for non-owner visitors (majority of traffic).

#### W4.3 Defer `SubscribeSection` form libraries
`components/Pages/Project/v2/SidePanel/SubscribeSection.tsx` eagerly imports `react-hook-form`, `zod`, and `@hookform/resolvers/zod` on every project page. The subscription form is a minor feature that most visitors never interact with.

**Action:** Either:
- (A) Dynamic-import the entire `SubscribeSection` component, or
- (B) Extract the form into a sub-component that's dynamically imported on "Subscribe" button click.

**Files:** `components/Pages/Project/v2/SidePanel/SubscribeSection.tsx`
**Impact:** ~20-30KB off project page initial load.

#### W4.4 Dynamic-import all chart components
Every chart (`AreaChart`, `BarChart`, `LineChart`) should use dynamic import with `ssr: false`.

**Files:**
- `components/Pages/Admin/ProgramAnalytics.tsx` (BarChart)
- `components/Pages/Admin/OutputMetrics.tsx` (AreaChart)
- `components/Pages/Stats/LineChart.tsx` (LineChart)
- `components/Pages/Stats/WeeklyActiveUsersChart.tsx` (LineChart)
- `components/Pages/Communities/Impact/CommunityMetricsSection.tsx` (AreaChart)
- `components/Pages/Communities/Impact/AggregateCategoryRow.tsx` (AreaChart)
- `components/Pages/Communities/Impact/CategoryRow.tsx` (AreaChart)

#### W4.5 Virtualize ActivityFeed
`ActivityFeed.tsx` renders all accumulated items in the DOM via infinite scroll. For projects with 100+ activities, this creates thousands of DOM nodes.

**Action:** Use `@tanstack/react-virtual` (already installed after W3.3) to render only visible items + overscan buffer.

**Impact:** DOM node count O(n) → O(viewport). Improves INP.

---

### W5: Barrel Export and Tree-Shaking Fixes

#### W5.1 Eliminate `export *` in `store/index.ts`
`store/index.ts` uses `export *` from `donationCart`, `owner`, `project`. This means importing `useProjectStore` also pulls in `donationCart.ts` (which uses `zustand/middleware/persist`, adding serialization overhead).

**Action:** Replace `export *` with named exports. Each consumer should import directly from the specific store file:
```typescript
// Before
import { useProjectStore } from "@/store";

// After
import { useProjectStore } from "@/store/project";
```

**Files:** `store/index.ts`, all consumers of `@/store`
**Impact:** Better tree-shaking. Donation cart code not loaded on non-donation pages.

#### W5.2 Audit other barrel exports
Search for `export *` across the codebase. Each instance defeats tree-shaking for the re-exported module.

**Action:** Replace all `export *` with explicit named exports.

---

### W6: Per-Tab Data Fetching

#### W6.1 Split `useProjectProfile` by tab
`useProjectProfile` fires 4 parallel API calls on mount (project, grants, updates, impacts) on every project tab. Additionally, `ProjectActivityChart` makes a **second** `useProjectProfile` call, duplicating all 4 fetches.

**Action:**
1. Keep `useProject` in the layout (always needed for header/sidebar).
2. Move `useProjectGrants` into `/funding/page.tsx`.
3. Move `useProjectImpacts` into `/impact/page.tsx`.
4. Keep `useProjectUpdates` in the default profile page.
5. Remove the duplicate `useProjectProfile` call from `ProjectActivityChart`.

**Impact:** Reduces initial API calls from 8 (4 x2 duplicate) to 2 on first load.

---

### W7: CSS Budget Control

#### W7.1 Replace Tailwind safelist regex with CSS custom properties
The safelist generates **~7,000+ CSS classes**. This exists for dynamic community theme colors.

**Action:**
1. Audit dynamic class usage (template literals with color names).
2. Replace `bg-${color}-500` patterns with `bg-[var(--community-color)]`.
3. Remove the entire safelist regex from `tailwind.config.js`.

**Impact:** ~50-100KB CSS savings (gzipped).
**Risk:** High. Requires visual regression testing.

#### W7.2 Scope Karma Seeds CSS
`styles/globals.css` contains ~200 lines of `.seeds-*` classes. If only used on `/seeds`, move to a page-level CSS module.

#### W7.3 Remove `next-remove-imports` wrapper
Test if `@uiw/react-md-editor` works without the `next-remove-imports` webpack wrapper when loaded with `dynamic({ ssr: false })`.

#### W7.4 Clean up global CSS
- Line-clamp utilities (Tailwind v3.3+ has native `line-clamp-*`)
- Markdown preview/editor styles → move to component-level CSS modules

---

### W8: App Shell Split (Public vs App Routes)

#### W8.1 Split root layout by route groups
**This is the single highest-impact change for public pages** but has medium-high risk.

The current `app/layout.tsx` wraps every page in PrivyProvider + WagmiProvider + QueryClientProvider. Public pages (`/`, `/projects`, `/funders`, `/knowledge/*`, `/stats`) don't need Privy/Wagmi.

**Action:**
1. Create `app/(public)/layout.tsx` — lightweight layout without Privy/Wagmi.
2. Create `app/(app)/layout.tsx` — full layout with all current providers.
3. Create a lightweight Navbar variant that doesn't require useAuth().
4. Move routes into appropriate groups.

**Expected impact:** Public pages drop from ~941KB to ~400KB.
**Risk:** Medium-high. Requires:
- Lightweight navbar that works without auth context
- Careful route testing
- No shared state assumptions between route groups

---

### W9: Build and Config Hardening

#### W9.1 Sentry `reactComponentAnnotation: false`
`next.config.ts` has `reactComponentAnnotation: { enabled: true }` which injects component name annotations into every React component. This adds overhead to the build output.

**Action:** Set `enabled: false` (or remove).
**Impact:** Small bundle reduction + faster builds.

#### W9.2 Expand `optimizePackageImports`
Add to the existing list:
- `@radix-ui/react-*`
- `class-variance-authority`
- `clsx`
- `zod`
- `@hookform/resolvers`

#### W9.3 Performance budget CI gate
Parse `pnpm build` output. Fail PR when:
- Shared JS > 400KB
- Any route > 800KB

#### W9.4 Lighthouse CI on critical routes
Add routes to `lighthouserc.js`: `/`, `/projects`, `/project/<id>`, `/community/<id>`.

#### W9.5 Real-user web-vitals reporting
Use `web-vitals` library with `onLCP`, `onINP`, `onCLS` by route template.

---

## 4) Execution Plan (3 Remaining Phases)

### Phase 3: Bundle Killers (Days 1-3)
**Theme:** Remove duplicate/unnecessary libraries, fix barrel exports, defer heavy modals.

| Item | Expected Impact | Risk |
|------|----------------|------|
| W3.1 Dynamic ethers in eas-wagmi-utils | ~50-100KB off shared | Low-Med (async callers) |
| W3.2 Replace moment.js with date-fns | ~70KB | None |
| W3.3 Replace react-virtualized | ~95KB | Medium (5 file migration) |
| W3.5 Fix Tremor Card in ProjectActivityChart | Removes last eager Tremor | None |
| W4.1 Dynamic SingleProjectDonateModal | ~50-100KB off project pages | Low |
| W4.2 Dynamic ProjectOptionsMenu | ~30-50KB off project pages | Low |
| W4.3 Defer SubscribeSection form libs | ~20-30KB off project pages | Low |
| W5.1 Eliminate export * in store/index.ts | Better tree-shaking | Low |
| W9.1 Sentry reactComponentAnnotation off | Small bundle reduction | None |

**Exit criteria:**
- Shared first-load JS <= **700 KB** (from 996KB)
- Project pages <= **1.3 MB** (from 1.7MB)
- `pnpm build` passes, all routes smoke-tested

### Phase 4: Route Splitting + Data Optimization (Days 4-7)
**Theme:** Per-tab fetching, chart splitting, feed virtualization.

| Item | Expected Impact | Risk |
|------|----------------|------|
| W4.4 Dynamic-import all charts | ~100KB off initial load per chart page | Low |
| W4.5 Virtualize ActivityFeed | DOM nodes 1000s → ~30 | Medium |
| W6.1 Split useProjectProfile by tab | 2 fewer API calls on load | Medium |
| W3.4 Eliminate @headlessui duplication | ~30KB | High (70 files, incremental) |
| W5.2 Audit all barrel exports | Better tree-shaking | Low |
| W9.2 Expand optimizePackageImports | Better tree-shaking | None |

**Exit criteria:**
- Project pages <= **1.0 MB**
- INP <= 200ms on project page with 100+ activities

### Phase 5: CSS + App Shell + CI (Week 2-3)
**Theme:** Tailwind safelist elimination, layout split, CI enforcement.

| Item | Expected Impact | Risk |
|------|----------------|------|
| W7.1 Replace safelist with CSS vars | ~50-100KB CSS savings | High |
| W7.2 Scope Karma Seeds CSS | ~5-10KB | Low |
| W7.3 Remove next-remove-imports | Simpler webpack | Medium |
| W7.4 Clean up global CSS | ~2-5KB | Low |
| W8.1 Split root layout by route groups | Public pages → 400KB | Medium-High |
| W9.3-W9.5 CI gates + monitoring | Prevent regressions | Low |

**Exit criteria:**
- Lighthouse mobile >= 90 on critical templates
- Shared JS <= 400KB
- Public routes <= 500KB
- All budgets enforced in CI

---

## 5) Impact Estimate Summary

| Category | Current | Phase 3 Target | Phase 5 Target |
|----------|---------|---------------|---------------|
| Shared JS | 996KB | 700KB | 400KB |
| Project pages | 1.7MB | 1.3MB | 800KB |
| Public routes | 941KB | 800KB | 500KB |
| Lighthouse mobile | ~35 | ~60 | >= 90 |

**Key savings breakdown (Phase 3):**
- ethers dynamic in eas-wagmi-utils: ~75KB
- moment.js removal: ~70KB
- react-virtualized removal: ~95KB
- DonateModal + OptionsMenu + SubscribeSection deferral: ~100-180KB (project pages)
- Tremor Card fix + barrel exports: ~20-30KB

**Key savings breakdown (Phase 4-5):**
- @headlessui removal: ~30KB
- Tailwind safelist elimination: ~50-100KB CSS
- Layout split (public pages): ~400KB off public routes
- Chart splitting + data optimization: ~100KB per chart page

---

## 6) KPI Dashboard

| Metric | Source | Target |
|--------|--------|--------|
| Shared first-load JS | `pnpm build` | <= 400 KB |
| Top 10 routes first-load JS | `pnpm build` | <= 800 KB each |
| Lighthouse Performance (mobile) | LHCI | >= 90 |
| TBT (lab) | Lighthouse | <= 200ms |
| LCP (lab) | Lighthouse | <= 2.5s |
| P75 LCP (field) | web-vitals | <= 2.5s |
| P75 INP (field) | web-vitals | <= 200ms |
| P75 CLS (field) | web-vitals | <= 0.10 |
| Total CSS (gzipped) | Build | <= 80 KB |

---

## 7) Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dynamic ethers in eas-wagmi-utils breaks wagmi hooks | Medium | High | Test all wallet connection flows. The async conversion only affects the internal helpers, not the wagmi hook API. |
| react-virtualized → @tanstack/react-virtual migration misses edge cases | Medium | Medium | Test each migrated component with empty, small, and large datasets. Verify scroll restoration. |
| @headlessui removal causes accessibility regression | Medium | High | Migrate incrementally. Radix has equivalent ARIA support. Test with screen reader on each migrated component. |
| Barrel export refactoring touches many files | Low | Low | Automated codemod or find-and-replace. Single-purpose PR. |
| Layout split causes missing provider errors | Medium | High | Start with 1-2 public routes. Verify no component below the public layout calls useAuth/usePrivy. |
| Tailwind safelist removal breaks community colors | High | Medium | Audit all dynamic class usage first. Implement CSS vars before removing safelist. Visual regression testing. |
| SubscribeSection deferred → layout shift on load | Low | Low | Reserve space with min-height or skeleton. |

---

## 8) Immediate Action Backlog (Phase 3 — Start Here)

1. **W3.1:** Dynamic-import ethers in `utilities/eas-wagmi-utils.ts`. Update callers.
2. **W3.5:** Replace `import { Card } from "@tremor/react"` with DataCard in `ProjectActivityChart.tsx`.
3. **W4.1:** Dynamic-import `SingleProjectDonateModal` and `SetChainPayoutAddressModal` in `DonateSection.tsx`.
4. **W4.2:** Dynamic-import `ProjectOptionsMenu` in `ProjectProfileLayout.tsx`, gate behind permissions.
5. **W4.3:** Dynamic-import or defer form libraries in `SubscribeSection.tsx`.
6. **W3.2:** Replace `moment` with `date-fns` in `utilities/fillDateRangeWithValues.ts`.
7. **W3.3:** Replace `react-virtualized` with `@tanstack/react-virtual` (5 files).
8. **W5.1:** Replace `export *` with named exports in `store/index.ts`.
9. **W9.1:** Set `reactComponentAnnotation: { enabled: false }` in `next.config.ts`.
10. Run `pnpm build`, record new baseline, compare to 996KB shared JS.
