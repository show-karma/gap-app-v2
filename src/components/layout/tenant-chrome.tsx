import { DeferredLayoutComponents } from "@/components/DeferredLayoutComponents";
import { OrganizationJsonLd } from "@/components/Seo/OrganizationJsonLd";
import { PermissionsProvider } from "@/components/Utilities/PermissionsProvider";
import PrivyProviderWrapper from "@/components/Utilities/PrivyProviderWrapper";
import { TenantStoreInitializer } from "@/components/Utilities/TenantStoreInitializer";
import { FooterSwitcher } from "@/src/components/footer/footer-switcher";
import { GlobalNavbarSlot } from "@/src/components/navbar/global-navbar-slot";
import { WhitelabelNavbar } from "@/src/components/navbar/whitelabel-navbar";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { toHslToken, type WhitelabelDomain } from "@/utilities/whitelabel-config";
import { WhitelabelProvider } from "@/utilities/whitelabel-context";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

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

// The shape `hsl(var(--primary))` expects, and the only shape that may reach
// the stylesheet below. `toHslToken` normally produces it, but a tenant's
// colours can also arrive from NEXT_PUBLIC_EXTRA_WHITELABEL_DOMAINS as an
// unvalidated string (see parseExtraWhitelabelDomainsFromEnv), so the value is
// re-checked here rather than trusted: a stray `}` in a <style> body would end
// the rule and let the rest of the string author arbitrary CSS. A value that
// fails this test was already dead — `hsl(<not a token>)` is invalid CSS — so
// dropping it changes nothing a tenant could see.
const HSL_TOKEN = /^\d{1,3} \d{1,3}% \d{1,3}%$/;

const asHslToken = (value: string | null | undefined): string | null =>
  value && HSL_TOKEN.test(value) ? value : null;

/**
 * The tenant's `--primary` / `--primary-foreground`, as the body of a CSS rule.
 *
 * This used to be an inline `style` on <html>. It is a rule now because the
 * root layout no longer knows the tenant, but it deliberately still targets
 * `:root` rather than the `data-app-content` wrapper: Radix and Headless UI
 * portal their dialogs to <body>, and react-hot-toast's container is a sibling
 * of that wrapper, so scoping the variables to it would silently drop the
 * tenant's colour from every modal, popover and toast.
 *
 * Being unlayered is what makes it win. `styles/globals.css` defines both
 * `:root` and `.dark` inside `@layer base`, and unlayered normal declarations
 * outrank every layered one — so this beats the dark-mode `--primary` in both
 * themes, exactly as the inline style it replaces did.
 */
export function getWhitelabelThemeCss(
  config: WhitelabelDomain | null,
  tenantConfig: TenantConfig | null
): string | null {
  const primary =
    asHslToken(config?.theme?.primaryColor ? toHslToken(config.theme.primaryColor) : null) ??
    asHslToken(
      tenantConfig?.theme?.colors?.primary ? toHslToken(tenantConfig.theme.colors.primary) : null
    );
  const primaryForeground =
    asHslToken(config?.theme?.buttonTextColor ? toHslToken(config.theme.buttonTextColor) : null) ??
    asHslToken(
      tenantConfig?.theme?.colors?.buttontext
        ? toHslToken(tenantConfig.theme.colors.buttontext)
        : null
    );

  const declarations = [
    ...(primary ? [`--primary:${primary}`] : []),
    ...(primaryForeground ? [`--primary-foreground:${primaryForeground}`] : []),
  ];

  return declarations.length ? `:root{${declarations.join(";")}}` : null;
}

/**
 * Everything in the chrome that depends on the request host.
 *
 * The root layout renders this inside a <Suspense> boundary, so reading
 * `headers()` here streams instead of blocking the App Shell for every route.
 * `children` is nested inside on purpose: the page then arrives in the same
 * HTML response, below the boundary, so a crawler with no JavaScript still
 * receives the real content.
 */
export async function TenantChrome({ children }: { children: React.ReactNode }) {
  const { isWhitelabel, communitySlug, config, tenantConfig } = await getWhitelabelContext();
  const themeCss = isWhitelabel ? getWhitelabelThemeCss(config, tenantConfig) : null;

  return (
    <>
      {/* Rendered as a text child, not dangerouslySetInnerHTML: React escapes
          it, and <style> is RAWTEXT, so an escape would break the rule rather
          than close it. HSL_TOKEN already forbids every character that could
          matter — the two together mean a bad token can only ever be inert. */}
      {themeCss ? <style>{themeCss}</style> : null}
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
          <div
            data-app-content
            className="min-h-screen flex flex-col justify-between h-full text-gray-700 bg-white dark:bg-black dark:text-white"
          >
            <div className="flex flex-col w-full h-full">
              {isWhitelabel ? <WhitelabelNavbar /> : <GlobalNavbarSlot />}
              {children}
            </div>
            <FooterSwitcher isWhitelabel={isWhitelabel} />
          </div>
        </WhitelabelProvider>
      </PrivyProviderWrapper>
      {!isWhitelabel && <OrganizationJsonLd />}
    </>
  );
}

/**
 * What the shell paints while TenantChrome streams: the same two wrappers and
 * the navbar's height reservation, so the chrome does not shift when it lands.
 * It carries no tenant colours by design — the default theme is correct until
 * the host is known.
 */
export function TenantChromeFallback() {
  return (
    <div
      data-app-content
      className="min-h-screen flex flex-col justify-between h-full text-gray-700 bg-white dark:bg-black dark:text-white"
    >
      <div className="flex flex-col w-full h-full">
        <div data-app-chrome className="h-[var(--navbar-height)]" />
      </div>
    </div>
  );
}
