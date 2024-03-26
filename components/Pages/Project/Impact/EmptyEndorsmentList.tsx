import { useAuthStore } from "@/store/auth";
import { FC } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { EndorsementDialog } from "./EndorsementDialog";

export const EmptyEndorsmentList: FC = () => {
  const { isConnected, isConnecting } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { isAuth } = useAuthStore();

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
        <EndorsementDialog
          buttonElement={{
            text: "Endorse",
            styleClass: "bg-black text-white px-4 rounded-md py-2 w-max",
          }}
        />
      )}
    </div>
  );
};
