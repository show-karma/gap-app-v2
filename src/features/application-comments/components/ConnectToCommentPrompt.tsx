"use client";

import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utilities/tailwind";

interface ConnectToCommentPromptProps {
  className?: string;
}

export function ConnectToCommentPrompt({ className }: ConnectToCommentPromptProps) {
  const { login } = useAuth();

  return (
    <div
      className={cn(
        "border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center bg-gray-50 dark:bg-zinc-800",
        className
      )}
      data-testid="connect-to-comment-prompt"
    >
      <p className="text-muted-foreground mb-3">Login to join the conversation</p>
      <Button variant="outline" onClick={login}>
        <Wallet className="w-4 h-4" />
        Login
      </Button>
    </div>
  );
}
