import { RevokeButtonContent } from "./RevokeButtonContent";

interface GrantCompletedButtonProps {
  onClick: () => void;
  disabled: boolean;
  isRevoking: boolean;
  isAuthorized: boolean;
}

export const GrantCompletedButton: React.FC<GrantCompletedButtonProps> = ({
  onClick,
  disabled,
  isRevoking,
  isAuthorized,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Revoke grant completion"
      aria-busy={isRevoking}
      aria-disabled={disabled}
      className="group relative flex flex-row items-center justify-center gap-2 rounded-md border border-emerald-600 bg-green-100 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:border-red-600 hover:bg-red-100 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={isAuthorized ? "Click to revoke grant completion" : undefined}
    >
      <RevokeButtonContent isRevoking={isRevoking} />
    </button>
  );
};

