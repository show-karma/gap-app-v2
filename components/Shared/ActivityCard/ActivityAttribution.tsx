import { formatDate } from "@/utilities/formatDate";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";

interface ActivityAttributionProps {
  createdAt: number | string;
  attester?: string;
  actions?: React.ReactNode;
  isCompleted?: boolean;
}

export const ActivityAttribution = ({
  createdAt,
  attester,
  actions,
  isCompleted = false,
}: ActivityAttributionProps) => {
  return (
    <div className="flex flex-col gap-2 w-full border-t border-gray-300 dark:border-zinc-400 px-5 py-3">
      {/* Attribution line with actions */}
      <div className="flex flex-row gap-x-4 gap-y-2 items-center justify-between w-full flex-wrap">
        <div className="flex flex-row gap-4 items-center flex-wrap">
          {attester && (
            <EthereumAddressToENSAvatar
              address={attester}
              className="h-8 w-8 min-h-8 min-w-8 max-h-8 max-w-8 rounded-full border-1 border-gray-100 dark:border-zinc-900"
            />
          )}
          <div className="flex flex-col items-start gap-0">
            {attester && (
              <p className="text-sm text-center font-semibold text-black dark:text-zinc-200 max-2xl:text-[13px]">
                <EthereumAddressToENSName address={attester} />
              </p>
            )}
            <p className="text-gray-600 dark:text-zinc-300 text-sm font-medium">
              {isCompleted ? "Completed on" : "Created on"}{" "}
              {formatDate(createdAt)}
            </p>
          </div>
        </div>

        {/* Actions on the right side */}
        {actions && <div className="flex flex-row gap-2">{actions}</div>}
      </div>
    </div>
  );
};
