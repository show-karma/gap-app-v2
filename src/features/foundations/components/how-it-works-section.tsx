import { BarChart2, Mail, Zap } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

interface StepCard {
  icon: React.ComponentType<{ className?: string }>;
  stepLabel: string;
  title: string;
  description: string;
  hasButton?: boolean;
}

const steps: StepCard[] = [
  {
    icon: Mail,
    stepLabel: "Step 1",
    title: "Tell us about your program",
    description:
      "A 30-minute call to understand your grant cycle, evaluation criteria, and reporting needs. No sales pitch — just discovery.",
    hasButton: true,
  },
  {
    icon: Zap,
    stepLabel: "Step 2",
    title: "We configure everything",
    description:
      "We set up your intake forms, evaluation rubrics, milestone templates, and dashboard. Implementation is done for you — typically within a week.",
  },
  {
    icon: BarChart2,
    stepLabel: "Step 3",
    title: "Launch your next cycle",
    description:
      "Run your next grant cycle on Karma. Compare the experience against your current workflow. Most teams never look back.",
  },
];

export function HowItWorksSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-16">
        {/* Header */}
        <div className="flex flex-col items-start gap-4 w-full">
          <Badge
            variant="secondary"
            className={cn(
              "text-secondary-foreground font-medium text-xs",
              "leading-[150%] tracking-[0.015em]",
              "rounded-full py-[3px] px-2",
              "bg-secondary border-0 w-fit"
            )}
          >
            How It Works
          </Badge>

          <h2 className={cn("section-title", "w-full")}>
            <span className="text-foreground">Go live in one week.</span>{" "}
            <br className="hidden md:block" />
            <span className="text-muted-foreground">No IT required.</span>
          </h2>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full items-stretch">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={index} className="flex flex-col items-center gap-4 h-full">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <IconComponent className="w-6 h-6 text-foreground" />
                </div>

                <Badge
                  variant="secondary"
                  className={cn(
                    "text-secondary-foreground font-medium text-xs",
                    "leading-[150%] tracking-[0.015em]",
                    "rounded-full py-[3px] px-2",
                    "bg-secondary border-0 w-fit"
                  )}
                >
                  {step.stepLabel}
                </Badge>

                <div className={cn("flex flex-col w-full h-full rounded-2xl bg-secondary p-8")}>
                  <div
                    className={cn(
                      "flex flex-col items-start gap-2",
                      step.hasButton ? "justify-between h-full" : ""
                    )}
                  >
                    <div className="flex flex-col gap-2">
                      <h3 className="text-foreground font-semibold text-[20px] leading-[120%] tracking-[-0.02em]">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground font-medium text-sm leading-[20px]">
                        {step.description}
                      </p>
                    </div>

                    {step.hasButton && (
                      <div className="mt-4">
                        <Button
                          asChild
                          className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium"
                        >
                          <Link
                            href={SOCIALS.PARTNER_FORM}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Schedule a Call
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionContainer>
    </section>
  );
}
