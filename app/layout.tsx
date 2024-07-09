import { defaultMetadata } from "@/utilities/meta";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/globals.css";
import "@/styles/index.scss";
import "@/components/Utilities/DynamicStars/styles.css";
import "@rainbow-me/rainbowkit/styles.css";
import "rc-slider/assets/index.css";
import "react-day-picker/dist/style.css";
import "@uiw/react-markdown-preview/markdown.css";
import Footer from "@/components/Utilities/Footer";
import Header from "@/components/Utilities/Header";
import { Toaster } from "react-hot-toast";
import WagmiProvider from "@/components/Utilities/WagmiProvider";
import { StepperDialog } from "@/components/Dialogs/StepperDialog";
import { ProgressBarWrapper } from "@/components/ProgressBarWrapper";
import { ThemeProvider } from "next-themes";

export const metadata = defaultMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
