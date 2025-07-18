/* eslint-disable @next/next/no-img-element */
"use client";

import { useProjectStore } from "@/src/features/projects/lib/store";
import { useOwnerStore } from "@/store/owner";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";

import { PAGES } from "@/utilities/pages";
import Link from "next/link";

import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useActivityTabStore } from "@/store/activityTab";
import { useENS } from "@/store/ens";
import formatCurrency from "@/utilities/formatCurrency";
import { shortAddress } from "@/utilities/shortAddress";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { Hex } from "viem";

import { MemberDialog } from "@/components/Dialogs/Member";
import { DeleteMemberDialog } from "@/components/Dialogs/Member/DeleteMember";
import { DemoteMemberDialog } from "@/components/Dialogs/Member/DemoteMember";
import { InviteMemberDialog } from "@/components/Dialogs/Member/InviteMember";
import { PromoteMemberDialog } from "@/components/Dialogs/Member/PromoteMember";
import { errorManager } from "@/lib/utils/error-manager";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import { fetchData } from "@/lib/utils/fetch-data";
import {
  getProjectMemberRoles,
  Member,
} from "@/utilities/getProjectMemberRoles";
import { INDEXER } from "@/utilities/indexer";
import { PencilIcon } from "@heroicons/react/24/outline";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import pluralize from "pluralize";
import { useAccount } from "wagmi";
import { InformationBlock } from "./ProjectBodyTabs";
import { useProjectInstance } from "@/hooks/useProjectInstance";
import { useMemberRoles } from "@/hooks/useMemberRoles";
import ProjectSubscription from "../shared/subscription";
import { ProjectSubTabs } from "./sub-tabs";

const ContributorProfileDialog = dynamic(
  () =>
    import("@/components/Dialogs/ContributorProfileDialog").then(
      (mod) => mod.ContributorProfileDialog
    ),
  {
    ssr: false,
  }
);

