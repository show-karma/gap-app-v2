import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

export function CTASection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "pb-16 md:pb-24")}>
      <SectionContainer>
        <div className="flex flex-col items-center gap-6">
          <h2 className="section-title text-foreground text-center">
            Ready to give with confidence?
          </h2>
          <p className="text-base md:text-xl font-normal text-muted-foreground text-center leading-[30px] tracking-normal max-w-lg">
            Start with the nonprofits already on Karma, or tell us about your giving priorities and
            we&apos;ll walk you through it.
          </p>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto px-4 md:px-0">
            <Button
              asChild
              className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium px-6 py-2.5"
            >
              <Link href={PAGES.PROJECTS_EXPLORER}>Explore nonprofits</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-md font-medium px-6 py-2.5">
              <Link href={SOCIALS.PARTNER_FORM} target="_blank" rel="noopener noreferrer">
                Talk to our team
              </Link>
            </Button>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
