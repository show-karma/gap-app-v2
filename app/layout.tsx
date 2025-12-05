import { SpeedInsights } from "@vercel/speed-insights/next";
import { defaultMetadata } from "@/utilities/meta";
import "@/styles/globals.css";
import "@/styles/index.scss";
import "@/components/Utilities/DynamicStars/styles.css";
import "rc-slider/assets/index.css";
import "react-day-picker/dist/style.css";
import "@uiw/react-markdown-preview/markdown.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { ContributorProfileDialog } from "@/components/Dialogs/ContributorProfileDialog";
import { OnboardingDialog } from "@/components/Dialogs/OnboardingDialog";
import { StepperDialog } from "@/components/Dialogs/StepperDialog";
import { ProgressBarWrapper } from "@/components/ProgressBarWrapper";
import HotjarAnalytics from "@/components/Utilities/HotjarAnalytics";
import { PermissionsProvider } from "@/components/Utilities/PermissionsProvider";
import PrivyProviderWrapper from "@/components/Utilities/PrivyProviderWrapper";
import { Footer } from "@/src/components/footer/footer";
import { Navbar } from "@/src/components/navbar/navbar";

export const metadata = defaultMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      {process.env.NEXT_PUBLIC_GA_TRACKING_ID && process.env.NEXT_PUBLIC_ENV === "production" && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_TRACKING_ID as string} />
      )}
      <Suspense>
        <HotjarAnalytics />
      </Suspense>
      <body suppressHydrationWarning>
        <ThemeProvider
          defaultTheme="light"
          attribute="class"
          enableSystem={true}
          disableTransitionOnChange
        >
          <PrivyProviderWrapper>
            <PermissionsProvider />
            <Toaster
              position="top-right"
              toastOptions={{
                className: "toast-content",
                style: {
                  maxWidth: "500px",
                  wordWrap: "break-word",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                },
                duration: 4000,
              }}
              containerStyle={{
                maxWidth: "500px",
              }}
            />
            <StepperDialog />
            <Suspense fallback={null}>
              <ContributorProfileDialog />
            </Suspense>
            <OnboardingDialog />
            <ProgressBarWrapper />
            <div className="min-h-screen flex flex-col justify-between h-full text-gray-700 bg-white dark:bg-black dark:text-white">
              <div className="flex flex-col w-full h-full">
                <Navbar />
                <div className="h-[80px]" />
                {children}
                <Analytics />
              </div>
              <Footer />
            </div>
          </PrivyProviderWrapper>
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
