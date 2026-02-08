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
}

interface AgentChatStore {
  messages: ChatMessage[];
  isOpen: boolean;
  isStreaming: boolean;
  error: string | null;

  // Context for role-aware entry points (optional viewing hint)
  agentContext: {
    projectId?: string;
    programId?: string;
    applicationId?: string;
    communityId?: string;
  } | null;

  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  addMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  finalizeLastAssistantMessage: () => void;
  updateLastAssistantToolResult: (toolResult: ToolResultData) => void;
  updateMessageToolResultStatus: (messageId: string, status: "approved" | "denied") => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  setAgentContext: (ctx: AgentChatStore["agentContext"]) => void;
  clearMessages: () => void;
}

export const useAgentChatStore = create<AgentChatStore>((set) => ({
  messages: [],
  isOpen: false,
  isStreaming: false,
  error: null,
  agentContext: null,

  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

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

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
  setAgentContext: (agentContext) => set({ agentContext }),
  clearMessages: () => set({ messages: [], error: null }),
}));
