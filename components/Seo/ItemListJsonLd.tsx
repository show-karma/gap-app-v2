import { safeJsonLdStringify } from "@/utilities/jsonLd";
import { SITE_URL } from "@/utilities/meta";

export interface ItemListJsonLdItem {
  /** Visible name of the entry, exactly as the page renders it. */
  name: string;
  /** Path (or absolute URL) the entry links to, exactly as the page links it. */
  url: string;
}

interface ItemListJsonLdProps {
  /** Name of the list, matching the page's visible heading for it. */
  name: string;
  items: ItemListJsonLdItem[];
}

const toAbsoluteUrl = (url: string): string =>
  /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url}`;

/**
 * Emits a schema.org ItemList describing entries the page server-renders.
 *
 * The contract (DEV-596): every item here must correspond to an entry whose
 * name and link are present in the server-rendered HTML of the page. Callers
 * build `items` from the same data the visible list renders, filtered the same
 * way, so the structured data never claims entries the page does not show.
 */
export function ItemListJsonLd({ name, items }: ItemListJsonLdProps) {
  if (items.length === 0) {
    return null;
  }

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
