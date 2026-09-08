import { TenantFooter, TenantNavbar } from "@/src/components/layout/tenant-chrome";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

/**
 * The app chrome: navbar above the page, footer below it.
 *
 * Which routes get chrome used to be a `usePathname()` test inside
 * `GlobalNavbarSlot` and `FooterSwitcher` — three `startsWith` checks that ran
 * on every render of every route. A layout cannot read the pathname on the
 * server by design, so that question had to be asked from a client component,
 * and a client component reading URL state is exactly what stops a route from
 * being prerendered (`CLIENT_HOOK_DYNAMIC`). Since the answer is purely "which
 * section of the site is this", the route tree can answer it instead: the
 * sections that supply their own chrome live in `(bare)` and never see this
 * layout.
 *
 * The markup is deliberately identical to what the root layout used to emit:
 * the inner column holds the navbar and the page, and the footer is its
 * sibling inside `[data-app-content]`, so the sticky-footer geometry is
 * unchanged.
 *
 * No Suspense boundary here, and none below it above the page — a boundary
 * over the navbar streams it as a hidden late chunk and costs a crawlable page
 * its whole internal link graph (DEV-612).
 */
export default function ChromeLayout({ children }: { children: React.ReactNode }) {
  // Not awaited. `getWhitelabelContext()` is memoised per request, so this is
  // the same promise the root layout already handed to WhitelabelProvider —
  // the chrome takes it directly rather than reading the unwrapped context, so
  // it stays independent of that provider.
  const whitelabel = getWhitelabelContext();

  return (
    <>
      <div className="flex flex-col w-full h-full">
        <TenantNavbar whitelabel={whitelabel} />
        {children}
      </div>
      <TenantFooter whitelabel={whitelabel} />
    </>
  );
}
