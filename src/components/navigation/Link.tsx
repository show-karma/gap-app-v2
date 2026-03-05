"use client";

import type { LinkProps } from "next/link";
import NextLink from "next/link";
import type { ComponentProps, Ref } from "react";
import { forwardRef } from "react";
import { useUrlBuilder } from "@/hooks/use-url-builder";
import { cn } from "@/utilities/tailwind";
import { useWhitelabel } from "@/utilities/whitelabel-context";

export type CustomLinkProps = Omit<LinkProps, "href"> &
  Omit<ComponentProps<"a">, "href"> & {
    href: string;
    useBuilder?: boolean;
    disabled?: boolean;
    communityFallback?: string;
  };

export const Link = forwardRef<HTMLAnchorElement, CustomLinkProps>(
  ({ href, useBuilder = true, disabled = false, className, communityFallback, ...props }, ref) => {
    const { isWhitelabel, isUmbrella, communitySlug } = useWhitelabel();
    let urlBuilded = useUrlBuilder(href, communityFallback, useBuilder);

    // In whitelabel mode, strip /community/<slug> prefix so URLs stay clean.
    // Components may generate hrefs like `/community/optimism/programs/123`
    // via PAGES.COMMUNITY — normalize to `/programs/123` (domained) or
    // `/<slug>/programs/123` (umbrella).
    if (isWhitelabel && communitySlug) {
      const prefix = `/community/${communitySlug}`;
      if (urlBuilded.startsWith(prefix)) {
        const rest = urlBuilded.slice(prefix.length) || "/";
        urlBuilded = isUmbrella ? `/${communitySlug}${rest}` : rest;
      }
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
