import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { defaultMetadata } from "@/utilities/meta";
import "@/styles/globals.css";
import "@/styles/index.scss";
import "@/components/Utilities/DynamicStars/styles.css";
import "rc-slider/assets/index.css";
import "react-day-picker/dist/style.css";
import "@uiw/react-markdown-preview/markdown.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { AgentChatBubble } from "@/components/AgentChat/AgentChatBubble";
import { ContributorProfileDialog } from "@/components/Dialogs/ContributorProfileDialog";
import { OnboardingDialog } from "@/components/Dialogs/OnboardingDialog";
import { ProgressBarWrapper } from "@/components/ProgressBarWrapper";
import { OrganizationJsonLd } from "@/components/Seo/OrganizationJsonLd";
import HotjarAnalytics from "@/components/Utilities/HotjarAnalytics";
import { PermissionsProvider } from "@/components/Utilities/PermissionsProvider";
import PrivyProviderWrapper from "@/components/Utilities/PrivyProviderWrapper";
import { TenantStoreInitializer } from "@/components/Utilities/TenantStoreInitializer";
import { Footer } from "@/src/components/footer/footer";
import { WhitelabelFooter } from "@/src/components/footer/whitelabel-footer";
import { Navbar } from "@/src/components/navbar/navbar";
import { WhitelabelNavbar } from "@/src/components/navbar/whitelabel-navbar";
import { ApiKeyManagementModal } from "@/src/features/api-keys/components/api-key-management-modal";
import { toHslToken } from "@/utilities/whitelabel-config";
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

  return defaultMetadata;
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
    <html lang="en" className="h-full" suppressHydrationWarning style={themeStyle}>
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
              <Toaster {...toasterConfig} />
              {!isWhitelabel && (
                <>
                  <Suspense fallback={null}>
                    <ContributorProfileDialog />
                  </Suspense>
                  <Suspense fallback={null}>
                    <ApiKeyManagementModal />
                  </Suspense>
                  <OnboardingDialog />
                </>
              )}
              <ProgressBarWrapper />
              <div className="min-h-screen flex flex-col justify-between h-full text-gray-700 bg-white dark:bg-black dark:text-white">
                <div className="flex flex-col w-full h-full">
                  {isWhitelabel ? (
                    <WhitelabelNavbar />
                  ) : (
                    <>
                      <Navbar />
                      <div className="h-[80px]" />
                    </>
                  )}
                  {children}
                  <Analytics />
                </div>
                {isWhitelabel ? <WhitelabelFooter /> : <Footer />}
              </div>
              {!isWhitelabel && <AgentChatBubble />}
            </WhitelabelProvider>
          </PrivyProviderWrapper>
          <SpeedInsights />
        </ThemeProvider>
        {!isWhitelabel && <OrganizationJsonLd />}
      </body>
    </html>
  );
}
