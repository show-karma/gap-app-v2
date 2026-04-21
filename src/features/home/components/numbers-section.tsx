"use client";

import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { AnimatedCounter } from "@/src/features/home/components/animated-counter";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface Statistic {
  number: string;
  title: string;
  description: string;
}

const statistics: Statistic[] = [
  {
    number: "30+",
    title: "Programs powered",
    description:
      "From Web3 ecosystems to traditional foundations, running grants, hackathons, and RFPs on Karma",
  },
  {
    number: "4,000+",
    title: "Projects tracked",
    description: "Funded, tracked, and reported on automatically across every program",
  },
  {
    number: "50k+",
    title: "Milestones verified",
    description: "Proof of work collected, reviewed, and recorded automatically. No manual follow-up",
  },
  {
    number: "48hrs",
    title: "To go live",
    description:
      "From first call to accepting applications. Karma gets your program running in under 48 hours",
  },
];

export function NumbersSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding)}>
      <SectionContainer>
        <div className={cn("flex flex-col xl:flex-row gap-8 lg:gap-16 items-start w-full")}>
          {/* Left Column */}
          <ScrollReveal variant="fade-right">
            <div
              className={cn(
                "flex flex-col gap-6",
                "w-full lg:w-auto lg:max-w-[460px] lg:flex-shrink-0"
              )}
            >
              <Badge
                variant="secondary"
                className={cn(
                  "text-secondary-foreground font-medium text-xs",
                  "leading-[150%] tracking-[0.015em]",
                  "rounded-full py-[3px] px-2",
                  "bg-secondary border-0 w-fit"
                )}
              >
                The Numbers
              </Badge>

              <h2 className={cn("text-foreground", "section-title")}>
                Proven at scale
              </h2>

              <p
                className={cn(
                  "text-muted-foreground font-normal",
                  "text-lg leading-[28px]",
                  "lg:text-xl lg:leading-[30px]"
                )}
              >
                Organizations use Karma to do more with less: fewer tools, fewer
                spreadsheets, and fewer hours spent on program operations.
              </p>
            </div>
          </ScrollReveal>

          {/* Right Column — Stats Grid */}
          <div
            className={cn("grid grid-cols-1 md:grid-cols-2 gap-8", "w-full lg:flex-1 lg:min-w-0")}
          >
            {statistics.map((stat, index) => (
              <ScrollReveal key={index} variant="fade-up" delay={index * 120}>
                <div className="flex flex-col gap-2">
                  <div
                    className={cn(
                      "font-semibold text-5xl leading-none tracking-[-0.02em]",
                      "text-foreground"
                    )}
                  >
                    <AnimatedCounter value={stat.number} />
                  </div>

                  <h3
                    className={cn(
                      "text-foreground font-medium text-lg leading-[28px]"
                    )}
                  >
                    {stat.title}
                  </h3>

                  <p
                    className={cn(
                      "text-muted-foreground font-normal text-sm leading-[22px]"
                    )}
                  >
                    {stat.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
