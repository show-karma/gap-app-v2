import { getExplorerUrl } from "@/config/network";
import { ExternalLink } from "./external-link";

export function TransactionLink({
  transactionHash,
  chainId,
}: {
  transactionHash: string;
  chainId: number;
}) {
  return (
    <ExternalLink href={getExplorerUrl(chainId, transactionHash)}>
      <span className="hover:underline">
        {transactionHash.slice(0, 6) + "..." + transactionHash.slice(-4)}
      </span>
    </ExternalLink>
  );
}
