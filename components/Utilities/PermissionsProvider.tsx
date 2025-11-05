"use client";

import { useAuth } from "@/hooks/useAuth";
import { useAdminCommunities } from "@/hooks/useAdminCommunities";
import { useContractOwner } from "@/hooks/useContractOwner";

export function PermissionsProvider() {
  const { address } = useAuth();

  useAdminCommunities(address);
  useContractOwner();

  return null;
}

