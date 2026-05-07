"use client";
import { useParams, usePathname } from "next/navigation";
import { Link } from "@/src/components/navigation/Link";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

const baseLinkStyle =
  "relative px-1 pb-3 text-sm font-semibold tracking-[-0.005em] transition-colors max-lg:w-full max-lg:pb-2";
const activeLinkStyle = "text-foreground";
const inactiveLinkStyle = "text-muted-foreground hover:text-foreground";

export const ImpactTabNavigator = () => {
  const params = useParams();
  const communityId = params.communityId as string;
  const pathname = usePathname();
  const isProjectDiscovery = pathname.includes("/project-discovery");

  return (
    <div
      role="tablist"
      className="flex flex-row items-center gap-7 border-b border-border max-lg:flex-col max-lg:items-start max-lg:gap-3"
    >
      <Link
        href={PAGES.COMMUNITY.IMPACT(communityId)}
        className={cn(baseLinkStyle, !isProjectDiscovery ? activeLinkStyle : inactiveLinkStyle)}
        aria-label="View impact"
        aria-current={!isProjectDiscovery ? "page" : undefined}
        tabIndex={0}
      >
        Program Impact
        {!isProjectDiscovery ? (
          <span
            aria-hidden
            className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-foreground"
          />
        ) : null}
      </Link>
      <Link
        href={PAGES.COMMUNITY.PROJECT_DISCOVERY(communityId)}
        className={cn(baseLinkStyle, isProjectDiscovery ? activeLinkStyle : inactiveLinkStyle)}
        aria-label="Project Discovery"
        aria-current={isProjectDiscovery ? "page" : undefined}
        tabIndex={0}
      >
        Project Discovery
        {isProjectDiscovery ? (
          <span
            aria-hidden
            className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-foreground"
          />
        ) : null}
      </Link>
    </div>
  );
};
