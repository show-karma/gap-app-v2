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
            className="bg-gradient-to-r from-seeds-300/10 to-seeds-300/5 dark:from-seeds-300/20 dark:to-seeds-300/10 text-seeds-400 dark:text-seeds-300 border border-seeds-300/30 px-4 py-1.5 text-sm font-medium"
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
            <div className="absolute inset-0 bg-gradient-to-br from-seeds-300/15 via-seeds-300/5 to-seeds-300/15 dark:from-seeds-300/10 dark:via-seeds-300/5 dark:to-seeds-300/10" />

            {/* Decorative blobs */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-seeds-300/30 to-seeds-300/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-seeds-300/30 to-seeds-300/20 rounded-full blur-3xl" />

            <div className="relative px-8 py-12 md:px-12 md:py-14 flex flex-col items-center gap-6 border border-seeds-300/30 dark:border-seeds-300/20 rounded-3xl">
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
                  <Button className="bg-gradient-to-r from-seeds-300 to-seeds-400 hover:from-seeds-200 hover:to-seeds-300 text-seeds-600 rounded-xl font-medium px-6 py-5 seeds-glow group">
                    <MessageCircleMore className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                    Ask in Telegram
                  </Button>
                </ExternalLink>
                <ExternalLink href={SOCIALS.DISCORD}>
                  <Button className="bg-gradient-to-r from-seeds-300 to-seeds-400 hover:from-seeds-200 hover:to-seeds-300 text-seeds-600 rounded-xl font-medium px-6 py-5 seeds-glow group">
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
