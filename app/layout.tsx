import { defaultMetadata } from "@/utilities/meta";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/globals.css";
import "@/styles/index.scss";
import "@/components/Utilities/DynamicStars/styles.css";
import "rc-slider/assets/index.css";
import "react-day-picker/dist/style.css";
import "@uiw/react-markdown-preview/markdown.css";
import Footer from "@/components/Utilities/Footer";
import Header from "@/components/Utilities/Header";
import { Toaster } from "react-hot-toast";
import Web3Provider from "@/components/Utilities/Web3Provider";
import { StepperDialog } from "@/components/Dialogs/StepperDialog";
import { ProgressBarWrapper } from "@/components/ProgressBarWrapper";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";

export const metadata = defaultMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" style={{ scrollBehavior: "smooth" }}>
      {process.env.NEXT_PUBLIC_GA_TRACKING_ID &&
        process.env.NEXT_PUBLIC_ENV === "production" && (
          <GoogleAnalytics
            gaId={process.env.NEXT_PUBLIC_GA_TRACKING_ID as string}
          />
        )}
      <body>
        <ThemeProvider defaultTheme="light" attribute="class">
          <Web3Provider>
            <Toaster />
            <StepperDialog />
            <ProgressBarWrapper />
            <div className="min-h-screen flex flex-col justify-between h-full text-gray-700 bg-white dark:bg-black dark:text-white">
              <div>
                <div className="fixed w-full bg-white dark:bg-black z-10">
                  <Header />
                </div>
                <div className="h-[72px] w-full" />
                {children}
                <Analytics />
              </div>
              <Footer />
            </div>
          </Web3Provider>
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
