import styles from "@/styles/markdown.module.css";
import type { Project } from "@/types/v2/project";
import { renderMarkdownToHtml } from "@/utilities/markdown.server";
import { cn } from "@/utilities/tailwind";

interface ProjectHeaderServerProps {
  project: Project;
  className?: string;
}

/**
 * Server-rendered project header injected into the initial HTML of every
 * project tab.
 *
 * WHY: the canonical project page (`/project/{slug}`) defaults to the
 * client-only Updates feed, so before this only the sidebar (project name +
 * a 200-char description excerpt) reached crawlers, and no project page had an
 * `<h1>` at all. Google saw thin, heading-less pages and deprioritized crawling
 * (GSC "Discovered – currently not crawled"). Emitting the project name as an
 * `<h1>` plus the full description and category tags into the server HTML gives
 * every tab real, unique, indexable content above the interactive feed.
 *
 * Pure server component — no hooks, no interactivity — so its markup is present
 * in the streamed HTML regardless of client hydration.
 */
export function ProjectHeaderServer({ project, className }: ProjectHeaderServerProps) {
  const details = project?.details;
  const title = details?.title?.trim();

  // Without a title there is no meaningful heading to render; let the rest of
  // the page (sidebar, feed) stand on its own rather than emit an empty <h1>.
  if (!title) return null;

  const descriptionHtml = renderMarkdownToHtml(details?.description);
  const tags = (details?.tags ?? []).filter((tag) => tag?.trim());

  return (
    <header className={cn("flex flex-col gap-4", className)} data-testid="project-header-server">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>

      {descriptionHtml ? (
        <div
          className={cn(
            "preview wmdeMarkdown",
            styles.wmdeMarkdown,
            "text-sm text-muted-foreground leading-relaxed"
          )}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server markdown
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : null}

      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2" data-testid="project-header-tags">
          {tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
