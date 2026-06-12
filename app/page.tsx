import type { Metadata } from "next";
import { NewFeatureBanner } from "@/components/Pages/Home/NewFeatureBanner";
import { SectionContainer } from "@/src/components/shared/section-container";
import { Hero } from "@/src/features/home/components/hero";
import { WorkflowSection } from "@/src/features/home/components/workflow-section";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { customMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = {
  ...customMetadata({
    title:
      "Karma | Helping funders fund and track organizations, projects, and nonprofits worth backing",
    description:
      "Karma helps funders fund and track the organizations, projects, and nonprofits worth backing, from one-off nonprofit research to full grant programs.",
    path: "/",
  }),
  title: {
    absolute:
      "Karma | Helping funders fund and track organizations, projects, and nonprofits worth backing",
  },
};

export default function Index() {
  // Sections manage their own internal padding and full-bleed backgrounds
  // (the WorkflowSection alternates row bands). No outer gap or HR — the
  // editorial rhythm carries the visual transition between hero and
  // workflow.
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background overflow-x-hidden">
      <div className="flex w-full max-w-[1920px] flex-1 flex-col">
        <div className={cn(marketingLayoutTheme.padding, "w-full pt-8")}>
          <SectionContainer>
            <NewFeatureBanner />
          </SectionContainer>
        </div>
        <Hero />
        <WorkflowSection />
      </div>
    </main>
  );
}
