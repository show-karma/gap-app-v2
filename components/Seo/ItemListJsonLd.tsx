import { safeJsonLdStringify } from "@/utilities/jsonLd";
import { SITE_URL } from "@/utilities/meta";
import { buildWhitelabelRedirectPath, type WhitelabelContext } from "@/utilities/whitelabel-server";

interface ItemListJsonLdItem {
  /** Visible name of the entry, exactly as the page renders it. */
  name: string;
  /** Path (or absolute URL) the entry links to, exactly as the page links it. */
  url: string;
}

interface ItemListJsonLdProps {
  /** Name of the list, matching the page's visible heading for it. */
  name: string;
  items: ItemListJsonLdItem[];
  /**
   * Resolved by the calling page via `getWhitelabelContext()`. Read as a prop
   * rather than from headers() here so this stays a synchronous component:
   * an async one cannot be rendered by the SSR test harness.
   *
   * Required on purpose. Optional, it would let a new caller silently emit
   * canonical-host URLs on a tenant domain — the exact defect this prop exists
   * to prevent — with nothing failing to flag it.
   */
  whitelabel: WhitelabelContext;
}

/**
 * Emits a schema.org ItemList describing entries the page server-renders.
 *
 * The contract (DEV-596): every item here must correspond to an entry whose
 * name and link are present in the server-rendered HTML of the page. Callers
 * build `items` from the same data the visible list renders, filtered the same
 * way, so the structured data never claims entries the page does not show.
 *
 * That contract is host-scoped. These pages also serve whitelabel tenants on
 * their own domains, where the page's canonical is the tenant domain and links
 * render without the `/community/<slug>` prefix. Resolving item URLs against
 * SITE_URL there pointed structured data off the tenant's branded domain and at
 * paths their site never serves, so both the origin and the prefix follow the
 * request's whitelabel context.
 */
export function ItemListJsonLd({ name, items, whitelabel }: ItemListJsonLdProps) {
  if (items.length === 0) {
    return null;
  }

  const origin =
    whitelabel.isWhitelabel && whitelabel.config ? `https://${whitelabel.config.domain}` : SITE_URL;

  const toAbsoluteUrl = (url: string): string =>
    /^https?:\/\//i.test(url) ? url : `${origin}${buildWhitelabelRedirectPath(url, whitelabel)}`;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: toAbsoluteUrl(item.url),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLdStringify(itemListSchema),
      }}
    />
  );
}
