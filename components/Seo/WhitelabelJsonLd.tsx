import type { TenantConfig } from "@/src/infrastructure/types/tenant";

interface WhitelabelJsonLdProps {
  tenant: TenantConfig;
  url: string;
}

export function WhitelabelJsonLd({ tenant, url }: WhitelabelJsonLdProps) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: tenant.name,
    url,
    logo: tenant.assets.logo,
    description: tenant.seo.description,
  };

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tenant.seo.title,
    url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: tenant.seo.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
    </>
  );
}
