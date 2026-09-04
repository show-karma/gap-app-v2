import "@/styles/non-profits-landing.css";

import { NonProfitsFooter } from "@/src/features/non-profits/components/non-profits-footer";

/**
 * Dedicated chrome for the /nonprofits/find-funders section.
 *
 * The route lives in the `(bare)` group, so it gets no app navbar or footer;
 * this layout supplies the standalone "Karma Find Funders" footer and the
 * `.landing` wrapper that provides the CSS custom properties the lp-* classes
 * depend on.
 *
 * The navbar is NOT here. It comes one level down, from `(landing-nav)` or
 * `(workbench-nav)`, because it renders two variants and the difference used to
 * be a `usePathname()` test inside the navbar itself. A client component
 * reading URL state is what stops a route from prerendering
 * (CLIENT_HOOK_DYNAMIC), and it stopped all four detail routes below. The
 * question it was asking -- "is this the landing page" -- is a property of
 * where the route sits, so the route tree answers it and the navbar takes a
 * prop. Same move as `(chrome)/layout.tsx` made for the app navbar (#2096).
 *
 * Groups, not a Suspense boundary: this section IS crawlable
 * (`/nonprofits/find-funders` and the /connect trio are in the sitemap), and a
 * boundary over the navbar streams the page as a hidden late chunk that no-JS
 * readers never see (DEV-612).
 */
export default function NonProfitsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing">
      <div className="lp-page">
        {children}
        <NonProfitsFooter />
      </div>
    </div>
  );
}
