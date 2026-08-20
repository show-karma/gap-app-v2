import { useCallback, useEffect, useRef } from "react";
import { ChatBubbleShell } from "@/components/AgentChat/ChatBubbleShell";
import { KarmaLogo } from "@/components/Icons/Karma";
import { useAgentChatStore } from "@/store/agentChat";
import { abortWidgetStream, type GetAuthToken, useWidgetStream } from "./useWidgetStream";
import { WidgetInput } from "./WidgetInput";
import { WidgetMarkdown } from "./WidgetMarkdown";

/**
 * A standing note above the composer — for a host to say something true about
 * this conversation that the answers themselves will not.
 *
 * The case it exists for: a host with no session to offer (see `getAuthToken`)
 * gets general answers, and someone asking about *their* application deserves
 * to know that before they read the reply, not after. Text is supplied by the
 * host rather than written here, because only the host knows what its own
 * situation is.
 */
export interface ChatNotice {
  text: string;
  actionLabel?: string;
  actionHref?: string;
}

interface ChatWidgetProps {
  apiUrl: string;
  communityId: string;
  title?: string;
  placeholder?: string;
  getAuthToken?: GetAuthToken;
  notice?: ChatNotice;
  /** See KarmaChatConfig.brand — opt-in, defaults to the neutral mark. */
  brand?: "karma" | "none";
  /** See KarmaChatConfig.badge — e.g. "Community". */
  badge?: string;
  /** See KarmaChatConfig.emptyDescription. */
  emptyDescription?: string;
  /** See KarmaChatConfig.placement. */
  placement?: "fab" | "anchored";
}

export function ChatWidget({
  apiUrl,
  communityId,
  title = "Karma Assistant",
  placeholder,
  getAuthToken,
  notice,
  brand = "none",
  badge,
  emptyDescription,
  placement,
}: ChatWidgetProps) {
  const { isOpen, toggleOpen, messages, isStreaming, error, clearMessages } = useAgentChatStore();
  const { sendMessage, abort } = useWidgetStream({ apiUrl, communityId, getAuthToken });

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
      placement={placement}
      isOpen={isOpen}
      onToggle={toggleOpen}
      onClear={() => {
        abort();
        clearMessages();
      }}
      title={title}
      badge={
        badge ? (
          // The shell takes a node, and the in-app panel passes its <Badge>.
          // That component is not in this bundle's content globs, so its
          // classes would be tree-shaken out of the widget stylesheet; these
          // are the same utilities written inline.
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {badge}
          </span>
        ) : undefined
      }
      renderBrandIcon={
        brand === "karma" ? ({ className }) => <KarmaLogo className={className} /> : undefined
      }
      emptyDescription={
        // The fallback names the community by its id, which is a slug — fine as
        // a default, wrong as a sentence ("filecoin" for Filecoin). A host that
        // knows its own name passes one.
        emptyDescription ?? `Ask me about ${communityId} grants, programs, or applications.`
      }
      messages={messages}
      isStreaming={isStreaming}
      error={error}
      renderMarkdown={(content) => <WidgetMarkdown>{content}</WidgetMarkdown>}
      renderInput={() => (
        <>
          <WidgetInput
            onSubmit={handleSubmit}
            isStreaming={isStreaming}
            onStop={abort}
            placeholder={placeholder}
          />
          {notice ? (
            // Under the composer, as a footnote: it qualifies every answer in
            // the thread, not just the first, so it cannot live in the empty
            // state — that disappears the moment someone asks anything.
            <p className="-mt-1 px-3 pb-3 text-[11px] leading-snug text-muted-foreground">
              {notice.text}{" "}
              {notice.actionHref && notice.actionLabel ? (
                <a
                  href={notice.actionHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2"
                >
                  {notice.actionLabel}
                </a>
              ) : null}
            </p>
          ) : null}
        </>
      )}
    />
  );
}
