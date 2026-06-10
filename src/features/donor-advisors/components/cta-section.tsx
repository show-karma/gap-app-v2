"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

export function CTASection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "pb-16 md:pb-24")}>
      <SectionContainer>
        <ScrollReveal variant="fade-up">
          <div className="flex flex-col items-center gap-6">
            <h2 className="section-title text-foreground text-center">
              Get a brief for the cause you care about.
            </h2>
            <p className="text-base md:text-xl font-normal text-muted-foreground text-center leading-[30px] tracking-normal max-w-xl">
              Tell Karma the cause, geography, and grant size. A ranked shortlist arrives in 10
              minutes, with compliance and activity already scored.
            </p>
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto px-4 md:px-0">
              <Button asChild className="rounded-md font-semibold px-6 py-2.5">
                <Link href={PAGES.DONOR_RESEARCH}>Try Donor Research</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-md font-medium px-6 py-2.5">
                <Link href={SOCIALS.DONOR_PARTNER_FORM} target="_blank" rel="noopener noreferrer">
                  Talk to our team
                </Link>
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
