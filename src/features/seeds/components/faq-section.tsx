import { MessageCircleMore } from "lucide-react";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FAQAccordion } from "@/src/components/shared/faq-accordion";
import { SectionContainer } from "@/src/components/shared/section-container";
import { seedsFAQs } from "@/src/features/seeds/constants/faq-data";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { SOCIALS } from "@/utilities/socials";
import { cn } from "@/utilities/tailwind";

export function SeedsFAQ() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 md:py-24 w-full")}>
      <SectionContainer>
        <div className="flex flex-col items-start gap-5 mb-12 max-w-4xl mx-auto">
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/50 px-4 py-1.5 text-sm font-medium"
          >
            FAQs
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Frequently asked questions
          </h2>
          <p className="text-lg md:text-xl font-normal text-muted-foreground leading-relaxed">
            Common questions about how Seeds work.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-16">
          <FAQAccordion items={seedsFAQs} />
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/80 via-green-50/60 to-teal-100/80 dark:from-emerald-950/50 dark:via-green-950/30 dark:to-teal-950/50" />

            {/* Decorative blobs */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-emerald-300/30 to-green-400/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-teal-300/30 to-emerald-400/20 rounded-full blur-3xl" />

            <div className="relative px-8 py-12 md:px-12 md:py-14 flex flex-col items-center gap-6 border border-emerald-200/50 dark:border-emerald-800/30 rounded-3xl">
              <div className="flex flex-col items-center gap-3">
                <h3 className="text-2xl font-bold text-foreground text-center">
                  Still have questions?
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Can't find the answer you're looking for? Please reach out to our team.
                </p>
              </div>

              <div className="flex items-center md:flex-row flex-col gap-4">
                <ExternalLink href={SOCIALS.TELEGRAM}>
                  <Button className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-medium px-6 py-5 seeds-glow group">
                    <MessageCircleMore className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                    Ask in Telegram
                  </Button>
                </ExternalLink>
                <ExternalLink href={SOCIALS.DISCORD}>
                  <Button className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-medium px-6 py-5 seeds-glow group">
                    <MessageCircleMore className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                    Ask in Discord
                  </Button>
                </ExternalLink>
              </div>
            </div>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
