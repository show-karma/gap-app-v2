"use client";

import { Lock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AccessCodeInputProps {
  onSubmit: (code: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
  programName?: string;
}

export function AccessCodeInput({ onSubmit, isLoading, error, programName }: AccessCodeInputProps) {
  const [accessCode, setAccessCode] = useState("");

  const handleSubmit = async () => {
    if (!accessCode.trim()) return;
    await onSubmit(accessCode.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-primary/10 rounded-full p-6 mb-6">
        <Lock className="w-12 h-12 text-primary" data-testid="lock-icon" />
      </div>

      <h2 className="text-2xl font-semibold mb-2 text-center">This Application is Protected</h2>

      <p className="text-zinc-500 text-center max-w-md mb-8">
        {programName ? (
          <>
            <span className="font-medium text-foreground">{programName}</span> requires an access
            code to apply.
          </>
        ) : (
          "This program requires an access code to apply."
        )}{" "}
        Enter the code shared with you by the program administrator to unlock the application form.
      </p>

      <div className="w-full max-w-md rounded-lg border bg-card shadow-lg p-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="access-code-input" className="text-sm font-medium">
            Access Code
          </label>
          <Input
            id="access-code-input"
            placeholder="Enter your access code"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={isLoading}
            className="font-mono tracking-wider h-14 text-lg"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!accessCode.trim() || isLoading}
          isLoading={isLoading}
          className="w-full"
          size="lg"
        >
          {!isLoading && <Lock className="w-4 h-4 mr-2" />}
          {isLoading ? "Verifying..." : "Unlock Application"}
        </Button>
      </div>

      <p className="text-zinc-400 text-sm mt-6 text-center max-w-sm">
        Don&apos;t have an access code? Contact the program administrator to request one.
      </p>
    </div>
  );
}
