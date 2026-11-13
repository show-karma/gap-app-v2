"use client";

import { HashtagIcon, LockClosedIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { type FC, useMemo, useState } from "react";
import {
  previewFollowUpTarget,
  serverErrorMessage,
  toFollowUpTargetInputs,
} from "@/components/Inbox/followUpTargetLabel";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useFollowUpChannels,
  useFollowUpMembers,
  useFollowUpWorkspaces,
} from "@/hooks/useFollowUpTargets";
import type {
  FollowUpChannel,
  FollowUpMember,
  FollowUpTarget,
  FollowUpTargetInput,
  FollowUpWorkspace,
} from "@/types/follow-up-target";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

type Mode = "dm" | "channel" | "thread";

type PickInput = Exclude<FollowUpTargetInput, { kind: "unresolved" }>;

interface FollowUpTargetDialogProps {
  communityId: string;
  /** The saved note; absent while the note is still being written. */
  itemId?: string;
  targets: FollowUpTarget[];
  /** Index into `targets` being replaced; past the end adds one. */
  replaceIndex: number;
  isSaving: boolean;
  error: Error | null;
  onClose: () => void;
  /** The full new list, as inputs for the server and as previews to show. */
  onSave: (inputs: FollowUpTargetInput[], targets: FollowUpTarget[]) => void;
}

const SLACK_PERMALINK = /^https:\/\/[a-z0-9-]+\.slack\.com\/archives\/[A-Z0-9]+\/p\d{16}/i;

/**
 * Picks where one follow-up goes: another person, a channel the author is in,
 * or a thread by its message link. Every list is read through the note
 * author's own Slack connection, so it shows exactly what they can see.
 */
