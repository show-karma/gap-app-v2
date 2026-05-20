import { safeJsonLdStringify } from "@/utilities/jsonLd";
import { SITE_URL } from "@/utilities/meta";

/**
 * Schema.org Service markup describing Karma as a grant-management
 * service. Sits alongside OrganizationJsonLd in the root layout so
 * every page surfaces a Service entity (a separate semantic node from
 * the Organization / WebApplication ones we already emit), giving
 * AEO crawlers a richer match for "grants software" / "grant
 * management" / "RFP management" intent queries.
 *
 * `provider` references the Organization by `@id`, so Karma is the
 * single graph entity — not two disconnected nodes.
 */

const ORG_ID = `${SITE_URL}#organization`;
const SERVICE_ID = `${SITE_URL}#service`;

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": SERVICE_ID,
  name: "Karma — grant and funding-program management",
  description:
    "Karma is funding software for grants, hackathons, and RFPs. It automates intake, AI-assisted evaluation, milestone tracking, payouts, and impact reporting across 8 blockchain networks.",
  serviceType: "Grant management software",
  category: ["Grant management", "Funding operations", "Impact reporting"],
  provider: {
    "@id": ORG_ID,
  },
  areaServed: "Worldwide",
  url: SITE_URL,
  termsOfService: `${SITE_URL}/terms-and-conditions`,
  offers: {
    "@type": "Offer",
    name: "Free tier",
    price: "0",
    priceCurrency: "USD",
    url: `${SITE_URL}/pricing`,
  },
  audience: {
    "@type": "Audience",
    audienceType: "Foundations, DAOs, ecosystem programs, corporate giving, government agencies",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Karma capabilities",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Application intake and evaluation",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Milestone tracking and verification",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "On-chain payout coordination",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Impact measurement and reporting",
        },
      },
    ],
  },
};

export function ServiceJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLdStringify(serviceSchema),
      }}
    />
  );
}
