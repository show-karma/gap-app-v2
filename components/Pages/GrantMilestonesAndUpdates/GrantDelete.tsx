import { DeleteDialog } from "@/components/DeleteDialog";
import { useProjectStore } from "@/store";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { shortAddress } from "@/utilities/shortAddress";
import { TrashIcon } from "@heroicons/react/24/outline";
import type { Grant } from "@show-karma/karma-gap-sdk";
import { getWalletClient } from "@wagmi/core";
import { useQueryState } from "nuqs";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";

interface GrantDeleteProps {
  grant: Grant;
}

export const GrantDelete: FC<GrantDeleteProps> = ({ grant }) => {
  const [isDeletingGrant, setIsDeletingGrant] = useState(false);
  const { address, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [, setGrantTab] = useQueryState("grantId");

  const deleteFn = async () => {
    if (!address) return;
    setIsDeletingGrant(true);
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== grant.chainID) {
        await switchChainAsync?.({ chainId: grant.chainID });
      }
      const walletClient = await getWalletClient({
        chainId: grant.chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const grantUID = grant.uid;
      await grant.revoke(walletSigner).then(async () => {
        toast.success(MESSAGES.GRANT.DELETE.SUCCESS);
        await refreshProject().then((res) => {
          const stillExist = res?.grants.find((g) => g.uid === grantUID);
          if (stillExist && res?.grants) {
            const removedGrant = res?.grants.filter((g) => g.uid !== grantUID);
            res.grants = removedGrant;
            if (res.grants.length > 0) {
              setGrantTab(res.grants[0].uid);
            }
          }
        });
      });
    } catch (error) {
      toast.error(
        MESSAGES.GRANT.DELETE.ERROR(
          grant.details?.title || shortAddress(grant.uid)
        )
      );
      console.log(error);
    } finally {
      setIsDeletingGrant(false);
    }
  };

  return (
    <DeleteDialog
      deleteFunction={deleteFn}
      isLoading={isDeletingGrant}
      buttonElement={{
        icon: <TrashIcon className="w-6 h-6" />,
        text: "",
        styleClass:
          "bg-transparent text-red-500 p-1 px-2 hover:opacity-75 hover:bg-transparent",
      }}
      title={
        <p className="font-normal">
          Are you sure you want to delete{" "}
          <b>{grant.details?.title || shortAddress(grant.uid)}</b> grant?
        </p>
      }
    />
  );
};
