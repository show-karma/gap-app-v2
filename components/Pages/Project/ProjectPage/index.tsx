/* eslint-disable @next/next/no-img-element */
"use client";

import { useProjectStore } from "@/store";
import { useParams } from "next/navigation";
import { useEffect } from "react";

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
import { ProjectSubscription } from "../ProjectSubscription";
import { ProjectSubTabs } from "../ProjectSubTabs";
import { ProjectBlocks } from "./ProjectBlocks";
import { ProjectBodyTabs } from "./ProjectBodyTabs";

import Image from "next/image";
import pluralize from "pluralize";

function ProjectPage() {
  const project = useProjectStore((state) => state.project);

  const params = useParams();
  const projectId = params.projectId as string;

  const { populateEns, ensData } = useENS();

  useEffect(() => {
    if (project?.members) {
      populateEns(project?.members?.map((v) => v.recipient));
    }
  }, [project?.members]);

  const [, copy] = useCopyToClipboard();

  interface Member {
    uid: string;
    recipient: string;
    details?: {
      name?: string;
    };
  }

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

  const members = mountMembers();

  const { setActivityTab } = useActivityTabStore();

  const Team = () => {
    return members.length ? (
      <div className="flex flex-col gap-2 w-full min-w-48">
        <div className="font-semibold text-black dark:text-white leading-none">
          Team
        </div>
        <div className="flex flex-col divide-y divide-y-zinc-200 border border-zinc-200 rounded-xl">
          {members?.map((member) => (
            <div
              key={member.uid}
              className="flex items-center flex-row gap-3 p-3"
            >
              <EthereumAddressToENSAvatar
                address={member.recipient}
                className="h-8 w-8 rounded-full"
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold text-[#101828] dark:text-gray-400 line-clamp-1 text-wrap whitespace-nowrap w-full">
                  {member.details?.name ||
                    ensData[member.recipient as Hex]?.name ||
                    shortAddress(member.recipient)}
                </p>
                {member.recipient?.toLowerCase() ===
                project?.recipient?.toLowerCase() ? (
                  <p className="text-sm text-brand-blue font-medium leading-none">
                    Owner
                  </p>
                ) : null}
                <div className="flex flex-row gap-2 justify-between items-center w-full max-w-max">
                  <p className="text-sm font-medium text-[#475467] dark:text-gray-300 line-clamp-1 text-wrap whitespace-nowrap">
                    {shortAddress(member.recipient)}
                  </p>
                  <button type="button" onClick={() => copy(member.recipient)}>
                    <Image
                      src="/icons/copy-2.svg"
                      alt="Copy"
                      className="text-[#98A2B3]"
                      height={16}
                      width={16}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null;
  };

  return (
    <div className="flex flex-row max-lg:flex-col gap-6 max-md:gap-4 py-5 mb-20">
      <div className="flex flex-[2.5] gap-6 flex-col w-full max-lg:hidden">
        <ProjectBlocks />
        <Team />
      </div>
      <div className="flex w-full flex-col gap-2 lg:hidden">
        <ProjectBlocks />
      </div>
      <div className="flex flex-col flex-[7.5] max-lg:w-full gap-4">
        <ProjectBodyTabs />
      </div>
      <div className="flex flex-col flex-[4] gap-8 max-lg:w-full">
        <div className="flex w-full flex-col gap-2 lg:hidden">
          <Team />
        </div>

        <div className="flex w-full lg:hidden">
          {project ? <ProjectSubscription project={project} /> : null}
        </div>
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
                  <p className="font-normal text-[#344054] text-sm dark:text-zinc-300">
                    {pluralize("Grant", project?.grants.length || 0)}
                  </p>
                  <Image
                    src={"/icons/funding.png"}
                    alt="Grants"
                    height={20}
                    width={20}
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
                  <p className="font-normal text-[#344054] text-sm dark:text-zinc-300">
                    {pluralize(
                      "Endorsement",
                      project?.endorsements.length || 0
                    )}
                  </p>
                  <Image
                    src={"/icons/endorsements.png"}
                    alt="Endorsements"
                    height={20}
                    width={20}
                  />
                </div>
              </div>
              <div className="w-5 h-5 flex justify-center items-center">
                <ChevronRightIcon className="w-5 h-5 text-[#1D2939] dark:text-zinc-200" />
              </div>
            </button>
          </div>
        </div>
        <div className="flex w-full max-lg:hidden">
          {project ? <ProjectSubscription project={project} /> : null}
        </div>
        <div className="flex w-full">
          <ProjectSubTabs />
        </div>
      </div>
    </div>
  );
}

export default ProjectPage;
