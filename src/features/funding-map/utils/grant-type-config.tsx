import { ArrowDownToDot, Code, FastForward, IterationCw, Trophy, Vote } from "lucide-react";

export interface GrantTypeConfig {
  icon: React.ReactNode;
  color: string;
}

interface GetGrantTypeConfigOptions {
  iconSize?: "xs" | "sm" | "md" | "lg";
  strokeWidth?: number;
}

const ICON_SIZES = {
  xs: "h-3 w-3", // 12px
  sm: "h-3.5 w-3.5", // 14px
  md: "h-4 w-4", // 16px
  lg: "h-5 w-5", // 20px
} as const;

/**
 * Returns the icon and color configuration for a given grant type.
 * @param type - The grant type name
 * @param options - Configuration options including icon size and stroke width
 */
export function getGrantTypeConfig(
  type: string,
  options: GetGrantTypeConfigOptions = {}
): GrantTypeConfig | null {
  const { iconSize = "xs", strokeWidth = 2 } = options;
  const sizeClass = ICON_SIZES[iconSize];

  switch (type) {
    case "Direct Grants":
      return {
        icon: (
          <ArrowDownToDot
            className={sizeClass}
            style={{ color: "#365cf4" }}
            strokeWidth={strokeWidth}
          />
        ),
        color: "#365cf4",
      };
    case "Bounties":
      return {
        icon: <Code className={sizeClass} style={{ color: "#f050b5" }} strokeWidth={strokeWidth} />,
        color: "#f050b5",
      };
    case "Retro Funding":
      return {
        icon: (
          <IterationCw
            className={sizeClass}
            style={{ color: "#ff9757" }}
            strokeWidth={strokeWidth}
          />
        ),
        color: "#ff9757",
      };
    case "Hackathons":
      return {
        icon: (
          <Trophy className={sizeClass} style={{ color: "#54ba40" }} strokeWidth={strokeWidth} />
        ),
        color: "#54ba40",
      };
    case "Quadratic Funding":
      return {
        icon: <Vote className={sizeClass} style={{ color: "#963ffb" }} strokeWidth={strokeWidth} />,
        color: "#963ffb",
      };
    case "Accelerators":
      return {
        icon: (
          <FastForward
            className={sizeClass}
            style={{ color: "#bfb801" }}
            strokeWidth={strokeWidth}
          />
        ),
        color: "#bfb801",
      };
    default:
      return null;
  }
}
