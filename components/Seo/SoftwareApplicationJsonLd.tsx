import { DEFAULT_DESCRIPTION, SITE_URL } from "@/utilities/meta";

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Karma",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Grant Management Software",
  operatingSystem: "Web",
  description: DEFAULT_DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Grant Application Management",
    "Milestone Tracking",
    "Impact Measurement",
    "AI-Powered Grant Review",
    "Portfolio Dashboard",
    "Automated Grantee Reminders",
    "Grant Reporting & Analytics",
    "Multi-Program Management",
    "Onchain Attestations",
    "Whitelabel Funding Platforms",
  ],
};

export function SoftwareApplicationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(softwareApplicationSchema),
      }}
    />
  );
}
