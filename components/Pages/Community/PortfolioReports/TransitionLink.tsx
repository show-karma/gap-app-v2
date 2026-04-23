"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentProps, type MouseEvent, useRef } from "react";

type Props = ComponentProps<typeof NextLink>;

export function TransitionLink({ href, onClick, children, ...rest }: Props) {
  const router = useRouter();
  const anchorRef = useRef<HTMLAnchorElement>(null);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (typeof href !== "string") return;
    if (typeof document === "undefined") return;
    const startViewTransition = (
      document as Document & { startViewTransition?: (cb: () => void) => unknown }
    ).startViewTransition;
    if (typeof startViewTransition !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    e.preventDefault();

    // Promote elements with data-vt-source within this card to a stable view-transition-name
    // only for the duration of the transition, so other cards don't conflict.
    const sources = anchorRef.current?.querySelectorAll<HTMLElement>("[data-vt-source]");
    const promoted: Array<{ el: HTMLElement; previous: string }> = [];
    sources?.forEach((el) => {
      const name = el.dataset.vtSource;
      if (!name) return;
      // Use the static "type" prefix (e.g. "report-hero") so the destination page can match.
      const stableName = name.split("-").slice(0, 2).join("-");
      promoted.push({ el, previous: el.style.viewTransitionName });
      el.style.viewTransitionName = stableName;
    });

    const cleanup = () => {
      promoted.forEach(({ el, previous }) => {
        el.style.viewTransitionName = previous;
      });
    };

    const transition = startViewTransition.call(document, () => {
      router.push(href);
    }) as { finished?: Promise<void> } | undefined;

    if (transition?.finished?.finally) {
      transition.finished.finally(cleanup);
    } else {
      // Fallback if browser doesn't expose .finished
      setTimeout(cleanup, 600);
    }
  };

  return (
    <NextLink href={href} onClick={handleClick} ref={anchorRef} {...rest}>
      {children}
    </NextLink>
  );
}
