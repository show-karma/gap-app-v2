import { mintInteractionLabels } from "@/utilities/hypercerts/chainInteractions";
import { useParseBlockchainError } from "@/utilities/hypercerts/parse-blockchain-error";
import { HypercertMetadata, TransferRestrictions } from "@hypercerts-org/sdk";
import toast from "react-hot-toast";
import { useHypercertClient } from "./useHypercertClient";
import { useState } from "react";
import { usePublicClient } from "wagmi";

export const useMintClaim = ({ onComplete }: { onComplete?: () => void }) => {
  const [status, setStatus] = useState<
    "preparing" | "minting" | "waiting" | "complete"
  >("preparing");
  const [txPending, setTxPending] = useState(false);

  const { client, isLoading } = useHypercertClient();
  const publicClient = usePublicClient();

  const statusDescriptions = {
    preparing: "Preparing to mint hypercert",
    minting: "Minting hypercert on-chain",
    waiting: "Awaiting confirmation",
    complete: "Done minting",
  };

  const parseError = useParseBlockchainError();

  const initializeWrite = async (
    metaData: HypercertMetadata,
    units: number,
    transferRestrictions: TransferRestrictions
  ) => {
    setStatus("minting");
    try {
      setTxPending(true);

      if (!client) {
        toast.error("No client found");
        return;
      }

      const hash = await client.mintClaim(
        metaData,
        BigInt(units),
        transferRestrictions
      );

      if (!hash) {
        toast.error("No tx hash returned");
        return;
      }

      const receipt = await publicClient?.waitForTransactionReceipt({
        confirmations: 3,
        hash,
      });

      setStatus("waiting");

      if (receipt?.status === "reverted") {
        toast.error("Minting failed");
        console.error(receipt);
      }
      if (receipt?.status === "success") {
        toast.success(mintInteractionLabels.toastSuccess);

        setStatus("complete");
        onComplete?.();
      }
    } catch (error) {
      toast.error(parseError(error, mintInteractionLabels.toastError));
      console.error(error);
    } finally {
      setTxPending(false);
    }
  };

  return {
    write: async (
      metaData: HypercertMetadata,
      units: number,
      transferRestrictions: TransferRestrictions = TransferRestrictions.FromCreatorOnly
    ) => {
      setStatus("preparing");
      await initializeWrite(metaData, units, transferRestrictions);
    },
    txPending,
    status,
    readOnly: isLoading || !client || client.readonly,
  };
};
