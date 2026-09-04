"use client";

import type { LinkProps } from "next/link";
import NextLink from "next/link";
import type { ComponentProps, Ref } from "react";
import { forwardRef } from "react";
import { useUrlBuilder } from "@/hooks/use-url-builder";
import { cn } from "@/utilities/tailwind";
import { useWhitelabel } from "@/utilities/whitelabel-context";
import { toWhitelabelRouteAlias } from "@/utilities/whitelabel-routes";

export type CustomLinkProps = Omit<LinkProps, "href"> &
  Omit<ComponentProps<"a">, "href"> & {
    href: string;
    useBuilder?: boolean;
    disabled?: boolean;
    communityFallback?: string;
  };

export const Link = forwardRef<HTMLAnchorElement, CustomLinkProps>(
  ({ href, useBuilder = true, disabled = false, className, communityFallback, ...props }, ref) => {
    const { isWhitelabel, communitySlug } = useWhitelabel();
    let urlBuilded = useUrlBuilder(href, communityFallback, useBuilder);

    // In whitelabel mode, strip /community/<slug> prefix so URLs stay clean.
    // Components may generate hrefs like `/community/optimism/programs/123`
    // via PAGES.COMMUNITY — normalize to `/programs/123` (domained).
    if (isWhitelabel && communitySlug) {
      const prefix = `/community/${communitySlug}`;
      if (urlBuilded.startsWith(prefix)) {
        urlBuilded = urlBuilded.slice(prefix.length) || "/";
      }
      // Then say it in the tenant's own words. A tenant that renamed a section
      // renamed its URL too (WHITELABEL_ROUTE_ALIASES); doing it here means the
      // rename holds for every link into that section, not only the three the
      // navigation owns. No-op for a tenant with no alias.
      urlBuilded = toWhitelabelRouteAlias(urlBuilded, communitySlug);
    }

    if (disabled) {
      return (
        <span
          ref={ref as Ref<HTMLSpanElement>}
          className={cn("pointer-events-none opacity-50 cursor-not-allowed", className)}
          aria-disabled="true"
          tabIndex={-1}
          {...props}
        />
      );
    }

    return <NextLink ref={ref} href={urlBuilded} className={className} {...props} />;
  }
);

Link.displayName = "Link";

export default Link;
