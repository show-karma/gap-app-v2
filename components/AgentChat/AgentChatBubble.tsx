"use client";

import { SparklesIcon, Trash2Icon, XIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { ConfirmationCard } from "@/components/AgentChat/ConfirmationCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgentContextSync } from "@/hooks/useAgentContextSync";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useAuth } from "@/hooks/useAuth";
import { MessageResponse } from "@/src/components/ai-elements/message-response";
import {
  PromptInput,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/src/components/ai-elements/prompt-input";
import { useAgentChatStore } from "@/store/agentChat";
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

  const badge = contextLabel(agentContext);

  return (
    <ChatBubbleShell
      isOpen={isOpen}
      onToggle={toggleOpen}
      onClear={() => {
        abort();
        clearMessages();
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
        <div className="border-t border-border p-3">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={authenticated ? "Ask about your project..." : "Ask about a project..."}
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
      )}
      renderAfterMessage={(msg) =>
        msg.toolResult?.type === "preview" && authenticated ? (
          <div className="pl-9">
            <ConfirmationCard
              toolResult={msg.toolResult}
              onApprove={() => sendConfirmation(msg.id, msg.toolResult!.toolName, true)}
              onDeny={() => sendConfirmation(msg.id, msg.toolResult!.toolName, false)}
              disabled={isStreaming}
            />
          </div>
        ) : null
      }
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
