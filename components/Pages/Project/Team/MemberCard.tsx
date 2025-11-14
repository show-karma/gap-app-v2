/* eslint-disable @next/next/no-img-element */

import { PencilIcon } from "@heroicons/react/24/outline"
import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import type { Hex } from "viem"
import { useAccount } from "wagmi"
import { DeleteMemberDialog } from "@/components/Dialogs/Member/DeleteMember"
import { DemoteMemberDialog } from "@/components/Dialogs/Member/DemoteMember"
import { PromoteMemberDialog } from "@/components/Dialogs/Member/PromoteMember"
import { GithubIcon, LinkedInIcon, Twitter2Icon } from "@/components/Icons"
import { FarcasterIcon } from "@/components/Icons/Farcaster"
import { ExternalLink } from "@/components/Utilities/ExternalLink"
import { Skeleton } from "@/components/Utilities/Skeleton"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"
import { useProjectInstance } from "@/hooks/useProjectInstance"
import { useTeamProfiles } from "@/hooks/useTeamProfiles"
import { useOwnerStore, useProjectStore } from "@/store"
import { useENS } from "@/store/ens"
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile"
import { formatFarcasterLink } from "@/utilities/farcaster"
import { getProjectMemberRoles, type Member } from "@/utilities/getProjectMemberRoles"

const iconsClassnames = {
  general: "w-6 h-6 text-zinc-400 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300",
}

export const MemberCard = ({ member }: { member: string }) => {
  const project = useProjectStore((state) => state.project)
  const { teamProfiles } = useTeamProfiles(project)
  const profile = teamProfiles?.find(
    (item) => item.recipient.toLowerCase() === member.toLowerCase()
  )
  const [, copy] = useCopyToClipboard()
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner)
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin)
  const isContractOwner = useOwnerStore((state) => state.isOwner)
  const { address } = useAccount()
  const isAuthorized = isProjectOwner || isContractOwner
  const _isAdminOrAbove = isProjectOwner || isContractOwner || isProjectAdmin
  const { project: projectInstance } = useProjectInstance(
    project?.details?.data.slug || project?.uid || ""
  )
  const { openModal } = useContributorProfileModalStore()

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
  })

  const ensNames = useENS((state) => state.ensData)
  const populateEns = useENS((state) => state.populateEns)

  useEffect(() => {
    if (member) {
      populateEns([member?.toLowerCase() as string])
    }
  }, [member, populateEns])

  return (
    <div className="flex w-full flex-col gap-4 items-start shadow-sm rounded-lg p-4 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
      <div className="flex flex-col gap-0 w-full">
        <div className="flex flex-row justify-between w-full gap-4">
          <div className="flex flex-col gap-1 mb-4 w-full">
            <p className="text-lg font-bold text-black dark:text-zinc-100 break-words">
              {profile?.data.name ||
                ensNames[(member?.toLowerCase() || "") as Hex]?.name ||
                profile?.recipient ||
                member}
            </p>
            {isLoadingRoles || isFetchingRoles ? (
              <Skeleton className="w-full h-4" />
            ) : memberRoles && memberRoles[member.toLowerCase()] !== "Member" ? (
              <p className="text-sm text-brand-blue font-medium leading-none">
                {memberRoles[member.toLowerCase()]}
              </p>
            ) : null}
          </div>
          <div className="flex flex-row gap-2 mr-2">
            {isAuthorized && memberRoles && memberRoles[member.toLowerCase()] === "Member" ? (
              <PromoteMemberDialog memberAddress={member} />
            ) : null}
            {isAuthorized && memberRoles && memberRoles[member.toLowerCase()] === "Admin" ? (
              <DemoteMemberDialog memberAddress={member} />
            ) : null}
            {isAuthorized && memberRoles && memberRoles[member.toLowerCase()] !== "Owner" ? (
              <DeleteMemberDialog memberAddress={member} />
            ) : null}
            {member.toLowerCase() === address?.toLowerCase() ? (
              <button
                type="button"
                className="p-2 rounded-lg hover:opacity-80 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                onClick={() =>
                  openModal({
                    isGlobal: false,
                  })
                }
              >
                <PencilIcon className="w-4 h-4 text-black dark:text-zinc-100" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-row gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 w-full truncate">{member}</p>
          <button type="button" onClick={() => copy(member)}>
            <img
              src="/icons/copy-2.svg"
              alt="Copy"
              className=" text-zinc-800 dark:text-zinc-400 w-4 h-4"
            />
          </button>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 pt-2 pb-2">
          {profile?.data.aboutMe}
        </p>
      </div>
      {profile?.data.twitter || profile?.data.linkedin || profile?.data.github ? (
        <div className="flex flex-row gap-3">
          <div className="flex flex-row gap-2">
            {profile?.data.twitter ? (
              <ExternalLink
                href={
                  profile?.data.twitter.includes("http")
                    ? profile?.data.twitter
                    : profile?.data.twitter.includes("twitter.com") ||
                        profile?.data.twitter.includes("x.com")
                      ? `https://${profile?.data.twitter}`
                      : `https://x.com/${profile?.data.twitter}`
                }
                className="w-max "
              >
                <Twitter2Icon className={iconsClassnames.general} />
              </ExternalLink>
            ) : null}
            {profile?.data.github ? (
              <ExternalLink
                href={
                  profile?.data.github.includes("http")
                    ? profile?.data.github
                    : profile?.data.github.includes("github.com")
                      ? `https://${profile?.data.github}`
                      : `https://github.com/${profile?.data.github}`
                }
                className="w-max"
              >
                <GithubIcon className={iconsClassnames.general} />
              </ExternalLink>
            ) : null}
            {profile?.data.linkedin ? (
              <ExternalLink
                href={
                  profile?.data.linkedin.includes("http")
                    ? profile?.data.linkedin
                    : profile?.data.linkedin.includes("linkedin.com")
                      ? `https://${profile?.data.linkedin}`
                      : `https://linkedin.com/in/${profile?.data.linkedin}`
                }
                className="w-max"
              >
                <LinkedInIcon className={iconsClassnames.general} />
              </ExternalLink>
            ) : null}
            {profile?.data.farcaster ? (
              <ExternalLink href={formatFarcasterLink(profile?.data.farcaster)} className="w-max">
                <FarcasterIcon className={iconsClassnames.general} />
              </ExternalLink>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
