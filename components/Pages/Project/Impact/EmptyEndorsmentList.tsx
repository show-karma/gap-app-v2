import { useAuthStore } from "@/store/auth";
import { FC, useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { EndorsementDialog } from "./EndorsementDialog";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { Button } from "@/components/Utilities/Button";
import { cn } from "@/utilities/tailwind";

export const EmptyEndorsmentList: FC = () => {
  const { isConnected, isConnecting } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { isAuth } = useAuthStore();

  const { setIsEndorsementOpen: setIsOpen } = useEndorsementStore();

  return (
    <div className="flex flex-col gap-3">
      <p>Be the first to endorse this project!</p>
      {!isConnected || !isAuth ? (
        <button
          className="bg-brand-blue text-white px-4 rounded-md py-2 w-max"
          onClick={() => {
            if (!isConnecting) {
              openConnectModal?.();
            }
          }}
        >
          Connect
        </button>
      ) : (
        <Button
          className={cn(
            "flex justify-center items-center gap-x-1 rounded-md bg-primary-50 dark:bg-primary-900/50 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-zinc-100  hover:bg-primary-100 dark:hover:bg-primary-900 border border-primary-200 dark:border-primary-900",
            "bg-black text-white px-4 rounded-md py-2 w-max hover:bg-black border-none"
          )}
          onClick={() => setIsOpen(true)}
        >
          Endorse
        </Button>
      )}
    </div>
  );
};
