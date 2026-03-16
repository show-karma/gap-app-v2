import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { FAQPageJsonLd } from "@/components/Seo/FAQPageJsonLd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { customMetadata, SITE_URL } from "@/utilities/meta";
import { cn } from "@/utilities/tailwind";
import { getAllSolutions, getSolutionBySlug } from "../_data";
import type { SolutionPage as SolutionPageType, Step } from "../_data/types";

export function generateStaticParams() {
  return getAllSolutions().map((solution) => ({
    slug: solution.slug,
  }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const solution = getSolutionBySlug(params.slug);
  if (!solution) return {};

  return customMetadata({
    title: solution.title,
    description: solution.metaDescription,
    path: `/solutions/${solution.slug}`,
  });
}

function getRelatedSolutions(currentSlug: string): Pick<SolutionPageType, "slug" | "heading">[] {
  const all = getAllSolutions();
  const current = all.find((s) => s.slug === currentSlug);
  if (!current) return [];

  const currentCategory = getCategoryFromSlug(currentSlug);
  const related: Pick<SolutionPageType, "slug" | "heading">[] = [];

  for (const s of all) {
    if (s.slug === currentSlug) continue;
    if (getCategoryFromSlug(s.slug) === currentCategory && related.length < 2) {
      related.push({ slug: s.slug, heading: s.heading });
    }
  }

  for (const s of all) {
    if (related.length >= 4) break;
    if (s.slug === currentSlug) continue;
    if (related.some((r) => r.slug === s.slug)) continue;
    if (getCategoryFromSlug(s.slug) !== currentCategory) {
      related.push({ slug: s.slug, heading: s.heading });
    }
  }

  return related;
}

function getCategoryFromSlug(slug: string): string {
  if (slug.startsWith("best-")) return "best-for";
  if (slug.startsWith("alternative-to-")) return "alternatives";
  if (slug.startsWith("grant-management-for-")) return "audience";
  if (slug.startsWith("how-to-") || slug.endsWith("-guide") || slug.endsWith("-best-practices"))
    return "guides";
  if (
    slug.includes("under-") ||
    slug.includes("over-") ||
    slug.includes("500k") ||
    slug.includes("enterprise") ||
    slug.includes("affordable") ||
    slug.includes("startup-grant") ||
    slug.includes("small-foundation") ||
    slug.includes("mid-size") ||
    slug.includes("new-foundations") ||
    slug.includes("established-foundations")
  )
    return "size-budget";
  return "feature";
}

const badgeClassName = cn(
  "text-secondary-foreground font-medium text-xs",
  "leading-[150%] tracking-[0.015em]",
  "rounded-full py-[3px] px-2",
  "bg-secondary border-0 w-fit"
);

const HorizontalLine = ({ className }: { className?: string }) => (
  <hr className={cn("w-full h-[1px] bg-border max-w-[75%]", className)} />
);

/**
 * SoftwareApplication JSON-LD for grant management software rich results.
 * Uses static data only (no user input) — same safe pattern as OrganizationJsonLd.tsx.
 */
function SoftwareApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Karma",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Grant Management Software",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier available",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "200",
      bestRating: "5",
    },
    url: SITE_URL,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * WebPage JSON-LD with datePublished for freshness signals.
 * Uses static data only (no user input) — same safe pattern as OrganizationJsonLd.tsx.
 */
function WebPageJsonLd({
  title,
  description,
  path,
  datePublished,
}: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${SITE_URL}${path}`,
    isPartOf: { "@type": "WebSite", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "Karma",
      url: SITE_URL,
    },
  };

  if (datePublished) {
    schema.datePublished = datePublished;
    schema.dateModified = datePublished;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * HowTo JSON-LD for guide pages with step-by-step processes.
 * Uses static data only (no user input) — same safe pattern as OrganizationJsonLd.tsx.
 */
function HowToJsonLd({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: Step[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.description,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function SolutionPage({ params }: { params: { slug: string } }) {
  const solution = getSolutionBySlug(params.slug);
  if (!solution) notFound();

  const relatedSolutions = getRelatedSolutions(params.slug);
  const secondaryCta = solution.secondaryCta ?? {
    text: "See how it works",
    href: solution.ctaHref,
  };
  const category = getCategoryFromSlug(params.slug);

  const badgeLabel =
    category === "audience"
      ? solution.heading.replace(/^Grant Management /, "")
      : category === "alternatives"
        ? "Comparison"
        : category === "guides"
          ? "Guide"
          : category === "best-for"
            ? "Recommendation"
            : category === "size-budget"
              ? "By Program Size"
              : "Feature";

  return (
    <main className="flex w-full flex-col flex-1 items-center bg-background">
      {/* Structured data */}
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Solutions", path: "/solutions" },
          { name: solution.title, path: `/solutions/${solution.slug}` },
        ]}
      />
      <FAQPageJsonLd faqs={solution.faqs} />
      <SoftwareApplicationJsonLd />
      <WebPageJsonLd
        title={solution.title}
        description={solution.metaDescription}
        path={`/solutions/${solution.slug}`}
        datePublished={solution.datePublished}
      />
      {solution.steps && solution.steps.length > 0 && (
        <HowToJsonLd name={solution.heading} description={solution.tldr} steps={solution.steps} />
      )}

      <div className="flex w-full max-w-[1920px] justify-center items-center flex-1 flex-col gap-16 lg:gap-24">
        {/* ── Hero Section ── */}
        <section
          className={cn(
            marketingLayoutTheme.padding,
            "flex flex-col items-center w-full pt-16 md:pt-24"
          )}
        >
          <SectionContainer className="flex flex-col items-center gap-6">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="w-full flex justify-start md:justify-center">
              <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-foreground transition-colors">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/solutions" className="hover:text-foreground transition-colors">
                    Solutions
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-foreground font-medium truncate max-w-[300px]">
                  {solution.heading}
                </li>
              </ol>
            </nav>

            {/* Badge */}
            <div className="w-full flex justify-start md:justify-center">
              <Badge variant="secondary" className={badgeClassName}>
                {badgeLabel}
              </Badge>
            </div>

            {/* H1 */}
            <h1
              className={cn(
                "text-foreground font-semibold text-[40px] md:text-5xl lg:text-[48px]",
                "leading-[110%] tracking-[-0.02em]",
                "text-left md:text-center max-w-[768px] w-full md:mx-auto"
              )}
            >
              {solution.heading}
            </h1>

            {/* Overview / description */}
            <p
              className={cn(
                "text-muted-foreground font-medium text-base md:text-lg",
                "text-left md:text-center",
                "max-w-[640px] w-full md:mx-auto"
              )}
            >
              {solution.tldr}
            </p>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-start md:justify-center gap-3 text-xs text-muted-foreground w-full">
              <span>Trusted by 200+ grant programs</span>
              <span aria-hidden="true" className="hidden sm:inline">
                &middot;
              </span>
              <span>$50M+ in active grants</span>
              <span aria-hidden="true" className="hidden sm:inline">
                &middot;
              </span>
              <span>4.8/5 from program managers</span>
              {solution.datePublished && (
                <>
                  <span aria-hidden="true" className="hidden sm:inline">
                    &middot;
                  </span>
                  <span>
                    Updated{" "}
                    <time dateTime={solution.datePublished}>
                      {new Date(solution.datePublished).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </span>
                </>
              )}
            </div>

            {/* CTA buttons */}
            <div className="w-full flex flex-col sm:flex-row justify-start md:justify-center gap-3 max-w-[768px] md:mx-auto">
              <Button
                asChild
                className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium px-6 py-2.5"
              >
                <Link href={solution.ctaHref}>{solution.ctaText}</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-md font-medium px-6 py-2.5">
                <Link href={secondaryCta.href}>{secondaryCta.text}</Link>
              </Button>
            </div>
          </SectionContainer>
        </section>

        {/* ── Testimonial ── */}
        {solution.testimonial && (
          <>
            <HorizontalLine className="max-w-full" />
            <section
              className={cn(marketingLayoutTheme.padding, "flex flex-col items-center w-full")}
            >
              <SectionContainer className="flex flex-col items-center gap-4">
                <blockquote className="max-w-2xl text-center">
                  <p
                    className={cn(
                      "text-foreground font-semibold text-xl md:text-2xl",
                      "leading-[140%] tracking-[-0.01em] italic"
                    )}
                  >
                    &ldquo;{solution.testimonial.quote}&rdquo;
                  </p>
                  <footer className="mt-4 text-sm text-muted-foreground font-medium">
                    &mdash; {solution.testimonial.author}, {solution.testimonial.role},{" "}
                    {solution.testimonial.organization}
                  </footer>
                </blockquote>
              </SectionContainer>
            </section>
          </>
        )}

        {/* ── Problem Section (Pain Points style) ── */}
        <HorizontalLine />
        <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
          <SectionContainer className="flex flex-col items-start gap-10">
            <div className="flex flex-col items-start gap-4 w-full max-w-xl">
              <Badge variant="secondary" className={badgeClassName}>
                The Challenge
              </Badge>
              <h2 className={cn("section-title", "text-left", "w-full")}>
                <span className="text-foreground">{solution.problem.heading}</span>
              </h2>
            </div>
            <div className="bg-secondary rounded-2xl p-8 w-full">
              <p className="text-muted-foreground font-medium text-sm leading-[20px]">
                {solution.problem.description}
              </p>
            </div>
          </SectionContainer>
        </section>

        {/* ── Solution Section (Platform style) ── */}
        <HorizontalLine />
        <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
          <SectionContainer className="flex flex-col items-start gap-10">
            <div className="flex flex-col items-start gap-4 w-full max-w-xl">
              <Badge variant="secondary" className={badgeClassName}>
                The Solution
              </Badge>
              <h2 className={cn("section-title", "text-left", "w-full")}>
                <span className="text-foreground">{solution.solution.heading}</span>
              </h2>
              <p
                className={cn(
                  "text-muted-foreground font-normal text-left",
                  "text-[20px] leading-[30px]",
                  "w-full"
                )}
              >
                {solution.solution.description}
              </p>
            </div>

            {/* Capabilities as a 2-col card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {solution.capabilities.map((capability) => (
                <div
                  key={capability}
                  className="flex items-start gap-3 bg-secondary rounded-2xl p-6"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0 mt-2" />
                  <span className="text-foreground font-normal text-sm leading-[150%]">
                    {capability}
                  </span>
                </div>
              ))}
            </div>

            {/* Mid-page CTA */}
            <div className="w-full flex justify-start">
              <Button asChild variant="outline" className="rounded-md font-medium px-6 py-2.5">
                <Link href={secondaryCta.href}>{secondaryCta.text}</Link>
              </Button>
            </div>
          </SectionContainer>
        </section>

        {/* ── Comparison Table ── */}
        {solution.comparisonTable && (
          <>
            <HorizontalLine />
            <section
              className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}
            >
              <SectionContainer className="flex flex-col items-start gap-10">
                <div className="flex flex-col items-start gap-4 w-full max-w-xl">
                  <Badge variant="secondary" className={badgeClassName}>
                    Comparison
                  </Badge>
                  <h2 className={cn("section-title", "text-left", "w-full")}>
                    <span className="text-foreground">Feature comparison</span>
                  </h2>
                </div>
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {solution.comparisonTable.headers.map((header) => (
                          <th
                            key={header}
                            className="px-6 py-4 text-left font-semibold text-foreground text-[20px] leading-[120%] tracking-[-0.02em]"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {solution.comparisonTable.rows.map((row) => (
                        <tr key={row.feature} className="border-b border-border last:border-0">
                          <td className="px-6 py-4 font-medium text-foreground">{row.feature}</td>
                          <td className="px-6 py-4 text-foreground">{row.karma}</td>
                          <td className="px-6 py-4 text-muted-foreground">{row.competitors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionContainer>
            </section>
          </>
        )}

        {/* ── Who This Is For (Why Karma style — card grid) ── */}
        {solution.idealFor && solution.idealFor.length > 0 && (
          <>
            <HorizontalLine />
            <section
              className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}
            >
              <SectionContainer className="flex flex-col items-start gap-10">
                <div className="flex flex-col items-start gap-4 w-full max-w-xl">
                  <Badge variant="secondary" className={badgeClassName}>
                    Who This Is For
                  </Badge>
                  <h2 className={cn("section-title", "text-left", "w-full")}>
                    <span className="text-foreground">Built for teams that</span>
                    <br />
                    <span className="text-muted-foreground">need real grant infrastructure</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {solution.idealFor.map((audience) => (
                    <div
                      key={audience}
                      className="flex flex-col gap-3 bg-secondary rounded-2xl p-8"
                    >
                      <span className="text-foreground font-semibold text-[20px] leading-[120%] tracking-[-0.02em]">
                        {audience}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionContainer>
            </section>
          </>
        )}

        {/* ── How It Works (Steps — 3-col cards) ── */}
        {solution.steps && solution.steps.length > 0 && (
          <>
            <HorizontalLine />
            <section
              className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}
            >
              <SectionContainer className="flex flex-col items-start gap-10">
                <div className="flex flex-col items-start gap-4 w-full max-w-xl">
                  <Badge variant="secondary" className={badgeClassName}>
                    How It Works
                  </Badge>
                  <h2 className={cn("section-title", "text-left", "w-full")}>
                    <span className="text-foreground">Get started in minutes.</span>
                    <br />
                    <span className="text-muted-foreground">No IT required.</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full items-stretch">
                  {solution.steps.map((step, index) => (
                    <div key={step.title} className="flex flex-col items-center gap-4 h-full">
                      {/* Step badge */}
                      <Badge variant="secondary" className={badgeClassName}>
                        Step {index + 1}
                      </Badge>
                      {/* Card */}
                      <div className="flex flex-col w-full h-full rounded-2xl bg-secondary p-8">
                        <div className="flex flex-col gap-2">
                          <h3 className="text-foreground font-semibold text-[20px] leading-[120%] tracking-[-0.02em]">
                            {step.title}
                          </h3>
                          <p className="text-muted-foreground font-medium text-sm leading-[20px]">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionContainer>
            </section>
          </>
        )}

        {/* ── FAQs (Objections style — 2-col bordered cards) ── */}
        <HorizontalLine />
        <section className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}>
          <SectionContainer className="flex flex-col items-start gap-16">
            <div className="flex flex-col items-start gap-4 w-full max-w-xl">
              <Badge variant="secondary" className={badgeClassName}>
                Common Questions
              </Badge>
              <h2 className={cn("section-title", "text-left", "w-full")}>
                <span className="text-foreground">Frequently asked questions</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {solution.faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="flex flex-col gap-3 rounded-2xl border border-border p-8"
                >
                  <h3 className="text-foreground font-semibold text-lg leading-[120%] tracking-[-0.02em]">
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground font-medium text-sm leading-[20px]">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </SectionContainer>
        </section>

        {/* ── Related Solutions ── */}
        {relatedSolutions.length > 0 && (
          <>
            <HorizontalLine />
            <section
              className={cn(marketingLayoutTheme.padding, "flex flex-col items-start w-full")}
            >
              <SectionContainer className="flex flex-col items-start gap-10">
                <div className="flex flex-col items-start gap-4 w-full max-w-xl">
                  <Badge variant="secondary" className={badgeClassName}>
                    Explore More
                  </Badge>
                  <h2 className={cn("section-title", "text-left", "w-full")}>
                    <span className="text-foreground">Related solutions</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  {relatedSolutions.map((related) => (
                    <Link
                      key={related.slug}
                      href={`/solutions/${related.slug}`}
                      className="flex flex-col gap-3 rounded-2xl border border-border p-8 hover:border-foreground transition-colors"
                    >
                      <span className="text-foreground font-semibold text-[20px] leading-[120%] tracking-[-0.02em]">
                        {related.heading}
                      </span>
                    </Link>
                  ))}
                </div>
              </SectionContainer>
            </section>
          </>
        )}

        {/* ── Bottom CTA (foundations CTA style) ── */}
        <section className={cn(marketingLayoutTheme.padding, "pb-16 md:pb-24")}>
          <SectionContainer>
            <div className="flex flex-col items-center gap-6">
              <h2 className="section-title text-foreground text-center">{solution.ctaText}</h2>
              <p className="text-base md:text-xl font-normal text-muted-foreground text-center leading-[30px] tracking-normal max-w-lg">
                Free to start. No credit card required. Set up in under 30 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto px-4 sm:px-0">
                <Button
                  asChild
                  className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium px-6 py-2.5"
                >
                  <Link href={solution.ctaHref}>{solution.ctaText}</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-md font-medium px-6 py-2.5">
                  <Link href={secondaryCta.href}>{secondaryCta.text}</Link>
                </Button>
              </div>
            </div>
          </SectionContainer>
        </section>
      </div>
    </main>
  );
}
