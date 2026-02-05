import { Search, Sprout, TrendingUp } from "lucide-react";
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
    <section className={cn(marketingLayoutTheme.padding, "py-16 md:py-24 w-full relative")}>
      <SectionContainer>
        {/* Section Header */}
        <div className="flex flex-col items-center gap-5 mb-16 text-center">
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-seeds-300/10 to-seeds-300/5 dark:from-seeds-300/20 dark:to-seeds-300/10 text-seeds-400 dark:text-seeds-300 border border-seeds-300/30 px-4 py-1.5 text-sm font-medium"
          >
            How It Works
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight max-w-2xl">
            Simple by design
          </h2>
          <p className="text-lg md:text-xl font-normal text-muted-foreground leading-relaxed max-w-2xl">
            Find a project, contribute any amount, and receive Seeds in your wallet. Each Seed
            represents $1 of support—yours to hold, transfer, or use however the ecosystem evolves.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-[2px]">
            <div className="w-full h-full bg-gradient-to-r from-seeds-300/30 via-seeds-300/50 to-seeds-300/30 dark:from-seeds-300/20 dark:via-seeds-300/40 dark:to-seeds-300/20 rounded-full" />
          </div>

          {steps.map((step, index) => (
            <div
              key={step.number}
              className="flex flex-col items-center text-center relative group"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              {/* Step Number & Icon Container */}
              <div className="relative mb-8">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-seeds-300/30 to-seeds-300/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-150" />

                {/* Icon Circle */}
                <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-seeds-300/10 to-seeds-300/20 dark:from-seeds-300/20 dark:to-seeds-300/10 flex items-center justify-center border border-seeds-300/30 dark:border-seeds-300/20 shadow-lg shadow-seeds-300/20 dark:shadow-seeds-300/10 transition-transform duration-300 group-hover:scale-105">
                  <step.icon className="w-12 h-12 text-seeds-400 dark:text-seeds-300" />
                </div>

                {/* Step Number Badge */}
                <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-gradient-to-br from-seeds-300 to-seeds-400 text-seeds-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-seeds-300/30">
                  {step.number}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3 max-w-xs">
                <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
