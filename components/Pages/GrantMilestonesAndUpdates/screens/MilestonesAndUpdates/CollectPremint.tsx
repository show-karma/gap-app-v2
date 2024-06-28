import { createCollectorClient } from "@zoralabs/protocol-sdk";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWriteContract,
} from "wagmi";

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
  const { writeContract } = useWriteContract();

  const collectorClient = createCollectorClient({ chainId, publicClient });
  async function collectPremint() {
    if (!minterAccount) {
      console.error("No minter account");
      return;
    }
    const { parameters } = await collectorClient.mint({
      tokenContract: contractAddress as `0x${string}`,
      mintType: "premint",
      uid,
      quantityToMint: 1,
      mintComment: "Neat!!!",
      minterAccount,
    });

    writeContract(parameters);
  }
  return (
    <div>
      <button
        className="px-3 py-2 text-xl w-max h-max text-white transition-all duration-500 bg-gradient-to-tr to-red-400 via-violet-600 from-blue-500 bg-size-200 bg-pos-0 hover:bg-pos-100 rounded-xl shadow-xl"
        onClick={collectPremint}
      >
        Collect Premint
      </button>
    </div>
  );
}
