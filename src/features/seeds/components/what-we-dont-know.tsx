import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

const openQuestions = [
  {
    title: "Price stability is not enforced",
    description:
      "Seeds are intended to be $1 receipts—but nothing prevents someone from selling them for less on a secondary market. If someone decides a Seed is only worth $0.50 to them, they can sell it. Whether social norms, liquidity design, or tooling can discourage this is something we'll learn over time.",
  },
  {
    title: "Incentives are minimal by design",
    description:
      "If you're looking for quick upside, Karma Seeds is probably not for you. This is about alignment and support first. Economic sophistication comes later—if at all.",
  },
];

export function WhatWeDontKnow() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 lg:py-24 w-full")}>
      <SectionContainer className="flex flex-col items-center gap-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="section-title text-foreground">What We Don&apos;t Know</h2>
          <p className="text-muted-foreground text-lg">
            There are real open questions. We&apos;re being honest about them.
          </p>
        </div>

        {/* Open Questions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {openQuestions.map((question, index) => (
            <Card
              key={index}
              className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10"
            >
              <CardContent className="p-6 flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-foreground">{question.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {question.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
