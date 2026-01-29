import { Sprout } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

export function SeedsHero() {
  return (
    <section
      className={cn(
        marketingLayoutTheme.padding,
        "flex flex-col items-center w-full pt-20 md:pt-32 pb-8 seeds-gradient-bg relative"
      )}
    >
      {/* Decorative seed icons floating */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <Sprout className="absolute top-20 left-[10%] w-6 h-6 text-emerald-300/30 dark:text-emerald-400/20 seeds-float rotate-12" />
        <Sprout className="absolute top-40 right-[15%] w-8 h-8 text-green-300/25 dark:text-green-400/15 seeds-float-delayed -rotate-12" />
        <Sprout className="absolute bottom-20 left-[20%] w-5 h-5 text-teal-300/30 dark:text-teal-400/20 seeds-float-slow rotate-45" />
      </div>

      <SectionContainer className="flex flex-col items-center gap-8 relative z-10">
        {/* Badge */}
        <div className="seeds-fade-in">
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/50 px-4 py-1.5 text-sm font-medium shadow-sm seeds-pulse"
          >
            <Sprout className="w-4 h-4 mr-2" />
            Introducing Karma Seeds
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
          A simple way to <span className="seeds-gradient-text">back projects you believe in</span>
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
          For every dollar you contribute to a project, you get one Seed—a token that lives in your
          wallet as proof you believed early. Projects can reward their Seed holders with early
          access, rev share, or future token allocations. What happens next is up to them and you.
        </p>

        {/* CTA Button */}
        <div className="w-full flex flex-col sm:flex-row justify-start md:justify-center gap-4 max-w-[768px] md:mx-auto seeds-fade-in seeds-fade-in-delay-3">
          <Button
            asChild
            className="relative bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-semibold px-8 py-6 text-base seeds-glow transition-all duration-300 group"
          >
            <Link href="#projects">
              <Sprout className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
              Explore Projects
            </Link>
          </Button>
        </div>

        {/* Stats Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 mt-12 pt-10 w-full max-w-[800px] seeds-fade-in seeds-fade-in-delay-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-2xl blur-xl" />
            <div className="relative flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-white/10 dark:to-white/5 border border-emerald-100/50 dark:border-emerald-800/30 backdrop-blur-sm">
              <span className="text-4xl font-bold seeds-gradient-text">$1</span>
              <span className="text-sm text-muted-foreground mt-1 font-medium">= 1 Seed</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent rounded-2xl blur-xl" />
            <div className="relative flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-white/10 dark:to-white/5 border border-green-100/50 dark:border-green-800/30 backdrop-blur-sm">
              <span className="text-4xl font-bold seeds-gradient-text">ERC-20</span>
              <span className="text-sm text-muted-foreground mt-1 font-medium">
                token in your wallet
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-transparent rounded-2xl blur-xl" />
            <div className="relative flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-white/10 dark:to-white/5 border border-teal-100/50 dark:border-teal-800/30 backdrop-blur-sm">
              <span className="text-4xl font-bold seeds-gradient-text">Fixed</span>
              <span className="text-sm text-muted-foreground mt-1 font-medium">
                price by design
              </span>
            </div>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
