"use client";

import "@/components/Pages/Dashboard/v3/dashboard-soft.css";

import { ClipboardList, FileText, type LucideIcon, Plus, Sparkles, UsersRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { SoftShell } from "@/components/Pages/Dashboard/v3/SoftShell";
import { SK } from "@/components/Pages/Dashboard/v3/soft-classes";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  SIDEBAR_BELOW_NAVBAR_CLASSES,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useDonorAdvisor } from "@/hooks/useDonorAdvisor";
import { useDonorHandle } from "@/hooks/useDonorHandles";
import { Link } from "@/src/components/navigation/Link";
import type { DonorAdvisor } from "@/types/donor-research";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { DonorResearchLoading, type DonorResearchLoadingVariant } from "./DonorResearchLoading";
import { RateLimitCounter } from "./RateLimitCounter";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: PAGES.DONOR_RESEARCH.NEW, label: "New report", icon: Plus },
  { href: PAGES.DONOR_RESEARCH.INDEX, label: "Reports", icon: FileText },
  { href: PAGES.DONOR_RESEARCH.PERSONAS, label: "Donors", icon: UsersRound },
  {
    href: PAGES.DONOR_RESEARCH.DILIGENCE_TEMPLATE,
    label: "Diligence questions",
    icon: ClipboardList,
  },
];

