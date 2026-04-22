"use client";

import { SquareCheckBig } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

interface PricingTier {
  name: string;
  description: string;
  features: string[];
  mostPopular: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    description:
      "Everything you need to run a structured funding program, without adding headcount",
    features: [
      "Up to 100 projects & 25 grants",
      "Automated intake & milestone tracking",
      "Full API access + 3 integrations",
      "Email support (48hr response)",
    ],
    mostPopular: false,
  },
  {
    name: "Pro",
    description: "AI-powered evaluation, automated reporting, and the capacity to scale",
    features: [
      "Up to 500 projects with unlimited grants",
      "AI application review & impact assessment",
      "8 integrations including GitHub & Dune",
      "Dedicated support (24hr) + monthly check-ins",
    ],
    mostPopular: true,
  },
  {
    name: "Enterprise",
    description: "Your full funding operation on your domain, with your brand",
    features: [
      "2,000+ projects with unlimited grants & API usage",
      "Full AI automation + ecosystem intelligence",
      "White-label branding with custom domain",
      "Dedicated success manager + 4-hour critical SLA",
      "Custom integrations & agentic grants council",
    ],
    mostPopular: false,
  },
];

export function OfferingSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-12">
        {/* Header */}
        <ScrollReveal variant="fade-up">
          <div className="flex flex-col items-start gap-4 w-full max-w-xl">
            <Badge
              variant="secondary"
              className={cn(
                "text-secondary-foreground font-medium text-xs",
                "leading-[150%] tracking-[0.015em]",
                "rounded-full py-[3px] px-2",
                "bg-secondary border-0 w-fit"
              )}
            >
              Pricing
            </Badge>

            <h2 className={cn("section-title text-left max-w-[768px] w-full")}>
              <span className="text-muted-foreground">Start where you are,</span>
              <br />
              <span className="text-foreground">scale when you&apos;re ready</span>
            </h2>

            <p className="text-muted-foreground font-normal text-lg leading-[28px] text-left w-full">
              Every tier includes setup, configuration, and onboarding. Not just a login.
            </p>
          </div>
        </ScrollReveal>

        {/* Pricing Cards */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          {pricingTiers.map((tier, index) =>
            tier.mostPopular ? (
              <ScrollReveal key={tier.name} variant="scale-up" delay={index * 120}>
                <div className="bg-primary rounded-2xl p-0.5 flex flex-col">
                  <div className="text-left bg-primary text-primary-foreground font-medium text-sm leading-5 py-2 px-8 rounded-t-2xl">
                    Most popular
                  </div>
                  <div className="bg-background rounded-2xl p-8 flex flex-col justify-between flex-1 h-full gap-10 xl:max-h-[500px] min-h-max lg:min-h-[500px]">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-foreground font-semibold text-2xl leading-[120%] tracking-[-0.02em]">
                        {tier.name}
                      </h3>
                      <p className="text-muted-foreground font-medium text-base leading-[150%]">
                        {tier.description}
                      </p>
                    </div>
                    <ul className="flex flex-col gap-2 mt-4 lg:mt-16">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex gap-2 items-start">
                          <SquareCheckBig className="w-3 h-3 text-foreground flex-shrink-0 mt-[3px]" />
                          <span className="text-foreground font-normal text-sm leading-[150%] tracking-[0.005em]">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollReveal>
            ) : (
              <ScrollReveal key={tier.name} variant="scale-up" delay={index * 120}>
                <div className="rounded-2xl border border-border p-8 flex flex-col h-full xl:max-h-[480px] justify-between gap-16">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-foreground font-semibold text-2xl leading-[120%] tracking-[-0.02em]">
                      {tier.name}
                    </h3>
                    <p className="text-muted-foreground font-medium text-base leading-[150%]">
                      {tier.description}
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <SquareCheckBig className="w-3 h-3 text-foreground flex-shrink-0 mt-[3px]" />
                        <span className="text-foreground font-normal text-sm leading-[150%] tracking-[0.005em]">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            )
          )}
        </div>

        {/* CTA */}
        <div className="w-full flex flex-col items-center gap-4 mt-4">
          <p className="text-muted-foreground font-normal text-lg leading-[28px] text-center">
            Ready to replace your spreadsheets with software that works?
          </p>
          <Button asChild size="xl">
            <Link href={SOCIALS.PARTNER_FORM} target="_blank" rel="noopener noreferrer">
              Schedule a Demo
            </Link>
          </Button>
        </div>
      </SectionContainer>
    </section>
  );
}
