"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTeamMemberAbout, useUpdateTeamMemberAbout } from "@/hooks/useTeam";
import {
  TEAM_ROLE_DESCRIPTIONS,
  TEAM_ROLE_LABELS,
  TEAM_ROLES,
  type TeamRole,
} from "@/lib/hermes-client";
import { TeamChat } from "@/src/features/team-chat/TeamChat";
import { PAGES } from "@/utilities/pages";

type TabId = "chat" | "about" | "settings";

export default function TeamMemberPage() {
  const params = useParams<{ role: string }>();
  const search = useSearchParams();
  const [slug, setSlug] = useState<string | undefined>(undefined);
  const [tab, setTab] = useState<TabId>("about");
  const role = (params?.role ?? "") as TeamRole;
  const isKnownRole = TEAM_ROLES.includes(role);

  useEffect(() => {
    setSlug(search.get("slug") ?? undefined);
  }, [search]);

  if (!isKnownRole) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Team member not found</h1>
        <p className="mt-3 text-gray-700">We don&apos;t recognize this role on your team.</p>
        <Link href={PAGES.TEAM.DIRECTORY} className="mt-6 inline-block rounded border px-4 py-2">
          Back to team
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`${PAGES.TEAM.DIRECTORY}${slug ? `?slug=${slug}` : ""}`}
        className="text-sm text-gray-600 hover:underline"
      >
        ← Back to team
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{TEAM_ROLE_LABELS[role]}</h1>
      <p className="mt-1 text-sm text-gray-600">{TEAM_ROLE_DESCRIPTIONS[role]}</p>

      <nav className="mt-6 flex gap-1 border-b">
        {(
          [
            { id: "chat", label: "Chat" },
            { id: "about", label: "About" },
            { id: "settings", label: "Settings" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${
              tab === t.id
                ? "border-black font-semibold text-black"
                : "border-transparent text-gray-600 hover:text-black"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="mt-6">
        {tab === "about" ? (
          <AboutTab slug={slug} role={role} />
        ) : tab === "chat" ? (
          <ChatTab slug={slug} role={role} />
        ) : (
          <SettingsTab role={role} />
        )}
      </section>
    </main>
  );
}

function AboutTab({ slug, role }: { slug: string | undefined; role: TeamRole }) {
  const query = useTeamMemberAbout(slug, role);
  const mutation = useUpdateTeamMemberAbout(slug ?? "");
  const [draft, setDraft] = useState<string | null>(null);

  if (!slug) {
    return (
      <p className="text-sm text-gray-600">
        Set your team up via{" "}
        <Link href={PAGES.TEAM.ONBOARDING} className="font-medium underline">
          onboarding
        </Link>{" "}
        first.
      </p>
    );
  }

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded border bg-gray-100" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          Couldn&apos;t load this team member&apos;s About text.
        </p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="mt-3 rounded border px-3 py-1 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  const current = draft ?? query.data ?? "";
  const dirty = draft !== null && draft !== query.data;

  return (
    <div>
      <p className="mb-2 text-sm text-gray-600">
        This is how {TEAM_ROLE_LABELS[role]} thinks about their role. Edits take effect on the next
        chat turn.
      </p>
      <textarea
        value={current}
        onChange={(e) => setDraft(e.target.value)}
        rows={16}
        className="w-full rounded border p-3 font-mono text-sm leading-6"
        placeholder="Describe how this team member should behave..."
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={!dirty || mutation.isPending}
          onClick={() =>
            mutation.mutate({ role, content: current }, { onSuccess: () => setDraft(null) })
          }
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {mutation.isPending ? "Saving…" : "Save changes"}
        </button>
        {dirty ? (
          <button
            type="button"
            onClick={() => setDraft(null)}
            className="text-sm text-gray-600 hover:underline"
          >
            Discard
          </button>
        ) : (
          <span className="text-xs text-gray-500">No unsaved changes</span>
        )}
      </div>
    </div>
  );
}

function ChatTab({ slug, role }: { slug: string | undefined; role: TeamRole }) {
  if (!slug) {
    return <p className="text-sm text-gray-600">Set up your team first.</p>;
  }
  return <TeamChat slug={slug} role={role} />;
}

function SettingsTab({ role }: { role: TeamRole }) {
  return (
    <dl className="grid grid-cols-3 gap-4 rounded border bg-white p-5 text-sm">
      <dt className="font-medium text-gray-600">Role</dt>
      <dd className="col-span-2">{TEAM_ROLE_LABELS[role]}</dd>
      <dt className="font-medium text-gray-600">Responsibilities</dt>
      <dd className="col-span-2 text-gray-700">{TEAM_ROLE_DESCRIPTIONS[role]}</dd>
      <dt className="font-medium text-gray-600">Karma protocol access</dt>
      <dd className="col-span-2">
        Enabled — this employee can read and write Karma records consistent with their
        responsibilities.
      </dd>
    </dl>
  );
}
