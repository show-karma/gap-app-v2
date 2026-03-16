import type { Metadata } from "next";
import { FAQPageJsonLd } from "@/components/Seo/FAQPageJsonLd";
import { CTASection } from "@/src/features/foundations/components/cta-section";
import { Hero } from "@/src/features/foundations/components/hero";
import { HowItWorksSection } from "@/src/features/foundations/components/how-it-works-section";
import { ObjectionsSection } from "@/src/features/foundations/components/objections-section";
import { PainPointsSection } from "@/src/features/foundations/components/pain-points-section";
import { PlatformSection } from "@/src/features/foundations/components/platform-section";
import { WhyKarmaSection } from "@/src/features/foundations/components/why-karma-section";
import { customMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = customMetadata({
  title: "For Foundations - Professional Grant Programs Without the Overhead",
  description:
    "Karma helps lean foundations run structured, professional grant programs with AI-powered evaluation, milestone tracking, and live portfolio dashboards — without hiring more staff.",
  path: "/foundations",
});

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />;
};

const foundationsFaqs = [
  {
    question: "Is Karma too complex for a small foundation?",
    answer:
      "No. Karma is built for lean teams. It replaces the patchwork of spreadsheets, email, and shared drives that small foundations cobble together. No large team or IT department required — most foundations are live within a week.",
  },
  {
    question: "Can I keep using spreadsheets instead of Karma?",
    answer:
      "Spreadsheets work for very small programs but break down as you scale. Karma gives you governance-grade structure — audit trails, automated board reporting, and structured review workflows — with the same simplicity you expect from a spreadsheet.",
  },
  {
    question: "Does Karma require AI expertise to use?",
    answer:
      "No. Karma's AI runs in the background automatically. You don't configure it, train it, or think about it. You just get pre-scored applications and save hours of review time per grant cycle.",
  },
  {
    question: "How long does it take to switch to Karma?",
    answer:
      "Implementation is done for you. Karma configures your intake forms, evaluation workflows, and dashboards. Most foundations are fully operational within a week with zero disruption to current grant cycles.",
  },
];

export default function FoundationsPage() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      <FAQPageJsonLd faqs={foundationsFaqs} />
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-16 lg:gap-24">
        <Hero />
        <HorizontalLine className="max-w-full" />
        <PainPointsSection />
        <HorizontalLine />
        <PlatformSection />
        <HorizontalLine />
        <WhyKarmaSection />
        <HorizontalLine />
        <HowItWorksSection />
        <HorizontalLine />
        <ObjectionsSection />
        <CTASection />
      </div>
    </main>
  );
}
