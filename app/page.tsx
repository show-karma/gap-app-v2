import type { Metadata } from "next";
import { Hero } from "@/src/features/home/components/hero";
import { WorkflowSection } from "@/src/features/home/components/workflow-section";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = {
  ...customMetadata({
    title: "Karma | Agentic funding software for foundations and donor advisors",
    description:
      "The funding platform foundation officers and donor advisors run from ChatGPT, Claude, or any AI agent. Fund nonprofits, follow updates, generate reports.",
    path: "/",
  }),
  title: {
    absolute: "Karma | Agentic funding software for foundations and donor advisors",
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
        <Hero />
        <WorkflowSection />
      </div>
    </main>
  );
}
