import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  DATA_PAGE_DESCRIPTION,
  DATA_PAGE_FAQS,
  DATA_PAGE_STATS,
  DATA_PAGE_TITLE,
  DATASET_DESCRIPTION,
} from "@/app/data/foundation-funding/content";
import FoundationFundingDataPage, { metadata } from "@/app/data/foundation-funding/page";
import { FILINGS_STATS } from "@/src/features/non-profits/lib/stats";

// The static sitemap pulls blog slugs from Sanity, whose gateway validates the
// client env at import time. Blog entries are irrelevant here.
vi.mock("@/sanity/lib/gateway", () => ({
  getPublishedSlugs: vi.fn(async () => []),
}));

const ROUTE = "/data/foundation-funding";

/** Every reader-visible string this page owns, for copy-rule sweeps. */
function allVisibleStrings(): string[] {
  return [
    DATA_PAGE_TITLE,
    DATA_PAGE_DESCRIPTION,
    DATASET_DESCRIPTION,
    ...DATA_PAGE_STATS.flatMap((stat) => [stat.value, stat.label, stat.definition]),
    ...DATA_PAGE_FAQS.flatMap((faq) => [faq.question, faq.answer]),
  ];
}

describe("/data/foundation-funding content", () => {
  it("has a question and a non-empty answer for every FAQ entry", () => {
    expect(DATA_PAGE_FAQS.length).toBeGreaterThanOrEqual(3);
    for (const entry of DATA_PAGE_FAQS) {
      expect(entry.question).toMatch(/\?$/);
      expect(entry.answer.length).toBeGreaterThan(0);
    }
  });

  it("contains no em or en dashes in reader-visible copy", () => {
    for (const value of allVisibleStrings()) {
      expect(value).not.toContain("—");
      expect(value).not.toContain("–");
    }
  });

  it("mentions ChatGPT nowhere (Codex-only copy convention)", () => {
    for (const value of allVisibleStrings()) {
      expect(value).not.toContain("ChatGPT");
    }
  });

  it("renders every corpus figure from FILINGS_STATS", () => {
    const values = DATA_PAGE_STATS.map((stat) => stat.value);
    expect(values).toContain(FILINGS_STATS.countShort);
    expect(values).toContain(FILINGS_STATS.dollarsTracked);
    expect(values).toContain(FILINGS_STATS.historySpanLong);
  });

  it("hardcodes no corpus figure as a literal in the page or content source", () => {
    // The figures come from reviewed copy and live in FILINGS_STATS
    // (src/features/non-profits/lib/stats.ts), the single source the
    // find-funders surfaces share. A literal here would silently go stale
    // the day that source changes.
    const routeDir = path.resolve(__dirname, "../../app/data/foundation-funding");
    for (const file of ["page.tsx", "content.ts"]) {
      const source = fs.readFileSync(path.join(routeDir, file), "utf8");
      for (const literal of ["2 million", "2M", "1.2T", "$1.2", "seven years"]) {
        expect(source, `${file} hardcodes "${literal}"`).not.toContain(literal);
      }
    }
  });
});

describe("/data/foundation-funding (server-rendered)", () => {
  // renderToStaticMarkup runs no effects and resolves no queries, so what it
  // produces is what a non-executing crawler receives from the server.
  function renderStatic(): Document {
    const html = renderToStaticMarkup(<FoundationFundingDataPage />);
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

  it("renders the title, dataset description, and every stat definition", () => {
    const doc = renderStatic();
    const text = doc.body.textContent ?? "";

    expect(doc.querySelector("h1")?.textContent).toBe(DATA_PAGE_TITLE);
    expect(text).toContain(DATASET_DESCRIPTION);
    for (const stat of DATA_PAGE_STATS) {
      expect(text).toContain(stat.value);
      expect(text).toContain(stat.definition);
    }
  });

  it("renders the figures-reviewed date from FILINGS_STATS", () => {
    const time = renderStatic().querySelector(
      `time[datetime="${FILINGS_STATS.figuresReviewedOn}"]`
    );
    expect(time).not.toBeNull();
  });

  it("contains no em or en dashes in the rendered text", () => {
    const text = renderStatic().body.textContent ?? "";
    expect(text).not.toContain("—");
    expect(text).not.toContain("–");
  });

  it("emits Dataset JSON-LD that mirrors the visible content 1:1", () => {
    const doc = renderStatic();
    const text = doc.body.textContent ?? "";
    const dataset = jsonLdSchemas(doc).find((schema) => schema["@type"] === "Dataset") as
      | { name: string; description: string; url: string }
      | undefined;

    expect(dataset).toBeDefined();
    expect(dataset?.name).toBe(DATA_PAGE_TITLE);
    expect(dataset?.description).toBe(DATASET_DESCRIPTION);
    expect(dataset?.url).toBe(`https://www.karmahq.xyz${ROUTE}`);
    // Every fact serialized in the Dataset schema is visible on the page.
    expect(text).toContain(dataset?.name ?? "");
    expect(text).toContain(dataset?.description ?? "");
  });

  it("emits FAQPage JSON-LD that mirrors the visible FAQ 1:1", () => {
    const doc = renderStatic();
    const text = doc.body.textContent ?? "";
    const faq = jsonLdSchemas(doc).find((schema) => schema["@type"] === "FAQPage");
    expect(faq).toBeDefined();

    const entities = (faq as { mainEntity: Array<Record<string, unknown>> }).mainEntity;
    expect(entities).toHaveLength(DATA_PAGE_FAQS.length);
    entities.forEach((entity, index) => {
      expect(entity.name).toBe(DATA_PAGE_FAQS[index].question);
      expect((entity.acceptedAnswer as { text: string }).text).toBe(DATA_PAGE_FAQS[index].answer);
      expect(text).toContain(DATA_PAGE_FAQS[index].question);
      expect(text).toContain(DATA_PAGE_FAQS[index].answer);
    });
  });

  it("links to find-funders and the due-diligence knowledge article", () => {
    const doc = renderStatic();
    expect(doc.querySelector('a[href="/nonprofits/find-funders"]')).not.toBeNull();
    expect(doc.querySelector('a[href="/knowledge/nonprofit-due-diligence"]')).not.toBeNull();
  });
});

describe("/data/foundation-funding registration", () => {
  it("self-canonicals", () => {
    const canonical = metadata.alternates?.canonical;
    expect(canonical).toBe(ROUTE);
  });

  it("is submitted in the static sitemap", async () => {
    const { default: staticSitemap } = await import("@/app/sitemaps/static/sitemap");
    const urls = (await staticSitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.endsWith(ROUTE))).toBe(true);
  });
});
