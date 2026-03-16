import type { Metadata } from "next";
import { FAQPageJsonLd } from "@/components/Seo/FAQPageJsonLd";
import { CaseStudiesSection } from "@/src/features/funders/components/case-studies-section";
import { FAQSection } from "@/src/features/funders/components/faq-section";
import { HandleTheVisionSection } from "@/src/features/funders/components/handle-the-vision-section";
import { Hero } from "@/src/features/funders/components/hero";
import { HowItWorksSection } from "@/src/features/funders/components/how-it-works-section";
import { NumbersSection } from "@/src/features/funders/components/numbers-section";
import { OfferingSection } from "@/src/features/funders/components/offering-section";
import { PlatformSection } from "@/src/features/funders/components/platform-section";
import { customMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";

const fundersFaqs = [
  {
    question: "What is Karma and how does it help funders?",
    answer:
      "Karma is a modular funding and impact infrastructure that helps you design, launch, and manage funding programs in days. You can intake applications, assign evaluators, track milestones, and measure impact, all on one platform.",
  },
  {
    question: "Can we migrate data from other platforms?",
    answer:
      "If you were using another funding platform in the past, we will help you import all the historical data into Karma's funding platform.",
  },
  {
    question: "How does Karma ensure accountability and transparency?",
    answer:
      "All project data, milestones, and impact attestations are stored onchain and publicly verifiable. This creates a transparent record of outcomes, reducing dependency on manual reporting and increasing community trust.",
  },
  {
    question: "Can I integrate my existing funding or evaluation mechanisms?",
    answer:
      "Absolutely. Karma supports direct funding, retroactive funding, milestone-based disbursements, and can integrate with custom allocation mechanisms built by your ecosystem.",
  },
  {
    question: "Can I generate reports and measure impact?",
    answer:
      "Yes. Karma automatically aggregates project data: updates, milestones, and outcomes into real-time dashboards and downloadable reports aligned with the Common Impact Data Standard (CIDS).",
  },
];

export const metadata: Metadata = customMetadata({
  title: "For Funders - Allocate funding and grow your ecosystem",
  description:
    "Discover how Karma helps funders allocate grants, track milestones, measure impact, and grow their ecosystems with a full-stack funding platform.",
  path: "/funders",
});

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />;
};

export default function FundersPage() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      <FAQPageJsonLd faqs={fundersFaqs} />
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-16 lg:gap-24">
        <Hero />
        <HorizontalLine className="max-w-full" />
        <NumbersSection />
        <HorizontalLine />
        <PlatformSection />
        <HorizontalLine />
        <CaseStudiesSection />
        <HorizontalLine />
        <HowItWorksSection />
        <HorizontalLine />
        <OfferingSection />
        <HorizontalLine />
        <FAQSection />
        <HandleTheVisionSection />
      </div>
    </main>
  );
}
