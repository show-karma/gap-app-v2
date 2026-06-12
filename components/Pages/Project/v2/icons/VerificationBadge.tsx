import { InfoTooltip } from "@/components/Utilities/InfoTooltip";
import { cn } from "@/utilities/tailwind";

interface VerificationBadgeProps {
  className?: string;
  "data-testid"?: string;
  "aria-label"?: string;
  /** Custom tooltip text. Defaults to "This project has received grant funding" */
  tooltipText?: string;
  /** Whether to show the tooltip. Defaults to true */
  showTooltip?: boolean;
}

/**
 * VerificationBadge displays a custom badge icon for verified projects.
 * Uses a seal/badge shape with a checkmark inside.
 * Includes a tooltip explaining why the project has this badge.
 */
export function VerificationBadge({
  className,
  "data-testid": dataTestId,
  "aria-label": ariaLabel = "Verified project",
  tooltipText = "This project has received grant funding",
  showTooltip = true,
}: VerificationBadgeProps) {
  const badgeIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("shrink-0", className)}
      data-testid={dataTestId}
      aria-label={ariaLabel}
      role="img"
    >
      <path
        d="M3.85 8.62C3.7 7.96 3.73 7.28 3.92 6.63C4.1 5.99 4.45 5.4 4.93 4.92C5.41 4.45 6 4.1 6.64 3.91C7.29 3.72 7.97 3.7 8.63 3.85C8.99 3.28 9.49 2.82 10.08 2.5C10.67 2.17 11.33 2 12 2C12.67 2 13.33 2.17 13.92 2.5C14.51 2.82 15.01 3.28 15.37 3.85C16.03 3.7 16.71 3.72 17.36 3.91C18.01 4.1 18.6 4.45 19.08 4.92C19.55 5.4 19.9 5.99 20.09 6.64C20.28 7.29 20.3 7.97 20.15 8.63C20.72 8.99 21.18 9.49 21.5 10.08C21.83 10.67 22 11.33 22 12C22 12.67 21.83 13.33 21.5 13.92C21.18 14.51 20.72 15.01 20.15 15.37C20.3 16.03 20.28 16.71 20.09 17.36C19.9 18 19.55 18.59 19.08 19.07C18.6 19.55 18.01 19.9 17.37 20.08C16.72 20.27 16.04 20.3 15.38 20.15C15.02 20.72 14.52 21.19 13.93 21.51C13.34 21.83 12.68 22 12.01 22C11.33 22 10.67 21.83 10.08 21.51C9.49 21.19 8.99 20.72 8.63 20.15C7.97 20.3 7.29 20.28 6.64 20.09C6 19.9 5.41 19.55 4.93 19.08C4.45 18.6 4.1 18.01 3.92 17.37C3.73 16.72 3.7 16.04 3.85 15.38C3.28 15.02 2.81 14.52 2.49 13.93C2.16 13.34 1.99 12.67 1.99 12C1.99 11.33 2.16 10.66 2.49 10.07C2.81 9.48 3.28 8.98 3.85 8.62Z"
        stroke="#10B981"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12L11 14L15 10"
        stroke="#10B981"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (!showTooltip) {
    return badgeIcon;
  }

  return (
    <InfoTooltip
      content={tooltipText}
      side="bottom"
      align="center"
      delayDuration={200}
      triggerAsChild
    >
      <span className="inline-flex cursor-help">{badgeIcon}</span>
    </InfoTooltip>
  );
}
