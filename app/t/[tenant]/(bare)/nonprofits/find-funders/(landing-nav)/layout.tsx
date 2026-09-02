import { NonProfitsNavbar } from "@/src/features/non-profits/components/non-profits-navbar";

/**
 * The landing page, and the only route that gets the marketing navbar --
 * the in-page anchor links (#how, #connector, #audience) only resolve here.
 *
 * A group rather than a `usePathname()` test in the navbar: the group is the
 * answer to "is this the landing page", it is known at build time, and it
 * costs the route nothing at prerender. The URL is unchanged -- route groups
 * are invisible in paths, so this is still /nonprofits/find-funders.
 */
export default function FindFundersLandingNavLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NonProfitsNavbar isHomepage />
      {children}
    </>
  );
}
