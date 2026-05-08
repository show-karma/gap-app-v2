import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import localFont from "next/font/local";
import { defaultMetadata } from "@/utilities/meta";

const inter = localFont({
  src: "../public/fonts/Inter/Inter.woff2",
  variable: "--font-inter",
  display: "optional",
  weight: "100 900",
});
import "@/styles/globals.css";
import "@/styles/index.scss";
import "@/components/Utilities/DynamicStars/styles.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ThemeProvider } from "next-themes";
import { DeferredLayoutComponents } from "@/components/DeferredLayoutComponents";
import { OrganizationJsonLd } from "@/components/Seo/OrganizationJsonLd";
import { PermissionsProvider } from "@/components/Utilities/PermissionsProvider";
import PrivyProviderWrapper from "@/components/Utilities/PrivyProviderWrapper";
import { TenantStoreInitializer } from "@/components/Utilities/TenantStoreInitializer";
import { FooterSwitcher } from "@/src/components/footer/footer-switcher";
import { Navbar } from "@/src/components/navbar/navbar";
import { WhitelabelNavbar } from "@/src/components/navbar/whitelabel-navbar";
import { toHslToken } from "@/utilities/whitelabel-config";
import { WhitelabelProvider } from "@/utilities/whitelabel-context";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

const Footer = dynamic(() =>
  import("@/src/components/footer/footer").then((m) => ({ default: m.Footer }))
);

const WhitelabelFooter = dynamic(() =>
  import("@/src/components/footer/whitelabel-footer").then((m) => ({
    default: m.WhitelabelFooter,
  }))
);

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
      apple: [{ url: "/images/favicon.png" }],
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isWhitelabel, communitySlug, config, tenantConfig } = await getWhitelabelContext();

  const tenantPrimaryToken = tenantConfig?.theme?.colors?.primary
    ? (toHslToken(tenantConfig.theme.colors.primary) ?? tenantConfig.theme.colors.primary)
    : null;
  const configPrimaryToken = config?.theme?.primaryColor
    ? toHslToken(config.theme.primaryColor)
    : null;
  const primaryToken = tenantPrimaryToken ?? configPrimaryToken;

  const themeStyle =
    isWhitelabel && primaryToken
      ? ({ "--primary": primaryToken } as React.CSSProperties)
      : undefined;

  return (
    <html
      lang="en"
      className={`h-full ${inter.variable}`}
      suppressHydrationWarning
      style={themeStyle}
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
          <PrivyProviderWrapper tenantConfig={isWhitelabel ? tenantConfig : null}>
            <WhitelabelProvider
              isWhitelabel={isWhitelabel}
              communitySlug={communitySlug}
              config={config}
              tenantConfig={tenantConfig ?? null}
            >
              {isWhitelabel && tenantConfig && (
                <TenantStoreInitializer tenant={tenantConfig}>{null}</TenantStoreInitializer>
              )}
              <PermissionsProvider />
              <DeferredLayoutComponents toasterConfig={toasterConfig} />
              <div className="min-h-screen flex flex-col justify-between h-full text-gray-700 bg-white dark:bg-black dark:text-white">
                <div className="flex flex-col w-full h-full">
                  {isWhitelabel ? (
                    <WhitelabelNavbar />
                  ) : (
                    <>
                      <Navbar />
                      <div className="h-[var(--navbar-height)]" />
                    </>
                  )}
                  {children}
                </div>
                <FooterSwitcher isWhitelabel={isWhitelabel} />
              </div>
            </WhitelabelProvider>
          </PrivyProviderWrapper>
        </ThemeProvider>
        {!isWhitelabel && <OrganizationJsonLd />}
      </body>
    </html>
  );
}
