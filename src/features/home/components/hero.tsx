"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SectionContainer } from "@/src/components/shared/section-container";
import { InfiniteMovingCards } from "@/src/components/ui/infinite-moving-cards";
import { RotatingWord } from "@/src/features/home/components/rotating-word";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

const ROTATING_TARGETS = ["organizations", "projects", "individuals"];

const PERSONA_CHIPS = [
  { label: "For foundations", hash: "#foundations" },
  { label: "For donors & advisors", hash: "#donors-advisors" },
  { label: "For nonprofits", hash: "#nonprofits" },
] as const;

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
        "flex flex-col items-center w-full pt-16 md:pt-28"
      )}
    >
      <SectionContainer className="flex flex-col items-center gap-8">
        {/* Main Heading. The rotating word is decorative (aria-hidden); the
            sr-only span gives screen readers and SEO crawlers one complete
            sentence covering all three audiences in their canonical order.
            The italic wrapper extends to both the invisible spacer and the
            active word so the slot's width matches the italic glyph metrics. */}
        <ScrollReveal variant="fade-up" duration={800}>
          <h1
            className={cn(
              "text-foreground font-semibold text-[36px] md:text-5xl lg:text-[56px]",
              "leading-[110%] tracking-[-0.025em]",
              "text-left md:text-center max-w-[920px] w-full md:mx-auto"
            )}
          >
            <span className="sr-only">
              Karma connects funders to organizations, projects, and individuals worth backing
            </span>
            <span aria-hidden>
              Karma connects funders to{" "}
              <span className="italic">
                <RotatingWord words={ROTATING_TARGETS} />
              </span>{" "}
              worth backing
            </span>
          </h1>
        </ScrollReveal>

        {/* Subtext: one sentence, one subject (Karma), three audiences in
            canonical order. Replaces the prior 40-word multi-subject blurb. */}
        <ScrollReveal variant="fade-up" delay={150} duration={800}>
          <p
            className={cn(
              "text-muted-foreground font-normal text-base md:text-lg lg:text-xl",
              "leading-[160%]",
              "text-left md:text-center",
              "max-w-[820px] w-full md:mx-auto"
            )}
          >
            Karma is the grantmaking software for foundations, the funder-facing profile builder for
            nonprofits, and the research engine that guides every donor gift.
          </p>
        </ScrollReveal>

        {/* Persona entry — three chips replace the demo-only primary CTA so
            every audience has an obvious next step above the fold. We use
            plain anchors with an explicit handler rather than next/link
            because Link uses history.pushState internally, which per spec
            does NOT fire a hashchange event — the audience switcher's
            hashchange listener would never hear the click. We replaceState
            (matching the switcher's tab clicks, so neither control spams
            history) and dispatch a synthetic hashchange, which also covers
            identical-hash re-clicks where a native hashchange wouldn't fire.
            Without JS, the plain href falls back to the anchor targets the
            switcher renders for each audience hash. */}
        <ScrollReveal variant="fade-up" delay={300} duration={800}>
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {PERSONA_CHIPS.map((chip) => {
                const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  window.history.replaceState(null, "", chip.hash);
                  // The switcher's hashchange listener sets the active panel
                  // and scrolls it into view.
                  window.dispatchEvent(new HashChangeEvent("hashchange"));
                };
                return (
                  <a
                    key={chip.hash}
                    href={chip.hash}
                    onClick={onClick}
                    className={cn(
                      "group inline-flex items-center justify-center gap-2",
                      "rounded-full border border-border bg-secondary",
                      "px-5 py-2.5 text-sm font-medium text-foreground",
                      "transition-colors duration-200 hover:bg-foreground hover:text-background",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    )}
                  >
                    {chip.label}
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </a>
                );
              })}
            </div>

            {/* Quiet escape hatch for high-intent foundation visitors who
                already know they want a demo. */}
            <p className="text-sm text-muted-foreground">
              Or{" "}
              <Link
                href={SOCIALS.PARTNER_FORM}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-foreground transition-colors"
              >
                schedule a demo
              </Link>
              .
            </p>
          </div>
        </ScrollReveal>

        {/* Trust strip. Specific number replaces generic "leading organizations"
            and avoids the word "organizations" appearing thrice in the hero. */}
        <ScrollReveal variant="fade-in" delay={550} duration={900} className="w-full min-w-0">
          <div className="flex flex-col items-start md:items-center mt-2 gap-3 w-full min-w-0">
            <p className="text-muted-foreground font-medium text-xs tracking-wider uppercase">
              Powering 30+ funding programs
            </p>
            <div className="w-full min-w-0 -mx-4 md:-mx-8 flex flex-row items-center justify-center overflow-hidden">
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
