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
    <section className={cn(marketingLayoutTheme.padding, "py-16 w-full")}>
      <SectionContainer>
        <div className="flex flex-col items-start gap-4 mb-10 max-w-4xl mx-auto">
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
          >
            FAQs
          </Badge>
          <h2 className="section-title text-foreground">Frequently asked questions</h2>
          <p className="text-xl font-normal text-muted-foreground leading-[30px] tracking-normal">
            Common questions about how Seeds work.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-12">
          <FAQAccordion items={seedsFAQs} />
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl px-8 py-10 flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-xl font-medium text-foreground text-center leading-[30px] tracking-normal">
                Still have questions?
              </h3>
              <p className="font-normal text-muted-foreground text-center leading-7 tracking-normal">
                Can't find the answer you're looking for? Please reach out to our team.
              </p>
            </div>

            <div className="flex items-center md:flex-row flex-col gap-4">
              <ExternalLink href={SOCIALS.TELEGRAM}>
                <Button
                  variant="default"
                  className="px-4 py-2.5 text-sm font-medium bg-green-600 text-white hover:bg-green-700 border-0 shadow"
                >
                  <MessageCircleMore className="w-4 h-4" />
                  Ask in Telegram
                </Button>
              </ExternalLink>
              <ExternalLink href={SOCIALS.DISCORD}>
                <Button
                  variant="default"
                  className="px-4 py-2.5 text-sm font-medium bg-green-600 text-white hover:bg-green-700 border-0 shadow"
                >
                  <MessageCircleMore className="w-4 h-4" />
                  Ask in Discord
                </Button>
              </ExternalLink>
            </div>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
