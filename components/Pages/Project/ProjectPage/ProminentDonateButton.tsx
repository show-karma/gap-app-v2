import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SingleProjectDonateModal } from "@/components/Donation/SingleProject/SingleProjectDonateModal";
import type { Hex } from "viem";
import Image from "next/image";

interface ProminentDonateButtonProps {
  project: {
    uid: string;
    title: string;
    payoutAddress: Hex;
    imageURL?: string;
  };
}

export function ProminentDonateButton({ project }: ProminentDonateButtonProps) {
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDonateModalOpen(true)}
        className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] w-full"
      >
        <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg">
          <Image
            src="/icons/coins-stacked.svg"
            alt="Donate"
            width={24}
            height={24}
            className="w-6 h-6"
          />
        </div>
        <div className="flex flex-col items-start flex-1">
          <span className="text-lg font-bold">Support This Project</span>
          <span className="text-sm text-blue-100">
            Donate with crypto or card
          </span>
        </div>
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      <SingleProjectDonateModal
        isOpen={isDonateModalOpen}
        onClose={() => setIsDonateModalOpen(false)}
        project={project}
      />
    </>
  );
}
