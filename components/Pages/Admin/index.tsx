"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from "react";
import debounce from "lodash.debounce";
import Link from "next/link";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunitiesStore } from "@/store/communities";
import { PAGES } from "@/utilities/pages";
import { MESSAGES } from "@/utilities/messages";
import { Community } from "@show-karma/karma-gap-sdk";
import { AddAdmin } from "./AddAdminDialog";
import { RemoveAdmin } from "./RemoveAdminDialog";
import { formatDate } from "@/utilities/formatDate";
import { blo } from "blo";
import { LinkIcon } from "@heroicons/react/24/solid";
import CommunityStats from "@/components/CommunityStats";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { useOwnerStore } from "@/store/owner";
import { useCommunityConfig, useCommunityConfigMutation } from "@/hooks/useCommunityConfig";
import { useAllCommunitiesWithAdmins, type AllCommunitiesWithAdminsData } from "@/hooks/useAllCommunitiesWithAdmins";
import { layoutTheme } from "@/src/helper/theme";

export const CommunitiesToAdmin = () => {
  const { communities: communitiesToAdmin, isLoading } = useCommunitiesStore();
  const { isOwner } = useOwnerStore();
  const { data, isLoading: isLoadingCommunities, refetch } = useAllCommunitiesWithAdmins();

  const communities = data?.communities ?? [];
  const communityAdmins = data?.communityAdmins ?? [];

  return (
    <div className={layoutTheme.padding}>
      {communitiesToAdmin.length === 0 ? (
        <p>{MESSAGES.ADMIN.NO_COMMUNITIES}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="text-2xl font-bold">
              Your Communities{" "}
              {communities.length ? `(${communitiesToAdmin.length})` : ""}
            </div>
          </div>
          <div className="mt-5 w-full gap-5">
            {communities.length ? (
              // Wrapping the table with a scrollable container
              <div className="overflow-x-auto">
                <table className="min-w-full border-x border-x-zinc-300 border-y border-y-zinc-300">
                  <thead className="border-x border-x-zinc-300 border-y border-y-zinc-300">
                    <tr className="divide-x">
                      <th className="min-w-[80px]">Img</th>
                      <th className="min-w-[150px]">Name</th>
                      <th className="min-w-[100px]">Created</th>
                      <th className="min-w-[200px]">UUID</th>
                      {/* Set minimum width */}
                      <th className="px-4 text-center min-w-[150px]">
                        Community page
                      </th>
                      <th className="px-4 text-center min-w-[120px]">
                        Admin page
                      </th>
                      <th className="px-4 text-center min-w-[120px]">
                        View stats
                      </th>
                      <th className="min-w-[150px]">Network</th>
                      <th className="min-w-[150px]">Admins</th>
                      <th className="min-w-[100px]">Action</th>
                      {isOwner && <th className="text-center">Public?</th>}
                      {isOwner && <th className="text-center">Rank</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-x">
                    {communities.map((community) => {
                      const isCommunityAdmin = communitiesToAdmin.some(
                        (adminOfCommunity) =>
                          adminOfCommunity.uid === community.uid
                      );

                      if (!isCommunityAdmin && !isOwner) return null;

                      const matchingCommunityAdmin = communityAdmins.find(
                        (admin: any) => admin.id === community.uid
                      );

                      const slug = community.details?.slug || community.uid;

                      return (
                        <CommunityRowWithConfig
                          key={community.uid}
                          community={community}
                          slug={slug}
                          matchingCommunityAdmin={matchingCommunityAdmin}
                          refetchCommunities={refetch}
                          isOwner={isOwner}
                          isCommunityAdmin={isCommunityAdmin}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : isLoading || isLoadingCommunities ? (
              <Spinner />
            ) : (
              <div className="text-center">
                <p>No communities to admin</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface CommunityRowWithConfigProps {
  community: Community;
  slug: string;
  matchingCommunityAdmin: any;
  refetchCommunities: () => void;
  isOwner: boolean;
  isCommunityAdmin: boolean;
}

const CommunityRowWithConfig: React.FC<CommunityRowWithConfigProps> = ({
  community,
  slug,
  matchingCommunityAdmin,
  refetchCommunities,
  isOwner,
  isCommunityAdmin
}) => {
  const updateConfigMutation = useCommunityConfigMutation();
  const { data: config, isLoading: configLoading } = useCommunityConfig(
    slug,
    isOwner
  );
  const [localRank, setLocalRank] = useState<number>(0);

  function shortenHex(hexString: string) {
    const firstPart = hexString.substring(0, 6);
    const lastPart = hexString.substring(hexString.length - 6);

    return `${firstPart}...${lastPart}`;
  }

  const isPublic = config?.public === true || config?.public === undefined;
  const rank = config?.rank || 0;

  useEffect(() => {
    setLocalRank(rank);
  }, [rank]);

  const handlePublicChange = (checked: boolean) => {
    updateConfigMutation.mutate({
      slug,
      config: {
        public: checked,
        rank: config?.rank
      }
    });
  };

  useEffect(() => {
    const handler = debounce(() => {
      if (localRank !== rank) {
        updateConfigMutation.mutate({
          slug,
          config: {
            public: config?.public,
            rank: localRank
          }
        });
      }
    }, 1000);

    handler();

    return () => handler.cancel();
  }, [localRank, rank, slug, config?.public, updateConfigMutation]);

  const handleRankInputChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 0) {
      setLocalRank(numValue);
    }
  };

  return (
    <React.Fragment>
      <tr className="divide-x">
        <td className="min-w-[80px]">
          <img
            src={community.details?.imageURL || blo(community.uid)}
            className="h-[64px] w-[100px] object-cover"
            alt={community.details?.name || community.uid}
          />
        </td>
        <td className="max-w-40 px-4 min-w-[150px]">
          {community.details?.name}
        </td>
        <td className="max-w-60 px-4 min-w-[100px]">
          {formatDate(community?.createdAt)}
        </td>
        <td className="max-w-80 break-all px-4 min-w-[200px]">
          {community.uid}
        </td>
        <td className="text-center px-4 min-w-[150px]">
          <Link
            href={PAGES.COMMUNITY.ALL_GRANTS(
              community.details?.slug || community.uid
            )}
            className="flex flex-row items-center gap-1.5 text-blue-500"
          >
            Community
            <LinkIcon className="w-4 h-4" />
          </Link>
        </td>
        <td className="text-center px-4 min-w-[120px]">
          {isCommunityAdmin ? (
            <Link
              href={PAGES.ADMIN.ROOT(
                community.details?.slug || community.uid
              )}
              className="flex flex-row items-center gap-1.5 text-blue-500"
            >
              Admin
              <LinkIcon className="w-4 h-4" />
            </Link>
          ) : (
            <span className="text-gray-500">No access</span>
          )}
        </td>
        <td className="text-center px-4 min-w-[120px]">
          <CommunityStats communityId={community.uid} />
        </td>
        <td className="px-4 min-w-[150px]">
          <div className="flex flex-row gap-2 items-center">
            <img
              src={chainImgDictionary(community.chainID)}
              alt={chainNameDictionary(community.chainID)}
              className="w-5 h-5"
            />
            <p>{chainNameDictionary(community.chainID)}</p>
          </div>
        </td>
        <td className="min-w-[150px]">
          {isCommunityAdmin ? (
            matchingCommunityAdmin &&
            matchingCommunityAdmin.admins &&
            matchingCommunityAdmin.admins.length > 0 &&
            matchingCommunityAdmin.admins.map(
              (admin: any, index: number) => (
                <div className="flex gap-2 p-5" key={index}>
                  <div>
                    {shortenHex(admin.user.id)}
                  </div>
                  <RemoveAdmin
                    UUID={community.uid}
                    chainid={community.chainID}
                    Admin={admin.user.id}
                    fetchAdmins={refetchCommunities}
                  />
                </div>
              )
            )
          ) : (
            <span className="text-gray-500 px-4">No access</span>
          )}
        </td>
        <td className="min-w-[100px]">
          {isCommunityAdmin ? (
            <AddAdmin
              UUID={community.uid}
              chainid={community.chainID}
              fetchAdmins={refetchCommunities}
            />
          ) : (
            <span className="text-gray-500">No access</span>
          )}
        </td>
        {isOwner && (
          <td className="px-2 text-center">
            <div className="flex items-center justify-center gap-2">
              {configLoading ? (
                <div className="w-4 h-4 animate-spin border border-gray-300 rounded-full border-t-transparent" />
              ) : (
                <>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => handlePublicChange(e.target.checked)}
                    disabled={updateConfigMutation.isPending}
                  />
                  {updateConfigMutation.isPending && (
                    <div className="w-3 h-3 animate-spin border border-blue-500 rounded-full border-t-transparent" />
                  )}
                </>
              )}
            </div>
          </td>
        )}
        {isOwner && (
          <td className="px-2 text-center">
            <div className="flex items-center justify-center gap-2">
              {configLoading ? (
                <div className="w-4 h-4 animate-spin border border-gray-300 rounded-full border-t-transparent" />
              ) : (
                <>
                  <input
                    type="number"
                    value={localRank}
                    onChange={(e) => handleRankInputChange(e.target.value)}
                    min="0"
                    className="w-16 px-1 border border-gray-300 rounded text-center"
                    disabled={updateConfigMutation.isPending}
                  />
                  {updateConfigMutation.isPending && (
                    <div className="w-3 h-3 animate-spin border border-blue-500 rounded-full border-t-transparent" />
                  )}
                </>
              )}
            </div>
          </td>
        )}
      </tr>
    </React.Fragment>
  );
};
