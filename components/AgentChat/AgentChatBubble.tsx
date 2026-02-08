"use client";

import { CopyIcon, MessageSquare } from "lucide-react";
import { useCallback, useState } from "react";
import { useAgentContextSync } from "@/hooks/useAgentContextSync";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useAuth } from "@/hooks/useAuth";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/src/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/src/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/src/components/ai-elements/prompt-input";
import { useAgentChatStore } from "@/store/agentChat";
import { ConfirmationCard } from "./ConfirmationCard";

function contextLabel(ctx: Record<string, string> | null): string | null {
  if (!ctx) return null;
  if (ctx.projectId) return "Project";
  if (ctx.programId) return "Program";
  if (ctx.applicationId) return "Application";
  if (ctx.communityId) return "Community";
  return null;
}

export function AgentChatBubble() {
  const { authenticated } = useAuth();
  const { isOpen, toggleOpen, messages, isStreaming, error, clearMessages, agentContext } =
    useAgentChatStore();
  const { sendMessage, sendConfirmation, abort } = useAgentStream();
  const [input, setInput] = useState("");

  // Sync page context (project/program/application) to agent store
  useAgentContextSync();

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const trimmed = message.text.trim();
      if (!trimmed || isStreaming) return;
      setInput("");
      sendMessage(trimmed);
    },
    [isStreaming, sendMessage]
  );

  // Don't render for unauthenticated users
  if (!authenticated) return null;

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] flex flex-col rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">GAP Assistant</h3>
              {contextLabel(agentContext) && (
                <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                  {contextLabel(agentContext)}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearMessages}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Clear chat"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Messages — AI Elements Conversation handles scroll-to-bottom */}
          <Conversation className="flex-1 min-h-0">
            <ConversationContent className="gap-4 p-4">
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<MessageSquare className="size-12" />}
                  title="Start a conversation"
                  description="Ask me anything about your projects, programs, or applications."
                />
              ) : (
                messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.content && (
                      <Message from={msg.role}>
                        <MessageContent>
                          <MessageResponse>{msg.content}</MessageResponse>
                        </MessageContent>
                        {msg.role === "assistant" && msg.content && !msg.isStreaming && (
                          <MessageActions>
                            <MessageAction
                              onClick={() => navigator.clipboard.writeText(msg.content)}
                              tooltip="Copy"
                            >
                              <CopyIcon className="size-3" />
                            </MessageAction>
                          </MessageActions>
                        )}
                      </Message>
                    )}
                    {msg.toolResult?.type === "preview" && (
                      <ConfirmationCard
                        toolResult={msg.toolResult}
                        onApprove={() => sendConfirmation(msg.id, msg.toolResult!.toolName, true)}
                        onDeny={() => sendConfirmation(msg.id, msg.toolResult!.toolName, false)}
                        disabled={isStreaming}
                      />
                    )}
                  </div>
                ))
              )}
              {isStreaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-start mb-2">
                  <div className="bg-gray-100 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm text-gray-500">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
              {error && (
                <div className="text-sm text-red-500 dark:text-red-400 text-center py-2">
                  {error}
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {/* Input — AI Elements PromptInput */}
          <div className="border-t border-gray-200 dark:border-zinc-700 p-3">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={isStreaming}
                className="min-h-10 max-h-24"
              />
              <PromptInputFooter>
                <div />
                <PromptInputSubmit
                  status={isStreaming ? "streaming" : "ready"}
                  onStop={abort}
                  disabled={!input.trim() && !isStreaming}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      )}
    </>
  );
}
