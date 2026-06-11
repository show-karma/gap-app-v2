"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { NonprofitSubmissionForm } from "@/src/features/nonprofits/components/nonprofit-submission-form";
import { marketingLayoutTheme } from "@/src/helper/theme";
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
              For Nonprofits
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
            Just share your website. We&apos;ll do the rest.
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
            Karma reads your public web (mission, programs, blog, socials, press) and assembles a
            live funder-facing profile. Free for nonprofits. Funders pay us, not you.
          </p>
        </ScrollReveal>

        {/* The submission form replaces the old CTA pair. Drop the URL,
            email, and (optional) phone; we email you for anything missing
            and reach out if a donor requests more detail. The id is the
            target of the page's bottom CTA anchor. */}
        <ScrollReveal variant="fade-up" delay={300} className="w-full flex justify-center">
          <div id="nonprofit-submission" className="w-full flex justify-center scroll-mt-24">
            <NonprofitSubmissionForm />
          </div>
        </ScrollReveal>

        <ScrollReveal variant="fade-in" delay={400}>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Prefer a call?{" "}
            <Link
              href={SOCIALS.NONPROFIT_HELP_FORM}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Reach out to our team
            </Link>
            .
          </p>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
