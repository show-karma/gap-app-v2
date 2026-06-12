/**
 * NonProfitsFooter — dedicated footer for the /nonprofits/find-funders section.
 *
 * Ported from grant-atlas src/components/landing-footer.tsx (the footer shown on
 * karmagrants.org). Adaptations for gap-app-v2:
 * - Brand: "Karma Find Funders" — the Karma logo (next/image) sits in for the original mark.
 * - Links: TanStack Router Link → next/link + NON_PROFITS_PAGES constants.
 *
 * Styling uses the lp-footer-* classes in styles/non-profits-landing.css.
 */

import Image from "next/image";
import Link from "next/link";
import { NON_PROFITS_PAGES } from "@/utilities/pages";

const COPY_YEAR = new Date().getFullYear();

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="lp-footer-link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function ComingSoon({ children }: { children: React.ReactNode }) {
  return (
    <span className="lp-footer-link" aria-disabled="true" title="Coming soon">
      {children}
    </span>
  );
}

function BrandMark() {
  return (
    <span className="lp-brand">
      <Image
        className="block h-7 w-auto dark:hidden"
        src="/logo/karma-logo-light.svg"
        alt="Karma"
        width={127}
        height={32}
      />
      <Image
        className="hidden h-7 w-auto dark:block"
        src="/logo/karma-logo-dark.svg"
        alt="Karma"
        width={127}
        height={32}
      />
    </span>
  );
}

export function NonProfitsFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-inner">
          <div>
            <BrandMark />
            <p className="lp-footer-intro">
              A search engine for philanthropy. Built by Karma for nonprofits that don&apos;t have
              time to learn another database.
            </p>
          </div>
          <div>
            <div className="lp-footer-col-title">{"// PRODUCT"}</div>
            <div className="lp-footer-links">
              <Link className="lp-footer-link" href={NON_PROFITS_PAGES.HOME}>
                Search
              </Link>
              <ComingSoon>Saved lists</ComingSoon>
              <ComingSoon>Pricing</ComingSoon>
              <ComingSoon>Changelog</ComingSoon>
            </div>
          </div>
          <div>
            <div className="lp-footer-col-title">{"// RESOURCES"}</div>
            <div className="lp-footer-links">
              <ComingSoon>Guide</ComingSoon>
              <ComingSoon>API docs</ComingSoon>
              <ComingSoon>Data sources</ComingSoon>
              <ComingSoon>Blog</ComingSoon>
            </div>
          </div>
          <div>
            <div className="lp-footer-col-title">{"// COMPANY"}</div>
            <div className="lp-footer-links">
              <ExternalLink href="https://www.karmahq.xyz">About Karma</ExternalLink>
              <ExternalLink href="mailto:hello@karmahq.xyz">Contact</ExternalLink>
              <ExternalLink href="https://www.karmahq.xyz/privacy">Privacy</ExternalLink>
              <ExternalLink href="https://www.karmahq.xyz/terms">Terms</ExternalLink>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <div>&copy; {COPY_YEAR} KARMA LABS</div>
          <div className="lp-footer-bottom-right">
            <span>DATA: IRS PUBLIC FILINGS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
