import { TrashIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { DeleteDialog } from "@/components/DeleteDialog";
import { errorManager } from "@/components/Utilities/errorManager";
import { useGap } from "@/hooks/useGap";
import { useOffChainRevoke } from "@/hooks/useOffChainRevoke";
import { useWallet } from "@/hooks/useWallet";
import { useProjectGrants } from "@/hooks/v2/useProjectGrants";
import { useOwnerStore, useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { useSetupChainAndWallet } from "@/hooks/useSetupChainAndWallet";
import type { Grant } from "@/types/v2/grant";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { PAGES } from "@/utilities/pages";
import { retryUntilConditionMet } from "@/utilities/retries";
import { shortAddress } from "@/utilities/shortAddress";

interface GrantDeleteProps {
  grant: Grant;
}

export const GrantDelete: FC<GrantDeleteProps> = ({ grant }) => {
  const [isDeletingGrant, setIsDeletingGrant] = useState(false);
  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const { setupChainAndWallet } = useSetupChainAndWallet();

  const { changeStepperStep, setIsStepper } = useStepper();

  const { project, isProjectOwner } = useProjectStore();
  const { refetch: refetchGrants, grants } = useProjectGrants(project?.uid || "");
  const { isOwner: isContractOwner } = useOwnerStore();
  const isOnChainAuthorized = isProjectOwner || isContractOwner;
  const { gap } = useGap();
  const { performOffChainRevoke } = useOffChainRevoke();

  const router = useRouter();

  const deleteFn = async () => {
    if (!address) return;
    setIsDeletingGrant(true);
    try {
      const setup = await setupChainAndWallet({
        targetChainId: grant.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!setup) {
        setIsDeletingGrant(false);
        return;
      }

      const { walletSigner, gapClient, chainId: actualChainId } = setup;
      const grantUID = grant.uid;
      const instanceProject = await gapClient.fetch.projectById(project?.uid);
      const grantInstance = instanceProject?.grants.find(
        (item) => item.uid.toLowerCase() === grantUID.toLowerCase()
      );
      if (!grantInstance) return;
      const checkIfAttestationExists = async (callbackFn?: () => void) => {
        await retryUntilConditionMet(
          async () => {
            const { data: fetchedGrants } = await refetchGrants();
            const stillExist = fetchedGrants?.find(
              (g) => g.uid?.toLowerCase() === grantUID?.toLowerCase()
            );
            if (!stillExist) {
              if (fetchedGrants && fetchedGrants.length > 0) {
                router.push(PAGES.PROJECT.GRANTS(project?.uid || project?.details?.slug || ""));
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
        await performOffChainRevoke({
          uid: grantUID as `0x${string}`,
          chainID: grantInstance.chainID,
          checkIfExists: checkIfAttestationExists,
          onSuccess: () => {
            changeStepperStep("indexed");
          },
          toastMessages: {
            success: MESSAGES.GRANT.DELETE.SUCCESS,
            loading: MESSAGES.GRANT.DELETE.LOADING,
          },
        });
      } else {
        try {
          const res = await grantInstance.revoke(walletSigner, changeStepperStep);
          changeStepperStep("indexing");
          const txHash = res?.tx[0]?.hash;
          if (txHash) {
            await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, grant.chainID), "POST", {});
          }
          await checkIfAttestationExists(() => {
            changeStepperStep("indexed");
            toast.success(MESSAGES.GRANT.DELETE.SUCCESS);
          });
        } catch (onChainError: any) {
          // Silently fallback to off-chain revoke
          setIsStepper(false); // Reset stepper since we're falling back

          const success = await performOffChainRevoke({
            uid: grantUID as `0x${string}`,
            chainID: grantInstance.chainID,
            checkIfExists: checkIfAttestationExists,
            onSuccess: () => {
              changeStepperStep("indexed");
            },
            toastMessages: {
              success: MESSAGES.GRANT.DELETE.SUCCESS,
              loading: MESSAGES.GRANT.DELETE.LOADING,
            },
          });

          if (!success) {
            // Both methods failed - throw the original error to maintain expected behavior
            throw onChainError;
          }
        }
      }
    } catch (error: any) {
      errorManager(
        MESSAGES.GRANT.DELETE.ERROR(grant.details?.title || shortAddress(grant.uid)),
        error,
        { grantUID: grant.uid, address },
        {
          error: MESSAGES.GRANT.DELETE.ERROR(grant.details?.title || shortAddress(grant.uid)),
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
        styleClass: "bg-transparent text-red-500 p-1 px-2 hover:opacity-75 hover:bg-transparent",
      }}
      title={
        <p className="font-normal">
          Are you sure you want to delete <b>{grant.details?.title || shortAddress(grant.uid)}</b>{" "}
          grant?
        </p>
      }
    />
  );
};
