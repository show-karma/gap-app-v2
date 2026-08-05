import { safeJsonLdStringify } from "@/utilities/jsonLd";

interface GrantJsonLdProps {
  /** Program title, exactly as the page's h1 renders it. */
  name: string;
  /** Absolute URL of the program page (whitelabel-aware canonical). */
  url: string;
  /** Plain-text excerpt of the description the page renders. Omitted when the page has none. */
  description?: string;
  /** Community slug the page's "by <community>" byline renders. Omitted when the byline is absent. */
  funderName?: string;
}

/**
 * Emits schema.org structured data for a funding-program detail page.
 *
 * Modeled as a `Grant` — "a grant, typically financial or otherwise
 * quasi-financial, given to fund research, educational or other activity,
 * typically by a public or private funder" — the closest schema.org type for a
 * grant program's call for applications.
 *
 * Deliberately thin (DEV-596): only facts the page's server-rendered HTML
 * states are included. The program budget is the round's total pool, not the
 * amount of a single grant, so it is NOT emitted as `MonetaryGrant.amount` —
 * that would be a false claim. Grant has no application-deadline property, so
 * the rendered dates stay visible-only.
 */
export function GrantJsonLd({ name, url, description, funderName }: GrantJsonLdProps) {
  const grantSchema = {
    "@context": "https://schema.org",
    "@type": "Grant",
    name,
    url,
    ...(description && { description }),
    ...(funderName && {
      funder: {
        "@type": "Organization",
        name: funderName,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLdStringify(grantSchema),
      }}
    />
  );
}
