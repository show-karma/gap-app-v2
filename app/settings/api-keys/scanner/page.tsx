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
          className="flex animate-pulse flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
          aria-busy="true"
          aria-label="Checking session"
        >
          <div className="h-5 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
        </output>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Log in to manage your scanner API keys
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
