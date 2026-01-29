import { ArrowRight, MessageCircle, Rocket } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

export function LaunchCTA() {
  return (
    <section
      className={cn(
        marketingLayoutTheme.padding,
        "py-24 md:py-32 w-full scroll-mt-20 relative overflow-hidden"
      )}
    >
      {/* Multi-layered gradient background */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/60 via-green-50/40 to-teal-100/60 dark:from-emerald-950/40 dark:via-green-950/20 dark:to-teal-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/80" />
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="seeds-blob seeds-float absolute top-10 right-10 w-48 h-48 bg-gradient-to-br from-emerald-400/20 to-green-400/10 blur-3xl" />
        <div className="seeds-blob seeds-float-delayed absolute bottom-10 left-10 w-56 h-56 bg-gradient-to-br from-teal-400/20 to-emerald-400/10 blur-3xl" />
        <div className="seeds-blob seeds-float-slow absolute top-1/2 right-1/4 w-36 h-36 bg-gradient-to-br from-green-300/15 to-teal-300/10 blur-2xl" />

        {/* Floating rocket icons */}
        <Rocket className="absolute top-1/4 left-[20%] w-8 h-8 text-emerald-300/25 dark:text-emerald-500/20 seeds-float rotate-45" />
        <Rocket className="absolute bottom-1/3 right-[15%] w-6 h-6 text-green-300/25 dark:text-green-500/20 seeds-float-delayed rotate-12" />
      </div>

      <SectionContainer className="relative z-10">
        <div className="flex flex-col items-center text-center gap-8 max-w-3xl mx-auto">
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/50 px-4 py-1.5 text-sm font-medium seeds-pulse"
          >
            <Rocket className="w-4 h-4 mr-2" />
            Ready to Launch?
          </Badge>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight">
            Start accepting support today
          </h2>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed">
            Launch Seeds for your project in minutes. No smart contracts to deploy, no token
            economics to design. Just transparent funding from your community.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 mt-4">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-semibold px-10 py-7 text-lg seeds-glow group"
            >
              <Link href="/dashboard">
                <Rocket className="w-6 h-6 mr-2 transition-transform group-hover:scale-110" />
                Launch Seeds
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/50 rounded-xl font-medium px-10 py-7 text-lg group"
            >
              <Link href={SOCIALS.TELEGRAM} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-6 h-6 mr-2 transition-transform group-hover:scale-110" />
                Talk to Us First
              </Link>
            </Button>
          </div>

          <p className="text-muted-foreground mt-2">
            Questions? We're happy to help you get set up.
          </p>

          {/* Link back to supporter page */}
          <div className="mt-12 pt-10 w-full max-w-lg">
            <div className="seeds-line mb-8" />
            <p className="text-muted-foreground mb-4 text-lg">
              Looking to support a project instead?
            </p>
            <Button
              asChild
              variant="ghost"
              className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/30 rounded-xl font-medium px-6 py-5 group"
            >
              <Link href="/seeds">
                Explore projects with Seeds
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
