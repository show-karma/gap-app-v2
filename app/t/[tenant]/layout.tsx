import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Spectral } from "next/font/google";
import localFont from "next/font/local";
import { defaultMetadata } from "@/utilities/meta";

// Single self-hosted Inter variable font (next/font/local), same as the rest
// of the app. The woff2 is loaded and processed once; the tailwind `display`
// family points straight at --font-inter, so the marketing H1/H2 share it.
const inter = localFont({
  src: "../../../public/fonts/Inter/Inter.woff2",
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
import { notFound } from "next/navigation";
import { tenant } from "next/root-params";
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
import { isKnownTenantParam, KARMA_TENANT_PARAM } from "@/utilities/tenant-param";
import { WhitelabelProvider } from "@/utilities/whitelabel-context";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

// Cache Components requires at least one value per root param or the build
// fails, so the list is here from the start rather than being bolted on when
// the flag flips.
//
// D3: only the karma shell is prerendered. Returning every tenant multiplied
// the build by the number of tenants — 8 full copies of ~185 routes, 1477 page
// renders — for shells that are identical apart from the theme. A tenant shell
// renders on demand on its first request and is then persisted like any other
// on-demand entry, so the only cost is one cold render per tenant per deploy.
// `isKnownTenantParam()` below still accepts every tenant — this only
// changes what is built ahead of time, not what is servable.
export function generateStaticParams(): Array<{ tenant: string }> {
  return [{ tenant: KARMA_TENANT_PARAM }];
}

// Keeps the rendering mode exactly as it was before the tenant moved into the
// URL. Until this PR every route was dynamic as a side effect of the root
// layout awaiting `headers()`; with that read gone Next would start
// prerendering several hundred pages at build time, which is a far bigger
// change than this refactor is allowed to make — 47 modules call
// `useSearchParams()` and each unguarded one fails the export outright.
//
// Route-by-route triage (Stream / Cache / Block) is Phase 2 of the Instant
// Navigations plan; this line is what Phase 2 deletes, one segment at a time.
// It does NOT affect the cacheComponents readiness proof, which is measured on
// a throwaway build with this export removed.
export const dynamic = "force-dynamic";

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

// THE root layout: <html>, the fonts, <body> and the theme provider. It lives
// under `app/t/[tenant]/` so that `tenant` is a root param, which is what makes
// the whitelabel identity URL-derived instead of host-derived. The proxy writes
// the `/t/<tenant>` prefix on every page request; browser URLs never change.
//
// Nothing in here reads the request. The whitelabel promise is still created
// without being awaited and handed down two ways: the tenant-dependent chrome —
// theme, navbar, footer, JSON-LD — takes it directly, and WhitelabelProvider
// unwraps it for the ~25 client consumers that expect a plain value. That shape
// comes from #2090 and is kept deliberately.
//
// There is deliberately no Suspense boundary anywhere in here. A boundary above
// the page makes Next stream it as a hidden late chunk that only JavaScript
// reveals, which is what DEV-612 forbids for sitemap-crawlable routes; one
// around the navbar and footer costs the page its internal link graph the same
// way. Without a boundary React holds the shell until the tenant is known and
// then emits one complete document — holding, not hiding. With the tenant in
// the URL there is nothing to hold on: the value is known before render.
//
// cacheComponents and partialPrefetching are still OFF. This layout is the
// prerequisite they were waiting on, not the flip itself.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The only await in here. `/t/<tenant>` is an internal prefix the proxy
  // writes and the browser never sees, so a value the proxy would not have
  // produced means a hand-crafted URL: 404 rather than a silent fall back to
  // karma. Unlike the old `headers()` read this resolves from the matched
  // route, not from the request, so it does not make the shell dynamic — it
  // is the same value the prerender is keyed on.
  const tenantParam = await tenant();
  if (!isKnownTenantParam(tenantParam)) notFound();

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
