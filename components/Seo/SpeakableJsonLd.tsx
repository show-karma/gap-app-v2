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
      dangerouslySetInnerHTML={{
        __html: safeJsonLdStringify(speakableSchema),
      }}
    />
  );
}
