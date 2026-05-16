"use client";

import { Check, Package, Plus, Search } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { useAvailableSkills, useInstallSkill, useProfileSkills } from "@/hooks/useSkills";
import {
  type HermesSkillSummary,
  TEAM_ROLE_LABELS,
  type TeamRole,
  VISIBLE_TEAM_ROLES,
} from "@/lib/hermes-client";
import { EmptyState, ErrorState } from "@/src/features/nonprofit/EmptyState";

interface Props {
  slug: string;
  role: TeamRole;
  onRoleChange: (role: TeamRole) => void;
}

export function SkillsMarketplace({ slug, role, onRoleChange }: Props) {
  const catalog = useAvailableSkills(slug);
  const installed = useProfileSkills(slug, role);
  const install = useInstallSkill(slug, role);
  const [query, setQuery] = useState("");

  const installedIds = useMemo(
    () => new Set((installed.data ?? []).map((s) => s.id)),
    [installed.data]
  );

  const filtered = useMemo(() => {
    const all = catalog.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [catalog.data, query]);

  return (
    <div className="mt-8 space-y-8">
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Install for</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              The employee that gets the skill on install.
            </p>
          </div>
        </div>
        <div
          className="mt-3 inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Pick employee"
        >
          {VISIBLE_TEAM_ROLES.map((r) => {
            const active = r === role;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onRoleChange(r)}
                role="tab"
                aria-selected={active}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-gray-900 text-white shadow"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {TEAM_ROLE_LABELS[r]}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Available skills</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {catalog.data
                ? `${catalog.data.length} bundled with this container`
                : "Loading catalog…"}
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, tag, description"
              className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm shadow-sm transition focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-100"
              aria-label="Search available skills"
            />
          </div>
        </div>

        <div className="mt-5">
          {catalog.isLoading ? (
            <Skeleton />
          ) : catalog.isError ? (
            <ErrorState
              title="Couldn't load the catalog"
              body="The Hermes container didn't respond. Check it's running, then retry."
              onRetry={() => catalog.refetch()}
            />
          ) : filtered.length === 0 ? (
            <EmptyBox query={query} totalCount={(catalog.data ?? []).length} />
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  alreadyInstalled={installedIds.has(skill.id)}
                  isPending={install.isPending && install.variables === skill.id}
                  onInstall={() => install.mutate(skill.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

interface CardProps {
  skill: HermesSkillSummary;
  alreadyInstalled: boolean;
  isPending: boolean;
  onInstall: () => void;
}

const SkillCard = memo(function SkillCard({
  skill,
  alreadyInstalled,
  isPending,
  onInstall,
}: CardProps) {
  return (
    <li
      className={`group relative flex flex-col rounded-xl border bg-white p-5 shadow-sm transition ${
        alreadyInstalled
          ? "border-emerald-200 ring-1 ring-emerald-100"
          : "border-gray-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            {skill.namespace}
          </p>
          <h3 className="mt-0.5 truncate text-base font-semibold text-gray-900">{skill.name}</h3>
        </div>
        {skill.version ? (
          <span className="shrink-0 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-gray-600">
            v{skill.version}
          </span>
        ) : null}
      </div>
      <p className="mt-3 min-h-[3rem] text-sm leading-relaxed text-gray-600">
        {skill.description ?? <span className="italic text-gray-400">No description.</span>}
      </p>
      {skill.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {skill.tags.slice(0, 4).map((tag) => (
            <li
              key={tag}
              className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-5 flex items-center justify-end">
        {alreadyInstalled ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Installed
          </span>
        ) : (
          <button
            type="button"
            onClick={onInstall}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {isPending ? "Installing…" : "Install"}
          </button>
        )}
      </div>
    </li>
  );
});

function Skeleton() {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <li key={i} className="h-44 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      ))}
    </ul>
  );
}

function EmptyBox({ query, totalCount }: { query: string; totalCount: number }) {
  if (totalCount === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No skills bundled"
        body="This Hermes container ships without any skills. Add some to the seed image, rebuild, and they'll show up here."
      />
    );
  }
  return (
    <EmptyState
      icon={Search}
      title={`Nothing matches "${query}"`}
      body="Try a broader search term, or clear the box to see everything."
    />
  );
}
