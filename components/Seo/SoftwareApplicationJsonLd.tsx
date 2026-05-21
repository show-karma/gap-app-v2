import { safeJsonLdStringify } from "@/utilities/jsonLd";
import { SITE_URL } from "@/utilities/meta";

const FEATURE_LIST = [
  "Read project milestones",
  "Query funding programs",
  "Track grant disbursements",
  "Search impact data",
  "Inspect applications and reviews",
  "Browse builders and ecosystems",
];

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Karma MCP Server",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Model Context Protocol server that exposes Karma's projects, grants, milestones, and impact data to AI agents like Claude, Cursor, and Codex.",
  url: `${SITE_URL}/mcp/connect`,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  softwareHelp: {
    "@type": "CreativeWork",
    url: `${SITE_URL}/mcp/connect`,
  },
  featureList: FEATURE_LIST,
  provider: {
    "@type": "Organization",
    name: "Karma",
    url: SITE_URL,
  },
};

export function SoftwareApplicationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLdStringify(softwareApplicationSchema),
      }}
    />
  );
}
