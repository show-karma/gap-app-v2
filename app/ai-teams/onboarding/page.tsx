"use client";

import { AlertCircle, ArrowLeft, Globe, Hash, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Input } from "@/components/ui/input";
import { useProvisionOrg } from "@/hooks/useTeam";
import { humanizeApiError } from "@/lib/ai-agent-error";
import { PAGES } from "@/utilities/pages";

// Phase 1 wizard: collects the four fields gap-indexer's
// POST /v2/hermes/orgs/:slug/provision needs to register a pre-existing
// container. Real-container-spawn is an ops concern; this UI is the seam
// for "tell us where your team lives + the auth token" until that's wired.
export default function OnboardingPage() {
  const router = useRouter();
  const provision = useProvisionOrg();
  const [slug, setSlug] = useState("");
  const [containerUrl, setContainerUrl] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [communityId, setCommunityId] = useState("");

  const canSubmit = slug && containerUrl && sessionToken && !provision.isPending;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={PAGES.TEAM.LIST}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-zinc-400 transition hover:text-gray-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to teams
      </Link>
      <div className="mt-4">
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-gray-900 dark:text-zinc-100">
          Set up your AI team
        </h1>
        <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-zinc-400">
          Your nonprofit gets a dedicated AI team running in its own private container. Connect to
          it once and we&apos;ll handle the rest.
        </p>
      </div>

      <form
        className="mt-10 space-y-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          provision.mutate(
            {
              slug: slug.trim(),
              containerUrl: containerUrl.trim(),
              sessionToken: sessionToken.trim(),
              communityId: communityId.trim() || null,
            },
            {
              onSuccess: (org) => {
                router.push(PAGES.TEAM.DIRECTORY(org.slug));
              },
            }
          );
        }}
      >
        <Field
          id="slug"
          label="Organization handle"
          hint="Lowercase letters, numbers, hyphens. This is internal — won't be shown publicly."
          icon={<Hash className="h-4 w-4" aria-hidden />}
          required
        >
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="acme-nonprofit"
            className="h-auto rounded-none border-0 bg-transparent py-2 pl-0 pr-3 text-sm text-gray-900 dark:text-zinc-100 shadow-none placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus-visible:ring-0"
            required
          />
        </Field>

        <Field
          id="containerUrl"
          label="Runtime URL"
          hint="Where your team lives — usually provided by ops when the container spins up."
          icon={<Globe className="h-4 w-4" aria-hidden />}
          required
        >
          <Input
            id="containerUrl"
            type="url"
            value={containerUrl}
            onChange={(e) => setContainerUrl(e.target.value)}
            placeholder="https://team-acme.karma.xyz"
            className="h-auto rounded-none border-0 bg-transparent py-2 pl-0 pr-3 text-sm text-gray-900 dark:text-zinc-100 shadow-none placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus-visible:ring-0"
            required
          />
        </Field>

        <Field
          id="sessionToken"
          label="Runtime session token"
          hint="From the runtime's welcome banner. Stored encrypted in our backend and never exposed in logs."
          icon={<KeyRound className="h-4 w-4" aria-hidden />}
          required
        >
          <Input
            id="sessionToken"
            type="password"
            value={sessionToken}
            onChange={(e) => setSessionToken(e.target.value)}
            placeholder="Runtime session token"
            autoComplete="new-password"
            className="h-auto rounded-none border-0 bg-transparent py-2 pl-0 pr-3 font-mono text-sm text-gray-900 dark:text-zinc-100 shadow-none placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus-visible:ring-0"
            required
            minLength={16}
          />
        </Field>

        <Field
          id="communityId"
          label="Karma community"
          hint="Optional — link this team to an existing community for shared admin."
          icon={<Hash className="h-4 w-4" aria-hidden />}
        >
          <Input
            id="communityId"
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            placeholder="Leave blank to skip"
            className="h-auto rounded-none border-0 bg-transparent py-2 pl-0 pr-3 text-sm text-gray-900 dark:text-zinc-100 shadow-none placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus-visible:ring-0"
          />
        </Field>

        {provision.isError ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30 px-4 py-3">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400"
              aria-hidden
            />
            <p className="text-sm text-amber-900 dark:text-amber-300">
              {humanizeApiError(provision.error, "Setup failed")}
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 dark:bg-zinc-100 py-2.5 text-sm font-medium text-white dark:text-zinc-900 shadow-sm transition hover:bg-gray-800 dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-zinc-700 disabled:shadow-none"
        >
          {provision.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Setting up your team…
            </>
          ) : (
            <>Set up team</>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-gray-500 dark:text-zinc-400">
        Don&apos;t have a runtime yet? Talk to ops — they&apos;ll spin one up for you.
      </p>
    </main>
  );
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  required?: boolean;
  children: ReactNode;
}

function Field({ id, label, hint, icon, required, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-900 dark:text-zinc-100">
        {label}
        {required ? null : (
          <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-zinc-500">
            Optional
          </span>
        )}
      </label>
      <div className="mt-1.5 flex items-center rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm transition focus-within:border-gray-400 dark:focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-gray-100 dark:focus-within:ring-zinc-700">
        {icon ? (
          <span className="pointer-events-none flex h-9 w-9 shrink-0 items-center justify-center text-gray-400 dark:text-zinc-500">
            {icon}
          </span>
        ) : null}
        {children}
      </div>
      {hint ? <p className="mt-1.5 text-xs text-gray-500 dark:text-zinc-400">{hint}</p> : null}
    </div>
  );
}
