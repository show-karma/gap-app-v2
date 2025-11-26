import Dompurify from "dompurify";
import MarkdownIt from "markdown-it";

const markdownIt = new MarkdownIt({
  linkify: true,
  html: false,
});

const defaultLinkOpen =
  markdownIt.renderer.rules.link_open ||
  function defaultLinkOpen(tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
  };

// Open all links in a new tab and instruct search engines not to follow them
markdownIt.renderer.rules.link_open = function linkOpen(tokens, idx, options, env, self) {
  tokens[idx].attrPush(["target", "_blank"]);
  tokens[idx].attrPush(["rel", "nofollow noopener noreferrer"]);
  return defaultLinkOpen(tokens, idx, options, env, self);
};

/**
 * Takes a markdown string as input, and ouputs a HTMl string with the markdown
 * rendered as HTMl elements. Moreover, it also
 * - sanitizes the input to protect against XSS
 * - fixes links not opening in new tabs
 * - is backwards compatible with non-markdown strings, which it just sanitizes
 * and passes along
 * @param markdownSourceText
 */
export function renderToHTML(markdownSourceText: string) {
  return Dompurify.sanitize(markdownIt.render(markdownSourceText), {
    ADD_ATTR: ["target"],
  });
}

/**
 *  Takes a markdown string as input, and ouputs a plain-text sanitized version,
 *  stripped of markdown tags such as # and _.
 *  Useful for displaying markdown-based descriptions in small spaces,
 *  where formatting is not desirable
 * @param markdownSourceText
 */
export function renderToPlainText(markdownSourceText: string) {
  return Dompurify.sanitize(renderToHTML(markdownSourceText), {
    USE_PROFILES: { html: false },
  });
}

export function truncateDescription(description: string, maxLength: number) {
  if (description.length > maxLength) {
    return `${description.slice(0, maxLength)}...`;
  } else {
    return description;
  }
}

/**
 * Utilities for working with markdown text
 */

/**
 * Removes all markdown syntax from a string for use in contexts that don't support markdown
 * like meta tags, plain text displays, etc.
 *
 * @param markdownText - The markdown text to clean
 * @param maxLength - Optional maximum length for the output text
 * @returns Plain text with markdown syntax removed
 */
export function cleanMarkdownForPlainText(markdownText: string, maxLength?: number): string {
  if (!markdownText) return "";

  let text = markdownText;

  // Remove link syntax but keep the text: [link text](url) -> link text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove image syntax: ![alt text](url) -> alt text
  text = text.replace(/!\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove bold and italic syntax
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2"); // Bold: **text** or __text__
  text = text.replace(/(\*|_)(.*?)\1/g, "$2"); // Italic: *text* or _text_

  // Remove code blocks and inline code
  text = text.replace(/```[\s\S]*?```/g, ""); // Code blocks: ```code```
  text = text.replace(/`([^`]+)`/g, "$1"); // Inline code: `code`

  // Remove blockquotes
  text = text.replace(/^>\s+/gm, "");

  // Remove headings
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Remove horizontal rules
  text = text.replace(/^(?:[-*_]){3,}$/gm, "");

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, "");

  // Handle lists - replace bullet points with a space
  text = text.replace(/^\s*[-+*]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");

  // Collapse multiple newlines and spaces
  text = text.replace(/\n{2,}/g, " ");
  text = text.replace(/\s{2,}/g, " ");

  // Trim any whitespace
  text = text.trim();

  // If maxLength is provided, truncate to that length
  if (maxLength && text.length > maxLength) {
    // Find the last space before maxLength to avoid cutting words
    const lastSpace = text.lastIndexOf(" ", maxLength);
    if (lastSpace > 0 && maxLength - lastSpace < 20) {
      // Only use lastSpace if it's within a reasonable distance from maxLength
      text = text.substring(0, lastSpace);
    } else {
      // Otherwise just cut at maxLength
      text = text.substring(0, maxLength);
    }

    // Add ellipsis if truncated
    if (text.length < markdownText.length) {
      text += "...";
    }
  }

  return text;
}

/**
 * Safely truncates a string to a maximum length without breaking in the middle of a word
 * and cleans any markdown syntax
 *
 * @param text - The text to truncate and clean
 * @param maxLength - Maximum length for the resulting string
 * @returns Truncated and markdown-free text
 */
export function truncateAndCleanMarkdown(text: string, maxLength: number): string {
  return cleanMarkdownForPlainText(text, maxLength);
}

// Rehype rewrite utilities
export type RehypeRewrite = (node: unknown, index?: number, parent?: unknown) => void;

type HastElement = {
  type: string;
  tagName: string;
  properties?: Record<string, unknown>;
};
const isHastElement = (node: unknown): node is HastElement =>
  !!node &&
  typeof node === "object" &&
  "type" in (node as object) &&
  (node as any).type === "element" &&
  "tagName" in (node as object) &&
  typeof (node as any).tagName === "string";

/**
 * Creates a rehype rewrite callback that converts specified heading levels to a target level.
 * Example: rewriteHeadingsToLevel(6) will convert h1..h5 to h6 (h6 remains unchanged).
 */
export function rewriteHeadingsToLevel(
  targetLevel: number,
  fromLevels: number[] = [1, 2, 3, 4, 5]
): RehypeRewrite {
  const toTag = `h${Math.min(Math.max(targetLevel, 1), 6)}`;
  const fromTags = new Set(
    fromLevels.filter((lvl) => lvl >= 1 && lvl <= 6).map((lvl) => `h${lvl}`)
  );

  return (node: unknown) => {
    if (isHastElement(node)) {
      const tagName = node.tagName.toLowerCase();
      if (fromTags.has(tagName)) {
        node.tagName = toTag;
      }
    }
  };
}

export default { renderToHTML, renderToPlainText };
