import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Spectral } from "next/font/google";
import localFont from "next/font/local";
import { defaultMetadata } from "@/utilities/meta";

// Single self-hosted Inter variable font (next/font/local), same as the rest
// of the app. The woff2 is loaded and processed once; the tailwind `display`
// family points straight at --font-inter, so the marketing H1/H2 share it.
const inter = localFont({
  src: "../public/fonts/Inter/Inter.woff2",
  variable: "--font-inter",
  display: "optional",
  weight: "100 900",
});

// Editorial display face for marketing H1 and section H2. Spectral
// (Production Type) is a literary serif with real italic cuts — the
// rotating word in the hero becomes proper cursive instead of slanted
// sans. Paired with Inter as body, it carries the "modern, opinionated,
// trustworthy with warmth" direction without going corporate.
const displayFont = Spectral({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

// Measurement font for the AI-Readiness Scanner (gauge numerics, per-check
// evidence, score/100 fractions). Inter remains the body font; mono is
// reserved for values that should read as instrument output, not prose.
const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});
import "@/styles/globals.css";
import "@/styles/index.scss";
import "@/components/Utilities/DynamicStars/styles.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { TenantChrome, TenantChromeFallback } from "@/src/components/layout/tenant-chrome";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

export async function generateMetadata(): Promise<Metadata> {
  const { isWhitelabel, config, tenantConfig } = await getWhitelabelContext();

  if (isWhitelabel && tenantConfig) {
    return {
      title: {
        default: tenantConfig.seo.title,
        template: `%s | ${tenantConfig.name}`,
      },
      description: tenantConfig.seo.description,
      keywords: tenantConfig.seo.keywords,
      metadataBase: config?.domain ? new URL(`https://${config.domain}`) : undefined,
      alternates: { canonical: "/" },
      icons: { icon: tenantConfig.assets.favicon },
    };
  }

  if (isWhitelabel && config) {
    return {
      title: {
        default: `${config.name} Grants`,
        template: `%s | ${config.name}`,
      },
      description: `Explore grants and grantee updates from ${config.name}.`,
      metadataBase: new URL(`https://${config.domain}`),
      alternates: { canonical: "/" },
      icons: { icon: "/favicon.ico" },
    };
  }

  return {
    ...defaultMetadata,
    manifest: "/manifest.json",
    icons: {
      icon: [{ url: "/favicon.ico", sizes: "48x48" }],
      apple: [{ url: "/favicon.ico" }],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// Request-independent by design: nothing here awaits headers(), so the App
// Shell — <html>, the fonts, <body>, the theme provider — is the same for every
// route and every host. Everything host-dependent lives in TenantChrome, one
// Suspense boundary down, and streams into the document below.
// generateMetadata above still awaits headers(); metadata resolves off the
// critical path and does not hold up the shell.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`h-full ${inter.variable} ${displayFont.variable} ${monoFont.variable}`}
      suppressHydrationWarning
    >
      {process.env.NEXT_PUBLIC_GA_TRACKING_ID && process.env.NEXT_PUBLIC_ENV === "production" && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_TRACKING_ID as string} />
      )}
      <link rel="preconnect" href={process.env.NEXT_PUBLIC_GAP_INDEXER_URL} />
      <link rel="dns-prefetch" href="https://auth.privy.io" />
      <link rel="dns-prefetch" href="https://explorer-api.walletconnect.com" />
      <link rel="dns-prefetch" href="https://browser.sentry-cdn.com" />
      <body suppressHydrationWarning>
        <ThemeProvider
          defaultTheme="light"
          attribute="class"
          enableSystem={true}
          disableTransitionOnChange
        >
          <Suspense fallback={<TenantChromeFallback />}>
            <TenantChrome>{children}</TenantChrome>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
