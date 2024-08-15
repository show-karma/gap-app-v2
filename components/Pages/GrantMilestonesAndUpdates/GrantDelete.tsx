import { DeleteDialog } from "@/components/DeleteDialog";
import { errorManager } from "@/components/Utilities/errorManager";
import { getGapClient, useGap } from "@/hooks";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { shortAddress } from "@/utilities/shortAddress";
import { config } from "@/utilities/wagmi/config";
import { TrashIcon } from "@heroicons/react/24/outline";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getWalletClient } from "@wagmi/core";
import { useQueryState } from "nuqs";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useSwitchChain } from "wagmi";

interface GrantDeleteProps {
  grant: IGrantResponse;
}

export const GrantDelete: FC<GrantDeleteProps> = ({ grant }) => {
  const [isDeletingGrant, setIsDeletingGrant] = useState(false);
  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const refreshProject = useProjectStore((state) => state.refreshProject);
  const [, setGrantTab] = useQueryState("grantId");

  const { changeStepperStep, setIsStepper } = useStepper();

  const { gap } = useGap();
  const project = useProjectStore((state) => state.project);
  const deleteFn = async () => {
    if (!address) return;
    setIsDeletingGrant(true);
    let gapClient = gap;
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== grant.chainID) {
        await switchChainAsync?.({ chainId: grant.chainID });
        gapClient = getGapClient(grant.chainID);
      }
      const walletClient = await getWalletClient(config, {
        chainId: grant.chainID,
      });
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const grantUID = grant.uid;
      const instanceProject = await gapClient.fetch.projectById(project?.uid);
      const grantInstance = instanceProject?.grants.find(
        (item) => item.uid.toLowerCase() === grantUID.toLowerCase()
      );
      if (!grantInstance) return;
      await grantInstance
        .revoke(walletSigner, changeStepperStep)
        .then(async (res) => {
          let retries = 1000;
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(
              INDEXER.ATTESTATION_LISTENER(txHash, grant.chainID),
              "POST",
              {}
            );
          }
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
    } catch (error: any) {
      toast.error(
        MESSAGES.GRANT.DELETE.ERROR(
          grant.details?.data?.title || shortAddress(grant.uid)
        )
      );
      errorManager(`Error deleting grant ${grant.uid}`, error);
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
          <b>{grant.details?.data?.title || shortAddress(grant.uid)}</b> grant?
        </p>
      }
    />
  );
};
