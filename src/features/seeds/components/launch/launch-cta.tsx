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
        <div className="absolute inset-0 bg-gradient-to-br from-seeds-300/15 via-seeds-300/5 to-seeds-300/15 dark:from-seeds-300/10 dark:via-seeds-300/5 dark:to-seeds-300/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/80" />
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="seeds-blob seeds-float absolute top-10 right-10 w-48 h-48 bg-gradient-to-br from-seeds-300/20 to-seeds-300/10 blur-3xl" />
        <div className="seeds-blob seeds-float-delayed absolute bottom-10 left-10 w-56 h-56 bg-gradient-to-br from-seeds-300/20 to-seeds-300/10 blur-3xl" />
        <div className="seeds-blob seeds-float-slow absolute top-1/2 right-1/4 w-36 h-36 bg-gradient-to-br from-seeds-300/15 to-seeds-300/10 blur-2xl" />

        {/* Floating rocket icons */}
        <Rocket className="absolute top-1/4 left-[20%] w-8 h-8 text-seeds-300/25 dark:text-seeds-300/20 seeds-float rotate-45" />
        <Rocket className="absolute bottom-1/3 right-[15%] w-6 h-6 text-seeds-300/25 dark:text-seeds-300/20 seeds-float-delayed rotate-12" />
      </div>

      <SectionContainer className="relative z-10">
        <div className="flex flex-col items-center text-center gap-8 max-w-3xl mx-auto">
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-seeds-300/10 to-seeds-300/5 dark:from-seeds-300/20 dark:to-seeds-300/10 text-seeds-400 dark:text-seeds-300 border border-seeds-300/30 px-4 py-1.5 text-sm font-medium seeds-pulse"
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
              className="bg-gradient-to-r from-seeds-300 to-seeds-400 hover:from-seeds-200 hover:to-seeds-300 text-seeds-600 rounded-xl font-semibold px-10 py-7 text-lg seeds-glow group"
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
              className="border-seeds-300 text-seeds-400 hover:bg-seeds-300/10 dark:border-seeds-300/50 dark:text-seeds-300 dark:hover:bg-seeds-300/10 rounded-xl font-medium px-10 py-7 text-lg group"
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
              className="text-seeds-400 hover:text-seeds-500 hover:bg-seeds-300/10 dark:text-seeds-300 dark:hover:text-seeds-200 dark:hover:bg-seeds-300/10 rounded-xl font-medium px-6 py-5 group"
            >
              <Link href="/seeds/fund">
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
