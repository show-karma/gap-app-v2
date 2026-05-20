"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useProfileSkills, useUninstallSkill } from "@/hooks/useSkills";
import { type AIAgentSkillSummary, TEAM_ROLE_LABELS, type TeamRole } from "@/lib/ai-agent-client";
import { EmptyState } from "@/src/features/nonprofit/EmptyState";
import { TeamErrorState } from "@/src/features/nonprofit/TeamErrorState";
import { PAGES } from "@/utilities/pages";

interface Props {
  slug: string | undefined;
  role: TeamRole;
}

export function SkillsTab({ slug, role }: Props) {
  const query = useProfileSkills(slug, role);
  const uninstall = useUninstallSkill(slug ?? "", role);

  if (!slug) {
    return (
      <p className="text-sm text-gray-600 dark:text-zinc-400">
        Set up your team via{" "}
        <Link href={PAGES.TEAM.ONBOARDING} className="font-medium underline">
          onboarding
        </Link>{" "}
        before managing skills.
      </p>
    );
  }

  if (query.isLoading) {
    return <SkillsSkeleton />;
  }

  if (query.isError) {
    return <TeamErrorState onRetry={() => query.refetch()} />;
  }

  const skills = query.data ?? [];
  const marketplaceHref = `${PAGES.SKILLS}?${new URLSearchParams({ slug, role }).toString()}`;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
            Installed for {TEAM_ROLE_LABELS[role]}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
            What this employee can call during chat and on the work board.
          </p>
        </div>
        <Link
          href={marketplaceHref}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gray-900 dark:bg-zinc-100 px-3 py-1.5 text-sm font-medium text-white dark:text-zinc-900 shadow-sm transition hover:bg-gray-800 dark:hover:bg-zinc-200"
        >
          Browse marketplace
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {skills.length === 0 ? (
        <EmptyState
          title={`${TEAM_ROLE_LABELS[role]} has no skills yet`}
          body={`Install one from the marketplace to expand what ${TEAM_ROLE_LABELS[role]} can do.`}
          action={
            <Link
              href={marketplaceHref}
              className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 dark:bg-zinc-100 px-3 py-1.5 text-sm font-medium text-white dark:text-zinc-900 shadow-sm transition hover:bg-gray-800 dark:hover:bg-zinc-200"
            >
              Browse marketplace
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {skills.map((skill) => {
            const [namespace, skillDir] = skill.id.split("/");
            return (
              <SkillRow
                key={skill.id}
                skill={skill}
                isPending={
                  uninstall.isPending &&
                  uninstall.variables?.namespace === namespace &&
                  uninstall.variables?.skillId === skillDir
                }
                onRemove={() => uninstall.mutate({ namespace, skillId: skillDir })}
              />
            );
          })}
        </ul>
      )}

      {skills.length > 0 ? (
        <p className="text-xs text-gray-500 dark:text-zinc-400">
          Tip: the next chat turn picks up new and removed skills automatically.
        </p>
      ) : null}
    </div>
  );
}

interface RowProps {
  skill: AIAgentSkillSummary;
  isPending: boolean;
  onRemove: () => void;
}

const SkillRow = memo(function SkillRow({ skill, isPending, onRemove }: RowProps) {
  return (
    <li className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm transition hover:border-gray-300 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-zinc-500">
            {skill.namespace}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">
              {skill.name}
            </h3>
            {skill.version ? (
              <span className="rounded-md border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-gray-600 dark:text-zinc-400">
                v{skill.version}
              </span>
            ) : null}
          </div>
          {skill.description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-zinc-400">
              {skill.description}
            </p>
          ) : (
            <p className="mt-1.5 text-xs italic text-gray-400 dark:text-zinc-500">
              No description.
            </p>
          )}
          {skill.tags.length > 0 ? (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {skill.tags.slice(0, 5).map((tag) => (
                <li
                  key={tag}
                  className="rounded-md bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:text-zinc-300"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <DeleteDialog
          title={`Remove ${skill.name}?`}
          isLoading={isPending}
          deleteFunction={async () => {
            onRemove();
          }}
          buttonElement={{
            text: isPending ? "Removing…" : "Remove",
            icon: null,
            styleClass:
              "shrink-0 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300 transition hover:border-gray-300 dark:hover:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50",
          }}
        />
      </div>
    </li>
  );
});

function SkillsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-1/3 rounded" />
      <Skeleton className="h-24 rounded-xl border border-gray-200" />
      <Skeleton className="h-24 rounded-xl border border-gray-200" />
    </div>
  );
}
