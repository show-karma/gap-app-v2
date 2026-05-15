"use client";

import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { Role } from "@/src/core/rbac/types";
import { useOwnerStore, useProjectStore } from "@/store";
import { useProgressModalStore } from "@/store/modals/progress";
import { cn } from "@/utilities/tailwind";

interface PostUpdateButtonProps {
  className?: string;
}

export function PostUpdateButton({ className }: PostUpdateButtonProps) {
  const { setIsProgressModalOpen } = useProgressModalStore();
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const { authenticated } = useAuth();
  const { data: permissions, isLoading: isPermissionsLoading } = usePermissionsQuery(
    {},
    { enabled: authenticated }
  );
  const isSuperAdmin = permissions?.roles?.roles?.includes(Role.SUPER_ADMIN) ?? false;

  const isAuthorized =
    isOwner || isProjectAdmin || isProjectOwner || (!isPermissionsLoading && isSuperAdmin);

  if (!isAuthorized) return null;

  return (
    <Button
      onClick={() => setIsProgressModalOpen(true)}
      className={cn(
        "h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2",
        className
      )}
      data-testid="post-update-button"
    >
      <PenLine className="size-4" />
      Post an update
    </Button>
  );
}
