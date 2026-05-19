"use client";

import { Check, Package, Plus, Search } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { Button } from "@/components/Utilities/Button";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useAvailableSkills, useInstallSkill, useProfileSkills } from "@/hooks/useSkills";
import {
  type AIAgentSkillSummary,
  TEAM_ROLE_LABELS,
  type TeamRole,
  VISIBLE_TEAM_ROLES,
} from "@/lib/ai-agent-client";
import { EmptyState } from "@/src/features/nonprofit/EmptyState";
import { TeamErrorState } from "@/src/features/nonprofit/TeamErrorState";

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
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Install for</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
              The employee that gets the skill on install.
            </p>
          </div>
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: inline button group, fieldset would break flex layout */}
        <div
          role="group"
          aria-label="Pick employee"
          className="mt-3 inline-flex rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1 shadow-sm"
        >
          {VISIBLE_TEAM_ROLES.map((r) => {
            const active = r === role;
            return (
              <Button
                key={r}
                type="button"
                variant="custom"
                onClick={() => onRoleChange(r)}
                aria-pressed={active}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow"
                    : "bg-transparent text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-zinc-100"
                }`}
              >
                {TEAM_ROLE_LABELS[r]}
              </Button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
              Available skills
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
              {catalog.data
                ? `${catalog.data.length} bundled with this container`
                : "Loading catalog…"}
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-zinc-500"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, tag, description"
              className="w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-1.5 pl-8 pr-3 text-sm text-gray-900 dark:text-zinc-100 shadow-sm transition focus:border-gray-400 dark:focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-gray-100 dark:focus:ring-zinc-700 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
              aria-label="Search available skills"
            />
          </div>
        </div>

        <div className="mt-5">
          {catalog.isLoading || installed.isLoading ? (
            <SkeletonGrid />
          ) : catalog.isError ? (
            <TeamErrorState onRetry={() => catalog.refetch()} />
          ) : installed.isError ? (
            <TeamErrorState onRetry={() => installed.refetch()} />
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
  skill: AIAgentSkillSummary;
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
      className={`group relative flex flex-col rounded-xl border bg-white dark:bg-zinc-900 p-5 shadow-sm transition ${
        alreadyInstalled
          ? "border-emerald-200 dark:border-emerald-800 ring-1 ring-emerald-100 dark:ring-emerald-900"
          : "border-gray-200 dark:border-zinc-800 hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-zinc-700 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-zinc-500">
            {skill.namespace}
          </p>
          <h3 className="mt-0.5 truncate text-base font-semibold text-gray-900 dark:text-zinc-100">
            {skill.name}
          </h3>
        </div>
        {skill.version ? (
          <span className="shrink-0 rounded-md border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-gray-600 dark:text-zinc-400">
            v{skill.version}
          </span>
        ) : null}
      </div>
      <p className="mt-3 min-h-[3rem] text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
        {skill.description ?? (
          <span className="italic text-gray-400 dark:text-zinc-500">No description.</span>
        )}
      </p>
      {skill.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {skill.tags.slice(0, 4).map((tag) => (
            <li
              key={tag}
              className="rounded-md bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:text-zinc-300"
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
          <Button
            type="button"
            variant="primary"
            isLoading={isPending}
            onClick={onInstall}
            disabled={isPending}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {isPending ? "Installing…" : "Install"}
          </Button>
        )}
      </div>
    </li>
  );
});

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <li key={i}>
          <Skeleton className="h-44 rounded-xl border border-gray-200" />
        </li>
      ))}
    </ul>
  );
}

function EmptyBox({ query, totalCount }: { query: string; totalCount: number }) {
  if (totalCount === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No tools available yet"
        body="No tools available yet. Ask your admin to add some."
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
