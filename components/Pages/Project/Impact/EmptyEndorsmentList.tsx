import { useAuthStore } from "@/store/auth";
import { FC } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useEndorsementStore } from "@/store/modals/endorsement";

export const EmptyEndorsmentList: FC = () => {
  const { isConnected, isConnecting } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { isAuth } = useAuthStore();

  const { setIsEndorsementOpen: setIsOpen } = useEndorsementStore();

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <p>
        Be the first to{" "}
        <span
          className="whitespace-nowrap cursor-pointer text-blue-600 px-0 py-0 rounded-md underline bg-transparent hover:bg-transparent transition-colors"
          onClick={() => {
            if (!isConnected || !isAuth) {
              openConnectModal?.();
            } else {
              setIsOpen(true);
            }
          }}
        >
          endorse this project!
        </span>
      </p>
    </div>
  );
};