function ProjectPage() {
  const project = useProjectStore((state) => state.project);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isAuthorized = isProjectOwner || isContractOwner;
  const isAdminOrAbove = isProjectOwner || isContractOwner || isProjectAdmin;
  const { project: projectInstance } = useProjectInstance(
    project?.details?.data.slug || project?.uid || ""
  );
  const { teamProfiles } = useTeamProfiles(project);
  const { address } = useAccount();
  const { openModal } = useContributorProfileModalStore();
  const inviteCodeParam = useSearchParams().get("invite-code");
  const params = useParams();
  const projectId = params.projectId as string;
  const { populateEns, ensData } = useENS();

  const {
    data: memberRoles,
    isLoading: isLoadingRoles,
    isFetching: isFetchingRoles,
  } = useMemberRoles();

  useEffect(() => {
    if (project?.members) {
      populateEns(project?.members?.map((v) => v.recipient));
    }
  }, [project?.members]);

  const [, copy] = useCopyToClipboard();

  const mountMembers = () => {
    const members: Member[] = [];
    if (project?.members) {
      project.members.forEach((member) => {
        if (!members.find((m) => m.recipient === member.recipient)) {
          members.push({
            uid: member.uid,
            recipient: member.recipient,
            details: {
              name: member?.details?.name,
            },
          });
        }
      });
    }
    const alreadyHasOwner = project?.members.find(
      (member) =>
        member.recipient.toLowerCase() === project.recipient.toLowerCase()
    );
    if (!alreadyHasOwner) {
      members.push({
        uid: project?.recipient || "",
        recipient: project?.recipient || "",
      });
    }
    // sort by owner
    members.sort((a, b) => {
      return a.recipient.toLowerCase() === project?.recipient?.toLowerCase()
        ? -1
        : 1;
    });
    return members;
  };

  const members = mountMembers().sort((a, b) => {
    const roleA = memberRoles?.[a.recipient] || "Member";
    const roleB = memberRoles?.[b.recipient] || "Member";

    const roleOrder = {
      Owner: 0,
      Admin: 1,
      Member: 2,
    };

    return roleOrder[roleA] - roleOrder[roleB];
  });

  const { setActivityTab } = useActivityTabStore();

  const Team = () => {
    return members.length ? (
      <div className="flex flex-col gap-2 w-full min-w-48">
        <div className="flex flex-col border border-zinc-200 divide-y divide-y-zinc-200  rounded-xl">
          <p className="font-bold text-black dark:text-white text-base leading-none p-3">
            Team ({members.length})
          </p>
          <div className="flex flex-col divide-y divide-y-zinc-200">
            {members?.map((member) => {
              const profile = teamProfiles?.find(
                (profile) =>
                  profile.recipient.toLowerCase() ===
                  member.recipient.toLowerCase()
              );
              return (
                <div
                  key={member.uid}
                  className="flex items-center flex-row gap-3 justify-between"
                >
                  <div className="flex items-center flex-row gap-3 p-3">
                    <EthereumAddressToENSAvatar
                      address={member.recipient}
                      className="h-8 w-8 min-h-8 min-w-8 rounded-full"
                    />
                    <div className="flex flex-col gap-1">
                      {profile ? (
                        <MemberDialog
                          profile={profile}
                          buttonText={
                            profile?.data.name ||
                            member.details?.name ||
                            ensData[member.recipient as Hex]?.name ||
                            shortAddress(member.recipient)
                          }
                          buttonClassName="text-sm font-bold font-body text-[#101828] dark:text-gray-400 line-clamp-1 text-wrap whitespace-nowrap w-full min-w-full max-w-full text-left"
                        />
                      ) : (
                        <p className="text-sm font-bold font-body text-[#101828] dark:text-gray-400 line-clamp-1 text-wrap whitespace-nowrap w-full min-w-full max-w-full text-left">
                          {member.details?.name ||
                            ensData[member.recipient as Hex]?.name ||
                            shortAddress(member.recipient)}
                        </p>
                      )}
                      {isLoadingRoles || isFetchingRoles ? (
                        <Skeleton className="w-full h-4" />
                      ) : memberRoles &&
                        memberRoles[member.recipient.toLowerCase()] !==
                          "Member" ? (
                        <p className="text-sm text-brand-blue font-medium leading-none">
                          {memberRoles[member.recipient.toLowerCase()]}
                        </p>
                      ) : null}
                      <div className="flex flex-row gap-2 justify-between items-center w-full max-w-max">
                        <p className="text-sm font-medium text-[#475467] dark:text-gray-300 line-clamp-1 text-wrap whitespace-nowrap">
                          {shortAddress(member.recipient)}
                        </p>
                        <button
                          type="button"
                          onClick={() => copy(member.recipient)}
                        >
                          <img
                            src="/icons/copy-2.svg"
                            alt="Copy"
                            className="text-[#98A2B3] w-4 h-4"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row gap-2 mr-2">
                    {member.recipient.toLowerCase() ===
                    address?.toLowerCase() ? (
                      <Tooltip.Provider>
                        <Tooltip.Root delayDuration={0}>
                          <Tooltip.Trigger asChild>
                            <div>
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
                            </div>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              className="TooltipContent bg-brand-darkblue rounded-lg text-white p-3 max-w-[360px] z-[1000]"
                              sideOffset={5}
                              side="top"
                            >
                              <p>Edit your profile</p>
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    ) : null}
                    {isAuthorized &&
                    memberRoles &&
                    memberRoles[member.recipient.toLowerCase()] === "Member" ? (
                      <PromoteMemberDialog memberAddress={member.recipient} />
                    ) : null}
                    {isAuthorized &&
                    memberRoles &&
                    memberRoles[member.recipient.toLowerCase()] === "Admin" ? (
                      <DemoteMemberDialog memberAddress={member.recipient} />
                    ) : null}
                    {isAuthorized &&
                    memberRoles &&
                    memberRoles[member.recipient.toLowerCase()] !== "Owner" ? (
                      <DeleteMemberDialog memberAddress={member.recipient} />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {isAuthorized ? <InviteMemberDialog /> : null}
      </div>
    ) : null;
  };

  const checkCodeValidation = async () => {
    if (!inviteCodeParam) return;
    try {
      const [data, error] = await fetchData(
        INDEXER.PROJECT.INVITATION.CHECK_CODE(projectId, inviteCodeParam)
      );
      if (error) throw error;
      if (data.message === "Valid") return true;
      return false;
    } catch (error) {
      errorManager("Failed to check code validation", error, {
        projectId,
        code: inviteCodeParam,
        address,
      });
    }
  };

  useEffect(() => {
    const isAlreadyMember = project?.members.some(
      (member) => member.recipient.toLowerCase() === address?.toLowerCase()
    );
    if (isAlreadyMember) return;
    checkCodeValidation().then((isValid) => {
      if (isValid) {
        openModal({
          isGlobal: false,
        });
      }
    });
  }, [project, address, inviteCodeParam]);

  return (
    <div className="flex flex-row max-lg:flex-col gap-6 max-md:gap-4 py-5 mb-20">
      <ContributorProfileDialog />

      <div className="flex flex-[2.5] gap-6 flex-col w-full max-lg:hidden">
        <Team />
      </div>
      <div className="flex flex-col flex-[7.5] max-lg:w-full gap-4">
        <InformationBlock />
      </div>
      <div className="flex flex-col flex-[4] gap-8 max-lg:w-full">
        <div className="flex w-full flex-col gap-2 lg:hidden">
          <Team />
        </div>

        {project ? <ProjectSubscription project={project} /> : null}
        <div className="flex flex-col gap-1">
          <p className="text-black dark:text-zinc-400 font-bold text-sm">
            This project has received
          </p>
          <div className="flex flex-row  max-lg:flex-col gap-4">
            <Link
              href={PAGES.PROJECT.GRANTS(projectId)}
              className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center"
            >
              <div className="flex flex-col gap-2">
                <p className="text-black dark:text-zinc-300 dark:bg-zinc-800 text-2xl font-bold bg-[#EFF4FF] rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px]  min-w-[40px] w-max h-max">
                  {project?.grants.length || 0}
                </p>
                <div className="flex flex-row gap-2">
                  <p className="font-normal text-brand-gray text-sm dark:text-zinc-300">
                    {pluralize("Grant", project?.grants.length || 0)}
                  </p>
                  <img
                    src={"/icons/funding.png"}
                    alt="Grants"
                    className="w-5 h-5"
                  />
                </div>
              </div>
              <div className="w-5 h-5 flex justify-center items-center">
                <ChevronRightIcon className="w-5 h-5 text-[#1D2939] dark:text-zinc-200" />
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setActivityTab("endorsements")}
              className="flex flex-1 rounded border border-[#EAECf0] dark:border-zinc-600 border-l-[#155EEF] dark:border-l-[#155EEF] border-l-[4px] p-4 justify-between items-center"
            >
              <div className="flex flex-col gap-2">
                <p className="text-black dark:text-zinc-300 dark:bg-zinc-800 text-2xl font-bold bg-[#EFF4FF] rounded-lg px-2 py-1 flex justify-center items-center min-h-[40px]  min-w-[40px] w-max h-max">
                  {formatCurrency(project?.endorsements.length || 0)}
                </p>
                <div className="flex flex-row gap-2">
                  <p className="font-normal text-brand-gray text-sm dark:text-zinc-300">
                    {pluralize(
                      "Endorsement",
                      project?.endorsements.length || 0
                    )}
                  </p>
                  <img
                    src={"/icons/endorsements.png"}
                    alt="Endorsements"
                    className="w-5 h-5"
                  />
                </div>
              </div>
              <div className="w-5 h-5 flex justify-center items-center">
                <ChevronRightIcon className="w-5 h-5 text-[#1D2939] dark:text-zinc-200" />
              </div>
            </button>
          </div>
        </div>

        <div className="flex w-full">
          <ProjectSubTabs />
        </div>
      </div>
    </div>
  );
}

export default ProjectPage;
