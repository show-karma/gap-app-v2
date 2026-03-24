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
      "Karma helps builders get funded and build reputation. Ecosystems use our full-stack solution to allocate grants, track milestones, and measure impact.",
    path: "/",
  }),
  title: {
    absolute: "Karma - Where builders get funded and ecosystems grow",
  },
};

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />;
};

export default function Index() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      <FAQJsonLd
        questions={[
          {
            question: "What is Karma and how can it help my project?",
            answer:
              "Karma is a modular funding and impact platform that helps you showcase your work, attract funding, and build your onchain reputation. You can share progress, complete milestones, and receive endorsements that boost your credibility across ecosystems.",
          },
          {
            question: "Do I need to be part of a specific program or community to use Karma?",
            answer:
              "No, you can create your project profile anytime. Think of your project profile as a resume. If your project is part of a grant program, hackathon, or ecosystem that partners with Karma, it will appear automatically. If not, you can easily add your grant by following the steps in our guide.",
          },
          {
            question: "What kind of information should I include in my project profile?",
            answer:
              "Your profile is your public, onchain portfolio. Include a clear description of your project and goals, milestones or deliverables you plan to achieve, updates on your progress (with links, screenshots, or metrics), and any impact results or endorsements you receive. The more complete your profile, the easier it is for funders and collaborators to discover and trust your work.",
          },
          {
            question: "How does Karma track and verify project progress?",
            answer:
              "Karma lets you post updates, complete milestones, and attach evidence (documents, links, metrics, attestations). These are reviewed or automatically verified depending on your program setup. Verified milestones strengthen your project's credibility and onchain impact record.",
          },
          {
            question: "Can I receive funding or donations directly through Karma?",
            answer:
              "Yes. You can log in and enable donations to accept fiat or crypto across multiple networks. Karma also functions as a funding platform. If your project is part of a program hosted on Karma, you can receive direct payments from that program or community.",
          },
          {
            question: "What happens to my data and reputation after my program ends?",
            answer:
              "Your project's profile and verified impact remain permanently available onchain. This means your history travels with you, helping you qualify faster for future funding, collaborations, or opportunities across other ecosystems using Karma.",
          },
          {
            question: "How do I make my metrics show up on my profile impact page?",
            answer:
              "Once you create your profile, you can link your github and onchain contracts. We will automatically fetch and display those metrics. You can also input your metrics manually.",
          },
          {
            question: "Do I need to pay gas fees to update my project or post progress?",
            answer:
              "Yes, for now. Since all project data is stored onchain, you'll need to pay a small gas fee when updating your project or posting progress. We're actively working on gasless transactions, so soon you'll be able to update your project without paying gas or holding crypto in your wallet.",
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
