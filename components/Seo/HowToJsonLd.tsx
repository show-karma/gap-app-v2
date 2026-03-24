interface HowToJsonLdProps {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string }>;
}

export function HowToJsonLd({ name, description, steps }: HowToJsonLdProps) {
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map(({ name: stepName, text }, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: stepName,
      text,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(howToSchema),
      }}
    />
  );
}
