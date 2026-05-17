"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTeamMemberAbout, useUpdateTeamMemberAbout } from "@/hooks/useTeam";
import {
  TEAM_ROLE_DESCRIPTIONS,
  TEAM_ROLE_LABELS,
  TEAM_ROLE_LONG_LABELS,
  TEAM_ROLES,
  type TeamRole,
} from "@/lib/hermes-client";
import { ErrorState } from "@/src/features/nonprofit/EmptyState";
import { SkillsTab } from "@/src/features/skills/SkillsTab";
import { RoleAvatar } from "@/src/features/team/RoleAvatar";
import { TeamChat } from "@/src/features/team-chat/TeamChat";
import { PAGES } from "@/utilities/pages";

type TabId = "chat" | "about" | "skills" | "settings";

export default function TeamMemberPage() {
  const params = useParams<{ role: string }>();
  const search = useSearchParams();
  const [slug, setSlug] = useState<string | undefined>(undefined);
  const [tab, setTab] = useState<TabId>("chat");
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
        className="inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to team
      </Link>
      <div className="mt-4 flex items-start gap-4">
        <RoleAvatar role={role} size={56} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
            Employee
          </p>
          <div className="mt-1.5 flex items-baseline gap-3">
            <h1 className="text-[28px] font-bold leading-none tracking-[-0.02em] text-gray-900">
              {TEAM_ROLE_LABELS[role]}
            </h1>
            <span className="text-sm text-gray-500">{TEAM_ROLE_LONG_LABELS[role]}</span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-[1.5] text-gray-600">
            {TEAM_ROLE_DESCRIPTIONS[role]}
          </p>
        </div>
      </div>

      <nav className="mt-6 flex gap-1 border-b border-gray-200">
        {(
          [
            { id: "chat", label: "Chat" },
            { id: "about", label: "About" },
            { id: "skills", label: "Skills" },
            { id: "settings", label: "Settings" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition ${
              tab === t.id
                ? "border-gray-900 font-semibold text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-900"
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
        ) : tab === "skills" ? (
          <SkillsTab slug={slug} role={role} />
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
        <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Couldn't load this employee's About text"
        body="The Hermes container didn't respond. Check it's running, then retry."
        onRetry={() => query.refetch()}
      />
    );
  }

  const current = draft ?? query.data ?? "";
  const dirty = draft !== null && draft !== query.data;

  return (
    <div>
      <textarea
        value={current}
        onChange={(e) => setDraft(e.target.value)}
        rows={20}
        className="block w-full resize-y rounded-xl border border-gray-200 bg-white p-[18px] font-sans text-[14px] leading-[1.6] text-gray-900 shadow-sm outline-none transition focus:border-gray-300 focus:ring-2 focus:ring-gray-100"
        placeholder={`Describe how ${TEAM_ROLE_LABELS[role]} should behave, what their voice sounds like, what they care about...`}
      />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {dirty
            ? "Unsaved changes — they apply on the next chat turn."
            : "Saved. Edits apply on the next chat turn."}
        </p>
        <div className="flex items-center gap-2">
          {dirty ? (
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50"
            >
              Discard
            </button>
          ) : null}
          <button
            type="button"
            disabled={!dirty || mutation.isPending}
            onClick={() =>
              mutation.mutate({ role, content: current }, { onSuccess: () => setDraft(null) })
            }
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            {mutation.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
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
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <dl className="divide-y divide-gray-100">
        <Row label="Role" value={TEAM_ROLE_LABELS[role]} />
        <Row label="Responsibilities" value={TEAM_ROLE_DESCRIPTIONS[role]} />
        <Row
          label="Karma protocol access"
          value={
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              <span>
                Enabled — read and write records consistent with this employee's responsibilities.
              </span>
            </span>
          }
        />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 px-5 py-4 text-sm">
      <dt className="font-medium text-gray-500">{label}</dt>
      <dd className="col-span-2 text-gray-900">{value}</dd>
    </div>
  );
}
