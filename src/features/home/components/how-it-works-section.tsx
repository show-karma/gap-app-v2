import { BarChart2, Mail, Zap } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
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
      "A 30-minute call. We learn your program goals, evaluation criteria, and reporting needs, then configure everything for you.",
    hasButton: true,
  },
  {
    icon: Zap,
    stepLabel: "Step 2",
    title: "Launch in 48 hours",
    description:
      "Intake forms, evaluation rubrics, milestone templates, and dashboards. All configured and live. No IT team required.",
  },
  {
    icon: BarChart2,
    stepLabel: "Step 3",
    title: "The platform does the work",
    description:
      "Applications flow in, AI evaluates, milestones are tracked, reports generate automatically. You focus on funding decisions. Karma handles the operations.",
  },
];

export function HowItWorksSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-12">
        {/* Header */}
        <ScrollReveal variant="fade-up">
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
              <span className="text-foreground">Live in 48 hours.</span>{" "}
              <br className="hidden md:block" />
              <span className="text-muted-foreground">No IT team required.</span>
            </h2>
          </div>
        </ScrollReveal>

        {/* Steps Grid */}
        <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-6 w-full", "items-stretch")}>
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <ScrollReveal key={index} variant="fade-up" delay={index * 150}>
                <div className={cn("flex flex-col items-center gap-4 h-full")}>
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex-shrink-0",
                      "bg-secondary flex items-center justify-center"
                    )}
                  >
                    <IconComponent className={cn("w-6 h-6", "text-foreground")} />
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

                  <Card
                    className={cn(
                      "flex flex-col w-full h-full",
                      "rounded-2xl border-0 bg-secondary shadow-none",
                      "p-8"
                    )}
                  >
                    <CardContent
                      className={cn(
                        "p-0 flex flex-col items-start gap-2",
                        step.hasButton ? "justify-between h-full" : ""
                      )}
                    >
                      <div className="flex flex-col gap-2">
                        <h3
                          className={cn(
                            "text-foreground font-semibold",
                            "text-xl leading-[120%] tracking-[-0.02em]"
                          )}
                        >
                          {step.title}
                        </h3>
                        <p
                          className={cn(
                            "text-muted-foreground font-medium text-sm",
                            "leading-[22px]"
                          )}
                        >
                          {step.description}
                        </p>
                      </div>

                      {step.hasButton && (
                        <div className="mt-4">
                          <Button asChild className="rounded-md font-medium">
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
                    </CardContent>
                  </Card>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </SectionContainer>
    </section>
  );
}
