"use client";

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
    label: "Drop your URL",
    title: "We build the profile from your website",
    description:
      "Karma reads your site to assemble your mission, programs, impact stories, and team into a live funder-facing profile. It ships in minutes. If anything is thin or missing, our team follows up by email so you don't have to fill out a form.",
  },
  {
    label: "Always current",
    title: "Your latest blogs, socials, and press, picked up automatically",
    description:
      "Karma watches your public web. New blog posts, social updates, and press mentions flow into your profile so funders see what you're doing right now, not what your About page said in 2022.",
  },
  {
    label: "Funders find you",
    title: "A live profile, in front of active funders",
    description:
      "Karma is where foundations and donors search for grantees. A current, complete profile puts your work in their results when they're actually looking to give.",
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
              What Karma does automatically
            </Badge>

            <h2 className={cn("section-title", "text-left", "w-full")}>
              <span className="text-foreground">Drop your URL.</span>
              <br />
              <span className="text-muted-foreground">Karma takes it from there.</span>
            </h2>

            <p
              className={cn(
                "text-muted-foreground font-normal text-left",
                "text-[18px] md:text-[20px] leading-[30px]",
                "w-full"
              )}
            >
              No long form, no setup wizard. Karma reads your public web to build your funder-facing
              profile and keeps it current as you publish.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
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
                <p className="text-muted-foreground font-medium text-sm leading-[20px]">
                  {feature.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
