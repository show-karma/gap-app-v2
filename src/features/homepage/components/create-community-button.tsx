"use client";

import type { Community } from "@show-karma/karma-gap-sdk/core/class/entities/Community";
import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { getCommunities } from "@/services/communities.service";

interface CreateCommunityButtonProps {
  styleClass?: string;
}

const defaultStyleClass = "px-4 py-[7.5px] text-sm font-medium w-max";

export function CreateCommunityButton({
  styleClass = defaultStyleClass,
}: CreateCommunityButtonProps) {
  const CommunityDialog = useMemo(
    () =>
      dynamic(
        () => import("@/components/Dialogs/CommunityDialog").then((mod) => mod.CommunityDialog),
        {
          ssr: false,
          loading: () => <Button className={styleClass}>Create community</Button>,
        }
      ),
    [styleClass]
  );

  const refreshCommunities = useCallback(async () => {
    try {
      const communities = await getCommunities();
      // Cast to SDK Community type — polling only checks .uid field
      return communities as unknown as Community[];
    } catch {
      return undefined;
    }
  }, []);

  return (
    <CommunityDialog
      buttonElement={{
        text: "Create community",
        styleClass,
      }}
      refreshCommunities={refreshCommunities}
    />
  );
}
