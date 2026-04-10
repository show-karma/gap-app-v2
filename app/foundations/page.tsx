import type { Metadata } from "next";
import { FAQPageJsonLd } from "@/components/Seo/FAQPageJsonLd";
import { CTASection } from "@/src/features/foundations/components/cta-section";
import { Hero } from "@/src/features/foundations/components/hero";
import { HowItWorksSection } from "@/src/features/foundations/components/how-it-works-section";
import {
  ObjectionsSection,
  objections,
} from "@/src/features/foundations/components/objections-section";
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

const foundationsFaqs = objections.map((o) => ({
  question: o.question.replace(/^"|"$/g, ""),
  answer: o.answer,
}));

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
