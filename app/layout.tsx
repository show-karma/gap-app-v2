import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Viewport } from "next";
import localFont from "next/font/local";
import { defaultMetadata } from "@/utilities/meta";
import "@/styles/globals.css";
import "@/styles/index.scss";
import "@/components/Utilities/DynamicStars/styles.css";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { OrganizationJsonLd } from "@/components/Seo/OrganizationJsonLd";
import HotjarAnalytics from "@/components/Utilities/HotjarAnalytics";

const inter = localFont({
  src: "../public/fonts/Inter/Inter.var.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

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
    <html lang="en" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://gapapi.karmahq.xyz" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://static.cloudflareinsights.com" />
      </head>
      {process.env.NEXT_PUBLIC_GA_TRACKING_ID && process.env.NEXT_PUBLIC_ENV === "production" && (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_TRACKING_ID}`}
          strategy="lazyOnload"
        />
      )}
      {process.env.NEXT_PUBLIC_GA_TRACKING_ID && process.env.NEXT_PUBLIC_ENV === "production" && (
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_TRACKING_ID}');
          `}
        </Script>
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
          {children}
          <SpeedInsights />
        </ThemeProvider>
        <OrganizationJsonLd />
      </body>
    </html>
  );
}
