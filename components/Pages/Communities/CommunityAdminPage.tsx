"use client";
import { Spinner } from "@/components/Utilities/Spinner";

import { useSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { isCommunityAdminOf } from "@/utilities/sdk/communities/isCommunityAdmin";
import type { ICommunityResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useEffect, useState } from "react";

import { errorManager } from "@/components/Utilities/errorManager";
import { Button } from "@/components/Utilities/Button";
import {
  ChevronRightIcon,
  Square2StackIcon,
  FlagIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/Utilities/Skeleton";
import { cn } from "@/utilities/tailwind";
import { useWalletInteraction } from "@/hooks/useWalletInteraction";

interface AdminButtonProps {
  href: string;
  label: string;
  description: string;
  colorClass: string;
  icon?: React.ReactNode;
}

const AdminButton = ({
  href,
  label,
  description,
  colorClass,
  icon,
}: AdminButtonProps) => (
  <a
    href={href}
    className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
    role="button"
    tabIndex={0}
  >
    <div
      className={cn(
        "flex flex-col gap-2 p-6 rounded-lg transition-all duration-200 focus:scale-105",
        "bg-white dark:bg-zinc-900 border-2 border-primary-500/20 hover:border-primary-500",
        "dark:border-primary-500/20 dark:hover:border-primary-500",
        "hover:shadow-lg hover:shadow-primary-500/5",
        colorClass
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && <div className="text-primary-500">{icon}</div>}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {label}
          </h3>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-primary-500 group-hover:translate-x-1 transition-transform duration-200" />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  </a>
);

const LoadingSkeleton = () => (
  <div className="flex flex-row flex-wrap gap-8">
    {[1, 2, 3].map((i) => (
      <div key={i} className="w-[300px]">
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    ))}
  </div>
);

export const CommunityAdminPage = ({
  communityId,
  community,
}: {
  communityId: string;
  community: ICommunityResponse;
}) => {
  const { address, isConnected } = useWalletInteraction();

  const [isAdmin, setIsAdmin] = useState<boolean>(false); // Data returned from the API
  const signer = useSigner();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!community) return;

    const checkIfAdmin = async () => {
      setLoading(true);
      if (!community?.uid || !isConnected) return;
      try {
        const checkAdmin = await isCommunityAdminOf(
          community,
          address as string,
          signer
        );
        setIsAdmin(checkAdmin);
      } catch (error: any) {
        errorManager(
          `Error checking if ${address} is admin of ${communityId}`,
          error
        );
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkIfAdmin();
  }, [address, isConnected, isConnected, community?.uid, signer]);

  return (
    <div className="container mx-auto px-4 py-8 mt-2">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          Community Admin Dashboard
        </h1>

        {loading ? (
          <LoadingSkeleton />
        ) : isAdmin ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AdminButton
              href={PAGES.ADMIN.EDIT_CATEGORIES(
                community?.details?.data?.slug || communityId
              )}
              label="Categories"
              description="Manage and organize community categories"
              colorClass=""
              icon={<Square2StackIcon className="w-6 h-6" />}
            />

            <AdminButton
              href={PAGES.ADMIN.MILESTONES(
                community?.details?.data?.slug || communityId
              )}
              label="Milestones"
              description="Track and update project milestones"
              colorClass=""
              icon={<FlagIcon className="w-6 h-6" />}
            />

            <AdminButton
              href={PAGES.ADMIN.MANAGE_INDICATORS(
                community?.details?.data?.slug || communityId
              )}
              label="Impact Measurement"
              description="Setup and manage impact indicators"
              colorClass=""
              icon={<ChartBarIcon className="w-6 h-6" />}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
            <p className="text-gray-600 dark:text-gray-300 text-center">
              {MESSAGES.ADMIN.NOT_AUTHORIZED(community?.uid || "")}
            </p>
            <Button className="mt-4" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
