import { Fragment, type ReactNode } from "react";
import type { ChatMention } from "@/store/agentChat";

/**
 * Wire format for a mention reference inside a chat message body.
 *
 *   @[<label>](mention:<kind>:<primaryId>[?project=<parentSlug>])
 *
 * The visible "@<label>" is what the user (and the LLM) reads as a friendly
 * name; the structured tail is the agent-resolvable handle (slug for project,
 * uid for milestone — both accepted by `get_project_details`). The chat
 * shell parses this token to render a pill in the message bubble matching
 * the chip styling in the input editor.
 *
 * Labels are user-controlled. We strip `]` (would terminate the link text)
 * and `\n` (would break parsing across lines) before emission.
 */
export const MENTION_TOKEN_PATTERN =
  /@\[([^\]\n]+)\]\(mention:(milestone|project|application):([^)?\s]+)(?:\?project=([^)\s]+))?\)/g;

export function mentionToToken(m: ChatMention): string {
  const safeLabel = m.label.replace(/]/g, ")").replace(/\n/g, " ");
  const tail = m.parentSlug ? `?project=${m.parentSlug}` : "";
  return `@[${safeLabel}](mention:${m.kind}:${m.primaryId}${tail})`;
}

const PILL_CLASSES =
  "inline-flex items-center align-baseline rounded-full bg-brand-blue/10 text-brand-blue px-1.5 py-0.5 mx-0.5 text-xs font-medium select-none";

/**
 * Split a message body into plain-text chunks and inline pill nodes for
 * any embedded mention tokens. Used to render user-authored bubbles that
 * still carry their @-mentions visually.
 */
export function renderWithMentionPills(content: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIdx = 0;
  const re = new RegExp(MENTION_TOKEN_PATTERN.source, "g");
  let match: RegExpExecArray | null = re.exec(content);
  let i = 0;
  while (match !== null) {
    if (match.index > lastIdx) {
      parts.push(<Fragment key={`t-${i}`}>{content.slice(lastIdx, match.index)}</Fragment>);
    }
    parts.push(
      <span key={`m-${i}-${match[3]}`} className={PILL_CLASSES}>
        @{match[1]}
      </span>
    );
    lastIdx = match.index + match[0].length;
    i += 1;
    match = re.exec(content);
  }
  if (lastIdx < content.length) {
    parts.push(<Fragment key={`t-${i}`}>{content.slice(lastIdx)}</Fragment>);
  }
  return <>{parts}</>;
}
