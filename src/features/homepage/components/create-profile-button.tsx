"use client";

import { Button } from "@/components/ui/button";
import { useContributorProfileModalStore } from "@/store/modals/contributorProfile";

export function CreateProfileButton() {
    const { openModal: openProfileModal } = useContributorProfileModalStore();

    return (
        <Button
            onClick={() => openProfileModal({ isGlobal: true })}
            className="px-6 py-2.5 text-sm font-medium w-max bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow"
        >
            Create Profile
        </Button>
    );
}

