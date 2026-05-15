import { AGENT_FAQS } from "../content";

export function FaqSection() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-12">
      <header className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Frequently asked questions
        </h2>
      </header>
      <dl className="space-y-3">
        {AGENT_FAQS.map((faq) => (
          <div key={faq.question} className="rounded-xl border border-border bg-card p-5">
            <dt className="text-base font-semibold text-foreground">{faq.question}</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
