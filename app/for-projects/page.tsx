import type { Metadata } from "next";
import { Suspense } from "react";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { FAQ } from "@/src/features/homepage/components/faq";
import { Hero } from "@/src/features/homepage/components/hero";
import { HowItWorks } from "@/src/features/homepage/components/how-it-works";
import { JoinCommunity } from "@/src/features/homepage/components/join-community";
import { LiveFundingOpportunities } from "@/src/features/homepage/components/live-funding-opportunities";
import { LiveFundingOpportunitiesSkeleton } from "@/src/features/homepage/components/live-funding-opportunities-skeleton";
import { PlatformFeatures } from "@/src/features/homepage/components/platform-features";
import { WhereBuildersGrow } from "@/src/features/homepage/components/where-builders-grow";
import { customMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = {
  ...customMetadata({
    description:
      "Create your project profile on Karma. Find funding, track milestones, build reputation, and get discovered across grant programs and hackathons.",
    path: "/for-projects",
  }),
  title: "Karma | For Projects",
};

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />;
};

export default function ForProjects() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      <FAQJsonLd
        questions={[
          {
            question: "What is Karma and how can it help my project?",
            answer:
              "Karma helps you showcase your work, attract funding, and build your reputation. Share progress, complete milestones, and receive endorsements that boost your credibility.",
          },
          {
            question: "Do I need to be part of a specific program to use Karma?",
            answer:
              "No, you can create your project profile anytime. If your project is part of a grant program, hackathon, or ecosystem that partners with Karma, it will appear automatically.",
          },
          {
            question: "What kind of information should I include in my project profile?",
            answer:
              "Include a clear description of your project and goals, milestones or deliverables you plan to achieve, updates on your progress, and any impact results or endorsements you receive. The more complete your profile, the easier it is for funders to discover and trust your work.",
          },
          {
            question: "How does Karma track and verify project progress?",
            answer:
              "Karma lets you post updates, complete milestones, and attach evidence (documents, links, metrics). These are reviewed or automatically verified depending on your program setup.",
          },
          {
            question: "Can I receive funding or donations directly through Karma?",
            answer:
              "Yes. You can enable donations to accept fiat or crypto across multiple networks. If your project is part of a program hosted on Karma, you can receive direct payments.",
          },
          {
            question: "What happens to my data and reputation after my program ends?",
            answer:
              "Your project profile and verified impact remain permanently available. Your history travels with you, helping you qualify faster for future funding and opportunities.",
          },
        ]}
      />
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-2">
        <Hero />
        <HorizontalLine className="max-w-full" />
        <Suspense fallback={<LiveFundingOpportunitiesSkeleton />}>
          <LiveFundingOpportunities />
        </Suspense>
        <HorizontalLine />
        <PlatformFeatures />
        <HorizontalLine />
        <HowItWorks />
        <HorizontalLine />
        <JoinCommunity />
        <HorizontalLine />
        <FAQ />
        <HorizontalLine />
        <WhereBuildersGrow />
      </div>
    </main>
  );
}
