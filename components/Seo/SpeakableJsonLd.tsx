import { safeJsonLdStringify } from "@/utilities/jsonLd";
import { SITE_URL } from "@/utilities/meta";

const speakableSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": SITE_URL,
  speakable: {
    "@type": "SpeakableSpecification",
    cssSelector: ["h1", "[data-speakable]"],
  },
};

export function SpeakableJsonLd() {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data requires dangerouslySetInnerHTML
      dangerouslySetInnerHTML={{
        __html: safeJsonLdStringify(speakableSchema),
      }}
    />
  );
}
