import { OrganizationJsonLd } from "@/components/Seo/OrganizationJsonLd";
import { COPYRIGHT_YEAR } from "@/src/components/footer/copyright-year";
import { Footer } from "@/src/components/footer/footer";
import { WhitelabelFooter } from "@/src/components/footer/whitelabel-footer";
import { Navbar } from "@/src/components/navbar/navbar";
import { WhitelabelNavbar } from "@/src/components/navbar/whitelabel-navbar";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { toHslToken, type WhitelabelDomain } from "@/utilities/whitelabel-config";
import type { WhitelabelContext } from "@/utilities/whitelabel-server";

/**
 * The chrome that depends on the request host, split one piece per concern so
 * each can be given its own Suspense boundary later without touching the page.
 *
 * They take the promise directly rather than reading WhitelabelProvider's
 * context, so they stay independent of it. None of them is wrapped in a
 * boundary today, and that is deliberate: measured on a production build, a
 * boundary around the navbar and footer streams them as hidden late chunks and
 * costs a crawlable page its whole internal link graph — 203 characters of
 * no-JS text on `/`, every navigation and footer link. Boundaries here only
 * start paying once WhitelabelProvider itself stops holding the shell.
 */

type Whitelabel = Promise<WhitelabelContext>;

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
 * Why it wins is document order, not layers: Tailwind flattens `@layer base`
 * away at build time, so the only two `--primary` rules that ship are `:root`
 * and `.dark`, both specificity (0,1,0), both in a stylesheet `<link>`ed from
 * <head>. This `<style>` is a body child — React does not hoist it, since it
 * carries no `precedence` — so it comes later and equal specificity resolves
 * in its favour, in light and dark alike, exactly as the inline style it
 * replaces did.
 *
 * That makes it weaker than the old inline attribute in one way: a future rule
 * more specific than (0,1,0) — `html.dark`, say — would outrank it. The test
 * in __tests__/app/tenant-chrome.test.tsx fails if globals.css ever grows one.
 */
function whitelabelThemeCss(
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

export async function TenantThemeStyle({ whitelabel }: { whitelabel: Whitelabel }) {
  const { isWhitelabel, config, tenantConfig } = await whitelabel;
  const css = isWhitelabel ? whitelabelThemeCss(config, tenantConfig) : null;

  // Rendered as a text child, not dangerouslySetInnerHTML: React escapes it,
  // and <style> is RAWTEXT, so an escape would break the rule rather than
  // close it. HSL_TOKEN already forbids every character that could matter —
  // the two together mean a bad token can only ever be inert.
  return css ? <style>{css}</style> : null;
}

export async function TenantNavbar({ whitelabel }: { whitelabel: Whitelabel }) {
  const { isWhitelabel } = await whitelabel;

  if (isWhitelabel) return <WhitelabelNavbar />;

  // The spacer offsets the fixed navbar. It used to live in GlobalNavbarSlot
  // alongside three `pathname.startsWith(...)` suppressions; those are now the
  // `(bare)` route group, so nothing is left to decide and the slot is gone.
  return (
    <>
      <Navbar />
      <div data-app-chrome className="h-[var(--navbar-height)]" />
    </>
  );
}

export async function TenantFooter({ whitelabel }: { whitelabel: Whitelabel }) {
  const { isWhitelabel } = await whitelabel;

  // Which routes get a footer at all is answered by the route tree, not by a
  // pathname test — the sections that supply their own chrome live outside the
  // chrome group (PR #2096). That is what retired FooterSwitcher.
  //
  // COPYRIGHT_YEAR is a build-time constant, read here on the server and handed
  // down as a prop — see copyright-year.ts for why the client component that
  // displays it must not compute it itself.
  return isWhitelabel ? <WhitelabelFooter /> : <Footer copyrightYear={COPYRIGHT_YEAR} />;
}

/** Describes Karma, so it is for the main domain only. */
export async function TenantJsonLd({ whitelabel }: { whitelabel: Whitelabel }) {
  const { isWhitelabel } = await whitelabel;

  return isWhitelabel ? null : <OrganizationJsonLd />;
}
