import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

export function CTASection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "pb-16 md:pb-24")}>
      <SectionContainer>
        <div className="flex flex-col items-center gap-6">
          <h2 className="section-title text-foreground text-center">
            Ready to upgrade your next grant cycle?
          </h2>
          <p className="text-base md:text-xl font-normal text-muted-foreground text-center leading-[30px] tracking-normal max-w-lg">
            30-minute call. No commitment. We&apos;ll show you exactly how Karma works for
            foundations your size.
          </p>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto px-4 md:px-0">
            <Button
              asChild
              className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium px-6 py-2.5"
            >
              <Link href={SOCIALS.PARTNER_FORM} target="_blank" rel="noopener noreferrer">
                Schedule a Demo
              </Link>
            </Button>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
