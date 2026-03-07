"use client";

import { useRouter as useNextRouter, useParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { getUrlBuilder } from "@/hooks/use-url-builder";

export interface EnhancedRouter {
  push: (href: string, options?: { scroll?: boolean }) => void;
  replace: (href: string, options?: { scroll?: boolean }) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (href: string) => void;
  _nextRouter: ReturnType<typeof useNextRouter>;
}

export function useRouter(): EnhancedRouter {
  const nextRouter = useNextRouter();
  const params = useParams<{ communityId: string }>();
  const community = params.communityId;

  const isExternalUrl = useCallback((url: string): boolean => {
    return url.startsWith("http://") || url.startsWith("https://");
  }, []);

  const buildInternalUrl = useCallback(
    (href: string): string => {
      if (isExternalUrl(href)) return href;
      if (community && href.startsWith(`/${community}/`)) return href;
      return getUrlBuilder(community, href);
    },
    [community, isExternalUrl]
  );

  const push = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      nextRouter.push(buildInternalUrl(href), options);
    },
    [nextRouter, buildInternalUrl]
  );

  const replace = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      nextRouter.replace(buildInternalUrl(href), options);
    },
    [nextRouter, buildInternalUrl]
  );

  const prefetch = useCallback(
    (href: string) => {
      nextRouter.prefetch(buildInternalUrl(href));
    },
    [nextRouter, buildInternalUrl]
  );

  return useMemo(
    () => ({
      push,
      replace,
      back: nextRouter.back,
      forward: nextRouter.forward,
      refresh: nextRouter.refresh,
      prefetch,
      _nextRouter: nextRouter,
    }),
    [push, replace, nextRouter, prefetch]
  );
}

export default useRouter;
