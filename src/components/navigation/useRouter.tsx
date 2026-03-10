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

  // Capture stable method references from the router object.
  // The nextRouter object itself is a new reference every render,
  // but its methods (push, replace, etc.) are stable.
  const nextPush = nextRouter.push;
  const nextReplace = nextRouter.replace;
  const nextPrefetch = nextRouter.prefetch;
  const nextBack = nextRouter.back;
  const nextForward = nextRouter.forward;
  const nextRefresh = nextRouter.refresh;

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
      nextPush(buildInternalUrl(href), options);
    },
    [nextPush, buildInternalUrl]
  );

  const replace = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      nextReplace(buildInternalUrl(href), options);
    },
    [nextReplace, buildInternalUrl]
  );

  const prefetch = useCallback(
    (href: string) => {
      nextPrefetch(buildInternalUrl(href));
    },
    [nextPrefetch, buildInternalUrl]
  );

  return useMemo(
    () => ({
      push,
      replace,
      back: nextBack,
      forward: nextForward,
      refresh: nextRefresh,
      prefetch,
      _nextRouter: nextRouter,
    }),
    [push, replace, nextBack, nextForward, nextRefresh, prefetch, nextRouter]
  );
}

export default useRouter;
