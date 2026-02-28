"use client";

import type { LinkProps } from "next/link";
import NextLink from "next/link";
import type { ComponentProps, Ref } from "react";
import { forwardRef } from "react";
import { useUrlBuilder } from "@/hooks/use-url-builder";
import { cn } from "@/utilities/tailwind";

export type CustomLinkProps = Omit<LinkProps, "href"> &
  Omit<ComponentProps<"a">, "href"> & {
    href: string;
    useBuilder?: boolean;
    disabled?: boolean;
    communityFallback?: string;
  };

export const Link = forwardRef<HTMLAnchorElement, CustomLinkProps>(
  ({ href, useBuilder = true, disabled = false, className, communityFallback, ...props }, ref) => {
    const urlBuilded = useUrlBuilder(href, communityFallback, useBuilder);

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
