import { BarChart2, Mail, Zap } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    title: "Connect with our team",
    description:
      "Meet your dedicated success partner who will guide you through setup, onboarding, and best practices.",
    hasButton: true,
  },
  {
    icon: Zap,
    stepLabel: "Step 2",
    title: "Configure your ecosystem",
    description:
      "We’ll help you set up your community space, enable whitelabel branding, and deploy the onchain modules you need — all tailored to your workflow.",
  },
  {
    icon: BarChart2,
    stepLabel: "Step 3",
    title: "Launch your program",
    description:
      "Design your funding program, set evaluation criteria, and go live. Start receiving applications and funding projects within 48 hours.",
  },
];

export function HowItWorksSection() {
  return (
    <section
      className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full gap-16")}
    >
      {/* Header */}
      <div className="flex flex-col items-start gap-4 w-full">
        {/* How It Works Pill */}
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

        {/* Main Heading */}
        <h2 className={cn("section-title", "w-full")}>
          <span className="text-foreground">Launch and fund impact</span>{" "}
          <br className="hidden md:block" />
          <span className="text-muted-foreground"> in 48 hours</span>
        </h2>
      </div>

      {/* Steps Grid */}
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-3 gap-8 w-full",
          "max-w-[1920px]",
          "items-stretch"
        )}
      >
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          return (
            <div key={index} className={cn("flex flex-col items-center gap-4 h-full")}>
              {/* Icon Container */}
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex-shrink-0",
                  "bg-secondary flex items-center justify-center"
                )}
              >
                <IconComponent className={cn("w-6 h-6", "text-foreground")} />
              </div>

              {/* Step Badge */}
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

              {/* Card */}
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
                    {/* Title */}
                    <h3
                      className={cn(
                        "text-foreground font-semibold",
                        "text-[20px] leading-[120%] tracking-[-0.02em]"
                      )}
                    >
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p
                      className={cn(
                        "text-muted-foreground font-medium text-sm",
                        "leading-[20px] tracking-[0%]"
                      )}
                    >
                      {step.description}
                    </p>
                  </div>

                  {/* Button - only for first card */}
                  {step.hasButton && (
                    <div className="mt-4">
                      <Button
                        asChild
                        className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium"
                      >
                        <Link href={SOCIALS.PARTNER_FORM} target="_blank" rel="noopener noreferrer">
                          Schedule Demo
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </section>
  );
}
