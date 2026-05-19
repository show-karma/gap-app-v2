"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { TabContent, Tabs, TabTrigger } from "@/components/Utilities/Tabs";
import { Textarea } from "@/components/ui/textarea";
import { useTeamMemberAbout, useUpdateTeamMemberAbout } from "@/hooks/useTeam";
import {
  TEAM_ROLE_DESCRIPTIONS,
  TEAM_ROLE_LABELS,
  TEAM_ROLE_LONG_LABELS,
  TEAM_ROLES,
  type TeamRole,
} from "@/lib/hermes-client";
import { TeamErrorState } from "@/src/features/nonprofit/TeamErrorState";
import { SkillsTab } from "@/src/features/skills/SkillsTab";
import { RoleAvatar } from "@/src/features/team/RoleAvatar";
import { TeamChat } from "@/src/features/team-chat/TeamChat";
import { PAGES } from "@/utilities/pages";

const aboutSchema = z.object({
  content: z.string(),
});
type AboutFormShape = z.infer<typeof aboutSchema>;

type TabId = "chat" | "about" | "skills" | "settings";

// Module-level constant avoids recreating the array on every render (P2-5).
const MEMBER_TABS = [
  { id: "chat", label: "Chat" },
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "settings", label: "Settings" },
] as const satisfies readonly { id: TabId; label: string }[];

export default function TeamMemberPage() {
  const { slug, role: roleParam } = useParams<{ slug: string; role: string }>();
  const role = roleParam as TeamRole;
  const isKnownRole = TEAM_ROLES.includes(role);

  if (!isKnownRole) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Team member not found</h1>
        <p className="mt-3 text-gray-700 dark:text-zinc-300">
          We don&apos;t recognize this role on your team.
        </p>
        <Link
          href={PAGES.TEAM.DIRECTORY(slug)}
          className="mt-6 inline-block rounded border dark:border-zinc-700 px-4 py-2 dark:text-zinc-300"
        >
          Back to team
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={PAGES.TEAM.DIRECTORY(slug)}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-zinc-400 transition hover:text-gray-900 dark:hover:text-zinc-100"
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
            <h1 className="text-[28px] font-bold leading-none tracking-[-0.02em] text-gray-900 dark:text-zinc-100">
              {TEAM_ROLE_LABELS[role]}
            </h1>
            <span className="text-sm text-gray-500 dark:text-zinc-400">
              {TEAM_ROLE_LONG_LABELS[role]}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-[1.5] text-gray-600 dark:text-zinc-400">
            {TEAM_ROLE_DESCRIPTIONS[role]}
          </p>
        </div>
      </div>

      <Tabs defaultTab="chat">
        <div className="mt-6 flex gap-1 border-b border-gray-200 dark:border-zinc-800">
          {MEMBER_TABS.map((t) => (
            <TabTrigger
              key={t.id}
              value={t.id}
              className="-mb-px border-b-2 rounded-none px-4 py-2 text-sm"
            >
              {t.label}
            </TabTrigger>
          ))}
        </div>

        <div className="mt-6">
          <TabContent value="chat">
            <ChatTab slug={slug} role={role} />
          </TabContent>
          <TabContent value="about">
            <AboutTab slug={slug} role={role} />
          </TabContent>
          <TabContent value="skills">
            <SkillsTab slug={slug} role={role} />
          </TabContent>
          <TabContent value="settings">
            <SettingsTab role={role} />
          </TabContent>
        </div>
      </Tabs>
    </main>
  );
}

function AboutTab({ slug, role }: { slug: string; role: TeamRole }) {
  const query = useTeamMemberAbout(slug, role);
  const mutation = useUpdateTeamMemberAbout(slug);

  const { register, handleSubmit, reset, formState } = useForm<AboutFormShape>({
    resolver: zodResolver(aboutSchema),
    defaultValues: { content: "" },
  });

  useEffect(() => {
    if (query.data !== undefined) {
      reset({ content: query.data ?? "" });
    }
  }, [query.data, reset]);

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-64 rounded-xl border border-gray-200" />
      </div>
    );
  }

  if (query.isError) {
    return <TeamErrorState onRetry={() => query.refetch()} />;
  }

  return (
    <form
      onSubmit={handleSubmit((values) =>
        mutation.mutate(
          { role, content: values.content },
          {
            onSuccess: () => {
              toast.success("Saved. Edits apply on the next chat turn.");
              reset({ content: values.content });
            },
            onError: (err) => toast.error(err instanceof Error ? err.message : "Save failed"),
          }
        )
      )}
    >
      <Textarea
        {...register("content")}
        rows={20}
        className="resize-y rounded-xl bg-white dark:bg-zinc-900 p-[18px] font-sans text-[14px] leading-[1.6] text-gray-900 dark:text-zinc-100"
        placeholder={`Describe how ${TEAM_ROLE_LABELS[role]} should behave, what their voice sounds like, what they care about...`}
      />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-zinc-400">
          {formState.isDirty
            ? "Unsaved changes — they apply on the next chat turn."
            : "Saved. Edits apply on the next chat turn."}
        </p>
        <div className="flex items-center gap-2">
          {formState.isDirty ? (
            <Button type="button" variant="secondary" onClick={() => reset()}>
              Discard
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            isLoading={mutation.isPending}
            disabled={!formState.isDirty || mutation.isPending}
          >
            Save changes
          </Button>
        </div>
      </div>
    </form>
  );
}

function ChatTab({ slug, role }: { slug: string; role: TeamRole }) {
  return <TeamChat slug={slug} role={role} />;
}

function SettingsTab({ role }: { role: TeamRole }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <dl className="divide-y divide-gray-100 dark:divide-zinc-800">
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
      <dt className="font-medium text-gray-500 dark:text-zinc-400">{label}</dt>
      <dd className="col-span-2 text-gray-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}
