import { FIND_FUNDERS_FAQ_LINKS, FIND_FUNDERS_FAQS } from "../lib/faq-content";

const LINK_TARGETS = Object.keys(FIND_FUNDERS_FAQ_LINKS).sort((a, b) => b.length - a.length);

const LINK_SPLITTER = new RegExp(
  `(${LINK_TARGETS.map((target) => target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`
);

/**
 * Renders an FAQ answer, turning the URL mentions listed in
 * FIND_FUNDERS_FAQ_LINKS into anchors. The answer string itself stays plain
 * text because the FAQPage JSON-LD serializes it verbatim; only the two
 * visible renderings (landing page and noscript replica) get real links.
 */
function FaqAnswer({ text }: { text: string }) {
  return (
    <>
      {text.split(LINK_SPLITTER).map((part) => {
        const href = FIND_FUNDERS_FAQ_LINKS[part];
        if (!href) return part;
        const external = href.startsWith("https://");
        return (
          <a
            // Answers never repeat a URL, so the linked part is a stable key.
            key={part}
            href={href}
            className="lp-faq-link"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {part}
          </a>
        );
      })}
    </>
  );
}

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
              <dd className="lp-faq-a">
                <FaqAnswer text={faq.answer} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
