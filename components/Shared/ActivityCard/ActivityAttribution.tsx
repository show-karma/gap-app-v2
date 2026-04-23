import EthereumAddressToProfileName from "@/components/EthereumAddressToProfileName";
import { formatDate } from "@/utilities/formatDate";

interface ActivityAttributionProps {
  date: number | string;
  attester?: string;
  actions?: React.ReactNode;
  isCompleted?: boolean;
}

export const ActivityAttribution = ({
  date,
  attester,
  actions,
  isCompleted = false,
}: ActivityAttributionProps) => {
  return (
    <div className="flex flex-col gap-2 w-full border-t px-5 py-3">
      {/* Attribution line with actions */}
      <div className="flex flex-row gap-x-4 gap-y-2 items-center justify-between w-full flex-wrap">
        <div className="flex flex-row gap-4 items-center flex-wrap">
          <div className="flex flex-col items-start gap-0">
            {attester && (
              <p className="text-sm text-center font-semibold text-foreground max-2xl:text-[13px]">
                <EthereumAddressToProfileName
                  address={attester}
                  showProfilePicture
                  pictureClassName="h-8 w-8 min-h-8 min-w-8 max-h-8 max-w-8 rounded-full border-1"
                />
              </p>
            )}
            <p className="text-muted-foreground text-sm font-medium">
              {isCompleted ? "Completed on" : "Created on"} {formatDate(date)}
            </p>
          </div>
        </div>

        {/* Actions on the right side */}
        {actions && <div className="flex flex-row gap-2">{actions}</div>}
      </div>
    </div>
  );
};
