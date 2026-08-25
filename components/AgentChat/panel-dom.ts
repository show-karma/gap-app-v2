/**
 * DOM identifiers shared across the Karma Assistant surfaces.
 *
 * These live in their own module rather than in `ChatBubbleShell.tsx` on
 * purpose: the navbar renders on every page, while the chat shell is
 * deliberately loaded via `next/dynamic` with `ssr: false`. Importing a
 * constant from the shell would drag the shell — and its `ai-elements`
 * dependency tree — into the navbar chunk and undo that code split.
 *
 * The module is plain TypeScript with no Next.js-coupled imports, so the
 * embeddable widget bundle can consume it too.
 */

/** Panel element id, targeted by the navbar trigger's `aria-controls`. */
export const KARMA_ASSISTANT_PANEL_ID = "karma-assistant-panel";

/** Accessible name of the chat composer. */
export const CHAT_COMPOSER_LABEL = "Chat message";

/**
 * Selector for the composer's contenteditable node.
 *
 * Derived from {@link CHAT_COMPOSER_LABEL} so the label and the queries that
 * depend on it cannot drift. When they drift, focusing the composer fails
 * silently — the kind of bug nobody notices until a keyboard user reports it.
 */
export const CHAT_COMPOSER_SELECTOR = `[role="textbox"][aria-label="${CHAT_COMPOSER_LABEL}"]`;
