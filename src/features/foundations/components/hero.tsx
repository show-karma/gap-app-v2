import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
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
            "text-left md:text-center max-w-[768px] w-full md:mx-auto"
          )}
        >
          Run professional grant programs without hiring more staff
        </h1>

        {/* Description */}
        <p
          className={cn(
            "text-muted-foreground font-medium text-base md:text-lg",
            "text-left md:text-center",
            "max-w-[640px] w-full md:mx-auto"
          )}
        >
          Structured intake, standardized evaluation, milestone tracking, and a live portfolio
          dashboard — purpose-built for lean foundations giving $500K to $2M per year.
        </p>

        {/* CTA Buttons */}
        <div className="w-full flex flex-col sm:flex-row justify-start md:justify-center gap-3 max-w-[768px] md:mx-auto">
          <Button
            asChild
            className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium px-6 py-2.5"
          >
            <Link href={SOCIALS.PARTNER_FORM} target="_blank" rel="noopener noreferrer">
              Schedule a Demo
            </Link>
          </Button>
        </div>
      </SectionContainer>
    </section>
  );
}
