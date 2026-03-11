import type { TenantId, TenantTheme } from "../types/tenant";

export function getBaseTheme(): TenantTheme {
  return {
    mode: "light",
    colors: {
      primary: "#1de9b6",
      primaryDark: "#139f71",
      primaryLight: "#1de9b6",
      secondary: "#666666",
      background: "#ffffff",
      foreground: "#000000",
      mutedForeground: "#737373",
      buttontext: "#ffffff",
      border: "#eaeaea",
      success: "#0cad00",
      warning: "#f5a623",
      error: "#ee0000",
    },
    fonts: {
      sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      mono: ["Fira Code", "Monaco", "Consolas", "monospace"],
    },
    radius: {
      small: "0.25rem",
      medium: "0.5rem",
      large: "0.75rem",
    },
  };
}

const tenantThemes: Record<string, Partial<TenantTheme>> = {
  optimism: {
    colors: {
      primary: "#FF0420",
      primaryDark: "#CC0000",
      primaryLight: "#FF3333",
      secondary: "#FF6666",
      background: "#ffffff",
      foreground: "#000000",
      mutedForeground: "#737373",
      buttontext: "#ffffff",
      border: "#FFE5E5",
      success: "#0cad00",
      warning: "#f5a623",
      error: "#ee0000",
    },
    radius: { small: "0.375rem", medium: "0.75rem", large: "1rem" },
  },
  arbitrum: {
    colors: {
      primary: "#12AAFF",
      primaryDark: "#0088CC",
      primaryLight: "#45BBFF",
      secondary: "#28A0F0",
      background: "#ffffff",
      foreground: "#000000",
      mutedForeground: "#737373",
      buttontext: "#ffffff",
      border: "#E5F4FF",
      success: "#0cad00",
      warning: "#f5a623",
      error: "#ee0000",
    },
  },
  celo: {
    colors: {
      primary: "#d49f0f",
      primaryDark: "#89670A",
      primaryLight: "#F2FF86",
      secondary: "#FCFF52",
      background: "#ffffff",
      foreground: "#000000",
      mutedForeground: "#737373",
      buttontext: "#ffffff",
      border: "#E5F7ED",
      success: "#FFF600",
      warning: "#FCFF52",
      error: "#ee0000",
    },
    radius: { small: "0.125rem", medium: "0.25rem", large: "0.5rem" },
  },
  polygon: {
    colors: {
      primary: "#8247E5",
      primaryDark: "#6B38C2",
      primaryLight: "#9D68F0",
      secondary: "#A78BFA",
      background: "#ffffff",
      foreground: "#000000",
      mutedForeground: "#737373",
      buttontext: "#ffffff",
      border: "#E9E3FF",
      success: "#0cad00",
      warning: "#f5a623",
      error: "#ee0000",
    },
  },
  scroll: {
    colors: {
      primary: "#EBC28E",
      primaryDark: "#FF684B",
      primaryLight: "#FFEEDA",
      secondary: "#595959",
      background: "#FFF8F3",
      foreground: "#000000",
      mutedForeground: "#737373",
      buttontext: "#190602",
      border: "#FFDEB5",
      success: "#0F8E7E",
      warning: "#F18740",
      error: "#DC3347",
    },
  },
  celopg: {
    colors: {
      primary: "#d49f0f",
      primaryDark: "#89670A",
      primaryLight: "#F2FF86",
      secondary: "#FCFF52",
      background: "#ffffff",
      foreground: "#000000",
      mutedForeground: "#737373",
      buttontext: "#ffffff",
      border: "#E5F7ED",
      success: "#FFF600",
      warning: "#FCFF52",
      error: "#ee0000",
    },
    radius: { small: "0.125rem", medium: "0.25rem", large: "0.5rem" },
  },
  "regen-coordination": {
    colors: {
      primary: "#f19066",
      primaryDark: "#f3a683",
      primaryLight: "#f5cd79",
      secondary: "#FCFF52",
      background: "#ffffff",
      foreground: "#000000",
      mutedForeground: "#737373",
      buttontext: "#ffffff",
      border: "#E5F7ED",
      success: "#FFF600",
      warning: "#FCFF52",
      error: "#ee0000",
    },
    radius: { small: "0.125rem", medium: "0.25rem", large: "0.5rem" },
  },
  "localism-fund": {
    colors: {
      primary: "#61a13a",
      primaryDark: "#61a13a",
      primaryLight: "#61a13a",
      secondary: "#FCFF52",
      background: "#ffffff",
      foreground: "#000000",
      mutedForeground: "#737373",
      buttontext: "#e9ff5e",
      border: "#E5F7ED",
      success: "#FFF600",
      warning: "#FCFF52",
      error: "#ee0000",
    },
    radius: { small: "0.125rem", medium: "0.25rem", large: "0.5rem" },
  },
  filecoin: {
    colors: {
      primary: "#0090ff",
      primaryDark: "#0090ff",
      primaryLight: "#0090ff",
      secondary: "#FCFF52",
      background: "#ffffff",
      foreground: "#000000",
      mutedForeground: "#737373",
      buttontext: "#ffffff",
      border: "#E5F7ED",
      success: "#FFF600",
      warning: "#FCFF52",
      error: "#ee0000",
    },
    radius: { small: "0.125rem", medium: "0.25rem", large: "0.5rem" },
  },
  "for-the-world": {
    colors: {
      primary: "#898989",
      primaryDark: "#6a6a6a",
      primaryLight: "#a8a8a8",
      secondary: "#b0b0b0",
      background: "#ffffff",
      foreground: "#000000",
      mutedForeground: "#737373",
      buttontext: "#ffffff",
      border: "#e0e0e0",
      success: "#0cad00",
      warning: "#f5a623",
      error: "#ee0000",
    },
  },
};

export function getTenantTheme(tenantId: TenantId): TenantTheme {
  if (!tenantThemes[tenantId]) {
    return getBaseTheme();
  }
  return mergeThemes(getBaseTheme(), tenantThemes[tenantId]);
}

export function mergeThemes(
  baseTheme: TenantTheme,
  partialTheme: Partial<TenantTheme>
): TenantTheme {
  return {
    mode: partialTheme.mode || baseTheme.mode,
    colors: { ...baseTheme.colors, ...(partialTheme.colors || {}) },
    fonts: { ...baseTheme.fonts, ...(partialTheme.fonts || {}) },
    radius: { ...baseTheme.radius, ...(partialTheme.radius || {}) },
  };
}
