import { safeJsonLdStringify } from "@/utilities/jsonLd";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_URL } from "@/utilities/meta";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  // Stable @id so Service / Product / Event nodes can reference Karma
  // as a single graph entity rather than emitting a fresh inline
  // Organization on every page where they appear.
  "@id": `${SITE_URL}#organization`,
  name: "Karma",
  url: SITE_URL,
  logo: `${SITE_URL}/logo/karma-logo.svg`,
  description: DEFAULT_DESCRIPTION,
  email: "info@karmahq.xyz",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "info@karmahq.xyz",
    areaServed: "Worldwide",
    availableLanguage: ["English"],
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "US",
  },
  sameAs: [
    "https://x.com/karmahq_",
    "https://github.com/show-karma",
    "https://linkedin.com/company/karmahq",
    "https://crunchbase.com/organization/karmahq",
  ],
};

const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: DEFAULT_TITLE,
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: DEFAULT_DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export function OrganizationJsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify(webApplicationSchema),
        }}
      />
    </>
  );
}
