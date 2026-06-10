"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

export function Hero() {
  return (
    <section
      className={cn(
        marketingLayoutTheme.padding,
        "flex flex-col items-center w-full pt-16 md:pt-24"
      )}
    >
      <SectionContainer className="flex flex-col items-center gap-6">
        <ScrollReveal variant="fade-up">
          <div className="w-full flex justify-start md:justify-center">
            <Badge
              variant="secondary"
              className={cn(
                "text-secondary-foreground font-medium text-xs",
                "leading-[150%] tracking-[0.015em]",
                "rounded-full py-[3px] px-2",
                "bg-secondary border-0 w-fit"
              )}
            >
              For Donors & Advisors
            </Badge>
          </div>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={100}>
          <h1
            className={cn(
              "text-foreground font-semibold text-[40px] md:text-5xl lg:text-[48px]",
              "leading-[110%] tracking-[-0.02em]",
              "text-left md:text-center max-w-[820px] w-full md:mx-auto"
            )}
          >
            Every brief shows the work behind the recommendation.
          </h1>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={200}>
          <p
            className={cn(
              "text-muted-foreground font-medium text-base md:text-lg",
              "text-left md:text-center",
              "max-w-[760px] w-full md:mx-auto"
            )}
          >
            Karma Donor Research scores thousands of 501(c)(3)s against your cause, geography, and
            grant size, then returns a ranked shortlist. Every pick gets a compliance check, an
            activity score, and a mission match, with the receipts attached.
          </p>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={300}>
          <div className="w-full flex flex-col sm:flex-row justify-start md:justify-center gap-3 max-w-[640px] md:mx-auto">
            <Button asChild className="rounded-md font-semibold px-6 py-2.5">
              <Link href={PAGES.DONOR_RESEARCH}>Try Donor Research</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-md font-medium px-6 py-2.5">
              <Link href={SOCIALS.DONOR_PARTNER_FORM} target="_blank" rel="noopener noreferrer">
                Talk to our team
              </Link>
            </Button>
          </div>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
