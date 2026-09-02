import { NonProfitsNavbar } from "@/src/features/non-profits/components/non-profits-navbar";

/**
 * Everything in find-funders that is not the landing page: the /connect trio
 * and the four workbench detail routes. They get the navbar without the
 * landing-page anchor links, and with the bookmarks tray that only makes
 * sense once a signed-in visitor is off the landing page.
 *
 * See `(landing-nav)/layout.tsx` and the parent layout for why this is a
 * group and not a hook.
 */
export default function FindFundersWorkbenchNavLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NonProfitsNavbar />
      {children}
    </>
  );
}
