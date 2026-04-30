"use client";

import { Trash2Icon, XIcon } from "lucide-react";
import { useCallback } from "react";
import { ConfirmationCard } from "@/components/AgentChat/ConfirmationCard";
import { MessageRating } from "@/components/AgentChat/MessageRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgentContextSync } from "@/hooks/useAgentContextSync";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useAuth } from "@/hooks/useAuth";
import { MessageResponse } from "@/src/components/ai-elements/message-response";
import { useAgentChatStore } from "@/store/agentChat";
import { WidgetInput } from "@/widget/WidgetInput";
import { ChatBubbleShell } from "./ChatBubbleShell";

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
  const {
    isOpen,
    toggleOpen,
    messages,
    isStreaming,
    error,
    clearMessages,
    agentContext,
    pendingMentions,
    clearMentions,
  } = useAgentChatStore();
  const { sendMessage, sendConfirmation, abort } = useAgentStream();

  // Sync page context (project/program/application) to agent store
  useAgentContextSync();

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text || isStreaming) return;
      sendMessage(text);
    },
    [isStreaming, sendMessage]
  );

  const badge = contextLabel(agentContext);

  return (
    <ChatBubbleShell
      isOpen={isOpen}
      onToggle={toggleOpen}
      onClear={() => {
        abort();
        clearMessages();
        clearMentions();
      }}
      title="Karma Assistant"
      badge={badge ? <Badge variant="secondary">{badge}</Badge> : undefined}
      emptyDescription={
        authenticated
          ? "Ask me about your projects, programs, or applications."
          : "Ask me about projects, milestones, or the platform. Sign in to manage your own projects."
      }
      messages={messages}
      isStreaming={isStreaming}
      error={error}
      renderMarkdown={(content) => <MessageResponse>{content}</MessageResponse>}
      renderInput={() => (
        <WidgetInput
          onSubmit={handleSubmit}
          isStreaming={isStreaming}
          onStop={abort}
          placeholder={authenticated ? "Ask about your project..." : "Ask about a project..."}
          mentions={pendingMentions}
          onMentionsConsumed={clearMentions}
        />
      )}
      renderAfterMessage={(msg) => (
        <>
          {msg.toolResult?.type === "preview" && authenticated ? (
            <div className="pl-9">
              <ConfirmationCard
                toolResult={msg.toolResult}
                onApprove={() => sendConfirmation(msg.id, msg.toolResult!.toolName, true)}
                onDeny={() => sendConfirmation(msg.id, msg.toolResult!.toolName, false)}
                disabled={isStreaming}
              />
            </div>
          ) : null}
          {msg.role === "assistant" && msg.content && !msg.isStreaming && msg.traceId ? (
            <MessageRating messageId={msg.id} traceId={msg.traceId} />
          ) : null}
        </>
      )}
      renderHeaderActions={({ onClear, onClose }) => (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-xs" onClick={onClear} title="Clear chat">
                <Trash2Icon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Clear chat</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-xs" onClick={onClose} title="Close chat">
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Close</TooltipContent>
          </Tooltip>
        </>
      )}
      wrapper={(children) => <TooltipProvider delayDuration={300}>{children}</TooltipProvider>}
    />
  );
}
