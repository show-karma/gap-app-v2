"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { InfiniteMovingCards } from "@/src/components/ui/infinite-moving-cards";
import { ThemeImage } from "@/src/components/ui/theme-image";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

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
        {/* Main Heading */}
        <ScrollReveal variant="fade-up" duration={800}>
          <h1
            className={cn(
              "text-foreground font-semibold text-[36px] md:text-5xl lg:text-[56px]",
              "leading-[110%] tracking-[-0.025em]",
              "text-left md:text-center max-w-[820px] w-full md:mx-auto"
            )}
          >
            Funding software that does the work for you
          </h1>
        </ScrollReveal>

        {/* Description */}
        <ScrollReveal variant="fade-up" delay={150} duration={800}>
          <p
            className={cn(
              "text-muted-foreground font-normal text-base md:text-lg lg:text-xl",
              "leading-[160%]",
              "text-left md:text-center",
              "max-w-[640px] w-full md:mx-auto"
            )}
          >
            Run grants, hackathons, and RFPs with a lean team. AI-powered evaluation,
            automated milestone tracking, and real-time impact reporting so you can
            focus on funding what matters.
          </p>
        </ScrollReveal>

        {/* CTA Buttons */}
        <ScrollReveal variant="fade-up" delay={300} duration={800}>
          <div className="w-full flex flex-col sm:flex-row justify-start md:justify-center gap-3 max-w-[640px] md:mx-auto">
            <Button
              asChild
              size="xl"
            >
              <Link href={SOCIALS.PARTNER_FORM} target="_blank" rel="noopener noreferrer">
                Schedule a Demo
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="xl"
            >
              <Link href={PAGES.COMMUNITIES}>
                Explore Organizations
              </Link>
            </Button>
          </div>
        </ScrollReveal>

        {/* Product Screenshots - layered composition */}
        <div className="w-full max-w-[960px] mx-auto mt-4 relative">
          {/* Back image - project registry, offset right and up */}
          <ScrollReveal variant="fade-up" delay={500} duration={900}>
            <div className="w-[75%] ml-auto rounded-xl overflow-hidden border border-border shadow-md">
              <ThemeImage
                src="/images/homepage/funder-benefit-02.png"
                alt="Karma project registry"
                width={720}
                height={450}
                className="w-full h-auto"
              />
            </div>
          </ScrollReveal>

          {/* Front image - application evaluation, overlapping from the left */}
          <ScrollReveal variant="fade-up" delay={350} duration={900}>
            <div className="w-[75%] -mt-[30%] relative z-10 rounded-xl overflow-hidden border border-border shadow-xl">
              <ThemeImage
                src="/images/homepage/funder-benefit-01.png"
                alt="Karma application evaluation dashboard"
                width={720}
                height={450}
                className="w-full h-auto"
              />
            </div>
          </ScrollReveal>
        </div>

        {/* Trusted By */}
        <ScrollReveal variant="fade-in" delay={600} duration={1000}>
          <div className="flex flex-col items-start md:items-center mt-4 gap-3 w-full">
            <p className="text-muted-foreground font-medium text-xs tracking-wider uppercase">
              Trusted by leading organizations
            </p>
            <div className="w-full -mx-4 md:-mx-8 flex flex-row items-center justify-center">
              <InfiniteMovingCards
                items={communityItems}
                variant="pill"
                direction="left"
                speed="slow"
                pauseOnHover
                className="w-full"
              />
            </div>
          </div>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
