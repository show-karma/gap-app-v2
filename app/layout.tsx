import { StepperDialog } from "@/components/Dialogs/StepperDialog";
import { ProgressBarWrapper } from "@/components/ProgressBarWrapper";
import "@/components/Utilities/DynamicStars/styles.css";
import Footer from "@/components/Utilities/Footer";
import Header from "@/components/Utilities/Header";
import WagmiProvider from "@/components/Utilities/WagmiProvider";
import "@/styles/globals.css";
import "@/styles/index.scss";
import { defaultMetadata } from "@/utilities/meta";
import { GoogleAnalytics } from "@next/third-parties/google";
import "@rainbow-me/rainbowkit/styles.css";
import "@uiw/react-markdown-preview/markdown.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "next-themes";
import { Inter, Open_Sans } from "next/font/google";
import "rc-slider/assets/index.css";
import "react-day-picker/dist/style.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
});

export const metadata = defaultMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${openSans.variable} h-full`}
      style={{ scrollBehavior: "smooth" }}
    >
      {process.env.NEXT_PUBLIC_GA_TRACKING_ID &&
        process.env.NEXT_PUBLIC_ENV === "production" && (
          <GoogleAnalytics
            gaId={process.env.NEXT_PUBLIC_GA_TRACKING_ID as string}
          />
        )}
      <body>
        <ThemeProvider defaultTheme="light" attribute="class">
          <WagmiProvider>
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
          </WagmiProvider>
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
