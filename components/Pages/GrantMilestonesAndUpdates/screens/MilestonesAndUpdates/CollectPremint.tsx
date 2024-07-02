import { createCollectorClient } from "@zoralabs/protocol-sdk";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWriteContract,
} from "wagmi";
import { useState, useEffect } from "react";

export type CollectPremintProps = {
  contractAddress: string;
  uid: number;
};

export default function ZoraCollectPremint({
  contractAddress,
  uid,
}: CollectPremintProps) {
  const chainId = useChainId();
  const publicClient = usePublicClient()!;
  const { address: minterAccount } = useAccount();
  const { writeContract, data: hash, status, error } = useWriteContract();
  const collectorClient = createCollectorClient({ chainId, publicClient });

  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string>("idle");

  async function collectPremint() {
    if (!minterAccount) {
      console.error("No minter account");
      return;
    }

    setTxStatus("pending");

    try {
      const { parameters } = await collectorClient.mint({
        tokenContract: contractAddress as `0x${string}`,
        mintType: "premint",
        uid,
        quantityToMint: 1,
        mintComment: "Neat!!!",
        minterAccount,
      });

      writeContract(parameters);
      setTxHash(hash as string);
      setTxStatus("success");
    } catch (err) {
      console.error("Minting error:", err);
      setTxStatus("error");
    }
  }

  useEffect(() => {
    if (status === "success" && hash) {
      setTxHash(hash);
    }
  }, [status, hash]);

  return (
    <div className="flex">
      {!txHash && (
        <button
          className="px-3 py-2 text-xl w-max h-max text-white transition-all duration-500 bg-gradient-to-tr to-red-400 via-violet-600 from-blue-500 bg-size-200 bg-pos-0 hover:bg-pos-100 rounded-xl shadow-xl"
          onClick={collectPremint}
          disabled={txStatus === "pending"}
        >
          {txStatus === "pending" ? "Minting..." : "Collect Premint"}
        </button>
      )}
      {txStatus === "success" && txHash && (
        <div className="">
          <p className="text-green-500">Mint successful!</p>
          <p>
            Transaction hash:{" "}
            <a
              href={`https://www.onceupon.xyz/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              {txHash.slice(0, 8)}...{txHash.slice(-6)}
            </a>
          </p>
        </div>
      )}
      {txStatus === "error" && (
        <p className="mt-4 text-red-500">Minting failed. Please try again.</p>
      )}
    </div>
  );
}
