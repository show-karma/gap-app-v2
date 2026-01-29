import type { LucideIcon } from "lucide-react";
import { Ban, CheckCircle2, Clock, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface WantItem {
  text: string;
}

interface DontWantItem {
  icon: LucideIcon;
  text: string;
}

const whatProjectsWant: WantItem[] = [
  { text: "Raise a bit of money" },
  { text: "Build a small but aligned community" },
  { text: "Stay focused on building" },
];

const whatProjectsDontWant: DontWantItem[] = [
  { icon: TrendingDown, text: "Launch a token on day one" },
  { icon: TrendingDown, text: "Price speculation and charts" },
  { icon: TrendingDown, text: "Volatility and emotional whiplash" },
  { icon: TrendingDown, text: "Managing markets before product-market fit" },
];

const currentOptions = [
  {
    title: "Donations",
    problem: "Feel one-way and invisible",
  },
  {
    title: "Tokens",
    problem: "Feel premature and risky",
  },
  {
    title: "Grants",
    problem: "Are slow and gated",
  },
];

export function LaunchProblem() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 w-full")}>
      <SectionContainer>
        {/* Section Header */}
        <div className="flex flex-col items-center gap-4 mb-12 text-center">
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
          >
            The Problem
          </Badge>
          <h2 className="section-title text-foreground max-w-3xl">
            You want to raise funds, not launch a token
          </h2>
          <p className="text-xl font-normal text-muted-foreground leading-[30px] tracking-normal max-w-3xl">
            There are thousands of projects—especially early-stage non-VC scale projects and open
            source projects—that don't need too much funding. What they really need is users,
            product feedback, and evangelists, without the stress of token price fluctuation.
          </p>
        </div>

        {/* Two Columns: What you want vs What you don't want */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* What you want */}
          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">What you want</h3>
              <ul className="space-y-3">
                {whatProjectsWant.map((item) => (
                  <li key={item.text} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-foreground">{item.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* What you don't want */}
          <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">What you don't want</h3>
              <ul className="space-y-3">
                {whatProjectsDontWant.map((item) => (
                  <li key={item.text} className="flex items-center gap-3">
                    <Ban className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                    <span className="text-foreground">{item.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Current Options */}
        <div className="text-center mb-8">
          <p className="text-lg text-muted-foreground mb-6">Today, your options are awkward:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {currentOptions.map((option) => (
              <Card key={option.title} className="border-border bg-muted/30">
                <CardContent className="p-4 text-center">
                  <div className="font-semibold text-foreground">{option.title}</div>
                  <div className="text-sm text-muted-foreground">{option.problem}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Conclusion */}
        <div className="text-center">
          <p className="text-xl text-foreground font-medium">
            We think there's room for something simpler.
          </p>
        </div>
      </SectionContainer>
    </section>
  );
}
