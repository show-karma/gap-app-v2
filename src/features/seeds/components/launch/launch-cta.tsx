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
        "py-20 w-full scroll-mt-20 relative overflow-hidden"
      )}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-green-600/10 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-green-800/20"
        aria-hidden="true"
      />

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-green-400/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-green-300/10 blur-2xl" />
      </div>

      <SectionContainer className="relative z-10">
        <div className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto">
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
          >
            <Rocket className="w-4 h-4 mr-1.5" />
            Ready to Launch?
          </Badge>

          <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Start accepting support today
          </h2>

          <p className="text-xl text-muted-foreground max-w-2xl">
            Launch Seeds for your project in minutes. No smart contracts to deploy, no token
            economics to design. Just transparent funding from your community.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative">
              {/* Blurred gradient background for primary CTA */}
              <div
                className="pointer-events-none absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-400 opacity-50 blur-md rounded-lg"
                aria-hidden="true"
              />
              <Button
                asChild
                size="lg"
                className="relative bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
              >
                <Link href="/dashboard">
                  <Rocket className="w-5 h-5 mr-2" />
                  Launch Seeds
                </Link>
              </Button>
            </div>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-green-600 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-950/50 px-8 py-6 text-lg"
            >
              <Link href={SOCIALS.TELEGRAM} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5 mr-2" />
                Talk to Us First
              </Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Questions? We're happy to help you get set up.
          </p>

          {/* Link back to supporter page */}
          <div className="mt-8 pt-8 border-t border-green-200/50 dark:border-green-800/50 w-full max-w-md">
            <p className="text-muted-foreground mb-3">Looking to support a project instead?</p>
            <Button
              asChild
              variant="ghost"
              className="text-green-700 hover:text-green-800 hover:bg-green-100/50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30"
            >
              <Link href="/seeds">
                Explore projects with Seeds
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
