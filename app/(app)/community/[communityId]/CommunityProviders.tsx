"use client";

import { LazyDialogs } from "@/components/Dialogs/LazyDialogs";
import { PermissionsProvider } from "@/components/Utilities/PermissionsProvider";

export function CommunityProviders() {
  return (
    <>
      <PermissionsProvider />
      <LazyDialogs />
    </>
  );
}
