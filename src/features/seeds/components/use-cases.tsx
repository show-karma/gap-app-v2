import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface HypothesisProps {
  number: string;
  title: string;
  description: string;
  examples?: string[];
}

function HypothesisCard({ number, title, description, examples }: HypothesisProps) {
  return (
    <Card className="border bg-card shadow-sm">
      <CardContent className="p-6 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            {number}
          </span>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        {examples && examples.length > 0 && (
          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
            {examples.map((example, index) => (
              <li
                key={index}
                className="pl-4 border-l-2 border-emerald-200 dark:border-emerald-800"
              >
                {example}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const hypotheses: HypothesisProps[] = [
  {
    number: "1",
    title: "Some projects just want support, not speculation",
    description:
      "Open-source projects, public goods, and community tools may never want a volatile token. Karma Seeds lets them accept money, do good work, and stay focused—without committing to tokenomics.",
  },
  {
    number: "2",
    title: "Seeds can become a foundation for future value",
    description:
      "Some teams do want to build deeper economic relationships later. None of this is enforced by the token itself—it's all opt-in and built on top.",
    examples: [
      "Access to private communities",
      "Future token allocations",
      "Revenue sharing",
      "Recognition as early supporters",
    ],
  },
  {
    number: "3",
    title: "People will wrap Seeds in creative ways",
    description:
      "We expect people to experiment. Karma Seeds doesn't prescribe behavior—it enables it.",
    examples: [
      '"Buy $10k in Seeds now, I\'ll return $15k later"',
      "Milestone-based funding via escrow",
      "Pooling Seeds for collective action",
    ],
  },
  {
    number: "4",
    title: "Seeds could bridge to real token launches",
    description:
      "A project might raise early support via Seeds, later launch a real token, use the treasury to bootstrap liquidity, and reward early supporters. Optional, composable, flexible.",
  },
  {
    number: "5",
    title: "Seeds could connect to legal entities",
    description:
      "As on-chain incorporation tools mature, Seeds could become the first step in forming real companies on-chain—where contributions and ownership are cryptographically recorded. This is a long-term idea, not a promise.",
  },
];

export function CoreHypotheses() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 lg:py-24 w-full bg-secondary/30")}>
      <SectionContainer className="flex flex-col items-center gap-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <h2 className="section-title text-foreground">Our Core Hypotheses</h2>
          <p className="text-muted-foreground text-lg">
            We&apos;re testing a few ideas with Karma Seeds. We don&apos;t have all the
            answers&mdash;we&apos;re explicitly launching this as a hypothesis.
          </p>
        </div>

        {/* Hypothesis Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {hypotheses.slice(0, 3).map((hypothesis, index) => (
            <HypothesisCard key={index} {...hypothesis} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {hypotheses.slice(3).map((hypothesis, index) => (
            <HypothesisCard key={index + 3} {...hypothesis} />
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
