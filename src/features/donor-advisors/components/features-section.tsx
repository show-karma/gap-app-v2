"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

interface Feature {
  label: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    label: "Compliance verified",
    title: "Every pick passes the IRS check",
    description:
      "Karma verifies 501(c)(3) status against IRS Pub 78, pulls the most recent 990, and checks state charity registries before any nonprofit shows up in your brief.",
  },
  {
    label: "Activity scored",
    title: "See who's actually still doing the work",
    description:
      "Each recommendation comes with recent public mentions, a freshness score, and a last-active date. Quiet nonprofits don't slip onto your shortlist by accident.",
  },
  {
    label: "Mission matched",
    title: "Tell Karma the cause, get aligned nonprofits",
    description:
      "Set cause, geography, and grant size. Karma surfaces nonprofits whose recent work matches what you want to fund, with a transparent composite score.",
  },
  {
    label: "Fast and Deep modes",
    title: "10 minutes for a shortlist, 3 days for diligence",
    description:
      "Fast mode delivers ranked recommendations with EIN and address on every row. Deep mode adds outreach calls and emails so you can vet before you wire.",
  },
];

export function FeaturesSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
      <SectionContainer className="flex flex-col items-start gap-12">
        <ScrollReveal variant="fade-up">
          <div className="flex flex-col items-start gap-4 w-full max-w-[768px]">
            <Badge
              variant="secondary"
              className={cn(
                "text-secondary-foreground font-medium text-xs",
                "leading-[150%] tracking-[0.015em]",
                "rounded-full py-[3px] px-2",
                "bg-secondary border-0 w-fit"
              )}
            >
              What's in the brief
            </Badge>

            <h2 className={cn("section-title", "text-left", "w-full")}>
              <span className="text-foreground">Compliance, activity, mission.</span>
              <br />
              <span className="text-muted-foreground">All scored, all sourced.</span>
            </h2>

            <p
              className={cn(
                "text-muted-foreground font-normal text-left",
                "text-[18px] md:text-[20px] leading-[30px]",
                "w-full"
              )}
            >
              No "trust me, this is a good one." Every recommendation comes with the inputs that
              produced it, so you can defend the gift to a co-trustee or a spouse.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {features.map((feature, index) => (
            <ScrollReveal key={feature.label} variant="fade-up" delay={index * 80}>
              <div
                className={cn("flex flex-col gap-3 p-8 md:p-10 h-full", "bg-secondary rounded-2xl")}
              >
                <span className="text-muted-foreground font-medium text-xs leading-[150%] tracking-[0.015em] uppercase">
                  {feature.label}
                </span>
                <h3 className="text-foreground font-semibold text-[20px] leading-[120%] tracking-[-0.02em]">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground font-medium text-sm leading-[22px]">
                  {feature.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal variant="fade-up" delay={120} className="w-full">
          <figure className="flex flex-col gap-3 w-full">
            <div
              className={cn(
                "relative w-full overflow-hidden",
                "rounded-2xl border border-border bg-background",
                "shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)]"
              )}
            >
              <Image
                src="/images/homepage/karma-donor-research-brief.png"
                alt="Karma Donor Research brief: lead recommendation Northcoast Environmental Center with composite match 74/100, score breakdown across mission match, online presence, and IRS 990 recency, plus three-year financials and recent press coverage"
                width={1500}
                height={1049}
                sizes="(min-width: 1280px) 1200px, 100vw"
                className="w-full h-auto"
              />
            </div>
            <figcaption className="text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground text-center">
              From a recent research brief.
            </figcaption>
          </figure>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
