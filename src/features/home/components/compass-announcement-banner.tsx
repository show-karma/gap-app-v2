import { ArrowRight, Compass } from "lucide-react";
import Link from "next/link";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { NONPROFITS_ORIGIN } from "@/utilities/domains";
import { cn } from "@/utilities/tailwind";

/** Homepage announcement for Karma Compass, the separate nonprofits app. */
export function CompassAnnouncementBanner() {
  return (
    <div className={cn(marketingLayoutTheme.padding, "w-full pt-8")}>
      <SectionContainer>
        <Link
          href={NONPROFITS_ORIGIN}
          className={cn(
            "group flex w-full items-center justify-between gap-4 rounded-2xl border-2 border-brand-300 px-5 py-4 shadow-md transition",
            "bg-gradient-to-r from-brand-100 via-brand-50 to-card",
            "dark:border-brand-700 dark:from-brand-900 dark:via-brand-950 dark:to-card",
            "hover:border-brand-500 hover:shadow-lg",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "max-md:flex-col max-md:items-start max-md:gap-3 max-md:px-4"
          )}
        >
          <div className="flex items-center gap-4 max-md:items-start max-md:gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-brand-950"
            >
              <Compass className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-base font-semibold text-foreground">Introducing Karma Compass</p>
              <p className="text-sm text-muted-foreground">
                AI-powered board management for nonprofits
              </p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-brand-700 dark:bg-brand-500 dark:text-brand-950 dark:group-hover:bg-brand-400 max-md:ml-14">
            Try Compass
            <ArrowRight
              aria-hidden
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </span>
        </Link>
      </SectionContainer>
    </div>
  );
}
