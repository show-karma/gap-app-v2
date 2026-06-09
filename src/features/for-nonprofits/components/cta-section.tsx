import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { NON_PROFITS_PAGES, PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

export function CTASection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "pb-16 md:pb-24")}>
      <SectionContainer>
        <div className="flex flex-col items-center gap-6">
          <h2 className="section-title text-foreground text-center">
            Built for nonprofits. Paid by funders.
          </h2>
          <p className="text-base md:text-xl font-normal text-muted-foreground text-center leading-[30px] tracking-normal max-w-xl">
            Karma is free for nonprofits because foundations and donors pay for the funder side. AI
            agents make our cost to run your reporting and social near zero, so we pass it on.
          </p>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto px-4 md:px-0">
            <Button
              asChild
              className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium px-6 py-2.5"
            >
              <Link href={PAGES.CREATE_PROJECT_PROFILE}>Add your nonprofit free</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-md font-medium px-6 py-2.5">
              <Link href={NON_PROFITS_PAGES.HOME}>Try the funder search</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Want to talk it through?{" "}
            <Link
              href={SOCIALS.PARTNER_FORM}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Book a call
            </Link>
            .
          </p>
        </div>
      </SectionContainer>
    </section>
  );
}
