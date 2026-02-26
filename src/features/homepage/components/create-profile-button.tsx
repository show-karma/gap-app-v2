"use client";

import { Button } from "@/components/ui/button";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";

export function CreateProfileButton() {
  const { openModal: openProfileModal } = useContributorProfileModalStore();

  return (
    <Button variant="secondary" onClick={() => openProfileModal({ isGlobal: true })}>
      Create Profile
    </Button>
  );
}
