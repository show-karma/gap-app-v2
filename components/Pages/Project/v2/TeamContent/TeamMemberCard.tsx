"use client";

import { PencilIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Hex } from "viem";
import { useAccount } from "wagmi";
import { DeleteMemberDialog } from "@/components/Dialogs/Member/DeleteMember";
import { DemoteMemberDialog } from "@/components/Dialogs/Member/DemoteMember";
import { PromoteMemberDialog } from "@/components/Dialogs/Member/PromoteMember";
import { GithubIcon, LinkedInIcon, Twitter2Icon } from "@/components/Icons";
import { FarcasterIcon } from "@/components/Icons/Farcaster";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useProjectInstance } from "@/hooks/useProjectInstance";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { useOwnerStore, useProjectStore } from "@/store";
import { useENS } from "@/store/ens";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import { formatFarcasterLink } from "@/utilities/farcaster";
import { getProjectMemberRoles, type Member } from "@/utilities/getProjectMemberRoles";

const iconsClassnames = {
  general: "w-5 h-5 text-zinc-400 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300",
};

interface TeamMemberCardProps {
  member: string;
  className?: string;
}

/**
 * TeamMemberCard displays a single team member with their profile info,
 * social links, and admin actions (promote, demote, delete).
 *
 * This is an updated version of the original MemberCard for the v2 design.
 */
export function TeamMemberCard({ member, className }: TeamMemberCardProps) {
  const project = useProjectStore((state) => state.project);
  const { teamProfiles } = useTeamProfiles(project);
  const profile = teamProfiles?.find(
    (item) => item.recipient.toLowerCase() === member.toLowerCase()
  );
  const [, copy] = useCopyToClipboard();
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const { address } = useAccount();
  const isAuthorized = isProjectOwner || isContractOwner;
  const { project: projectInstance } = useProjectInstance(
    project?.details?.slug || project?.uid || ""
  );
  const { openModal } = useContributorProfileModalStore();

  const {
    data: memberRoles,
    isLoading: isLoadingRoles,
    isFetching: isFetchingRoles,
  } = useQuery<Record<string, Member["role"]>>({
    queryKey: ["memberRoles", project?.uid],
    queryFn: () =>
      project && projectInstance ? getProjectMemberRoles(project, projectInstance) : {},
    enabled: !!project && !!projectInstance,
    staleTime: 1000 * 60 * 5,
  });

  const ensNames = useENS((state) => state.ensData);
  const populateEns = useENS((state) => state.populateEns);

  useEffect(() => {
    if (member) {
      populateEns([member?.toLowerCase() as string]);
    }
  }, [member, populateEns]);

  const displayName =
    profile?.data.name ||
    ensNames[(member?.toLowerCase() || "") as Hex]?.name ||
    profile?.recipient ||
    member;

  const role = memberRoles?.[member.toLowerCase()];
  const isRoleLoading = isLoadingRoles || isFetchingRoles;
  const isMemberRole = role === "Member";
  const isAdminRole = role === "Admin";
  const isOwnerRole = role === "Owner";
  const isCurrentUser = member.toLowerCase() === address?.toLowerCase();

  const hasSocials =
    profile?.data.twitter ||
    profile?.data.linkedin ||
    profile?.data.github ||
    profile?.data.farcaster;

  return (
    <div
      className={`flex w-full flex-col gap-3 items-start rounded-xl p-5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 ${className || ""}`}
      data-testid="team-member-card"
    >
      <div className="flex flex-col gap-0 w-full">
        <div className="flex flex-row justify-between w-full gap-4">
          <div className="flex flex-col gap-1 w-full">
            <p
              className="text-base font-semibold text-black dark:text-zinc-100 break-words"
              data-testid="member-name"
            >
              {displayName}
            </p>
            {isRoleLoading ? (
              <Skeleton className="w-16 h-4" />
            ) : role && !isMemberRole ? (
              <p
                className="text-sm text-brand-blue font-medium leading-none"
                data-testid="member-role"
              >
                {role}
              </p>
            ) : null}
          </div>
          <div className="flex flex-row gap-2 items-start">
            {isAuthorized && isMemberRole ? <PromoteMemberDialog memberAddress={member} /> : null}
            {isAuthorized && isAdminRole ? <DemoteMemberDialog memberAddress={member} /> : null}
            {isAuthorized && !isOwnerRole ? <DeleteMemberDialog memberAddress={member} /> : null}
            {isCurrentUser ? (
              <button
                type="button"
                className="p-2 rounded-lg hover:opacity-80 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                onClick={() =>
                  openModal({
                    isGlobal: false,
                  })
                }
                aria-label="Edit profile"
                data-testid="edit-profile-button"
              >
                <PencilIcon className="w-4 h-4 text-black dark:text-zinc-100" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-row gap-2 mt-1">
          <p
            className="text-sm text-zinc-500 dark:text-zinc-400 w-full truncate"
            data-testid="member-address"
          >
            {member}
          </p>
          <button
            type="button"
            onClick={() => copy(member)}
            aria-label="Copy address"
            data-testid="copy-address-button"
          >
            <img
              src="/icons/copy-2.svg"
              alt="Copy"
              className="text-zinc-500 dark:text-zinc-400 w-4 h-4"
            />
          </button>
        </div>
        {profile?.data.aboutMe && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 pt-2" data-testid="member-about">
            {profile.data.aboutMe}
          </p>
        )}
      </div>
      {hasSocials && (
        <div className="flex flex-row gap-3" data-testid="member-socials">
          {profile?.data.twitter && (
            <ExternalLink
              href={
                profile.data.twitter.includes("http")
                  ? profile.data.twitter
                  : profile.data.twitter.includes("twitter.com") ||
                      profile.data.twitter.includes("x.com")
                    ? `https://${profile.data.twitter}`
                    : `https://x.com/${profile.data.twitter}`
              }
              className="w-max"
            >
              <Twitter2Icon className={iconsClassnames.general} />
            </ExternalLink>
          )}
          {profile?.data.github && (
            <ExternalLink
              href={
                profile.data.github.includes("http")
                  ? profile.data.github
                  : profile.data.github.includes("github.com")
                    ? `https://${profile.data.github}`
                    : `https://github.com/${profile.data.github}`
              }
              className="w-max"
            >
              <GithubIcon className={iconsClassnames.general} />
            </ExternalLink>
          )}
          {profile?.data.linkedin && (
            <ExternalLink
              href={
                profile.data.linkedin.includes("http")
                  ? profile.data.linkedin
                  : profile.data.linkedin.includes("linkedin.com")
                    ? `https://${profile.data.linkedin}`
                    : `https://linkedin.com/in/${profile.data.linkedin}`
              }
              className="w-max"
            >
              <LinkedInIcon className={iconsClassnames.general} />
            </ExternalLink>
          )}
          {profile?.data.farcaster && (
            <ExternalLink href={formatFarcasterLink(profile.data.farcaster)} className="w-max">
              <FarcasterIcon className={iconsClassnames.general} />
            </ExternalLink>
          )}
        </div>
      )}
    </div>
  );
}
