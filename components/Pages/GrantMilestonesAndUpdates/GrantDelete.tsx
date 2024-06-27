import { DeleteDialog } from "@/components/DeleteDialog";
import { getGapClient, useGap } from "@/hooks";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { shortAddress } from "@/utilities/shortAddress";
import { config } from "@/utilities/wagmi/config";
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
  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [, setGrantTab] = useQueryState("grantId");

  const { changeStepperStep, setIsStepper } = useStepper();

  const deleteFn = async () => {
    if (!address) return;
    setIsDeletingGrant(true);
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== grant.chainID) {
        await switchChainAsync?.({ chainId: grant.chainID });
      }
      const walletClient = await getWalletClient(config, {
        chainId: grant.chainID,
      });
      if (!walletClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const grantUID = grant.uid;
      await grant.revoke(walletSigner, changeStepperStep).then(async () => {
        let retries = 1000;
        changeStepperStep("indexing");
        while (retries > 0) {
          await refreshProject()
            .then(async (res) => {
              const stillExist = res?.grants.find((g) => g.uid === grantUID);
              if (!stillExist && res?.grants) {
                retries = 0;
                changeStepperStep("indexed");
                toast.success(MESSAGES.GRANT.DELETE.SUCCESS);
                if (res.grants.length > 0) {
                  setGrantTab(res.grants[0].uid);
                }
              }
              retries -= 1;
              // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
              await new Promise((resolve) => setTimeout(resolve, 1500));
            })
            .catch(async () => {
              retries -= 1;
              // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
              await new Promise((resolve) => setTimeout(resolve, 1500));
            });
        }
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
      setIsStepper(false);
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
