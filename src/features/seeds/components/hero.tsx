import { ArrowRightIcon, SparklesIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

export function Hero() {
  return (
    <section
      className={cn(
        marketingLayoutTheme.padding,
        "flex flex-col items-center justify-center w-full py-16 lg:py-24",
        "bg-gradient-to-b from-emerald-50/80 via-emerald-50/40 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/10 dark:to-transparent"
      )}
    >
      <SectionContainer className="flex flex-col items-center gap-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
          <SparklesIcon className="w-4 h-4" />
          <span>Now available on Sepolia Testnet</span>
        </div>

        {/* Main Heading */}
        <div className="flex flex-col items-center gap-4 text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
            Fund Projects with{" "}
            <span className="text-emerald-600 dark:text-emerald-400">Karma Seeds</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            A new way to support open source and public goods. Fixed price, no volatility, direct
            funding to project treasuries.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button
            asChild
            className="h-12 px-6 text-base font-medium bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl"
          >
            <Link href={PAGES.PROJECTS_EXPLORER}>
              Explore Projects
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 px-6 text-base font-medium rounded-xl border-2"
          >
            <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer">
              View Contract
            </a>
          </Button>
        </div>
      </SectionContainer>
    </section>
  );
}
