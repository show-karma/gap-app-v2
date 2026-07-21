import type { ChatTurn } from "../store/philanthropy";

/**
 * Conversation message for multi-turn chat history.
 *
 * The indexer accepts the full `messages` array so it can resolve follow-up
 * references ("narrow that to Texas") against prior assistant outputs.
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Builds the conversation array sent to the indexer for a chat-mode turn.
 *
 * Includes all completed prior turns as alternating user/assistant messages,
 * then appends the new user query as the final message. Streaming and errored
 * turns are skipped — they'd give the indexer half-formed context.
 */
export function buildConversationMessages(
  priorTurns: ReadonlyArray<ChatTurn>,
  newUserQuery: string
): ConversationMessage[] {
  const completed = priorTurns.filter((t) => t.status === "done");
  const history: ConversationMessage[] = [];
  for (const turn of completed) {
    history.push({ role: "user", content: turn.userQuery });
    if (turn.narrative.trim()) {
      history.push({ role: "assistant", content: turn.narrative });
    }
  }
  history.push({ role: "user", content: newUserQuery });
  return history;
}
