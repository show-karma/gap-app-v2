import { FIND_FUNDERS_FAQS } from "../lib/faq-content";

/**
 * FAQ section for the find-funders landing page.
 *
 * Deliberately NOT a `"use client"` module: it renders no hooks and no
 * handlers, so the same component serves both trees that must stay in sync —
 * the interactive landing page (client tree, via LandingPageClient) and the
 * root layout's <noscript> replica (Server Component tree, via
 * FindFundersNoscriptHero). The copy comes from lib/faq-content, the same
 * array that feeds the page's FAQPage JSON-LD, so the structured data, the
 * interactive page, and the no-JS page can never drift apart.
 */
export function LandingFaq() {
  return (
    <section id="faq">
      <div className="lp-container">
        <div className="lp-section-head">
          <div>
            <div className="lp-section-label">08 &mdash; FAQ</div>
            <h2 className="lp-section-title">
              Common questions,
              <br />
              <span className="italic">answered straight.</span>
            </h2>
          </div>
        </div>

        <dl className="lp-faq-list">
          {FIND_FUNDERS_FAQS.map((faq) => (
            <div key={faq.question} className="lp-faq-item">
              <dt className="lp-faq-q">{faq.question}</dt>
              <dd className="lp-faq-a">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
