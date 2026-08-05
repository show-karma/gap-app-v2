import { safeJsonLdStringify } from "@/utilities/jsonLd";
import { SITE_URL } from "@/utilities/meta";

interface DatasetJsonLdProps {
  /** Dataset name; must match the visible page heading or dataset title. */
  name: string;
  /** Description; every factual claim must also be visible on the page. */
  description: string;
  /** Path of the page describing the dataset (e.g. "/data/foundation-funding"). */
  url: string;
  /**
   * Names of the source datasets this index is derived from (schema.org
   * `isBasedOn`), e.g. the IRS Form 990 e-file corpus.
   */
  isBasedOn?: string[];
  /** Human-readable keywords for the dataset. */
  keywords?: string[];
}

/**
 * Dataset JSON-LD (schema.org/Dataset).
 *
 * Reserved for pages whose primary subject IS a dataset. Today that is only
 * /data/foundation-funding; do not add this to marketing or product pages
 * that merely mention data. Facts serialized here must be 1:1 with visible
 * page content (same rule as FAQJsonLd), enforced by the page's SSR test.
 */
export function DatasetJsonLd({ name, description, url, isBasedOn, keywords }: DatasetJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url: `${SITE_URL}${url}`,
    creator: {
      "@type": "Organization",
      name: "Karma",
      url: SITE_URL,
    },
    ...(isBasedOn && isBasedOn.length > 0 && { isBasedOn }),
    ...(keywords && keywords.length > 0 && { keywords: keywords.join(", ") }),
    isAccessibleForFree: true,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLdStringify(schema),
      }}
    />
  );
}
