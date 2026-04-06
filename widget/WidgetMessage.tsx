import { cjk } from "@streamdown/cjk";
import { BotIcon, UserIcon } from "lucide-react";
import { memo } from "react";
import { Streamdown } from "streamdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/utilities/tailwind";

interface WidgetMessageProps {
  content: string;
  from: "user" | "assistant";
}

// Intentionally exclude @streamdown/code — it bundles shiki (~8MB of syntax grammars).
// The widget uses plain <code> styling instead, which is sufficient for a chat assistant.
const streamdownPlugins = { cjk };

export const WidgetMessage = memo(function WidgetMessage({ content, from }: WidgetMessageProps) {
  const isUser = from === "user";

  return (
    <div className={cn("flex items-start gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarFallback
          className={isUser ? "bg-brand-blue/10 text-brand-blue" : "bg-muted text-muted-foreground"}
        >
          {isUser ? <UserIcon className="h-3.5 w-3.5" /> : <BotIcon className="h-3.5 w-3.5" />}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "max-w-[calc(100%-2.5rem)] rounded-lg px-3 py-2 text-sm",
          isUser ? "bg-brand-blue text-white" : "bg-muted text-foreground"
        )}
      >
        <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <Streamdown plugins={streamdownPlugins}>{content}</Streamdown>
        </div>
      </div>
    </div>
  );
});
