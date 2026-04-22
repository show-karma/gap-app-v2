"use client";

import { FAQAccordion } from "@/src/components/shared/faq-accordion";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

const faqItems = [
  {
    id: "what-is-karma",
    question: "What is Karma?",
    answer:
      "Karma is **funding software that does the work**, not just a dashboard. It automates intake, AI-powered evaluation, milestone tracking, impact reporting, and fund distribution for grants, hackathons, and RFPs.",
  },
  {
    id: "who-is-karma-for",
    question: "Who is Karma for?",
    answer:
      "Any organization that funds projects: foundations, ecosystems, corporate programs, DAOs, government agencies. Whether you manage $100K or $100M, Karma scales with you. Especially useful for lean teams that need enterprise-grade programs without adding headcount.",
  },
  {
    id: "tool-or-service",
    question: "How is Karma different from other grant management tools?",
    answer:
      "Most tools give you forms and dashboards, but you still do all the work. Karma **automates the work itself**: AI agents evaluate applications, milestones are tracked automatically, and reports generate continuously. It's the difference between a tool and a platform that does the heavy lifting.",
  },
  {
    id: "ai-agents",
    question: "How do AI agents work in Karma?",
    answer:
      "Karma's AI agents handle the time-consuming operational tasks: scoring and ranking applications, flagging risks, summarizing grantee progress, and generating impact reports. They run continuously in the background. You review the output and make the decisions.",
  },
  {
    id: "migrate-data",
    question: "Can we migrate from our current setup?",
    answer:
      "Yes. Whether you're using spreadsheets, another platform, or a patchwork of tools, we handle the migration. Historical data, existing grantee records, past program data: we bring it all over.",
  },
  {
    id: "modular-usage",
    question: "Do we have to use everything?",
    answer:
      "**No.** Start with what you need: just intake, just milestone tracking, or just impact reporting. You can use one module while keeping the rest of your workflow. Most organizations expand as they see results.",
  },
  {
    id: "how-different-from-consulting",
    question: "Do I still need a grants team?",
    answer:
      "That depends on your scale, but many organizations run their entire program with Karma and a very lean team. The platform handles the operational work so your team can focus on strategy and funding decisions.",
  },
  {
    id: "reports",
    question: "Do we get reports for our board?",
    answer:
      "Yes, automatically. Karma continuously aggregates project data into **real-time dashboards and downloadable reports**. Board-ready impact reports are always current, not a quarterly scramble.",
  },
  {
    id: "whitelabel",
    question: "Can we run it under our own brand?",
    answer:
      "Yes. Many organizations use a **custom-branded instance of Karma** with their own domain, theme, and workflows. Your applicants and grantees see your brand. Karma stays in the background.",
  },
];

export function FAQSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 w-full")}>
      <SectionContainer>
        <ScrollReveal variant="fade-up">
          <div className="flex flex-col items-center gap-4 max-w-4xl mx-auto px-4">
            <h2 className="section-title text-foreground text-center">
              Frequently asked questions
            </h2>
            <p className="text-base md:text-lg font-normal text-muted-foreground text-center leading-[28px]">
              Everything you need to know about the platform.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={150}>
          <div className="max-w-4xl mx-auto mb-8 md:mb-12 px-4 mt-10">
            <FAQAccordion items={faqItems} />
          </div>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
