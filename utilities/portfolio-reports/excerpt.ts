import type { PortfolioReport } from "@/types/portfolio-report";

const DEFAULT_LENGTH = 240;

/**
 * Plain-text excerpt for a report card. The report's `content` field
 * is HTML for new reports and markdown for any pre-migration rows; the
 * stripper below tolerates both shapes (markdown that doesn't contain
 * tags passes through with its punctuation cleaned up; HTML loses tags
 * + named entities). Used by the public list page card preview only —
 * never feed the output back into HTML rendering.
 */
export function reportExcerpt(report: PortfolioReport, maxLength: number = DEFAULT_LENGTH): string {
  if (!report.content) return "";
  return excerptFromBody(report.content, maxLength);
}

function excerptFromBody(input: string, maxLength: number): string {
  let text = input;
  // Drop scripts / styles / heads if this is HTML.
  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<head[\s\S]*?<\/head>/gi, " ");
  text = text.replace(/<[^>]+>/g, " ");
  // Decode the named entities the renderer actually emits.
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)));
  // Light markdown cleanup so legacy markdown rows look reasonable.
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^>\s?/gm, "");
  text = text.replace(/^[\s]*[-*+]\s+/gm, "");
  text = text.replace(/^[\s]*\d+\.\s+/gm, "");
  text = text.replace(/(\*\*|__)(.+?)\1/g, "$2");
  text = text.replace(/(\*|_)(.+?)\1/g, "$2");
  text = text.replace(/~~(.+?)~~/g, "$1");
  text = text.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated;
  return `${cut}…`;
}
