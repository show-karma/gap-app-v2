import { AlertCircleIcon, MessageSquareIcon, SparklesIcon, Trash2Icon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/src/components/ai-elements/conversation";
import { useAgentChatStore } from "@/store/agentChat";
import { useWidgetStream } from "./useWidgetStream";
import { WidgetInput } from "./WidgetInput";
import { WidgetMessage } from "./WidgetMessage";

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

interface ChatWidgetProps {
  apiUrl: string;
  communityId: string;
  title?: string;
  placeholder?: string;
}

export function ChatWidget({
  apiUrl,
  communityId,
  title = "Karma Assistant",
  placeholder,
}: ChatWidgetProps) {
  const { isOpen, toggleOpen, messages, isStreaming, error, clearMessages } = useAgentChatStore();
  const { sendMessage, abort } = useWidgetStream({ apiUrl, communityId });

  const setAgentContext = useAgentChatStore((s) => s.setAgentContext);
  useEffect(() => {
    setAgentContext({ communityId });
  }, [communityId, setAgentContext]);

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text || isStreaming) return;
      sendMessage(text);
    },
    [isStreaming, sendMessage]
  );

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-[9999] h-12 w-12 rounded-full bg-brand-blue text-white shadow-lg hover:bg-brand-blue/90 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
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

      {/* Chat panel */}
      <div
        role="dialog"
        aria-label="Chat assistant"
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={`fixed bottom-20 right-6 z-[9999] w-[min(380px,calc(100vw-2rem))] h-[min(600px,calc(100vh-120px))] flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-lg transition-all duration-300 ease-out overflow-hidden ${
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
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <Badge variant="secondary">{communityId}</Badge>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                abort();
                clearMessages();
              }}
              aria-label="Clear chat"
              className="h-7 w-7 p-0"
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleOpen}
              aria-label="Close chat"
              className="h-7 w-7 p-0"
            >
              <XIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
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
                  description={`Ask me about ${communityId} grants, programs, or applications.`}
                />
              ) : (
                messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.content && (
                      <WidgetMessage
                        content={msg.content}
                        from={msg.role === "user" ? "user" : "assistant"}
                      />
                    )}
                  </div>
                ))
              )}
              {isStreaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex items-center gap-1 px-1 py-2 ml-8" data-testid="thinking-dots">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:300ms]" />
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive-subtle p-3 flex items-start gap-2">
                  <AlertCircleIcon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}

        {/* Input */}
        <WidgetInput
          onSubmit={handleSubmit}
          isStreaming={isStreaming}
          onStop={abort}
          placeholder={placeholder}
        />
      </div>
    </>
  );
}
