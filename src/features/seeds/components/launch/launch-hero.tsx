import { Rocket } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

export function LaunchHero() {
  return (
    <section
      className={cn(
        marketingLayoutTheme.padding,
        "flex flex-col items-center w-full pt-16 md:pt-24"
      )}
    >
      <SectionContainer className="flex flex-col items-center gap-6">
        {/* Badge */}
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
        >
          <Rocket className="w-4 h-4 mr-1.5" />
          For Projects
        </Badge>

        {/* Main Heading */}
        <h1
          className={cn(
            "text-foreground font-semibold text-[40px] md:text-5xl lg:text-[56px]",
            "leading-[110%] tracking-[-0.02em]",
            "text-left md:text-center max-w-[900px] w-full md:mx-auto"
          )}
        >
          Raise funds{" "}
          <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
            without launching a token
          </span>
        </h1>

        {/* Description */}
        <p
          className={cn(
            "text-muted-foreground font-medium text-base md:text-lg",
            "text-left md:text-center",
            "max-w-[768px] w-full md:mx-auto"
          )}
        >
          Karma Seeds let you raise funds from your community at $1 per seed. No token economics to
          design, no markets to manage, no speculation to worry about. Just transparent funding that
          goes directly to your treasury.
        </p>

        {/* CTA Button */}
        <div className="w-full flex flex-col sm:flex-row justify-start md:justify-center gap-3 max-w-[768px] md:mx-auto">
          <div className="relative">
            {/* Blurred gradient background for primary CTA */}
            <div
              className="pointer-events-none absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-400 opacity-40 blur-md rounded-lg"
              aria-hidden="true"
            />
            <Button
              asChild
              className="relative bg-green-600 text-white hover:bg-green-700 rounded-md font-medium px-6 py-2.5"
            >
              <Link href="#get-started">Get Started</Link>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 mt-8 pt-8 border-t border-border w-full max-w-[768px]">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-green-600 dark:text-green-400">$1</span>
            <span className="text-sm text-muted-foreground">per Seed</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-green-600 dark:text-green-400">Direct</span>
            <span className="text-sm text-muted-foreground">to your treasury</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-green-600 dark:text-green-400">No</span>
            <span className="text-sm text-muted-foreground">token baggage</span>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
