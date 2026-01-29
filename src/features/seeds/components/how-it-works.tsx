import { ArrowRight, Search, Sprout, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

const steps = [
  {
    number: 1,
    icon: Search,
    title: "Find a project you believe in",
    description:
      "Browse projects building things you care about—open source, public goods, early-stage ideas.",
  },
  {
    number: 2,
    icon: Sprout,
    title: "Get your Seeds",
    description:
      "Contribute $1 or more. For every dollar, you receive one Seed—a token that lives in your wallet.",
  },
  {
    number: 3,
    icon: TrendingUp,
    title: "Hold as proof of early belief",
    description:
      "Seeds in your wallet mark you as an early supporter. Projects can reward backers with early access, rev share, or future token allocations.",
  },
];

export function SeedsHowItWorks() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 w-full")}>
      <SectionContainer>
        {/* Section Header */}
        <div className="flex flex-col items-center gap-4 mb-12 text-center">
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
          >
            How It Works
          </Badge>
          <h2 className="section-title text-foreground max-w-2xl">Simple by design</h2>
          <p className="text-xl font-normal text-muted-foreground leading-[30px] tracking-normal max-w-2xl">
            Find a project, contribute any amount, and receive Seeds in your wallet. Each Seed
            represents $1 of support—yours to hold, transfer, or use however the ecosystem evolves.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative">
          {steps.map((step, index) => (
            <div key={step.number} className="flex flex-col items-center text-center relative">
              {/* Connecting Arrow (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute top-12 left-[60%] w-[80%] items-center justify-center">
                  <div className="flex-1 h-[2px] bg-gradient-to-r from-green-300 to-green-200 dark:from-green-700 dark:to-green-800" />
                  <ArrowRight className="w-5 h-5 text-green-400 dark:text-green-600 -ml-1" />
                </div>
              )}

              {/* Step Number & Icon */}
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <step.icon className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                  {step.number}
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground max-w-xs">{step.description}</p>
            </div>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
