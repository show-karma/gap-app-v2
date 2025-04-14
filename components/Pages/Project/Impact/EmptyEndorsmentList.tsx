import { useAuthStore } from "@/store/auth";
import { FC, useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { Button } from "@/components/Utilities/Button";
import { cn } from "@/utilities/tailwind";

export const EmptyEndorsmentList: FC = () => {
  const { isConnected, isConnecting } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { isAuth } = useAuthStore();

  const { setIsEndorsementOpen: setIsOpen } = useEndorsementStore();

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <p>Be the first to endorse this project!</p>

      <Button
        className="whitespace-nowrap w-max bg-brand-blue text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        onClick={() => {
          if (!isConnected || !isAuth) {
            openConnectModal?.();
          } else {
            setIsOpen(true);
          }
        }}
      >
        Endorse the project
      </Button>
    </div>
  );
};
