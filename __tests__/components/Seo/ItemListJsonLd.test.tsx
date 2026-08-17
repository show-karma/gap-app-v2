import { renderToString } from "react-dom/server";
import { ItemListJsonLd } from "@/components/Seo/ItemListJsonLd";
import { SITE_URL } from "@/utilities/meta";
import type { WhitelabelContext } from "@/utilities/whitelabel-server";

/**
 * The ItemList contract (DEV-596) is host-scoped: these pages also serve
 * whitelabel tenants on their own domains. Emitting karmahq.org URLs there
 * contradicts the page's own canonical and steers search and AI traffic off a
 * paying customer's branded domain.
 */

const TENANT_DOMAIN = "grantsapp.scroll.io";
const TENANT_SLUG = "scroll";

const tenantContext = {
  isWhitelabel: true,
  communitySlug: TENANT_SLUG,
  config: { domain: TENANT_DOMAIN, communitySlug: TENANT_SLUG },
  tenantConfig: null,
} as unknown as WhitelabelContext;

const karmaContext: WhitelabelContext = {
  isWhitelabel: false,
  communitySlug: null,
  config: null,
  tenantConfig: null,
};

const extractSchema = (html: string) => {
  const match = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  if (!match) throw new Error("No JSON-LD script rendered");
  return JSON.parse(match[1].replace(/\\u003c/g, "<"));
};

const renderList = (whitelabel?: WhitelabelContext) =>
  extractSchema(
    renderToString(
      <ItemListJsonLd
        name="Funding opportunities"
        whitelabel={whitelabel}
        items={[{ name: "Batch 3", url: `/community/${TENANT_SLUG}/programs/1479` }]}
      />
    )
  );

describe("ItemListJsonLd on a whitelabel tenant domain", () => {
  it("emits the tenant's own origin, not the canonical Karma host", () => {
    const schema = renderList(tenantContext);

    expect(schema.itemListElement[0].url).toContain(`https://${TENANT_DOMAIN}`);
    expect(schema.itemListElement[0].url).not.toContain(SITE_URL);
  });

  it("strips the /community/<slug> prefix the tenant site never serves", () => {
    const schema = renderList(tenantContext);

    expect(schema.itemListElement[0].url).toBe(`https://${TENANT_DOMAIN}/programs/1479`);
  });
});

describe("ItemListJsonLd on the canonical host", () => {
  it("resolves item URLs against the canonical origin, prefix intact", () => {
    const schema = renderList(karmaContext);

    expect(schema.itemListElement[0].url).toBe(
      `${SITE_URL}/community/${TENANT_SLUG}/programs/1479`
    );
  });

  it("behaves the same when no whitelabel context is supplied", () => {
    const schema = renderList(undefined);

    expect(schema.itemListElement[0].url).toBe(
      `${SITE_URL}/community/${TENANT_SLUG}/programs/1479`
    );
  });

  it("leaves an already-absolute URL untouched", () => {
    const html = renderToString(
      <ItemListJsonLd
        name="Funding opportunities"
        whitelabel={tenantContext}
        items={[{ name: "External", url: "https://example.org/programs/1" }]}
      />
    );

    expect(extractSchema(html).itemListElement[0].url).toBe("https://example.org/programs/1");
  });
});
