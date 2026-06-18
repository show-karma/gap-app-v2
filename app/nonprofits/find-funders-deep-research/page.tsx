import type { Metadata } from "next";
import { DeepResearchForm } from "@/src/features/non-profits/components/deep-research-form";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Deep Research — Karma Find Funders",
  description:
    "Get a hand-researched shortlist of funders. Tell us about your mission and we'll do the deep digging for you.",
  path: "/nonprofits/find-funders-deep-research",
});

export default function FindFundersDeepResearchPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          Deep research
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          Want better results than a single search can give you? Tell us as much as you can about
          what you&apos;re after and our team will dig deep across millions of filings to build a
          tailored funder shortlist for you.
        </p>
      </div>
      <DeepResearchForm />
    </main>
  );
}
