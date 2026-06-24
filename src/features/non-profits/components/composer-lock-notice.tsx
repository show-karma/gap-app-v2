import { Lock } from "lucide-react";

export type ComposerLockReason = "readonly" | "full" | "login";

const MESSAGE: Record<ComposerLockReason, string> = {
  login: "You've reached the free limit.",
  full: "This conversation has reached its maximum length.",
  readonly: "This conversation belongs to another account and is read-only.",
};

/**
 * Replaces the composer when the conversation can't accept more input. The
 * `login` reason offers a sign-in action; the others offer a new-chat action.
 */
export function ComposerLockNotice({
  reason,
  onNewChat,
  onSignIn,
}: {
  reason: ComposerLockReason;
  onNewChat: () => void;
  onSignIn: () => void;
}) {
  const isLogin = reason === "login";
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      <Lock className="size-4 shrink-0" />
      <span>
        {MESSAGE[reason]}{" "}
        <button
          type="button"
          onClick={isLogin ? onSignIn : onNewChat}
          className="font-medium text-brand underline-offset-2 hover:underline"
        >
          {isLogin ? "Sign in" : "Start a new chat"}
        </button>{" "}
        to continue.
      </span>
    </div>
  );
}
