"use client";

import { ArrowDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { InfiniteMovingCards } from "@/src/components/ui/infinite-moving-cards";
import { RotatingWord } from "@/src/features/home/components/rotating-word";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

const ROTATING_TARGETS = ["nonprofits", "projects", "initiatives"];

export function Hero() {
  const communityItems = chosenCommunities(true).map((community) => ({
    text: community.name,
    image: community.imageURL,
    href: PAGES.COMMUNITY.ALL_GRANTS(community.slug),
  }));

  return (
    <section
      className={cn(
        marketingLayoutTheme.padding,
        "flex flex-col items-start w-full pt-16 md:pt-24"
      )}
    >
      {/* Left-aligned editorial composition. The hero now matches the
          workflow section's left-aligned rhythm instead of shifting from
          centered SaaS-stack to editorial mid-page. */}
      <SectionContainer className="flex flex-col items-start gap-10 md:gap-12">
        {/* Category eyebrow signals product type for cold traffic before
            they read the H1's audience promise. */}
        <ScrollReveal variant="fade-up" duration={700}>
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-foreground/40" />
            <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted-foreground">
              Agentic funding software · for foundations and donor advisors
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal variant="fade-up" delay={100} duration={800}>
          <div className="flex flex-col gap-5 md:gap-6">
            <h1
              className={cn(
                "font-display font-medium text-foreground",
                "text-[40px] md:text-[56px] lg:text-[64px]",
                "leading-[105%] tracking-[-0.02em]",
                "max-w-[1080px]"
              )}
            >
              <span className="sr-only">
                Fund nonprofits, projects, and initiatives with AI agents.
              </span>
              <span aria-hidden>
                Fund <RotatingWord words={ROTATING_TARGETS} className="italic" /> with AI agents.
              </span>
            </h1>
            <p
              className={cn(
                "text-muted-foreground font-normal text-base md:text-lg lg:text-xl",
                "leading-[160%]",
                "max-w-[680px]"
              )}
            >
              Karma is the funding platform foundation officers and donor advisors run from ChatGPT,
              Claude, or any agent they already use, or right here in the browser. Discover
              projects, approve funding, pull grantee updates, and generate reports.
            </p>
          </div>
        </ScrollReveal>

        {/* Primary CTA is the demo. Secondary is demoted to a text link
            with a downward arrow — it's a detour, not a conversion, so
            it shouldn't claim equal visual mass. */}
        <ScrollReveal variant="fade-up" delay={250} duration={800}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-7">
            <Button asChild size="xl">
              <Link href={SOCIALS.PARTNER_FORM} target="_blank" rel="noopener noreferrer">
                Schedule a demo
              </Link>
            </Button>
            <Link
              href="#why-karma"
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium",
                "text-foreground hover:text-foreground/80 transition-colors",
                "group"
              )}
            >
              Why funders pick Karma
              <ArrowDown
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-y-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </ScrollReveal>

        {/* Trust strip. The number (30+) earns the typographic weight that
            the marquee used to absorb. Marquee stays as supporting proof
            but at smaller visual mass. */}
        <ScrollReveal variant="fade-in" delay={400} duration={900} className="w-full min-w-0">
          <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-10 w-full min-w-0 mt-2 md:mt-4">
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <span
                className={cn(
                  "font-display font-medium text-foreground",
                  "text-[40px] md:text-[48px] leading-none tracking-[-0.02em] tabular-nums"
                )}
              >
                30+
              </span>
              <span className="text-[11px] font-medium tracking-[0.16em] uppercase text-muted-foreground">
                Funding programs running on Karma
              </span>
            </div>
            <div className="flex-1 min-w-0 -mx-4 md:mx-0 overflow-hidden md:[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              <InfiniteMovingCards
                items={communityItems}
                variant="pill"
                direction="left"
                speed="slow"
                pauseOnHover
                className="w-full min-w-0"
              />
            </div>
          </div>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
