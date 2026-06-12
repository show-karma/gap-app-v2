import Link from "next/link";
import { RightArrowIcon } from "@/components/Icons/RightArrow";
import { NON_PROFITS_PAGES } from "@/utilities/pages";

const bannerLink = NON_PROFITS_PAGES.HOME;

export function NewFeatureBanner() {
  return (
    <div className="relative w-full">
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-emerald-400/25 via-teal-300/15 to-emerald-400/25 blur-md [animation-duration:4s] motion-reduce:animate-none dark:from-emerald-500/15 dark:via-teal-400/10 dark:to-emerald-500/15"
      />
      <Link
        href={bannerLink}
        className="group relative flex w-full items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700 max-md:flex-col max-md:items-start max-md:gap-3 max-md:px-4 max-md:py-3"
      >
        <div className="flex items-center gap-3">
          <span className="shrink-0 bg-emerald-500 px-3 py-1 text-[11px] font-bold uppercase text-white [clip-path:polygon(0_0,100%_0,calc(100%-8px)_50%,100%_100%,0_100%)]">
            New
          </span>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 max-md:text-xs">
            We just launched funder search for nonprofits
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-emerald-600 underline underline-offset-4 dark:text-emerald-400 max-md:text-xs">
          Try it now
          <RightArrowIcon />
        </span>
      </Link>
    </div>
  );
}
