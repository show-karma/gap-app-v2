import { renderToStaticMarkup } from "react-dom/server";
import { RESEARCH_FAQS } from "@/app/knowledge/nonprofit-due-diligence/content";
import NonprofitDueDiligencePage from "@/app/knowledge/nonprofit-due-diligence/page";

describe("RESEARCH_FAQS content", () => {
  it("has a question and a non-empty answer for every entry", () => {
    expect(RESEARCH_FAQS.length).toBeGreaterThanOrEqual(6);
    for (const entry of RESEARCH_FAQS) {
      expect(entry.question).toMatch(/\?$/);
      expect(entry.answer.length).toBeGreaterThan(0);
    }
  });

  it("answers the compliance-check question with the four real checks (P004)", () => {
    const compliance = RESEARCH_FAQS.find((f) => f.question.includes("IRS Pub 78"));
    expect(compliance?.answer).toContain("IRS Publication 78");
    expect(compliance?.answer).toContain("last three years");
    expect(compliance?.answer).toContain("California Attorney General");
    expect(compliance?.answer).toContain("governance");
  });

  it("keeps the state-registry claim scoped to the California AG registry", () => {
    // The product checks exactly one state registry (compliance-checks.ts).
    // Broadening this to "all states" would be an unverifiable claim.
    for (const entry of RESEARCH_FAQS) {
      expect(entry.answer).not.toMatch(/all (50 )?states|every state/i);
    }
  });

  it("answers the ranked-shortlist question with the five real dimensions (P003/P042)", () => {
    const shortlist = RESEARCH_FAQS.find((f) => f.question.includes("ranked nonprofit shortlist"));
    expect(shortlist?.answer).toMatch(/^Yes\./);
    for (const dimension of [
      "match with the donor's criteria",
      "compliance",
      "impact recency",
      "online presence",
      "social presence",
    ]) {
      expect(shortlist?.answer).toContain(dimension);
    }
  });

  it("answers the old-990 activity question (P034)", () => {
    const activity = RESEARCH_FAQS.find((f) => f.question.includes("still active"));
    expect(activity?.answer).toContain("Filings lag reality");
  });

  it("positions against Candid/Charity Navigator without describing their products (P009/P041)", () => {
    const comparison = RESEARCH_FAQS.find((f) => f.question.includes("Candid"));
    expect(comparison).toBeDefined();
    // Positioning is about Karma's workflow only, with no claims about what
    // competitors do or lack.
    expect(comparison?.answer).not.toMatch(/Candid (does|doesn|lacks|only)/i);
    expect(comparison?.answer).toContain("shortlist");
  });

  it("mentions ChatGPT nowhere (Codex-only copy convention)", () => {
    for (const entry of RESEARCH_FAQS) {
      expect(entry.question).not.toContain("ChatGPT");
      expect(entry.answer).not.toContain("ChatGPT");
    }
  });

  it("contains no em dashes in reader-visible copy", () => {
    for (const entry of RESEARCH_FAQS) {
      expect(entry.question).not.toContain("—");
      expect(entry.answer).not.toContain("—");
    }
  });
});

describe("/knowledge/nonprofit-due-diligence (server-rendered)", () => {
  // renderToStaticMarkup runs no effects and resolves no queries, so what it
  // produces is what a non-executing crawler receives from the server.
  function renderStatic(): Document {
    const html = renderToStaticMarkup(<NonprofitDueDiligencePage />);
    return new DOMParser().parseFromString(
      `<!doctype html><html><body>${html}</body></html>`,
      "text/html"
    );
  }

  function jsonLdSchemas(doc: Document): Array<Record<string, unknown>> {
    return Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).map(
      (script) => JSON.parse(script.textContent ?? "{}") as Record<string, unknown>
    );
  }

  it("renders every question and answer in the server HTML", () => {
    const text = renderStatic().body.textContent ?? "";

    for (const entry of RESEARCH_FAQS) {
      expect(text).toContain(entry.question);
      expect(text).toContain(entry.answer);
    }
  });

  it("emits FAQPage JSON-LD that mirrors the visible content 1:1", () => {
    const faq = jsonLdSchemas(renderStatic()).find((schema) => schema["@type"] === "FAQPage");
    expect(faq).toBeDefined();

    const entities = (faq as { mainEntity: Array<Record<string, unknown>> }).mainEntity;
    expect(entities).toHaveLength(RESEARCH_FAQS.length);
    entities.forEach((entity, index) => {
      expect(entity.name).toBe(RESEARCH_FAQS[index].question);
      expect((entity.acceptedAnswer as { text: string }).text).toBe(RESEARCH_FAQS[index].answer);
    });
  });

  it("emits Article JSON-LD with the recorded publication date", () => {
    const article = jsonLdSchemas(renderStatic()).find((schema) => schema["@type"] === "Article") as
      | { datePublished?: string }
      | undefined;
    expect(article).toBeDefined();
    expect(article?.datePublished).toBe("2026-08-04");
  });

  it("links back to the /nonprofit-research product page", () => {
    const link = renderStatic().querySelector('a[href="/nonprofit-research"]');
    expect(link).not.toBeNull();
  });
});
