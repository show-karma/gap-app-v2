import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
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

        <h1
          className={cn(
            "text-foreground font-semibold text-[40px] md:text-5xl lg:text-[48px]",
            "leading-[110%] tracking-[-0.02em]",
            "text-left md:text-center max-w-[820px] w-full md:mx-auto"
          )}
        >
          Find nonprofits you can actually trust to get results
        </h1>

        <p
          className={cn(
            "text-muted-foreground font-medium text-base md:text-lg",
            "text-left md:text-center",
            "max-w-[720px] w-full md:mx-auto"
          )}
        >
          Karma surfaces vetted, active nonprofits matched to your giving priorities, so you can
          move from &ldquo;I want to give&rdquo; to &ldquo;I found the right organization&rdquo; in
          minutes, not months.
        </p>

        <div className="w-full flex flex-col sm:flex-row justify-start md:justify-center gap-3 max-w-[640px] md:mx-auto">
          <Button
            asChild
            className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium px-6 py-2.5"
          >
            <Link href={PAGES.PROJECTS_EXPLORER}>Start discovering nonprofits</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-md font-medium px-6 py-2.5">
            <Link href={SOCIALS.PARTNER_FORM} target="_blank" rel="noopener noreferrer">
              Talk to our team
            </Link>
          </Button>
        </div>
      </SectionContainer>
    </section>
  );
}
