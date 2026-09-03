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
import { DeferredLayoutComponents } from "@/components/DeferredLayoutComponents";
import { PermissionsProvider } from "@/components/Utilities/PermissionsProvider";
import PrivyProviderWrapper from "@/components/Utilities/PrivyProviderWrapper";
import {
  TenantFooter,
  TenantJsonLd,
  TenantNavbar,
  TenantThemeStyle,
} from "@/src/components/layout/tenant-chrome";
import { TenantStoreSync } from "@/src/components/layout/tenant-store-sync";
import { WhitelabelProvider } from "@/utilities/whitelabel-context";
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

const toasterConfig = {
  position: "top-right" as const,
  toastOptions: {
    className: "toast-content",
    style: {
      maxWidth: "500px",
      wordWrap: "break-word" as const,
      overflowWrap: "anywhere" as const,
      wordBreak: "break-word" as const,
    },
    duration: 4000,
  },
  containerStyle: { top: 20, right: 20 },
};

// Synchronous by design: the layout starts the whitelabel read but never
// awaits it, so <html>, the fonts, <body> and the theme provider are the same
// for every route and every host.
//
// The promise is created once and handed down two ways: the host-dependent
// chrome — theme, navbar, footer, JSON-LD — takes it directly, and
// WhitelabelProvider unwraps it for the ~25 client consumers that expect a
// plain value.
//
// There is deliberately no Suspense boundary anywhere in here. A boundary
// above the page makes Next stream it as a hidden late chunk that only
// JavaScript reveals, which is what DEV-612 forbids for sitemap-crawlable
// routes; one around the navbar and footer costs the page its internal link
// graph the same way. Without a boundary React holds the shell until the host
// is known and then emits one complete document — holding, not hiding.
//
// So this is the prerequisite, not the finished job: the layout no longer
// awaits, but WhitelabelProvider still blocks the tree. Making the shell
// genuinely prerenderable needs that provider to stop blocking, which in turn
// needs an answer for the crawlable routes — see the PR discussion.
//
// generateMetadata above still awaits headers(); metadata resolves off the
// critical path and does not hold up the shell.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const whitelabel = getWhitelabelContext();

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
          <TenantThemeStyle whitelabel={whitelabel} />
          <PrivyProviderWrapper whitelabel={whitelabel}>
            <WhitelabelProvider value={whitelabel}>
              <TenantStoreSync />
              <PermissionsProvider />
              <DeferredLayoutComponents toasterConfig={toasterConfig} />
              <div
                data-app-content
                className="min-h-screen flex flex-col justify-between h-full text-gray-700 bg-white dark:bg-black dark:text-white"
              >
                <div className="flex flex-col w-full h-full">
                  <TenantNavbar whitelabel={whitelabel} />
                  {children}
                </div>
                <TenantFooter whitelabel={whitelabel} />
              </div>
            </WhitelabelProvider>
          </PrivyProviderWrapper>
          <TenantJsonLd whitelabel={whitelabel} />
        </ThemeProvider>
      </body>
    </html>
  );
}
