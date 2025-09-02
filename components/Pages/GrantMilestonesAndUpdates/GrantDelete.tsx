import { DeleteDialog } from "@/components/DeleteDialog";
import { errorManager } from "@/components/Utilities/errorManager";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useWallet } from "@/hooks/useWallet";
import { useOwnerStore, useProjectStore } from "@/store";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import { useStepper } from "@/store/modals/txStepper";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { retryUntilConditionMet } from "@/utilities/retries";
import { shortAddress } from "@/utilities/shortAddress";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
import { TrashIcon } from "@heroicons/react/24/outline";
import { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useRouter } from "next/navigation";

import { useQueryState } from "nuqs";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";

interface GrantDeleteProps {
  grant: IGrantResponse;
}

export const GrantDelete: FC<GrantDeleteProps> = ({ grant }) => {
  const [isDeletingGrant, setIsDeletingGrant] = useState(false);
  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();

  const refreshProject = useProjectStore((state) => state.refreshProject);

  const { changeStepperStep, setIsStepper } = useStepper();

  const { project, isProjectOwner } = useProjectStore();
  const { isOwner: isContractOwner } = useOwnerStore();
  const isOnChainAuthorized = isProjectOwner || isContractOwner;
  const { gap } = useGap();

  const router = useRouter();

  const deleteFn = async () => {
    if (!address) return;
    setIsDeletingGrant(true);
    let gapClient = gap;
    try {
      const { success, chainId: actualChainId, gapClient: newGapClient } = await ensureCorrectChain({
        targetChainId: grant.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsDeletingGrant(false);
        return;
      }

      gapClient = newGapClient;

      const { walletClient, error } = await safeGetWalletClient(actualChainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }
      if (!walletClient || !gapClient) return;
      const walletSigner = await walletClientToSigner(walletClient);
      const grantUID = grant.uid;
      const instanceProject = await gapClient.fetch.projectById(project?.uid);
      const grantInstance = instanceProject?.grants.find(
        (item) => item.uid.toLowerCase() === grantUID.toLowerCase()
      );
      if (!grantInstance) return;
      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const fetchedProject = await refreshProject();
            const stillExist = fetchedProject?.grants.find(
              (g) => g.uid?.toLowerCase() === grantUID?.toLowerCase()
            );
            if (!stillExist) {
              if (
                fetchedProject?.grants &&
                fetchedProject?.grants?.length > 0
              ) {
                router.push(
                  PAGES.PROJECT.GRANTS(
                    project?.uid || project?.details?.data.slug || ""
                  )
                );
              }
            }

            return !stillExist;
          },
          () => {
            callbackFn?.();
          }
        );
      };
      if (!isOnChainAuthorized) {
        const toastLoading = toast.loading(MESSAGES.GRANT.DELETE.LOADING);
        await fetchData(
          INDEXER.PROJECT.REVOKE_ATTESTATION(
            grantUID as `0x${string}`,
            grantInstance.chainID
          ),
          "POST",
          {}
        )
          .then(async () => {
            checkIfAttestationExists()
              .then(() => {
                toast.success(MESSAGES.GRANT.DELETE.SUCCESS, {
                  id: toastLoading,
                });
              })
              .catch(() => {
                toast.dismiss(toastLoading);
              });
          })
          .catch(() => {
            toast.dismiss(toastLoading);
          });
      } else {
        await grantInstance
          .revoke(walletSigner, changeStepperStep)
          .then(async (res) => {
            changeStepperStep("indexing");
            const txHash = res?.tx[0]?.hash;
            if (txHash) {
              await fetchData(
                INDEXER.ATTESTATION_LISTENER(txHash, grant.chainID),
                "POST",
                {}
              );
            }
            await checkIfAttestationExists(() => {
              changeStepperStep("indexed");
            }).then(() => {
              toast.success(MESSAGES.GRANT.DELETE.SUCCESS);
              router.push(
                PAGES.PROJECT.GRANTS(
                  project?.uid || project?.details?.data.slug || ""
                )
              );
            });
          });
      }
    } catch (error: any) {
      errorManager(
        MESSAGES.GRANT.DELETE.ERROR(
          grant.details?.data?.title || shortAddress(grant.uid)
        ),
        error,
        { grantUID: grant.uid, address },
        {
          error: MESSAGES.GRANT.DELETE.ERROR(
            grant.details?.data?.title || shortAddress(grant.uid)
          ),
        }
      );
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
