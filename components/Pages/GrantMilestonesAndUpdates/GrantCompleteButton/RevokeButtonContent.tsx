import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { Spinner } from "@/components/ui/spinner";

interface RevokeButtonContentProps {
  isRevoking: boolean;
}

export const RevokeButtonContent: React.FC<RevokeButtonContentProps> = ({
  isRevoking,
}) => {
  if (isRevoking) {
    return (
      <>
        <Spinner className="h-5 w-5" />
        <span>Revoking...</span>
      </>
    );
  }

  return (
    <>
      <span className="group-hover:hidden">Marked as complete</span>
      <span className="hidden group-hover:inline">Revoke completion</span>
      <div className="h-5 w-5">
        <CheckCircleIcon className="h-5 w-5 group-hover:hidden" />
        <XCircleIcon className="h-5 w-5 hidden group-hover:block" />
      </div>
    </>
  );
};

