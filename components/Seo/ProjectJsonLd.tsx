import type { Project } from "@/types/v2/project";
import { safeJsonLdStringify } from "@/utilities/jsonLd";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { SITE_URL } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

interface ProjectJsonLdProps {
  project: Project;
  /** Canonical slug (or uid) used to build the project URL. */
  slug: string;
}

const isHttpUrl = (url: string): boolean => /^https?:\/\//i.test(url);

/**
 * Emits schema.org structured data for a single project profile.
 *
 * Modeled as a `Project` (a subtype of `Organization`) — "An enterprise
 * (potentially individual but typically collaborative), planned to achieve a
 * particular aim." — which is exactly what a Karma project represents, so it
 * inherits Organization properties like `logo`, `sameAs`, and `foundingDate`.
 */
export function ProjectJsonLd({ project, slug }: ProjectJsonLdProps) {
  const details = project?.details;
  const name = details?.title || "";
  const description = cleanMarkdownForPlainText(details?.description || "", 300);
  const url = `${SITE_URL}${PAGES.PROJECT.OVERVIEW(slug)}`;

  // External links (website, twitter, github, …) become `sameAs` entries so
  // crawlers can reconcile this project with its off-platform presence.
  const sameAs = (details?.links || [])
    .map((link) => link?.url)
    .filter((linkUrl): linkUrl is string => Boolean(linkUrl) && isHttpUrl(linkUrl));

  const projectSchema = {
    "@context": "https://schema.org",
    "@type": "Project",
    name,
    url,
    ...(description && { description }),
    ...(details?.logoUrl && { logo: details.logoUrl, image: details.logoUrl }),
    ...(sameAs.length > 0 && { sameAs }),
    ...(details?.tags?.length && { keywords: details.tags.join(", ") }),
    ...(project?.createdAt && { foundingDate: project.createdAt }),
    subjectOf: {
      "@type": "WebPage",
      url,
      name,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLdStringify(projectSchema),
      }}
    />
  );
}
