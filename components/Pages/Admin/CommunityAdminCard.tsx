"use client";
import { ChevronDownIcon, ChevronUpIcon, LinkIcon } from "@heroicons/react/24/solid";
import { blo } from "blo";
import Image from "next/image";
import { isAddress } from "viem";
import CommunityStats from "@/components/CommunityStats";
import { AddAdmin } from "@/components/Pages/Admin/AddAdminDialog";
import { RemoveAdmin } from "@/components/Pages/Admin/RemoveAdminDialog";
import type { CommunityAdmin, CommunityAdminsBatchStatus } from "@/services/communities.service";
import type { UserProfileInfo } from "@/services/community-admins.service";
import { Link } from "@/src/components/navigation/Link";
import type { Community } from "@/types/v2/community";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";
import { formatDate } from "@/utilities/formatDate";
import { PAGES } from "@/utilities/pages";

const ADMINS_COLLAPSED_COUNT = 3;

const getAdminsBatchStatusMessage = (status: CommunityAdminsBatchStatus): string => {
  if (status === "community_not_found") {
    return "Admin data unavailable: community not found in the indexer.";
  }
  if (status === "subgraph_unavailable") {
    return "Admin data unavailable: subgraph is temporarily unavailable.";
  }
  return "";
};

const formatAdminAddress = (address: string): `0x${string}` => {
  if (isAddress(address)) {
    return address as `0x${string}`;
  }
  if (address.startsWith("0x") && address.length === 42) {
    return address as `0x${string}`;
  }
  // Return a default format if not a valid address (should not happen)
  return `0x${address.replace("0x", "")}` as `0x${string}`;
};

interface CommunityAdminCardProps {
  community: Community;
  matchingCommunityAdmin: CommunityAdmin | undefined;
  canManageAdmins: boolean;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  adminProfiles: Map<string, UserProfileInfo> | undefined;
  onRefetch: () => void;
}

export function CommunityAdminCard({
  community,
  matchingCommunityAdmin,
  canManageAdmins,
  isExpanded,
  onToggleExpansion,
  adminProfiles,
  onRefetch,
}: CommunityAdminCardProps) {
  const adminBatchStatus = matchingCommunityAdmin?.status;
  // Safely format community UID as hex address
  const communityId = formatAdminAddress(community.uid);

  return (
    <div className="border border-zinc-300 rounded-lg p-6 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-shadow">
      {/* Network at top */}
      <div className="mb-3">
        <div className="flex flex-row gap-2 items-center">
          <Image
            src={chainImgDictionary(community.chainID)}
            alt={chainNameDictionary(community.chainID)}
            width={20}
            height={20}
            className="w-5 h-5"
            unoptimized
          />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {chainNameDictionary(community.chainID)}
          </p>
        </div>
      </div>

      {/* Header with image and name */}
      <div className="flex items-center gap-4 mb-4">
        <Image
          src={community.details?.imageURL || blo(community.uid as `0x${string}`)}
          width={64}
          height={64}
          className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
          alt={community.details?.name || community.uid}
          unoptimized
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {community.details?.name || "Unnamed Community"}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Created {formatDate(community?.createdAt)}
          </p>
        </div>
      </div>

      {/* UUID */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">UUID</p>
        <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
          {community.uid}
        </p>
      </div>

      {/* Links & Stats */}
      <div className="mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick Links</p>
        <div className="flex flex-col gap-2">
          <Link
            href={PAGES.COMMUNITY.ALL_GRANTS(community.details?.slug || community.uid)}
            className="flex flex-row items-center gap-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Community Page</span>
          </Link>
          <Link
            href={PAGES.ADMIN.ROOT(community.details?.slug || community.uid)}
            className="flex flex-row items-center gap-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Admin Page</span>
          </Link>
          <div className="mt-1">
            <CommunityStats communityId={community.uid} />
          </div>
        </div>
      </div>

      {/* Admins */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Admins{" "}
            {adminBatchStatus === "ok" &&
              matchingCommunityAdmin &&
              matchingCommunityAdmin.admins.length > 0 && (
                <span className="text-gray-400">({matchingCommunityAdmin.admins.length})</span>
              )}
          </p>
          {canManageAdmins && (
            <AddAdmin UUID={communityId} chainid={community.chainID} fetchAdmins={onRefetch} />
          )}
        </div>
        <div className="space-y-2">
          {adminBatchStatus && adminBatchStatus !== "ok" ? (
            <p className="text-xs text-amber-700 dark:text-amber-300 italic">
              {getAdminsBatchStatusMessage(adminBatchStatus)}
            </p>
          ) : matchingCommunityAdmin && matchingCommunityAdmin.admins.length > 0 ? (
            <>
              {(isExpanded
                ? matchingCommunityAdmin.admins
                : matchingCommunityAdmin.admins.slice(0, ADMINS_COLLAPSED_COUNT)
              ).map((admin) => {
                const profile = adminProfiles?.get(admin.user.id.toLowerCase());
                return (
                  <div
                    className="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-zinc-800 rounded"
                    key={admin.user.id}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      {profile ? (
                        <>
                          {profile.name && (
                            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                              {profile.name}
                            </span>
                          )}
                          <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {profile.email}
                          </span>
                        </>
                      ) : null}
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-500 break-all">
                        {admin.user.id}
                      </span>
                    </div>
                    {canManageAdmins && (
                      <RemoveAdmin
                        UUID={communityId}
                        chainid={community.chainID}
                        Admin={formatAdminAddress(admin.user.id)}
                        adminName={profile?.name}
                        adminEmail={profile?.email}
                        fetchAdmins={onRefetch}
                      />
                    )}
                  </div>
                );
              })}
              {matchingCommunityAdmin.admins.length > ADMINS_COLLAPSED_COUNT && (
                <button
                  type="button"
                  onClick={onToggleExpansion}
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} admin list for ${
                    community.details?.name || community.uid
                  }`}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mt-1"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUpIcon className="w-3 h-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="w-3 h-3" />
                      Show {matchingCommunityAdmin.admins.length - ADMINS_COLLAPSED_COUNT} more
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No admins yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
