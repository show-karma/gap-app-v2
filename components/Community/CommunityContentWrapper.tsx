import { layoutTheme } from "@/src/helper/theme";
import { cn } from "@/utilities/tailwind";

/**
 * Applies the standard padding to community content.
 *
 * This used to read `usePathname()` to skip the padding on manage pages, which
 * have their own sidebar layout. It never fired: only the `(with-header)` route
 * group renders this, and `manage/` is a sibling of that group, not a route
 * inside it. With the test gone the component needs no hooks at all, so it is a
 * server component now and stops holding the community hub out of the prerender.
 */
export function CommunityContentWrapper({ children }: { children: React.ReactNode }) {
  return <div className={cn(layoutTheme.padding, "w-full max-w-full")}>{children}</div>;
}
