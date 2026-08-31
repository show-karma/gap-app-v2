import { cn } from "@/utilities/tailwind";

/**
 * Sidebar `className` for app shells that sit below the global navbar AND have
 * a body-level footer after the shell. The default rail is `position: fixed`
 * to the viewport, so it would paint over that footer once scrolled into view.
 * These overrides scope the rail to the shell instead (`absolute` in a
 * `relative` SidebarProvider — the provider MUST get a `relative` class), and
 * make the inner column sticky so the nav stays in view while scrolling.
 * Mobile (the Sheet drawer) only gets the below-navbar offset.
 */
export const SIDEBAR_BELOW_NAVBAR_CLASSES = cn(
  "!bottom-0 !h-auto !top-[var(--navbar-height,64px)]",
  "md:!absolute md:!top-0",
  "md:[&>[data-sidebar=sidebar]]:sticky md:[&>[data-sidebar=sidebar]]:top-[var(--navbar-height,64px)] md:[&>[data-sidebar=sidebar]]:!h-[calc(100svh-var(--navbar-height,64px))]"
);
