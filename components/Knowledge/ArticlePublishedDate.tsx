import { formatDate } from "@/utilities/formatDate";

interface ArticlePublishedDateProps {
  /** Publication date as `YYYY-MM-DD` (UTC), from `app/knowledge/articleDates.ts`. */
  date: string;
}

/**
 * Renders the visible publication line for a knowledge-base article.
 *
 * Knowledge pages emit `datePublished` in their Article JSON-LD; this keeps that
 * fact visible on the page, so the structured data never claims something a
 * reader cannot see.
 */
export function ArticlePublishedDate({ date }: ArticlePublishedDateProps) {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Published <time dateTime={date}>{formatDate(date, "UTC")}</time>
    </p>
  );
}
