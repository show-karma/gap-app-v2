"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProvisionOrg } from "@/hooks/useTeam";
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
      <h1 className="text-2xl font-semibold">Set up your team</h1>
      <p className="mt-2 text-sm text-gray-600">
        Your nonprofit gets a dedicated AI team. This step registers the runtime that hosts them and
        verifies it&apos;s reachable.
      </p>

      <form
        className="mt-8 space-y-5"
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
                router.push(`${PAGES.TEAM.DIRECTORY}?slug=${org.slug}`);
              },
            }
          );
        }}
      >
        <div>
          <label htmlFor="slug" className="block text-sm font-medium">
            Organization handle
          </label>
          <input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="acme-nonprofit"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Lowercase letters, numbers, hyphens. This is internal.
          </p>
        </div>

        <div>
          <label htmlFor="containerUrl" className="block text-sm font-medium">
            Runtime URL
          </label>
          <input
            id="containerUrl"
            type="url"
            value={containerUrl}
            onChange={(e) => setContainerUrl(e.target.value)}
            placeholder="https://hermes-acme.karma.xyz"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="sessionToken" className="block text-sm font-medium">
            Runtime session token
          </label>
          <input
            id="sessionToken"
            type="password"
            value={sessionToken}
            onChange={(e) => setSessionToken(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full rounded border px-3 py-2 text-sm font-mono"
            required
            minLength={16}
          />
          <p className="mt-1 text-xs text-gray-500">
            From the runtime&apos;s welcome banner. Stored encrypted.
          </p>
        </div>

        <div>
          <label htmlFor="communityId" className="block text-sm font-medium">
            Karma community (optional)
          </label>
          <input
            id="communityId"
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            placeholder="Optional Karma community ID"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded bg-black py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {provision.isPending ? "Setting up…" : "Set up team"}
        </button>

        {provision.isError ? (
          <p className="text-sm text-red-600">
            {provision.error instanceof Error ? provision.error.message : "Setup failed"}
          </p>
        ) : null}
      </form>
    </main>
  );
}
