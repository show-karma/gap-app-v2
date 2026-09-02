import {
  DonorResearchSectionLayout,
} from "@/src/features/donor-research/components/common/donor-research-section-layout";

/**
 * The section index. Public, server-rendered answer content (E4, DEV-595), so
 * it is neither auth-gated nor shell-wrapped here: the page itself renders the
 * sign-in gate for anonymous visitors and the advisor shell + workspace for
 * signed-in advisors (ResearchIndexExperience).
 */
export default function DonorResearchPublicLayout({ children }: { children: React.ReactNode }) {
  return <DonorResearchSectionLayout mode="public">{children}</DonorResearchSectionLayout>;
}
