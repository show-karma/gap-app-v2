import { SITE_URL } from "@/utilities/meta";

interface CollectionPageJsonLdProps {
  name: string;
  description: string;
  url: string;
}

export function CollectionPageJsonLd({ name, description, url }: CollectionPageJsonLdProps) {
  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: `${SITE_URL}${url}`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(collectionPageSchema),
      }}
    />
  );
}
