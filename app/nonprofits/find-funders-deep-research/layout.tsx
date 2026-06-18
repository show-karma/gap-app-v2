import "../../../styles/non-profits-landing.css";

import { NonProfitsFooter } from "@/src/features/non-profits/components/non-profits-footer";
import { NonProfitsNavbar } from "@/src/features/non-profits/components/non-profits-navbar";

/**
 * Reuses the Karma Find Funders chrome (standalone navbar + footer) for the
 * deep-research intake page, which sits as a sibling of /nonprofits/find-funders.
 */
export default function DeepResearchLayout({ children }: { children: React.ReactNode }) {
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
