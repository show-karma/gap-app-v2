/**
 * DOM id of the Karma Assistant panel, shared between the panel itself
 * (`ChatBubbleShell`) and the navbar trigger's `aria-controls`.
 *
 * It lives in its own module rather than in `ChatBubbleShell.tsx` on purpose:
 * the navbar renders on every page, while the chat shell is deliberately
 * loaded via `next/dynamic` with `ssr: false`. Importing the constant from the
 * shell would drag the shell — and its `ai-elements` dependency tree — into the
 * navbar chunk and undo that code split.
 */
export const KARMA_ASSISTANT_PANEL_ID = "karma-assistant-panel";
