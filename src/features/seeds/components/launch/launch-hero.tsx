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
        "flex flex-col items-center w-full pt-20 md:pt-32 pb-8 seeds-gradient-bg relative"
      )}
    >
      {/* Decorative rocket icons floating */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <Rocket className="absolute top-24 left-[12%] w-6 h-6 text-seeds-300/30 dark:text-seeds-300/20 seeds-float rotate-45" />
        <Rocket className="absolute top-36 right-[18%] w-8 h-8 text-seeds-300/25 dark:text-seeds-300/15 seeds-float-delayed -rotate-12" />
        <Rocket className="absolute bottom-24 left-[22%] w-5 h-5 text-seeds-300/30 dark:text-seeds-300/20 seeds-float-slow rotate-[30deg]" />
      </div>

      <SectionContainer className="flex flex-col items-center gap-8 relative z-10">
        {/* Badge */}
        <div className="seeds-fade-in">
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-seeds-300/10 to-seeds-300/5 dark:from-seeds-300/20 dark:to-seeds-300/10 text-seeds-400 dark:text-seeds-300 border border-seeds-300/30 px-4 py-1.5 text-sm font-medium shadow-sm seeds-pulse"
          >
            <Rocket className="w-4 h-4 mr-2" />
            For Projects
          </Badge>
        </div>

        {/* Main Heading */}
        <h1
          className={cn(
            "text-foreground font-bold text-[42px] md:text-5xl lg:text-[64px]",
            "leading-[1.1] tracking-[-0.03em]",
            "text-left md:text-center max-w-[900px] w-full md:mx-auto",
            "seeds-fade-in seeds-fade-in-delay-1"
          )}
        >
          Raise funds <span className="seeds-gradient-text">without launching a token</span>
        </h1>

        {/* Description */}
        <p
          className={cn(
            "text-muted-foreground font-normal text-lg md:text-xl",
            "text-left md:text-center",
            "max-w-[720px] w-full md:mx-auto leading-relaxed",
            "seeds-fade-in seeds-fade-in-delay-2"
          )}
        >
          Karma Seeds let you raise funds from your community at $1 per seed. No token economics to
          design, no markets to manage, no speculation to worry about. Just transparent funding that
          goes directly to your treasury.
        </p>

        {/* CTA Button */}
        <div className="w-full flex flex-col sm:flex-row justify-start md:justify-center gap-4 max-w-[768px] md:mx-auto seeds-fade-in seeds-fade-in-delay-3">
          <Button
            asChild
            className="relative bg-gradient-to-r from-seeds-300 to-seeds-400 hover:from-seeds-200 hover:to-seeds-300 text-seeds-600 rounded-xl font-semibold px-8 py-6 text-base seeds-glow transition-all duration-300 group"
          >
            <Link href="#get-started">
              <Rocket className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
              Get Started
            </Link>
          </Button>
        </div>

        {/* Stats Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 mt-12 pt-10 w-full max-w-[800px] seeds-fade-in seeds-fade-in-delay-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-seeds-300/20 to-transparent rounded-2xl blur-xl" />
            <div className="relative flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-white/10 dark:to-white/5 border border-seeds-300/30 dark:border-seeds-300/20 backdrop-blur-sm">
              <span className="text-4xl font-bold seeds-gradient-text">$1</span>
              <span className="text-sm text-muted-foreground mt-1 font-medium">per Seed</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-seeds-300/20 to-transparent rounded-2xl blur-xl" />
            <div className="relative flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-white/10 dark:to-white/5 border border-seeds-300/30 dark:border-seeds-300/20 backdrop-blur-sm">
              <span className="text-4xl font-bold seeds-gradient-text">Direct</span>
              <span className="text-sm text-muted-foreground mt-1 font-medium">
                to your treasury
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-seeds-300/20 to-transparent rounded-2xl blur-xl" />
            <div className="relative flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-white/10 dark:to-white/5 border border-seeds-300/30 dark:border-seeds-300/20 backdrop-blur-sm">
              <span className="text-4xl font-bold seeds-gradient-text">No</span>
              <span className="text-sm text-muted-foreground mt-1 font-medium">token baggage</span>
            </div>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
