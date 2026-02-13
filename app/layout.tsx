import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Viewport } from "next";
import { defaultMetadata } from "@/utilities/meta";
import "@/styles/globals.css";
import "@/styles/index.scss";
import "@/components/Utilities/DynamicStars/styles.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { LazyDialogs } from "@/components/Dialogs/LazyDialogs";
import { ProgressBarWrapper } from "@/components/ProgressBarWrapper";
import { OrganizationJsonLd } from "@/components/Seo/OrganizationJsonLd";
import HotjarAnalytics from "@/components/Utilities/HotjarAnalytics";
import { PermissionsProvider } from "@/components/Utilities/PermissionsProvider";
import PrivyProviderWrapper from "@/components/Utilities/PrivyProviderWrapper";
import { Footer } from "@/src/components/footer/footer";
import { Navbar } from "@/src/components/navbar/navbar";

export const metadata = defaultMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://gapapi.karmahq.xyz" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://static.cloudflareinsights.com" />
        <link
          rel="preload"
          href="/fonts/Inter/Inter.var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
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
                top: 20,
                right: 20,
              }}
            />
            <LazyDialogs />
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
        <OrganizationJsonLd />
      </body>
    </html>
  );
}
