import { formatDate } from "@/utilities/formatDate";

interface ArticlePublishedDateProps {
  /** Publication date as `YYYY-MM-DD` (UTC), from `app/knowledge/articleDates.ts`. */
  date: string;
  /**
   * Date of the last substantive content revision as `YYYY-MM-DD` (UTC), from
   * `KNOWLEDGE_ARTICLE_UPDATED_DATES` in `app/knowledge/articleDates.ts`.
   * Omitted for articles that have not been revised since publication.
   */
  updated?: string;
}

/**
 * Renders the visible publication line for a knowledge-base article.
 *
 * Knowledge pages emit `datePublished` (and, when revised, `dateModified`) in
 * their Article JSON-LD; this keeps those facts visible on the page, so the
 * structured data never claims something a reader cannot see.
 */
export function ArticlePublishedDate({ date, updated }: ArticlePublishedDateProps) {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Published <time dateTime={date}>{formatDate(date, "UTC")}</time>
      {updated && (
        <>
          {" · Updated "}
          <time dateTime={updated}>{formatDate(updated, "UTC")}</time>
        </>
      )}
    </p>
  );
}
