import type { Metadata } from "next";
import { Suspense } from "react";
import { FAQPageJsonLd } from "@/components/Seo/FAQPageJsonLd";
import { SoftwareApplicationJsonLd } from "@/components/Seo/SoftwareApplicationJsonLd";
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

const homepageFaqs = [
  {
    question: "What is Karma and how can it help my project?",
    answer:
      "Karma is a modular funding and impact platform that helps you showcase your work, attract funding, and build your onchain reputation. You can share progress, complete milestones, and receive endorsements that boost your credibility across ecosystems.",
  },
  {
    question: "Do I need to be part of a specific program or community to use Karma?",
    answer:
      "No, you can create your project profile anytime. If your project is part of a grant program, hackathon, or ecosystem that partners with Karma, it will appear automatically. If not, you can easily add your grant by following the steps in our guide.",
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
    question: "Do I need to pay gas fees to update my project or post progress?",
    answer:
      "Yes, for now. Since all project data is stored onchain, you'll need to pay a small gas fee when updating your project or posting progress. We're actively working on gasless transactions.",
  },
];

export const metadata: Metadata = {
  ...customMetadata({
    description:
      "Karma is a platform for builders and ecosystems. Builders showcase their work and build reputation. Ecosystems use our full stack solution to allocate funding and grow their ecosystems.",
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
      <FAQPageJsonLd faqs={homepageFaqs} />
      <SoftwareApplicationJsonLd />
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
