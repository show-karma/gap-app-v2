import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { LayeredScreenshots } from "@/src/features/foundations/components/layered-screenshots";
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
      <SectionContainer className="flex flex-col items-center gap-8">
        {/* Badge */}
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
            For Foundations
          </Badge>
        </div>

        {/* Main Heading */}
        <h1
          className={cn(
            "text-foreground font-semibold text-[40px] md:text-5xl lg:text-[48px]",
            "leading-[110%] tracking-[-0.02em]",
            "text-left md:text-center max-w-[820px] w-full md:mx-auto"
          )}
        >
          AI-powered funding software that does the work for you
        </h1>

        {/* Description */}
        <p
          className={cn(
            "text-muted-foreground font-medium text-base md:text-lg",
            "text-left md:text-center",
            "max-w-[720px] w-full md:mx-auto"
          )}
        >
          Run grants, hackathons, and RFPs with a lean team. Karma&apos;s AI agents handle
          evaluation, milestone tracking, and impact reporting, so your team focuses on funding
          outcomes, not data entry.
        </p>

        {/* CTAs: primary demo, secondary in-page anchor for visitors not ready for a call */}
        <div className="w-full flex flex-col sm:flex-row justify-start md:justify-center gap-3 max-w-[768px] md:mx-auto">
          <Button asChild className="rounded-md font-semibold px-6 py-2.5">
            <Link href={SOCIALS.PARTNER_FORM} target="_blank" rel="noopener noreferrer">
              Schedule a demo
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-md font-medium px-6 py-2.5">
            <Link href="#the-platform">See the platform</Link>
          </Button>
        </div>

        {/* Layered product screenshots — above the fold proof for foundations.
            Moved here from the audience-neutral home hero so the home page can
            keep its switcher above the fold. */}
        <LayeredScreenshots className="mt-4" />
      </SectionContainer>
    </section>
  );
}
