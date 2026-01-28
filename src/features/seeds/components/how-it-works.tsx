import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface StepCardProps {
  number: string;
  title: string;
  description: string;
}

function StepCard({ number, title, description }: StepCardProps) {
  return (
    <Card className="border bg-card shadow-sm relative overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
      <CardContent className="p-6 pt-8 flex flex-col gap-4">
        <span className="text-5xl font-bold text-emerald-100 dark:text-emerald-900/60">
          {number}
        </span>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const steps: StepCardProps[] = [
  {
    number: "01",
    title: "Launch Your Seeds",
    description:
      "Project owners deploy a custom Seed token in one transaction. Set your treasury address and optional cap.",
  },
  {
    number: "02",
    title: "Supporters Buy Seeds",
    description:
      "Anyone can purchase Seeds using ETH, USDC, or any token with a Uniswap pool. Price is always $1.",
  },
  {
    number: "03",
    title: "Instant Treasury Funding",
    description:
      "97% of every purchase goes directly to your project treasury. Funds arrive immediately.",
  },
  {
    number: "04",
    title: "Build With Confidence",
    description: "Focus on your roadmap with predictable, sustainable funding from your community.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className={cn(marketingLayoutTheme.padding, "py-16 lg:py-24 w-full")}
    >
      <SectionContainer className="flex flex-col items-center gap-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
          <h2 className="section-title text-foreground">How It Works</h2>
          <p className="text-muted-foreground text-lg">
            From launch to funding in four simple steps.
          </p>
        </div>

        {/* Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {steps.map((step, index) => (
            <StepCard
              key={index}
              number={step.number}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
