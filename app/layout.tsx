import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Viewport } from "next";
import { Inter } from "next/font/google";
import { DeferredGoogleAnalytics } from "@/components/Utilities/DeferredGoogleAnalytics";
import { DeferredHotjarAnalytics } from "@/components/Utilities/DeferredHotjarAnalytics";
import { defaultMetadata } from "@/utilities/meta";
import "@/styles/globals.css";
import "@/styles/index.scss";
import "@/components/Utilities/DynamicStars/styles.css";
import { ThemeProvider } from "next-themes";
import { OrganizationJsonLd } from "@/components/Seo/OrganizationJsonLd";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
        <DeferredGoogleAnalytics trackingId={process.env.NEXT_PUBLIC_GA_TRACKING_ID} />
      )}
      <DeferredHotjarAnalytics />
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
