import toast from "react-hot-toast";
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
  const performOffChainRevoke = async ({
    uid,
    chainID,
    checkIfExists,
    onSuccess,
    onError,
    toastMessages,
  }: UseOffChainRevokeOptions): Promise<boolean> => {
    const toastLoading = toast.loading(toastMessages?.loading || "Revoking attestation...");
    try {
      const res = await fetchData(INDEXER.PROJECT.REVOKE_ATTESTATION(uid, chainID), "POST", {});

      if (res[1]) {
        if (toastLoading) {
          toast.dismiss(toastLoading);
          toast.error(res[1]);
        }
        onError?.(res[1]);
        return false;
      }

      await checkIfExists?.();

      if (toastMessages?.success) {
        toast.success(toastMessages?.success, {
          id: toastLoading!,
        });
      }

      onSuccess?.();
      return true;
    } catch (error) {
      if (toastLoading) {
        toast.dismiss(toastLoading);
      }
      onError?.(error);
      return false;
    }
  };

  return { performOffChainRevoke };
};
