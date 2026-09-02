import "@/styles/non-profits-landing.css";

import { NonProfitsFooter } from "@/src/features/non-profits/components/non-profits-footer";
import { NonProfitsNavbar } from "@/src/features/non-profits/components/non-profits-navbar";

/**
 * Dedicated chrome for the /nonprofits/find-funders section.
 *
 * The route lives in the `(bare)` group, so it gets no app navbar or footer;
 * this layout supplies the standalone "Karma Find Funders" navbar + footer
 * instead. The `.landing` wrapper provides the CSS custom properties the lp-*
 * classes depend on.
 */
export default function NonProfitsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing">
      <div className="lp-page">
        <NonProfitsNavbar />
        {children}
        <NonProfitsFooter />
      </div>
    </div>
  );
}
