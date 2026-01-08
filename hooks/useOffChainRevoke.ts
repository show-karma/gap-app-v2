import { useAttestationToast } from "@/hooks/useAttestationToast";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

interface UseOffChainRevokeOptions {
  uid: `0x${string}`;
  chainID: number;
  checkIfExists?: () => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  toastMessages?: {
    success: string;
    loading: string;
  };
}

export const useOffChainRevoke = () => {
  const { showLoading, showSuccess, showError, dismiss } = useAttestationToast();

  const performOffChainRevoke = async ({
    uid,
    chainID,
    checkIfExists,
    onSuccess,
    onError,
    toastMessages,
  }: UseOffChainRevokeOptions): Promise<boolean> => {
    showLoading(toastMessages?.loading || "Revoking attestation...");
    try {
      const res = await fetchData(INDEXER.PROJECT.REVOKE_ATTESTATION(uid, chainID), "POST", {});

      if (res[1]) {
        showError(res[1]);
        onError?.(res[1]);
        return false;
      }

      await checkIfExists?.();

      if (toastMessages?.success) {
        showSuccess(toastMessages.success);
      } else {
        dismiss();
      }

      onSuccess?.();
      return true;
    } catch (error) {
      dismiss();
      onError?.(error);
      return false;
    }
  };

  return { performOffChainRevoke };
};
