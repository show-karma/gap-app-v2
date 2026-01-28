import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

const seedFacts = [
  "Anyone can contribute $1 (or more) to a project",
  "For every $1, they receive 1 Karma Seed",
  "Karma Seeds is an ERC-20 token",
  "The price is fixed at $1 per seed",
];

export function WhatAreSeeds() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 lg:py-24 w-full")}>
      <SectionContainer className="flex flex-col items-center gap-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <h2 className="section-title text-foreground">What are Karma Seeds?</h2>
          <p className="text-2xl font-medium text-foreground">
            Karma Seeds is a $1 receipt. That&apos;s it.
          </p>
        </div>

        {/* Facts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          {seedFacts.map((fact, index) => (
            <Card key={index} className="border bg-card shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  {index + 1}
                </span>
                <span className="text-muted-foreground">{fact}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quote */}
        <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 w-full max-w-2xl">
          <CardContent className="p-8 flex flex-col gap-4 text-center">
            <p className="text-muted-foreground">
              No promises. No speculation by design. No built-in governance. No implied upside.
            </p>
            <p className="text-lg font-medium text-foreground">
              Just a transparent, on-chain receipt that says:
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              &ldquo;I supported this project.&rdquo;
            </p>
            <p className="text-sm text-muted-foreground">That&apos;s the entire primitive.</p>
          </CardContent>
        </Card>
      </SectionContainer>
    </section>
  );
}
