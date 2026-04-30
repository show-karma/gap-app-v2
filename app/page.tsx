import type { Metadata } from "next";
import { FAQJsonLd } from "@/components/Seo/FAQJsonLd";
import { CaseStudiesSection } from "@/src/features/home/components/case-studies-section";
import { CTASection } from "@/src/features/home/components/cta-section";
import { FAQSection } from "@/src/features/home/components/faq-section";
import { Hero } from "@/src/features/home/components/hero";
import { HowItWorksSection } from "@/src/features/home/components/how-it-works-section";
import { NumbersSection } from "@/src/features/home/components/numbers-section";
import { ObjectionsSection } from "@/src/features/home/components/objections-section";
import { OfferingSection } from "@/src/features/home/components/offering-section";
import { PainPoints } from "@/src/features/home/components/pain-points";
import { PlatformSection } from "@/src/features/home/components/platform-section";
import { customMetadata } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";

export const metadata: Metadata = {
  ...customMetadata({
    title: "Karma | Funding Software That Does the Work for Funders",
    description:
      "AI-powered software for grants, hackathons, and RFPs. Automated evaluation, milestone tracking, and impact reporting. Funding software that does the work.",
    path: "/",
  }),
  title: {
    absolute: "Karma | AI powered funding Software that does the work for you",
  },
};

const HorizontalLine = ({ className }: { className?: string }) => {
  return <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />;
};

export default function Index() {
  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background overflow-x-hidden">
      <FAQJsonLd
        questions={[
          {
            question: "What is Karma?",
            answer:
              "Karma is funding software that does the work, not just a dashboard. It automates intake, AI-powered evaluation, milestone tracking, impact reporting, and fund distribution for grants, hackathons, and RFPs.",
          },
          {
            question: "Who is Karma for?",
            answer:
              "Any organization that funds projects: foundations, ecosystems, corporate programs, DAOs, government agencies. Especially useful for lean teams that need enterprise-grade programs without adding headcount.",
          },
          {
            question: "How is Karma different from other grant management tools?",
            answer:
              "Most tools give you forms and dashboards, but you still do all the work. Karma automates the work itself: AI agents evaluate applications, milestones are tracked automatically, and reports generate continuously.",
          },
          {
            question: "How do AI agents work in Karma?",
            answer:
              "Karma's AI agents handle time-consuming operational tasks: scoring applications, flagging risks, summarizing grantee progress, and generating impact reports. They run continuously in the background. You review the output and make the decisions.",
          },
          {
            question: "Can we migrate from our current setup?",
            answer:
              "Yes. Whether you're using spreadsheets, another platform, or a patchwork of tools, we handle the migration completely.",
          },
          {
            question: "Do we have to use everything?",
            answer:
              "No. Start with what you need. We can run part of your program while you keep the rest. Most organizations expand as they see results.",
          },
          {
            question: "Do I still need a grants team?",
            answer:
              "Many organizations run their entire program with Karma and a very lean team. The platform handles the operational work so your team can focus on strategy and funding decisions.",
          },
          {
            question: "Do we get reports for our board?",
            answer:
              "Yes, automatically. Board-ready impact reports are always current. No quarterly scramble.",
          },
          {
            question: "Can we run it under our own brand?",
            answer:
              "Yes. Many organizations use a custom-branded instance of Karma with their own domain, theme, and workflows. Your applicants see your brand. Karma is invisible.",
          },
        ]}
      />
      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-16 lg:gap-24">
        <Hero />
        <HorizontalLine className="max-w-full" />
        <PainPoints />
        <HorizontalLine />
        <NumbersSection />
        <HorizontalLine />
        <PlatformSection />
        <HorizontalLine />
        <CaseStudiesSection />
        <HorizontalLine />
        <HowItWorksSection />
        <HorizontalLine />
        <ObjectionsSection />
        <HorizontalLine />
        <OfferingSection />
        <HorizontalLine />
        <FAQSection />
        <CTASection />
      </div>
    </main>
  );
}
