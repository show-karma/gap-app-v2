import { SectionContainer } from "@/src/components/shared/section-container";
import { FOUNDATION_FAQS } from "@/src/features/foundations/content";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

/**
 * Visible FAQ for /foundations, server-rendered on purpose: the shared
 * accordion keeps closed answers out of the server HTML, so answer
 * engines never saw them. This section renders every question and answer
 * as a definition list (the reviewed E1 pattern), from the same
 * `FOUNDATION_FAQS` source the page's FAQPage JSON-LD uses — the two can
 * never drift.
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
        <dl className="max-w-4xl mx-auto mb-8 md:mb-12 px-4 mt-10 space-y-3">
          {FOUNDATION_FAQS.map((faq) => (
            <div key={faq.question} className="rounded-xl border border-border bg-card p-5">
              <dt className="text-base font-semibold text-foreground">{faq.question}</dt>
              <dd className="mt-1 text-base font-normal leading-6 text-muted-foreground">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </SectionContainer>
    </section>
  );
}
