import { ArrowRight } from "lucide-react";
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
            "group flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition",
            "hover:border-primary/40 hover:shadow-md",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "max-md:flex-col max-md:items-start max-md:gap-3 max-md:px-4 max-md:py-3"
          )}
        >
          <div className="flex items-center gap-3 max-md:items-start">
            <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold uppercase text-primary-foreground">
              New
            </span>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Introducing Karma Compass</span>
              <span className="max-md:hidden"> · </span>
              <span className="max-md:block">
                AI agents that run your nonprofit&apos;s board meetings, over email.
              </span>
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary">
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