export const FollowUpTargetDialog: FC<FollowUpTargetDialogProps> = ({
  communityId,
  itemId,
  targets,
  replaceIndex,
  isSaving,
  error,
  onClose,
  onSave,
}) => {
  const current = targets[replaceIndex];
  const personName = current?.personName;
  const fieldId = `follow-up-permalink-${itemId ?? "draft"}`;
  const workspaces = useFollowUpWorkspaces(communityId, itemId, true);
  const [teamId, setTeamId] = useState<string | undefined>(
    current && "teamId" in current ? current.teamId : undefined
  );
  const workspace = useMemo<FollowUpWorkspace | undefined>(() => {
    const list = workspaces.data ?? [];
    return list.find((w) => w.teamId === teamId) ?? list[0];
  }, [workspaces.data, teamId]);
  const activeTeamId = workspace?.teamId;

  const [mode, setMode] = useState<Mode>(
    current?.kind === "channel" || current?.kind === "thread" ? current.kind : "dm"
  );
  const [member, setMember] = useState<FollowUpMember | null>(null);
  const [channel, setChannel] = useState<FollowUpChannel | null>(null);
  const [permalink, setPermalink] = useState("");

  const choice = useMemo<{ input: PickInput; label: string } | null>(() => {
    if (!activeTeamId) return null;
    if (mode === "dm" && member)
      return {
        input: { kind: "dm", teamId: activeTeamId, slackUserId: member.slackUserId, personName },
        label: member.displayName,
      };
    if (mode === "channel" && channel)
      return {
        input: { kind: "channel", teamId: activeTeamId, channelId: channel.channelId, personName },
        label: channel.name,
      };
    if (mode === "thread" && SLACK_PERMALINK.test(permalink.trim()))
      return {
        input: { kind: "thread", teamId: activeTeamId, permalink: permalink.trim(), personName },
        label: "",
      };
    return null;
  }, [activeTeamId, mode, member, channel, permalink, personName]);

  const save = () => {
    if (!choice) return;
    const next = targets.filter((_, index) => index !== replaceIndex);
    next.splice(
      Math.min(replaceIndex, next.length),
      0,
      previewFollowUpTarget(choice.input, choice.label)
    );
    onSave(toFollowUpTargetInputs(next), next);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md gap-3 p-5">
        <DialogHeader>
          <DialogTitle className="text-base">
            {personName
              ? `Where should the follow-up to ${personName} go?`
              : "Where should the follow-up go?"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Sent from your Slack account, as you. You can only post where you already are.
          </DialogDescription>
        </DialogHeader>

        {workspaces.isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : !workspace ? (
          <p className="py-4 text-sm text-gray-600 dark:text-gray-300">
            Connect your Slack in{" "}
            <Link
              href={PAGES.ADMIN.NOTIFICATION_SETTINGS(communityId)}
              className="underline underline-offset-2"
            >
              notification settings
            </Link>{" "}
            first.
          </p>
        ) : (
          <>
            {(workspaces.data?.length ?? 0) > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-gray-500 dark:text-gray-400">Workspace</span>
                {workspaces.data?.map((w) => (
                  <Button
                    key={w.teamId}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTeamId(w.teamId);
                      setMember(null);
                      setChannel(null);
                    }}
                    className={cn(
                      "h-auto rounded-full border px-2 py-0.5 text-xs font-normal",
                      w.teamId === activeTeamId
                        ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                        : "border-gray-200 text-gray-600 hover:border-gray-400 dark:border-zinc-600 dark:text-zinc-300"
                    )}
                  >
                    {w.teamName}
                  </Button>
                ))}
              </div>
            )}

            <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dm">Person</TabsTrigger>
                <TabsTrigger value="channel">Channel</TabsTrigger>
                <TabsTrigger value="thread">Thread</TabsTrigger>
              </TabsList>

              <TabsContent value="dm" className="mt-3">
                <MemberPicker
                  communityId={communityId}
                  itemId={itemId}
                  teamId={activeTeamId}
                  selected={member}
                  initialQuery={personName ?? ""}
                  onSelect={setMember}
                />
              </TabsContent>

              <TabsContent value="channel" className="mt-3">
                {workspace.canPickDestination ? (
                  <ChannelPicker
                    communityId={communityId}
                    itemId={itemId}
                    teamId={activeTeamId}
                    selected={channel}
                    onSelect={setChannel}
                  />
                ) : (
                  <ReconnectNotice communityId={communityId} teamName={workspace.teamName} />
                )}
              </TabsContent>

              <TabsContent value="thread" className="mt-3 flex flex-col gap-2">
                <label htmlFor={fieldId} className="text-xs text-gray-600 dark:text-gray-300">
                  Paste the message link. In Slack, open the message menu and choose{" "}
                  <span className="font-medium">Copy link</span>. The follow-up is posted as a reply
                  in that thread.
                </label>
                <Input
                  id={fieldId}
                  value={permalink}
                  onChange={(event) => setPermalink(event.target.value)}
                  placeholder="https://your-team.slack.com/archives/C…/p…"
                  className="h-9 font-mono text-xs"
                  aria-invalid={permalink.trim() !== "" && !SLACK_PERMALINK.test(permalink.trim())}
                />
                {permalink.trim() !== "" && !SLACK_PERMALINK.test(permalink.trim()) && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    That doesn&apos;t look like a Slack message link.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {serverErrorMessage(error, "Couldn't save that destination. Try again.")}
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={!choice || isSaving} isLoading={isSaving}>
            Use this destination
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MemberPicker: FC<{
  communityId: string;
  itemId: string | undefined;
  teamId: string | undefined;
  selected: FollowUpMember | null;
  initialQuery: string;
  onSelect: (member: FollowUpMember) => void;
}> = ({ communityId, itemId, teamId, selected, initialQuery, onSelect }) => {
  const [query, setQuery] = useState(initialQuery);
  const debounced = useDebounce(query, 250);
  const members = useFollowUpMembers(communityId, itemId, teamId, debounced, true);
  return (
    <Command
      shouldFilter={false}
      className="rounded-md border border-gray-200 dark:border-zinc-700"
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search people in this workspace"
      />
      <CommandList className="max-h-56">
        {members.isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : members.isError ? (
          <CommandEmpty>Couldn&apos;t load people. Try again in a moment.</CommandEmpty>
        ) : (
          <>
            <CommandEmpty>No one matches &ldquo;{debounced}&rdquo;.</CommandEmpty>
            <CommandGroup>
              {(members.data ?? []).map((m) => (
                <CommandItem
                  key={m.slackUserId}
                  value={m.slackUserId}
                  onSelect={() => onSelect(m)}
                  aria-selected={selected?.slackUserId === m.slackUserId}
                  className={cn(
                    selected?.slackUserId === m.slackUserId &&
                      "bg-accent font-medium text-accent-foreground"
                  )}
                >
                  {m.displayName}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
};

const ChannelPicker: FC<{
  communityId: string;
  itemId: string | undefined;
  teamId: string | undefined;
  selected: FollowUpChannel | null;
  onSelect: (channel: FollowUpChannel) => void;
}> = ({ communityId, itemId, teamId, selected, onSelect }) => {
  const channels = useFollowUpChannels(communityId, itemId, teamId, true);
  return (
    <Command className="rounded-md border border-gray-200 dark:border-zinc-700">
      <CommandInput placeholder="Filter channels and group messages" />
      <CommandList className="max-h-56">
        {channels.isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : channels.isError ? (
          <CommandEmpty>Couldn&apos;t load channels. Try again in a moment.</CommandEmpty>
        ) : (
          <>
            <CommandEmpty>No channel matches.</CommandEmpty>
            <CommandGroup>
              {(channels.data ?? []).map((c) => (
                <CommandItem
                  key={c.channelId}
                  value={c.name}
                  onSelect={() => onSelect(c)}
                  aria-selected={selected?.channelId === c.channelId}
                  className={cn(
                    selected?.channelId === c.channelId &&
                      "bg-accent font-medium text-accent-foreground"
                  )}
                >
                  {c.isGroupDm ? (
                    <UserGroupIcon aria-hidden="true" />
                  ) : c.isPrivate ? (
                    <LockClosedIcon aria-hidden="true" />
                  ) : (
                    <HashtagIcon aria-hidden="true" />
                  )}
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
};

const ReconnectNotice: FC<{ communityId: string; teamName: string }> = ({
  communityId,
  teamName,
}) => (
  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
    Your {teamName} connection was made before channel posting existed.{" "}
    <Link
      href={PAGES.ADMIN.NOTIFICATION_SETTINGS(communityId)}
      className="font-medium underline underline-offset-2"
    >
      Reconnect your Slack
    </Link>{" "}
    once to pick a channel. Direct messages keep working either way.
  </div>
);
