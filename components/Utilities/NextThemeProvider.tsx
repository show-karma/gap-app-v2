"use client";
import { ThemeProvider } from "next-themes";
const NextThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      {children}
    </ThemeProvider>
  );
};
export default NextThemeProvider;
