import type { Metadata } from "next";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { CTASection } from "@/src/features/foundations/components/cta-section";
import { Hero } from "@/src/features/foundations/components/hero";
import { CaseStudiesSection } from "@/src/features/home/components/case-studies-section";
import { FAQSection } from "@/src/features/home/components/faq-section";
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
      <FAQJsonLd
        questions={[
          {
            question: "What is Karma for foundations?",
            answer:
              "Karma is AI-powered funding software for foundations running grants, hackathons, and RFPs. AI agents handle application evaluation, milestone tracking, and impact reporting, so a lean team can run enterprise-grade programs.",
          },
          {
            question: "How is Karma different from other grant management tools?",
            answer:
              "Most tools give you forms and dashboards, but you still do all the work. Karma automates the work itself: AI agents score applications against your rubric, milestones are tracked automatically, and impact reports stay current.",
          },
          {
            question: "How do AI agents work in Karma?",
            answer:
              "Karma's AI agents handle the time-consuming operational tasks: scoring applications, flagging risks, summarizing grantee progress, and generating impact reports. They run continuously in the background. You review the output and make the decisions.",
          },
          {
            question: "Can we migrate from our current setup?",
            answer:
              "Yes. Whether you're using spreadsheets, another platform, or a patchwork of tools, we handle the migration completely.",
          },
          {
            question: "Do we have to use everything?",
            answer:
              "No. Start with what you need. We can run part of your program while you keep the rest. Most foundations expand as they see results.",
          },
          {
            question: "Do I still need a grants team?",
            answer:
              "Many foundations run their entire program with Karma and a very lean team. The platform handles the operational work so your team can focus on strategy and funding decisions.",
          },
          {
            question: "Do we get reports for our board?",
            answer:
              "Yes, automatically. Board-ready impact reports stay current as grantees post updates. No quarterly scramble.",
          },
          {
            question: "Can we run it under our own brand?",
            answer:
              "Yes. Many foundations use a custom-branded instance of Karma with their own domain, theme, and workflows. Your applicants see your brand. Karma is invisible.",
          },
        ]}
      />
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
        <FAQSection />
        <CTASection />
      </div>
    </main>
  );
}
