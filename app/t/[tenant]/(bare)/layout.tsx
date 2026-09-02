/**
 * Sections that bring their own chrome, so the app's navbar and footer must
 * not render above them:
 *
 * - `/nonprofits/find-funders*` — its own "Find Funders" navbar and footer
 *   (`(bare)/nonprofits/find-funders/layout.tsx`). The deep-research route is
 *   in here too: the old suppression was `pathname.startsWith(FIND_FUNDERS)`
 *   with no `/` boundary, so `/nonprofits/find-funders-deep-research` matched
 *   it. That is preserved deliberately — it is the behaviour that shipped.
 * - `/admin/studio` — a full-screen authoring tool that renders its own
 *   fixed-height container.
 * - `/nonprofit-research/shared/[token]` and `/nonprofit-research/diligence/[token]`
 *   — anonymous, outward-facing documents carrying `TokenPageShell`.
 *
 * The column matches the `(chrome)` group's so the page geometry is identical
 * either way; only the navbar and footer are absent. `[data-app-content]` sits
 * above both, in the root layout.
 */
export default function BareLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col w-full h-full">{children}</div>;
}
