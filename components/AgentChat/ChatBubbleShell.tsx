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
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/src/components/ai-elements/conversation";
import { Message, MessageContent } from "@/src/components/ai-elements/message";
import type { ChatMessage } from "@/store/agentChat";
import { renderWithMentionPills } from "@/widget/mention-token";
import { KARMA_ASSISTANT_PANEL_ID } from "./panel-id";

function ScrollOnNewMessage({ lastMessageContent }: { lastMessageContent: string | undefined }) {
  const { scrollToBottom } = useStickToBottomContext();
  const prevContent = useRef(lastMessageContent);

  useEffect(() => {
    if (lastMessageContent && lastMessageContent !== prevContent.current) {
      prevContent.current = lastMessageContent;
      scrollToBottom();
    }
  }, [lastMessageContent, scrollToBottom]);

  return null;
}

export interface ChatBubbleShellProps {
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;

  title?: string;
  badge?: ReactNode;
  emptyDescription?: string;

  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;

  /** Render the markdown content for a message. Receives the raw text. */
  renderMarkdown: (content: string) => ReactNode;
  /** Render the input area at the bottom of the panel. */
  renderInput: () => ReactNode;
  /** Optional slot rendered after each message (e.g. ConfirmationCard). */
  renderAfterMessage?: (msg: ChatMessage) => ReactNode;
  /**
   * Optional slot rendered inside each message's action row (alongside
   * the copy button). Use this for always-visible per-message controls
   * like a thumbs-up/down rating that should sit next to copy.
   *
   * The shell intentionally does not import these — the consumer passes
   * them in so the shell stays free of Next.js-coupled deps (the widget
   * bundle reuses this shell and forbids those imports).
   */
  renderMessageActions?: (msg: ChatMessage) => ReactNode;
  /** Optional wrapper around the entire shell (e.g. TooltipProvider). */
  wrapper?: (children: ReactNode) => ReactNode;
  /** Optional header action buttons (e.g. wrapped in Tooltip). Override defaults. */
  renderHeaderActions?: (props: { onClear: () => void; onClose: () => void }) => ReactNode;
  /**
   * Where the panel lives and who owns its trigger.
   *
   * - `"fab"` (default): the shell renders its own floating bottom-right
   *   button and anchors the panel above it. The embeddable widget bundle
   *   (`widget/ChatWidget.tsx`) runs on third-party sites where there is no
   *   host chrome to hang a trigger off, so it must keep this mode.
   * - `"anchored"`: no floating button — an external trigger (the navbar
   *   assistant button) owns open/close, and the panel drops down from under
   *   the fixed 4rem navbar. Escape closes and focus moves into the input,
   *   which the FAB never did.
   */
  placement?: "fab" | "anchored";
  /**
   * DOM id of the panel. Only needed so an external trigger can point
   * `aria-controls` at it; defaults to the shared constant.
   */
  panelId?: string;
  /**
   * Brand mark shown in the panel header and the empty state. Receives the
   * sizing/colour classes for each slot, since the two render at different
   * sizes.
   *
   * Defaults to the sparkles icon. The in-app panel overrides this with the
   * Karma mark; the embeddable widget deliberately does NOT, because it runs
   * on customers' own sites where stamping the Karma logo into their page is
   * a branding decision, not a styling one.
   */
  renderBrandIcon?: (props: { className: string }) => ReactNode;
}

