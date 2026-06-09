import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { ScrollReveal } from "@/src/features/home/components/scroll-reveal";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

export function CTASection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "pb-16 md:pb-24")}>
      <SectionContainer>
        <ScrollReveal variant="fade-up">
          <div className="flex flex-col items-center gap-6">
            <h2 className="section-title text-foreground text-center">
              One platform. Every side of the table.
            </h2>
            <p className="text-base md:text-lg font-normal text-muted-foreground text-center leading-[28px] px-4 max-w-xl">
              Foundations run grant programs. Donors find nonprofits worth backing. Nonprofits get
              found. Talk to us about the side you&apos;re on.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto px-4 sm:px-0">
              <Button asChild size="xl" className="w-full sm:w-auto">
                <Link href={SOCIALS.PARTNER_FORM} target="_blank" rel="noopener noreferrer">
                  Schedule a demo
                </Link>
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </SectionContainer>
    </section>
  );
}
