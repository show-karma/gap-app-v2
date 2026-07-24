import { renderRelativeTime } from "@/utilities/formatRelativeTime";

interface RelativeTimeProps {
  value: string | Date;
  className?: string;
}

/**
 * Component form of renderRelativeTime, for use directly inside JSX (avoids
 * inline render-function calls during render).
 */
export function RelativeTime({ value, className = "cursor-default" }: RelativeTimeProps) {
  return renderRelativeTime(value, className);
}
