import { useCallback, useEffect, useRef } from "react";
import { ChatBubbleShell } from "@/components/AgentChat/ChatBubbleShell";
import { useAgentChatStore } from "@/store/agentChat";
import { abortWidgetStream, useWidgetStream } from "./useWidgetStream";
import { WidgetInput } from "./WidgetInput";
import { WidgetMarkdown } from "./WidgetMarkdown";

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

  const previousCommunityIdRef = useRef(communityId);
  useEffect(() => {
    const store = useAgentChatStore.getState();
    if (previousCommunityIdRef.current !== communityId) {
      abortWidgetStream();
      store.clearMessages();
      previousCommunityIdRef.current = communityId;
    }
    store.setAgentContext({ ...store.agentContext, communityId });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when communityId changes
  }, [communityId]);

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text || isStreaming) return;
      sendMessage(text);
    },
    [isStreaming, sendMessage]
  );

  return (
    <ChatBubbleShell
      isOpen={isOpen}
      onToggle={toggleOpen}
      onClear={() => {
        abort();
        clearMessages();
      }}
      title={title}
      emptyDescription={`Ask me about ${communityId} grants, programs, or applications.`}
      messages={messages}
      isStreaming={isStreaming}
      error={error}
      renderMarkdown={(content) => <WidgetMarkdown>{content}</WidgetMarkdown>}
      renderInput={() => (
        <WidgetInput
          onSubmit={handleSubmit}
          isStreaming={isStreaming}
          onStop={abort}
          placeholder={placeholder}
        />
      )}
    />
  );
}
