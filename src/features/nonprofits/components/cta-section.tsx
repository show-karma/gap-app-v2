"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { NON_PROFITS_PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

export function CTASection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "pb-16 md:pb-24")}>
      <SectionContainer>
        <ScrollReveal variant="fade-up">
          <div className="flex flex-col items-center gap-6">
            <h2 className="section-title text-foreground text-center">
              Drop your URL. Get found by funders.
            </h2>
            <p className="text-base md:text-xl font-normal text-muted-foreground text-center leading-[30px] tracking-normal max-w-xl">
              Add your nonprofit free in under a minute. Karma reads your website, builds your
              profile, and keeps it current as you publish.
            </p>
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto px-4 md:px-0">
              {/* Anchor sends visitors back to the form at the top of the page. */}
              <Button asChild className="rounded-md font-semibold px-6 py-2.5">
                <Link href="#nonprofit-submission">Add your nonprofit free</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-md font-medium px-6 py-2.5">
                <Link href={NON_PROFITS_PAGES.HOME}>Search funders first</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Want a hand?{" "}
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
          </div>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
