import { safeJsonLdStringify } from "@/utilities/jsonLd";

// No `@id` — this component is mounted in the root layout and therefore
// ships on every page. Pinning `@id` to a single URL (e.g. SITE_URL)
// would tell crawlers that every page is the same resource, which is
// semantically wrong. Crawlers infer the resource from the page URL.
const speakableSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", "[data-speakable]"],
  },
};

export function SpeakableJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLdStringify(speakableSchema),
      }}
    />
  );
}
