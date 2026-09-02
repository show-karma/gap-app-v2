import {
  DonorResearchSectionLayout,
} from "@/src/features/donor-research/components/common/donor-research-section-layout";

/**
 * The two anonymous token routes -- the donor share view and the nonprofit
 * diligence response. Their token is the credential and they carry their own
 * `TokenPageShell`, so they sit in `(bare)` and never get the app navbar or
 * footer. That replaces the `isDonorResearchTokenRoute(pathname)` test the
 * navbar and footer used to run on every route of the app.
 *
 * Same section layout as the `(chrome)` half, mounted from the shared module
 * and naming its own posture.
 */
export default function DonorResearchTokenLayout({ children }: { children: React.ReactNode }) {
  return <DonorResearchSectionLayout mode="token">{children}</DonorResearchSectionLayout>;
}
