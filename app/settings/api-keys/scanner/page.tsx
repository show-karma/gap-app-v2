"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ScannerApiKeys } from "@/src/features/scanner/components/scanner-api-keys";

export default function ScannerApiKeysSettingsPage() {
  const { authenticated, ready, login } = useAuth();

  if (!ready) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-12">
        <output
          className="flex animate-pulse flex-col gap-3 rounded-2xl border border-border bg-card p-6"
          aria-busy="true"
          aria-label="Checking session"
        >
          <div className="h-5 w-1/3 rounded bg-secondary" />
          <div className="h-5 w-2/3 rounded bg-secondary" />
        </output>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold text-foreground">
          Log in to manage your scanner API keys
        </h1>
        <p className="text-sm text-muted-foreground">
          Scanner API keys are personal. Log in to generate, list, or revoke keys for your account.
        </p>
        <Button type="button" onClick={() => login()}>
          Log in
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <ScannerApiKeys />
    </main>
  );
}
