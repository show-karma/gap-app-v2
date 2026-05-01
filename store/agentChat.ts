import { create } from "zustand";

export interface ToolResultData {
  type: "preview" | "commit" | "extraction";
  toolName: string;
  data: Record<string, unknown>;
  status?: "pending" | "approved" | "denied";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  /** For preview/commit tool results rendered as confirmation cards */
  toolResult?: ToolResultData;
  isStreaming?: boolean;
  /** Langfuse trace ID — only present on assistant messages once the backend emits it */
  traceId?: string;
  /** User feedback rating: 1 = thumbs up, -1 = thumbs down */
  rating?: 1 | -1;
}

/**
 * A pre-seeded reference (milestone, project, etc.) rendered as a chip in the
 * input AND in the sent message bubble. The user still has to press Send —
 * chips are not auto-submitted.
 *
 * - `label` is what shows in the pill ("Milestone 1 from Fund#2")
 * - `primaryId` is the agent-resolvable handle (slug for project, uid for
 *   milestone) — `get_project_details` accepts UID or slug directly.
 * - `parentSlug` is an optional project slug carried alongside a milestone
 *   so the agent has unambiguous project context.
 *
 * On submit, each chip is serialized as a markdown-link-shaped token:
 *   `@[<label>](mention:<kind>:<primaryId>[?project=<parentSlug>])`
 * The chat shell detects this token in user messages and renders it as a pill
 * matching the input chip styling.
 */
export interface ChatMention {
  id: string;
  kind: "milestone" | "project" | "application";
  label: string;
  primaryId: string;
  parentSlug?: string;
}

interface AgentChatStore {
  messages: ChatMessage[];
  isOpen: boolean;
  isStreaming: boolean;
  error: string | null;

  /**
   * Buffered Langfuse trace ID. The backend emits `trace_started` over SSE
   * BEFORE the first assistant token arrives, so by the time the system
   * event is processed there's no assistant message in the store yet to
   * attach it to. We park the traceId here and consume it on the next
   * assistant message added via `addMessage`.
   */
  pendingTraceId: string | null;

  /**
   * ID of the assistant message whose thumbs-down feedback comment box is
   * currently open. The thumbs UI lives inline next to the copy button
   * (in the message bubble's action row), but the textarea expands below
   * the message via `renderAfterMessage`. They live in different parts of
   * the tree, so we coordinate the open/closed state through the store
   * rather than React-context-lifting.
   */
  ratingCommentBoxOpenForMessageId: string | null;

  // Context for role-aware entry points (optional viewing hint)
  agentContext: {
    projectId?: string;
    programId?: string;
    applicationId?: string;
    communityId?: string;
  } | null;

  // Reference chips seeded into the chat input (via "@mention" buttons on
  // milestone cards, etc.). Rendered as pills inside the input; on submit
  // their `refText` is prepended to the message. Chips persist until removed
  // or until the message is sent.
  pendingMentions: ChatMention[];

  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  addMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  finalizeLastAssistantMessage: () => void;
  updateLastAssistantToolResult: (toolResult: ToolResultData) => void;
  updateMessageToolResultStatus: (messageId: string, status: "approved" | "denied") => void;
  setLastAssistantTraceId: (traceId: string) => void;
  setMessageRating: (messageId: string, rating: 1 | -1) => void;
  setRatingCommentBoxOpenForMessageId: (messageId: string | null) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  setAgentContext: (ctx: AgentChatStore["agentContext"]) => void;
  addMention: (mention: ChatMention) => void;
  removeMention: (id: string) => void;
  clearMentions: () => void;
  clearMessages: () => void;
}

export const useAgentChatStore = create<AgentChatStore>((set) => ({
  messages: [],
  isOpen: false,
  isStreaming: false,
  error: null,
  agentContext: null,
  pendingMentions: [],
  pendingTraceId: null,
  ratingCommentBoxOpenForMessageId: null,

  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  addMessage: (message) =>
    set((state) => {
      // If a trace_started SSE event arrived before this assistant message
      // existed, consume the buffered traceId and stamp it on the new
      // message — that's the path the rating UI gates on.
      if (
        message.role === "assistant" &&
        !message.traceId &&
        state.pendingTraceId
      ) {
        return {
          messages: [
            ...state.messages,
            { ...message, traceId: state.pendingTraceId }
          ],
          pendingTraceId: null
        };
      }
      return { messages: [...state.messages, message] };
    }),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIdx = messages.length - 1;
      if (lastIdx >= 0 && messages[lastIdx].role === "assistant") {
        messages[lastIdx] = { ...messages[lastIdx], content };
      }
      return { messages };
    }),

  finalizeLastAssistantMessage: () =>
    set((state) => {
      const messages = [...state.messages];
      const lastIdx = messages.length - 1;
      if (lastIdx >= 0 && messages[lastIdx].role === "assistant") {
        messages[lastIdx] = { ...messages[lastIdx], isStreaming: false };
      }
      return { messages };
    }),

  updateLastAssistantToolResult: (toolResult) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIdx = messages.length - 1;
      if (lastIdx >= 0 && messages[lastIdx].role === "assistant") {
        messages[lastIdx] = { ...messages[lastIdx], toolResult };
      }
      return { messages };
    }),

  updateMessageToolResultStatus: (messageId, status) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId && msg.toolResult
          ? { ...msg, toolResult: { ...msg.toolResult, status } }
          : msg
      ),
    })),

  setLastAssistantTraceId: (traceId) =>
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant") {
          // Defensive: don't clobber an existing traceId. Today the
          // assistant placeholder is added synchronously before the
          // stream opens (see useAgentStream) so the latest assistant
          // message will always be the right target. But future flows
          // (regenerate, tool re-runs, replay) could leave a finalized
          // assistant message with a traceId in place when a new
          // trace_started event fires; we should buffer the new one
          // for the next addMessage instead of silently overwriting.
          if (messages[i].traceId) {
            return { pendingTraceId: traceId };
          }
          messages[i] = { ...messages[i], traceId };
          return { messages };
        }
      }
      // No assistant message yet — buffer the traceId so the next
      // addMessage call (when the assistant message is created from the
      // first stream token) can attach it.
      return { pendingTraceId: traceId };
    }),

  setMessageRating: (messageId, rating) =>
    set((state) => ({
      messages: state.messages.map((msg) => (msg.id === messageId ? { ...msg, rating } : msg)),
    })),

  setRatingCommentBoxOpenForMessageId: (messageId) =>
    set({ ratingCommentBoxOpenForMessageId: messageId }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
  setAgentContext: (agentContext) => set({ agentContext }),
  addMention: (mention) =>
    set((state) =>
      state.pendingMentions.some((m) => m.id === mention.id)
        ? state
        : { pendingMentions: [...state.pendingMentions, mention] }
    ),
  removeMention: (id) =>
    set((state) => ({ pendingMentions: state.pendingMentions.filter((m) => m.id !== id) })),
  clearMentions: () => set({ pendingMentions: [] }),
  clearMessages: () =>
    set({
      messages: [],
      error: null,
      isStreaming: false,
      pendingTraceId: null,
      ratingCommentBoxOpenForMessageId: null
    }),
}));
