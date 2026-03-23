"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full"
      aria-label={`Toggle theme to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
