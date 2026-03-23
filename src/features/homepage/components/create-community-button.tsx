"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";

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
    return undefined;
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
