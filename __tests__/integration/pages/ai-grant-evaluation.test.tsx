import { renderToStaticMarkup } from "react-dom/server";
import { AI_GRANT_EVALUATION_FAQS } from "@/app/knowledge/ai-grant-evaluation/content";
import AiGrantEvaluationPage from "@/app/knowledge/ai-grant-evaluation/page";
import {
  KNOWLEDGE_ARTICLE_DATES,
  KNOWLEDGE_ARTICLE_UPDATED_DATES,
} from "@/app/knowledge/articleDates";
import "@testing-library/jest-dom";

/**
 * /knowledge/ai-grant-evaluation — direct-answer content regressions
 * (DEV-595 experiment E6).
 *
 * `renderToStaticMarkup` runs no effects and resolves no queries, so these
 * assertions describe what a non-executing crawler receives from the server.
 */

function renderPage(): Document {
  const html = renderToStaticMarkup(<AiGrantEvaluationPage />);
  return new DOMParser().parseFromString(
    `<!doctype html><html><body>${html}</body></html>`,
    "text/html"
  );
}

function schemas(doc: Document): Record<string, unknown>[] {
  return Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).map(
    (script) => JSON.parse(script.textContent ?? "{}") as Record<string, unknown>
  );
}

describe("/knowledge/ai-grant-evaluation", () => {
  it("renders every target question and its full answer as visible text", () => {
    const text = renderPage().body.textContent ?? "";

    for (const faq of AI_GRANT_EVALUATION_FAQS) {
      expect(text).toContain(faq.question);
      expect(text).toContain(faq.answer);
    }
  });

  it("emits FAQPage JSON-LD built from the same array the visible sections render", () => {
    const faqSchema = schemas(renderPage()).find((schema) => schema["@type"] === "FAQPage") as
      | { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> }
      | undefined;

    expect(faqSchema).toBeDefined();
    expect(faqSchema?.mainEntity.map((entity) => entity.name)).toEqual(
      AI_GRANT_EVALUATION_FAQS.map((faq) => faq.question)
    );
    expect(faqSchema?.mainEntity.map((entity) => entity.acceptedAnswer.text)).toEqual(
      AI_GRANT_EVALUATION_FAQS.map((faq) => faq.answer)
    );
  });

  it("keeps its original published date and records the revision truthfully", () => {
    const published = KNOWLEDGE_ARTICLE_DATES["ai-grant-evaluation"];
    const updated = KNOWLEDGE_ARTICLE_UPDATED_DATES["ai-grant-evaluation"];
    expect(published).toBe("2026-01-07");
    expect(updated).toBeDefined();

    const article = schemas(renderPage()).find((schema) => schema["@type"] === "Article") as {
      datePublished?: string;
      dateModified?: string;
    };
    expect(article.datePublished).toBe(published);
    expect(article.dateModified).toBe(updated);
  });

  it("shows both dates to readers, so the structured data claims nothing invisible", () => {
    const doc = renderPage();
    const published = KNOWLEDGE_ARTICLE_DATES["ai-grant-evaluation"];
    const updated = KNOWLEDGE_ARTICLE_UPDATED_DATES["ai-grant-evaluation"];

    expect(doc.querySelector(`time[datetime="${published}"]`)).not.toBeNull();
    expect(doc.querySelector(`time[datetime="${updated}"]`)).not.toBeNull();
    expect(doc.body.textContent).toContain("Published");
    expect(doc.body.textContent).toContain("Updated");
  });

  it("never claims a measured review-time figure", () => {
    // A prior verification round could not source any "review time saved"
    // number, so the page must say so instead of resurrecting one.
    const text = renderPage().body.textContent ?? "";

    expect(text).toContain("There is no single figure that holds across programs");
    expect(text).not.toMatch(/\d+\s*%/);
    expect(text).not.toMatch(/\d+x\b/i);
  });

  it("keeps the human-sign-off facts in visible text", () => {
    const text = renderPage().body.textContent ?? "";

    expect(text).toContain("status changes are made only by people with review permission");
    expect(text).toContain("never shown to applicants");
    expect(text).toContain("evaluation failures never block a submission");
  });

  it("emits exactly one h1", () => {
    expect(renderPage().querySelectorAll("h1")).toHaveLength(1);
  });
});
