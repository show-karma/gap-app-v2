/**
 * Mention format stored in comment content:
 * @[Display Name](email:user@example.com)
 *
 * While editing, mentions appear as clean `@Name` in the textarea.
 * On submit, they are resolved to the full format using a name→email map.
 */

export interface ParsedMention {
  displayName: string;
  email: string;
  raw: string;
}

const MENTION_PATTERN = /@\[([^\]]+)\]\(email:([^\s)]+)\)/g;

/**
 * Extracts all @mentions from comment content.
 */
export function parseMentions(content: string): ParsedMention[] {
  if (!content) return [];

  const pattern = new RegExp(MENTION_PATTERN.source, MENTION_PATTERN.flags);
  return Array.from(content.matchAll(pattern)).map((match) => ({
    displayName: match[1],
    email: match[2],
    raw: match[0],
  }));
}

/**
 * Inserts a clean @Name into the editor content, replacing the @filterText
 * that triggered the autocomplete.
 */
export function insertMention(
  currentContent: string,
  cursorPosition: number,
  reviewer: { name: string; email: string },
  _filterText: string
): string {
  const beforeCursor = currentContent.slice(0, cursorPosition);
  const atIndex = beforeCursor.lastIndexOf("@");

  if (atIndex === -1) return currentContent;

  const mentionToken = `@${reviewer.name}`;
  const before = currentContent.slice(0, atIndex);
  const after = currentContent.slice(cursorPosition);

  return `${before}${mentionToken} ${after}`;
}

/**
 * Resolves clean @Name tokens to the full @[Name](email:...) format
 * using a name→email mapping. Sort by name length descending to avoid
 * partial replacements (e.g. @John before @John Doe).
 */
export function resolveMentionsForSubmit(
  content: string,
  mentionsMap: Map<string, string>
): string {
  if (!content || mentionsMap.size === 0) return content;

  const entries = Array.from(mentionsMap.entries()).sort((a, b) => b[0].length - a[0].length);

  let resolved = content;
  for (const [name, email] of entries) {
    resolved = resolved.replaceAll(`@${name}`, `@[${name}](email:${email})`);
  }
  return resolved;
}

/**
 * Converts mention tokens to bold markdown for display.
 * @[Display Name](email:...) → **@Display Name**
 */
export function renderMentionsAsMarkdown(content: string): string {
  if (!content) return content;
  return content.replace(MENTION_PATTERN, "**@$1**");
}
