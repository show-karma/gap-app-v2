import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";

/**
 * "Submitting as" footer for the application form. Renders the connected
 * account by name/ENS/self-email rather than a raw wallet address.
 * Extracted so ApplicationSubmission.tsx (an oversized file) doesn't grow.
 */
export function SubmittingAsFooter({ address }: { address?: string }) {
  return (
    <div className="text-xs text-gray-500 dark:text-gray-400">
      Submitting as: <EthereumAddressToProfileName address={address} />
    </div>
  );
}
