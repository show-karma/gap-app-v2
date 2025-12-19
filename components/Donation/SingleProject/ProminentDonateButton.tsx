"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import type { Hex } from "viem";
import { SingleProjectDonateModal } from "@/components/Donation/SingleProject/SingleProjectDonateModal";

interface ProminentDonateButtonProps {
  project: {
    uid: string;
    title: string;
    payoutAddress: Hex;
    imageURL?: string;
    chainID?: number;
  };
}

export function ProminentDonateButton({ project }: ProminentDonateButtonProps) {
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDonateModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-colors shadow-md hover:shadow-lg"
      >
        <Heart className="w-4 h-4" />
        <span>Support Project</span>
      </button>

      <SingleProjectDonateModal
        isOpen={isDonateModalOpen}
        onClose={() => setIsDonateModalOpen(false)}
        project={project}
      />
    </>
  );
}
