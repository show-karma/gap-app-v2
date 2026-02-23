"use client";

import {
  AlertCircleIcon,
  BotIcon,
  CopyIcon,
  MessageSquareIcon,
  SparklesIcon,
  Trash2Icon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { ConfirmationCard } from "@/components/AgentChat/ConfirmationCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

/** Scrolls to bottom whenever the message count changes (must be inside StickToBottom). */
function ScrollOnNewMessage({ messageCount }: { messageCount: number }) {
  const { scrollToBottom } = useStickToBottomContext();
  const prevCount = useRef(messageCount);

  useEffect(() => {
    if (messageCount !== prevCount.current) {
      prevCount.current = messageCount;
      scrollToBottom();
    }
  }, [messageCount, scrollToBottom]);

  return null;
}

function contextLabel(ctx: Record<string, string | undefined> | null): string | null {
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

  const badge = contextLabel(agentContext);

  return (
    <TooltipProvider delayDuration={300}>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-brand-blue text-white shadow-lg hover:bg-brand-blue/90 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-in fade-in zoom-in-75 duration-300"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        <div className="relative h-6 w-6">
          <MessageSquareIcon
            className={`absolute inset-0 h-6 w-6 transition-all duration-200 ${
              isOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
            }`}
          />
          <XIcon
            className={`absolute inset-0 h-6 w-6 transition-all duration-200 ${
              isOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
            }`}
          />
        </div>
      </button>

      {/* Chat panel — always in DOM, animated via CSS */}
      <div
        role="dialog"
        aria-label="Chat assistant"
        aria-hidden={!isOpen}
        className={`fixed bottom-20 right-6 z-50 w-[min(380px,calc(100vw-2rem))] h-[min(600px,calc(100vh-120px))] flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-lg transition-all duration-300 ease-out overflow-hidden ${
          isOpen
            ? "translate-y-0 opacity-100 scale-100"
            : "pointer-events-none translate-y-4 opacity-0 scale-[0.97]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-blue/10">
              <SparklesIcon className="h-3.5 w-3.5 text-brand-blue" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Karma Assistant</h3>
            {badge && <Badge variant="secondary">{badge}</Badge>}
          </div>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    abort();
                    clearMessages();
                  }}
                  title="Clear chat"
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Clear chat</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-xs" onClick={toggleOpen} title="Close chat">
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Messages — only mount Conversation when open so StickToBottom measures correctly */}
        {isOpen && (
          <Conversation className="flex-1 min-h-0">
            <ScrollOnNewMessage messageCount={messages.length} />
            <ConversationContent className="gap-4 px-4 py-4">
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/10">
                      <SparklesIcon className="h-6 w-6 text-brand-blue" />
                    </div>
                  }
                  title="How can I help?"
                  description="Ask me about your projects, programs, or applications."
                />
              ) : (
                messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.content && (
                      <div
                        className={`flex items-start gap-2.5 ${
                          msg.role === "user" ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback
                            className={
                              msg.role === "user"
                                ? "bg-brand-blue/10 text-brand-blue"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {msg.role === "user" ? (
                              <UserIcon className="h-3.5 w-3.5" />
                            ) : (
                              <BotIcon className="h-3.5 w-3.5" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="max-w-[calc(100%-2.5rem)] group">
                          <Message from={msg.role}>
                            <MessageContent>
                              <MessageResponse>{msg.content}</MessageResponse>
                            </MessageContent>
                            {msg.role === "assistant" && msg.content && !msg.isStreaming && (
                              <MessageActions className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <MessageAction
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.content).catch(() => {
                                      // Clipboard API can fail in insecure contexts or iframes
                                    });
                                  }}
                                  tooltip="Copy"
                                >
                                  <CopyIcon className="size-3" />
                                </MessageAction>
                              </MessageActions>
                            )}
                          </Message>
                        </div>
                      </div>
                    )}
                    {msg.toolResult?.type === "preview" && (
                      <div className="pl-9">
                        <ConfirmationCard
                          toolResult={msg.toolResult}
                          onApprove={() => sendConfirmation(msg.id, msg.toolResult!.toolName, true)}
                          onDeny={() => sendConfirmation(msg.id, msg.toolResult!.toolName, false)}
                          disabled={isStreaming}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
              {isStreaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex items-start gap-2.5">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <BotIcon className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1 px-1 py-2" data-testid="thinking-dots">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive-subtle p-3 flex items-start gap-2">
                  <AlertCircleIcon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive" data-testid="chat-error">
                    {error}
                  </p>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}

        {/* Input */}
        <div className="border-t border-border p-3">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your project..."
              disabled={isStreaming}
              className="min-h-10 max-h-24 text-sm"
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
    </TooltipProvider>
  );
}
