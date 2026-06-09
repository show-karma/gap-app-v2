import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";
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

        <h1
          className={cn(
            "text-foreground font-semibold text-[40px] md:text-5xl lg:text-[48px]",
            "leading-[110%] tracking-[-0.02em]",
            "text-left md:text-center max-w-[820px] w-full md:mx-auto"
          )}
        >
          Just share your website. We&apos;ll do the rest.
        </h1>

        <p
          className={cn(
            "text-muted-foreground font-medium text-base md:text-lg",
            "text-left md:text-center",
            "max-w-[760px] w-full md:mx-auto"
          )}
        >
          Karma indexes your site to build your funder-facing profile, then runs your impact
          reporting and social with AI agents so funders see what you&apos;re doing in real time.
          Free for nonprofits. Funders pay us, not you.
        </p>

        <div className="w-full flex flex-col sm:flex-row justify-start md:justify-center gap-3 max-w-[640px] md:mx-auto">
          <Button
            asChild
            className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium px-6 py-2.5"
          >
            <Link href={PAGES.CREATE_PROJECT_PROFILE}>Add your nonprofit free</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-md font-medium px-6 py-2.5">
            <Link href={NON_PROFITS_PAGES.HOME}>Find funders for free</Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-1">
          Prefer a call?{" "}
          <Link
            href={SOCIALS.PARTNER_FORM}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Book one with our team
          </Link>
          .
        </p>
      </SectionContainer>
    </section>
  );
}
