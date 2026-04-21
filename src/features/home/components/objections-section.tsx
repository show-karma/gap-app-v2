"use client";

import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface Objection {
  question: string;
  answer: string;
}

const objections: Objection[] = [
  {
    question: '"We\'re too small for this."',
    answer:
      "That's exactly who this is for. One platform handles intake, evaluation, tracking, and reporting that used to require dedicated staff.",
  },
  {
    question: '"We already use spreadsheets and they work fine."',
    answer:
      "Spreadsheets are tools. You still do all the work. Karma automates the work: applications get scored, milestones get tracked, reports get generated. You just make the decisions.",
  },
  {
    question: '"We don\'t need AI."',
    answer:
      "You don't have to think about AI. It runs invisibly, pre-scoring applications, flagging risks, and generating reports. You just get better outcomes with less effort.",
  },
  {
    question: '"Switching tools sounds painful."',
    answer:
      "We handle the migration and setup. Most organizations are live within a week with zero disruption to current cycles. And unlike your last tool, this one does the work for you.",
  },
];

export function ObjectionsSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-12">
        {/* Header */}
        <ScrollReveal variant="fade-up">
          <div className="flex flex-col items-start gap-4 w-full max-w-xl">
            <Badge
              variant="secondary"
              className={cn(
                "text-secondary-foreground font-medium text-xs",
                "leading-[150%] tracking-[0.015em]",
                "rounded-full py-[3px] px-2",
                "bg-secondary border-0 w-fit"
              )}
            >
              Common Questions
            </Badge>

            <h2 className={cn("section-title", "text-left", "w-full")}>
              <span className="text-foreground">We get it.</span>
              <br />
              <span className="text-muted-foreground">Here&apos;s the honest answer.</span>
            </h2>
          </div>
        </ScrollReveal>

        {/* Objections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {objections.map((objection, index) => (
            <ScrollReveal key={index} variant="fade-up" delay={index * 100}>
              <div className="flex flex-col gap-3 rounded-2xl border border-border p-8 h-full">
                <h3 className="text-foreground font-semibold text-lg leading-[120%] tracking-[-0.02em]">
                  {objection.question}
                </h3>
                <p className="text-muted-foreground font-medium text-sm leading-[22px]">
                  {objection.answer}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
