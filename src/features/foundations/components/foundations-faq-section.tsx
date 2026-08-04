import { MinusCircle, PlusCircle } from "lucide-react";
import { SectionContainer } from "@/src/components/shared/section-container";
import { FOUNDATION_FAQS } from "@/src/features/foundations/content";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

/**
 * Visible FAQ for /foundations: native `<details>`/`<summary>` styled to
 * match the site's accordion (border-separated rows, plus/minus
 * affordance — the same look the shared Radix accordion gives the
 * homepage; `QueryDisclosure` is the existing details/summary precedent).
 *
 * Why not the shared Radix accordion: it unmounts closed answers, so
 * they never reach the server HTML and answer engines cannot read them.
 * `<details>` keeps every answer in the DOM and the served HTML — merely
 * visually collapsed, never `[hidden]` — with zero JS, working
 * expand/collapse before hydration, and native find-in-page
 * auto-expansion. All entries start collapsed, matching the previous
 * accordion's default state (its `defaultValue` matched no item).
 *
 * Content comes from the same `FOUNDATION_FAQS` source as the page's
 * FAQPage JSON-LD, so the two can never drift (E1 pattern).
 */
export function FoundationsFaqSection() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 w-full")}>
      <SectionContainer>
        <div className="flex flex-col items-center gap-4 max-w-4xl mx-auto px-4">
          <h2 className="section-title text-foreground text-center">Frequently asked questions</h2>
          <p className="text-base md:text-lg font-normal text-muted-foreground text-center leading-[28px]">
            How foundations run application intake, review, milestone-based payments, and impact
            reporting on Karma.
          </p>
        </div>
        <div className="max-w-4xl mx-auto mb-8 md:mb-12 px-4 mt-10">
          {FOUNDATION_FAQS.map((faq) => (
            <details key={faq.question} className="group border-b border-border last:border-b-0">
              <summary className="flex cursor-pointer list-none items-center py-4 [&::-webkit-details-marker]:hidden">
                <span className="flex-1 pr-4 text-left text-base font-medium leading-[28px] tracking-normal text-foreground">
                  {faq.question}
                </span>
                <span aria-hidden="true" className="relative ml-2 h-6 w-6 flex-shrink-0">
                  <PlusCircle className="absolute inset-0 h-6 w-6 text-muted-foreground group-open:hidden" />
                  <MinusCircle className="absolute inset-0 hidden h-6 w-6 text-muted-foreground group-open:block" />
                </span>
              </summary>
              <p className="pb-4 pt-0 text-base font-normal leading-6 tracking-normal text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
