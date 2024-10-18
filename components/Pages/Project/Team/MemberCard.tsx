/* eslint-disable @next/next/no-img-element */
import { DeleteMemberDialog } from "@/components/Dialogs/Member/DeleteMember";
import { GithubIcon, LinkedInIcon, Twitter2Icon } from "@/components/Icons";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useOwnerStore, useProjectStore } from "@/store";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";
import { PencilIcon } from "@heroicons/react/24/outline";
import { useAccount } from "wagmi";

const iconsClassnames = {
  general:
    "w-6 h-6 text-zinc-400 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300",
};

export const MemberCard = ({ member }: { member: string }) => {
  const { teamProfiles } = useProjectStore((state) => state);
  const profile = teamProfiles?.find(
    (item) => item.recipient.toLowerCase() === member.toLowerCase()
  );
  const [, copy] = useCopyToClipboard();
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const { address } = useAccount();
  const isAuthorized = isProjectOwner || isContractOwner;
  const project = useProjectStore((state) => state.project);
  const { openModal } = useContributorProfileModalStore();
  return (
    <div className="flex w-full flex-col gap-4 items-start shadow-sm rounded-lg p-4 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
      <div className="flex flex-col gap-0 w-full">
        <div className="flex flex-row justify-between w-full gap-4">
          <p className="text-lg font-bold text-black dark:text-zinc-100">
            {profile?.data.name || profile?.recipient || member}
          </p>
          <div className="flex flex-row gap-2 mr-2">
            {isAuthorized ? (
              member.toLowerCase() !== project?.recipient?.toLowerCase() ? (
                <DeleteMemberDialog memberAddress={member} />
              ) : null
            ) : null}
            {member.toLowerCase() === address?.toLowerCase() ? (
              <button
                type="button"
                className="p-2 rounded-lg hover:opacity-80 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                onClick={() => openModal(member)}
              >
                <PencilIcon className="w-4 h-4 text-black dark:text-zinc-100" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-row gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{member}</p>
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
      {profile?.data.twitter ||
      profile?.data.linkedin ||
      profile?.data.github ? (
        <div className="flex flex-row gap-3">
          <div className="flex flex-row gap-2">
            {profile?.data.twitter ? (
              <ExternalLink
                href={
                  profile?.data.twitter.includes("http")
                    ? profile?.data.twitter
                    : profile?.data.twitter.includes("twitter.com")
                    ? `https://${profile?.data.twitter}`
                    : `https://twitter.com/${profile?.data.twitter}`
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
          </div>
        </div>
      ) : null}
    </div>
  );
};
