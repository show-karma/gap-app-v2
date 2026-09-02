import {
  DonorResearchSectionLayout,
} from "@/src/features/donor-research/components/common/donor-research-section-layout";

/**
 * The gated advisor workspace: reports, personas, the new-report flow and the
 * diligence template. Signed-in only, and the one posture that renders inside
 * the advisor shell (sidebar, header, breadcrumbs).
 *
 * The group is what names the posture. It replaced a `usePathname()` test in
 * the section layout, which was the CLIENT_HOOK_DYNAMIC read that stopped
 * `[reportId]` and `personas/[handleId]` from prerendering.
 */
export default function DonorResearchAdvisorLayout({ children }: { children: React.ReactNode }) {
  return <DonorResearchSectionLayout mode="advisor">{children}</DonorResearchSectionLayout>;
}
