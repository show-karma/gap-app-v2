import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_URL } from "@/utilities/meta";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Karma",
  url: SITE_URL,
  logo: `${SITE_URL}/logo/karma-logo.svg`,
  description: DEFAULT_DESCRIPTION,
  sameAs: ["https://twitter.com/karmahq_", "https://github.com/show-karma"],
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
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationSchema),
        }}
      />
    </>
  );
}