const REPORT_SIBLING_ROUTES = [
  PAGES.DONOR_RESEARCH.NEW,
  PAGES.DONOR_RESEARCH.PERSONAS,
  PAGES.DONOR_RESEARCH.DILIGENCE_TEMPLATE,
];

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === PAGES.DONOR_RESEARCH.NEW) return pathname === href;

  if (href === PAGES.DONOR_RESEARCH.INDEX) {
    if (pathname === href) return true;
    return (
      pathname.startsWith(`${href}/`) &&
      !REPORT_SIBLING_ROUTES.some(
        (sibling) => pathname === sibling || pathname.startsWith(`${sibling}/`)
      )
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const Icon = item.icon;
  const active = isNavItemActive(pathname, item.href);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild className="h-11 md:h-8" isActive={active} tooltip={item.label}>
        <Link
          aria-current={active ? "page" : undefined}
          href={item.href}
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
        >
          <Icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function DonorResearchSidebar({
  advisor,
  pathname,
}: {
  advisor: DonorAdvisor | null;
  pathname: string;
}) {
  return (
    <Sidebar collapsible="icon" className={SIDEBAR_BELOW_NAVBAR_CLASSES}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Research</SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Nonprofit research sections">
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarNavItem item={item} key={item.href} pathname={pathname} />
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="group-data-[collapsible=icon]:hidden">
          {advisor ? (
            <RateLimitCounter advisor={advisor} variant="sidebar" />
          ) : (
            <div className="flex flex-col gap-2 rounded-sf-tile border border-sf-line bg-sf-card p-3">
              <span className={cn(SK, "h-3 w-24")} />
              <span className={cn(SK, "h-2 w-full rounded-full")} />
              <span className={cn(SK, "h-2 w-2/3")} />
            </div>
          )}
        </div>
        <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Usage limits">
              <Sparkles />
              <span>Usage limits</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function getPersonaId(pathname: string): string | null {
  const prefix = `${PAGES.DONOR_RESEARCH.PERSONAS}/`;
  if (!pathname.startsWith(prefix)) return null;
  return pathname.slice(prefix.length).split("/")[0] || null;
}

function getReportId(pathname: string): string | null {
  const prefix = `${PAGES.DONOR_RESEARCH.INDEX}/`;
  if (!pathname.startsWith(prefix)) return null;
  if (
    REPORT_SIBLING_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  ) {
    return null;
  }
  return pathname.slice(prefix.length).split("/")[0] || null;
}

function DonorResearchBreadcrumbs({ pathname }: { pathname: string }) {
  const personaId = getPersonaId(pathname);
  const reportId = getReportId(pathname);
  const personaQuery = useDonorHandle(personaId);
  const section = NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href));
  const sectionLabel = section?.label ?? "Research";
  const sectionHref = section?.href ?? PAGES.DONOR_RESEARCH.INDEX;
  const hasDetail = !!personaId || !!reportId;

  let detailLabel: ReactNode = null;
  if (personaId) {
    if (personaQuery.isLoading) {
      detailLabel = <output aria-label="Loading donor" className={cn(SK, "h-4 w-10 rounded")} />;
    } else if (personaQuery.isError || !personaQuery.data) {
      detailLabel = "Donor";
    } else {
      detailLabel = personaQuery.data.opaqueLabel;
    }
  } else if (reportId) {
    detailLabel = `No. ${reportId.slice(0, 6).toUpperCase()}`;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="min-w-0 flex-nowrap">
        <BreadcrumbItem className="hidden min-w-0 sm:inline-flex">
          <BreadcrumbLink asChild>
            <Link className="truncate" href={PAGES.DONOR_RESEARCH.INDEX}>
              Nonprofit Research
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden shrink-0 sm:block" />
        <BreadcrumbItem className="min-w-0">
          {hasDetail ? (
            <BreadcrumbLink asChild>
              <Link className="truncate" href={sectionHref}>
                {sectionLabel}
              </Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="truncate font-medium">{sectionLabel}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {hasDetail ? (
          <>
            <BreadcrumbSeparator className="shrink-0" />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className={cn("truncate font-medium", reportId && "font-mono")}>
                {detailLabel}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** Route → content-pane skeleton shape, so the pending pane matches the page. */
function getLoadingVariant(pathname: string): DonorResearchLoadingVariant {
  if (pathname === PAGES.DONOR_RESEARCH.NEW) return "form";
  if (getReportId(pathname) !== null) return "report";
  if (pathname === PAGES.DONOR_RESEARCH.INDEX) return "home";
  return "list";
}

function DonorResearchAppShell({
  advisor,
  children,
  pathname,
}: {
  advisor: DonorAdvisor | null;
  children: ReactNode;
  pathname: string;
}) {
  return (
    <SidebarProvider className="dashv3 relative min-h-[calc(100vh-var(--navbar-height,64px))] bg-sf-panel">
      <DonorResearchSidebar advisor={advisor} pathname={pathname} />
      <SidebarInset className="bg-sf-panel">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-2 size-11 md:-ml-1 md:size-7" />
          <DonorResearchBreadcrumbs pathname={pathname} />
        </header>
        <div className="mx-auto w-full max-w-[1920px] flex-1 p-4 pb-12 sm:p-6 sm:pb-12 lg:p-8 lg:pb-12">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

interface DonorResearchShellProps {
  children: ReactNode;
}

/** Shared collapsible navigation shell for the advisor-facing research routes. */
export function DonorResearchShell({ children }: DonorResearchShellProps) {
  const pathname = usePathname();
  const { replace } = useRouter();
  const advisorQuery = useDonorAdvisor();
  // Report-detail routes can also be viewed by staff without an advisor
  // profile (shared-report triage) — derived from the path so the shell can
  // live in the section layout instead of being re-declared per page.
  const allowStaffViewer = getReportId(pathname) !== null;
  const advisor = advisorQuery.data ?? null;
  const advisorMissing = advisorQuery.isSuccess && advisor === null;

  useEffect(() => {
    if (allowStaffViewer) return;
    if (advisorMissing) {
      replace(PAGES.DONOR_RESEARCH.ONBOARDING);
    }
  }, [allowStaffViewer, advisorMissing, replace]);

  // Staff viewing a report without their own advisor row get the plain Soft
  // shell (no advisor-scoped sidebar) rather than the research navigation.
  if (allowStaffViewer && (advisorQuery.isError || advisorMissing)) {
    return <SoftShell>{children}</SoftShell>;
  }

  // A genuine load failure on an advisor-owned route is unrecoverable here —
  // surface it to the route's error boundary.
  if (advisorQuery.isError && !allowStaffViewer) {
    throw advisorQuery.error;
  }

  // The navigation chrome is static, so it renders immediately — no fake
  // sidebar that later swaps for the real one. Only the content pane waits:
  // while the advisor resolves, or while a non-advisor is being redirected to
  // onboarding, it shows a skeleton shaped like the destination route.
  const contentPending = advisorQuery.isLoading || (advisorMissing && !allowStaffViewer);

  return (
    <DonorResearchAppShell advisor={advisor} pathname={pathname}>
      {contentPending ? (
        <DonorResearchLoading variant={getLoadingVariant(pathname)} label="Loading…" />
      ) : (
        children
      )}
    </DonorResearchAppShell>
  );
}
