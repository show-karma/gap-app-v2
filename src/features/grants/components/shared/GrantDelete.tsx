import { DeleteDialog } from "@/components/ui/delete-dialog";
import { errorManager } from "@/lib/utils/error-manager";
import { getGapClient, useGap } from "@/hooks/useGap";
import { useWallet } from "@/features/auth/hooks/use-wallet";
import { useProjectStore } from "@/features/projects/lib/store";
import { useOwnerStore } from "@/features/contract-owner/lib/owner";
import { useStepper } from "@/features/modals/lib/stores/txStepper";
import { checkNetworkIsValid } from "@/lib/web3/network-validation";
import { walletClientToSigner } from "@/lib/web3/eas-wagmi-utils";
import { fetchData } from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";
import { MESSAGES } from "@/config/messages";
import { PAGES } from "@/config/pages";
import { retryUntilConditionMet } from "@/lib/utils/retries";
import { shortAddress } from "@/lib/format/address";
import { safeGetWalletClient } from "@/lib/utils/wallet-helpers";
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
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== grant.chainID) {
        await switchChainAsync?.({ chainId: grant.chainID });
        gapClient = getGapClient(grant.chainID);
      }

      const { walletClient, error } = await safeGetWalletClient(grant.chainID);

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
