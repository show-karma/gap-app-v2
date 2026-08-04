import type { Metadata } from "next";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { CTASection } from "@/src/features/foundations/components/cta-section";
import { FoundationsFaqSection } from "@/src/features/foundations/components/foundations-faq-section";
import { Hero } from "@/src/features/foundations/components/hero";
import { FOUNDATION_FAQS } from "@/src/features/foundations/content";
import { CaseStudiesSection } from "@/src/features/home/components/case-studies-section";
import { HowItWorksSection } from "@/src/features/home/components/how-it-works-section";
import { NumbersSection } from "@/src/features/home/components/numbers-section";
import { ObjectionsSection } from "@/src/features/home/components/objections-section";
import { PainPoints } from "@/src/features/home/components/pain-points";
import { PlatformSection } from "@/src/features/home/components/platform-section";
import { SolutionBridge } from "@/src/features/home/components/solution-bridge";
import { customMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = customMetadata({
  title: "For foundations: AI-powered funding software that does the work for you",
  description:
    "AI-powered funding software for foundations running grants, hackathons, and RFPs. Karma's AI agents handle evaluation, milestone tracking, and impact reporting, so a lean team runs enterprise-grade programs.",
  path: "/foundations",
});

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />;
};

export default function FoundationsPage() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      <FAQJsonLd questions={FOUNDATION_FAQS} />
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-16 lg:gap-24">
        <Hero />
        {/* Narrative break: intro to problem */}
        <HorizontalLine className="max-w-full" />
        <PainPoints />
        <SolutionBridge />
        {/* Narrative break: problem to proof + product */}
        <HorizontalLine />
        <NumbersSection />
        <PlatformSection />
        <CaseStudiesSection />
        <HowItWorksSection />
        {/* Narrative break: product to close */}
        <HorizontalLine />
        <ObjectionsSection />
        {/* Foundations-specific FAQ: renders every answer in the server HTML
            (the shared accordion keeps closed answers out of it) and shares
            its FOUNDATION_FAQS source with the FAQPage JSON-LD above. */}
        <FoundationsFaqSection />
        <CTASection />
      </div>
    </main>
  );
}