export function ChatBubbleShell({
  isOpen,
  onToggle,
  onClear,
  title = "Karma Assistant",
  badge,
  emptyDescription = "Ask me about projects, milestones, or the platform.",
  messages,
  isStreaming,
  error,
  renderMarkdown,
  renderInput,
  renderAfterMessage,
  renderMessageActions,
  wrapper,
  renderHeaderActions,
  placement = "fab",
  panelId = KARMA_ASSISTANT_PANEL_ID,
  renderBrandIcon = ({ className }) => <SparklesIcon className={className} />,
}: ChatBubbleShellProps) {
  const isAnchored = placement === "anchored";
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape-to-close and focus-into-input are added for the anchored (navbar)
  // placement only. The FAB placement is the widget's contract on third-party
  // pages, where stealing focus and swallowing Escape would fight the host.
  useEffect(() => {
    if (!isAnchored || !isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onToggle();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isAnchored, isOpen, onToggle]);

  useEffect(() => {
    if (!isAnchored || !isOpen) return;
    // Two frames: the messages subtree and its input only mount once `isOpen`
    // flips, so the editor node does not exist on the first paint.
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        panelRef.current
          ?.querySelector<HTMLElement>('[role="textbox"][aria-label="Chat message"]')
          ?.focus();
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [isAnchored, isOpen]);

  const content = (
    <>
      {/* Floating toggle button — owned by the shell only in FAB placement.
          In anchored placement the navbar assistant button is the trigger. */}
      {!isAnchored && (
        <button
          type="button"
          onClick={onToggle}
          className="karma-assistant-fab fixed bottom-6 right-6 z-[9999] h-12 w-12 rounded-full bg-brand-blue text-white shadow-lg hover:bg-brand-blue/90 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
      )}

      {/* Chat panel */}
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label="Chat assistant"
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={`karma-assistant-panel fixed z-[9999] w-[min(380px,calc(100vw-2rem))] flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-lg transition-all duration-300 ease-out overflow-hidden ${
          isAnchored
            ? // Pinned top AND bottom: hangs off the fixed 4rem navbar and runs to
              // the bottom margin, so the composer sits at the bottom of the
              // viewport instead of floating mid-screen on tall displays.
              // Height is derived from the two insets — do not add an `h-*`.
              "top-[4.5rem] bottom-4 right-4"
            : "bottom-20 right-6 h-[min(600px,calc(100vh-120px))]"
        } ${
          isOpen
            ? "translate-y-0 opacity-100 scale-100"
            : "pointer-events-none translate-y-4 opacity-0 scale-[0.97]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-blue/10">
              {renderBrandIcon({ className: "h-3.5 w-3.5 text-brand-blue" })}
            </div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {badge}
          </div>
          <div className="flex gap-1">
            {renderHeaderActions ? (
              renderHeaderActions({ onClear, onClose: onToggle })
            ) : (
              <>
                <Button variant="ghost" size="icon-xs" onClick={onClear} title="Clear chat">
                  <Trash2Icon className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={onToggle} title="Close chat">
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        {isOpen && (
          <Conversation className="flex-1 min-h-0">
            <ScrollOnNewMessage lastMessageContent={messages[messages.length - 1]?.content} />
            <ConversationContent className="gap-4 px-4 py-4">
              {messages.length === 0 ? (
                <ConversationEmptyState
                  icon={
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/10">
                      {renderBrandIcon({ className: "h-6 w-6 text-brand-blue" })}
                    </div>
                  }
                  title="How can I help?"
                  description={emptyDescription}
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
                              {msg.role === "user"
                                ? renderWithMentionPills(msg.content)
                                : renderMarkdown(msg.content)}
                            </MessageContent>
                            {msg.role === "assistant" && msg.content && !msg.isStreaming && (
                              <div className="flex items-center gap-1">
                                {/* Always-visible per-message actions (e.g. thumbs rating).
                                    Sits FIRST in the row so it's the primary CTA. */}
                                {renderMessageActions?.(msg)}
                                {/* Copy button — fades in on hover only.
                                    Wrapper preserves the existing UX where copy is
                                    discoverable but doesn't visually compete at rest. */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => {
                                      // Raw navigator.clipboard here — this component is reused in
                                      // the widget bundle, which forbids Next.js-coupled imports
                                      // (useCopyToClipboard → errorManager → @sentry/nextjs).
                                      navigator.clipboard.writeText(msg.content).catch(() => {
                                        // SUPPRESSED: clipboard copy is best-effort; failures are
                                        // non-actionable and the widget bundle forbids the Sentry
                                        // error helper.
                                      });
                                    }}
                                    title="Copy"
                                  >
                                    <CopyIcon className="size-3" />
                                    <span className="sr-only">Copy</span>
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Message>
                        </div>
                      </div>
                    )}
                    {renderAfterMessage?.(msg)}
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
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/20 bg-destructive-subtle p-3 flex items-start gap-2"
                >
                  <AlertCircleIcon
                    aria-hidden="true"
                    className="h-4 w-4 text-destructive shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}

        {/* Input */}
        {renderInput()}
      </div>
    </>
  );

  return wrapper ? wrapper(content) : content;
}
