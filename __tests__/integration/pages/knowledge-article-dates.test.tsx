import * as fs from "node:fs";
import * as path from "node:path";
import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getKnowledgeArticleDate,
  KNOWLEDGE_ARTICLE_DATES,
  KNOWLEDGE_ARTICLE_UPDATED_DATES,
} from "@/app/t/[tenant]/(chrome)/knowledge/articleDates";
import GrantKycPage from "@/app/t/[tenant]/(chrome)/knowledge/grant-kyc/page";
import GrantLifecyclePage from "@/app/t/[tenant]/(chrome)/knowledge/grant-lifecycle/page";
import ProjectProfilesPage from "@/app/t/[tenant]/(chrome)/knowledge/project-profiles/page";
import "@testing-library/jest-dom";

/**
 * Knowledge articles must never publish a fabricated freshness signal:
 * every date they emit has to come from the checked-in provenance map and be
 * visible on the page itself.
 */

const KNOWLEDGE_DIR = path.resolve(__dirname, "../../../app/t/[tenant]/(chrome)/knowledge");

// The literals that were hardcoded on all 25 pages before the provenance map.
const FABRICATED_DATES = ["2025-01-15", "2026-03-24"];

function knowledgeSlugs(): string[] {
  return fs
    .readdirSync(KNOWLEDGE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(KNOWLEDGE_DIR, name, "page.tsx")));
}

/**
 * Renders a page through `renderToStaticMarkup` (no client runtime, no
 * hydration) so the assertions describe what a crawler receives from the
 * server, not what React produces after mounting.
 */
function renderStatic(Page: ComponentType): Document {
  const html = renderToStaticMarkup(<Page />);
  return new DOMParser().parseFromString(
    `<!doctype html><html><body>${html}</body></html>`,
    "text/html"
  );
}

function articleSchema(doc: Document): Record<string, unknown> {
  const schemas = Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).map(
    (script) => JSON.parse(script.textContent ?? "{}") as Record<string, unknown>
  );
  const article = schemas.find((schema) => schema["@type"] === "Article");
  expect(article).toBeDefined();
  return article as Record<string, unknown>;
}

describe("knowledge article publication dates", () => {
  describe("provenance map", () => {
    it("covers every knowledge article directory", () => {
      const slugs = knowledgeSlugs();
      expect(slugs.length).toBeGreaterThan(0);

      for (const slug of slugs) {
        expect(KNOWLEDGE_ARTICLE_DATES).toHaveProperty(slug);
      }
    });

    it("has no orphan entries without a matching page", () => {
      const slugs = new Set(knowledgeSlugs());

      for (const slug of Object.keys(KNOWLEDGE_ARTICLE_DATES)) {
        expect(slugs.has(slug)).toBe(true);
      }
    });

    it("records only plausible past dates, never the previously fabricated ones", () => {
      const today = new Date().toISOString().slice(0, 10);

      for (const [slug, date] of Object.entries(KNOWLEDGE_ARTICLE_DATES)) {
        expect(date, slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(date.localeCompare(today), slug).toBeLessThanOrEqual(0);
        expect(FABRICATED_DATES, slug).not.toContain(date);
      }
    });

    it("throws for a slug with no recorded date", () => {
      expect(() => getKnowledgeArticleDate("not-a-knowledge-article")).toThrow(
        /No publication date recorded/
      );
    });
  });

  describe("page sources", () => {
    it("never hardcode a date literal — published or modified dates come only from the maps", () => {
      for (const slug of knowledgeSlugs()) {
        const source = fs.readFileSync(path.join(KNOWLEDGE_DIR, slug, "page.tsx"), "utf8");

        expect(source, slug).not.toMatch(/dateModified\s*=\s*"/);
        expect(source, slug).not.toMatch(/datePublished\s*=\s*"/);
      }
    });
  });

  describe("revision map", () => {
    it("only records revisions for published articles, dated on or after publication", () => {
      const today = new Date().toISOString().slice(0, 10);

      for (const [slug, updated] of Object.entries(KNOWLEDGE_ARTICLE_UPDATED_DATES)) {
        expect(KNOWLEDGE_ARTICLE_DATES, slug).toHaveProperty(slug);
        expect(updated, slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(updated.localeCompare(KNOWLEDGE_ARTICLE_DATES[slug]), slug).toBeGreaterThan(0);
        expect(updated.localeCompare(today), slug).toBeLessThanOrEqual(0);
        expect(FABRICATED_DATES, slug).not.toContain(updated);
      }
    });

    it("never touches the held-out control article", () => {
      // /knowledge/grant-lifecycle is the untouched control cohort (C06) for
      // the knowledge-page experiments — it must not gain a revision entry.
      expect(KNOWLEDGE_ARTICLE_UPDATED_DATES).not.toHaveProperty("grant-lifecycle");
    });
  });

  describe.each([
    ["grant-lifecycle", GrantLifecyclePage, "Jan 6, 2026"],
    ["grant-kyc", GrantKycPage, "Jan 7, 2026"],
    ["project-profiles", ProjectProfilesPage, "Jan 14, 2026"],
  ])("%s (server-rendered)", (slug, Page, formatted) => {
    const expectedDate = KNOWLEDGE_ARTICLE_DATES[slug];

    it("emits the recorded datePublished in the Article JSON-LD", () => {
      const schema = articleSchema(renderStatic(Page));

      expect(schema.datePublished).toBe(expectedDate);
    });

    it("emits no dateModified", () => {
      const schema = articleSchema(renderStatic(Page));

      expect("dateModified" in schema).toBe(false);
    });

    it("shows the same date to readers in the server-rendered markup", () => {
      const doc = renderStatic(Page);
      const time = doc.querySelector(`time[datetime="${expectedDate}"]`);

      expect(time).not.toBeNull();
      expect(time?.textContent).toBe(formatted);
      expect(doc.body.textContent).toContain(`Published ${formatted}`);
    });
  });
});
