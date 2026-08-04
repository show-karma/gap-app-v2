import { RESEARCH_FAQS } from "@/src/features/donor-research/content";

/**
 * Visible FAQ for /nonprofit-research, server-rendered on purpose: the
 * research workspace itself is a signed-in client app, so this section
 * is the page's only crawlable content. Renders every question and
 * answer as a definition list (the reviewed E1 pattern), from the same
 * `RESEARCH_FAQS` source the page's FAQPage JSON-LD uses — the two can
 * never drift.
 */
export function ResearchFaqSection() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-12">
      <header className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Nonprofit research for donor advisors
        </h2>
        <p className="text-base text-muted-foreground">
          What Karma checks, how shortlists are ranked, and how the advisor workflow runs.
        </p>
      </header>
      <dl className="space-y-3">
        {RESEARCH_FAQS.map((faq) => (
          <div key={faq.question} className="rounded-xl border border-border bg-card p-5">
            <dt className="text-base font-semibold text-foreground">{faq.question}</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
