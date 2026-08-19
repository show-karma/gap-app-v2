"use client";

import { ChevronDown } from "lucide-react";
import { Fragment } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/src/components/navigation/Link";
import type { NavDropdown, NavItem } from "@/src/infrastructure/types/tenant";

export const navStyles = {
  desktopLink:
    "rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
  desktopTrigger:
    "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
  mobileLink:
    "block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
  mobileExternalLink:
    "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
  mobileSubItem:
    "block rounded-lg px-3 py-2 pl-6 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
  mobileSubItemExternal:
    "flex items-center justify-between rounded-lg px-3 py-2 pl-6 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
};

function isDropdown(item: NavItem): item is NavDropdown {
  return "items" in item;
}

interface TenantNavItemsProps {
  items: NavItem[] | undefined;
  showClaimFunds: boolean | undefined;
  claimFundsHref: string | undefined;
}

/** Desktop tenant nav items, with "Claim Funds" inserted before a "More" dropdown (or appended if none exists). */
export function DesktopTenantNavItems({
  items,
  showClaimFunds,
  claimFundsHref,
}: TenantNavItemsProps) {
  const hasMoreDropdown = items?.some((item) => isDropdown(item) && item.label === "More");

  return (
    <>
      {items?.map((item, index) => {
        const isMoreDropdown = isDropdown(item) && item.label === "More";
        return (
          <Fragment key={item.label ?? `nav-${index}`}>
            {showClaimFunds && isMoreDropdown && claimFundsHref && (
              <Link href={claimFundsHref} className={navStyles.desktopLink}>
                Claim Funds
              </Link>
            )}
            {isDropdown(item) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={navStyles.desktopTrigger}>
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[180px]">
                  {item.items.map((dropdownItem) =>
                    dropdownItem.items ? (
                      <DropdownMenuSub key={dropdownItem.label}>
                        <DropdownMenuSubTrigger>{dropdownItem.label}</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="min-w-[200px]">
                          {dropdownItem.items.map((subItem) => (
                            <DropdownMenuItem key={subItem.label} asChild>
                              {subItem.isExternal ? (
                                <a
                                  href={subItem.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between"
                                >
                                  {subItem.label}
                                </a>
                              ) : (
                                <Link href={subItem.href}>{subItem.label}</Link>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    ) : (
                      <DropdownMenuItem key={dropdownItem.label} asChild>
                        {dropdownItem.isExternal ? (
                          <a
                            href={dropdownItem.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between"
                          >
                            {dropdownItem.label}
                          </a>
                        ) : (
                          <Link href={dropdownItem.href ?? "#"}>{dropdownItem.label}</Link>
                        )}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : "isExternal" in item && item.isExternal ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={navStyles.desktopTrigger}
              >
                {item.label}
              </a>
            ) : (
              <Link href={item.href} className={navStyles.desktopLink}>
                {item.label}
              </Link>
            )}
          </Fragment>
        );
      })}

      {showClaimFunds && claimFundsHref && !hasMoreDropdown && (
        <Link href={claimFundsHref} className={navStyles.desktopLink}>
          Claim Funds
        </Link>
      )}
    </>
  );
}

interface MobileTenantNavItemsProps extends TenantNavItemsProps {
  onNavigate: () => void;
}

/** Mobile tenant nav items, with "Claim Funds" inserted before a "More" section (or appended if none exists). */
export function MobileTenantNavItems({
  items,
  showClaimFunds,
  claimFundsHref,
  onNavigate,
}: MobileTenantNavItemsProps) {
  const hasMoreDropdown = items?.some((item) => isDropdown(item) && item.label === "More");

  return (
    <>
      {items?.map((item, index) => {
        const isMoreDropdown = isDropdown(item) && item.label === "More";
        return (
          <Fragment key={item.label ?? `mobile-nav-${index}`}>
            {showClaimFunds && isMoreDropdown && claimFundsHref && (
              <Link href={claimFundsHref} className={navStyles.mobileLink} onClick={onNavigate}>
                Claim Funds
              </Link>
            )}
            {isDropdown(item) ? (
              <div className="space-y-1 py-1">
                <span className="block px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {item.label}
                </span>
                {item.items.map((dropdownItem) =>
                  dropdownItem.items ? (
                    <div key={dropdownItem.label} className="space-y-0.5">
                      <span className="block px-3 pl-6 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {dropdownItem.label}
                      </span>
                      {dropdownItem.items.map((subItem) =>
                        subItem.isExternal ? (
                          <a
                            key={subItem.label}
                            href={subItem.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between rounded-lg px-3 py-2 pl-9 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            {subItem.label}
                          </a>
                        ) : (
                          <Link
                            key={subItem.label}
                            href={subItem.href}
                            className="block rounded-lg px-3 py-2 pl-9 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            onClick={onNavigate}
                          >
                            {subItem.label}
                          </Link>
                        )
                      )}
                    </div>
                  ) : dropdownItem.isExternal ? (
                    <a
                      key={dropdownItem.label}
                      href={dropdownItem.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={navStyles.mobileSubItemExternal}
                    >
                      {dropdownItem.label}
                    </a>
                  ) : (
                    <Link
                      key={dropdownItem.label}
                      href={dropdownItem.href ?? "#"}
                      className={navStyles.mobileSubItem}
                      onClick={onNavigate}
                    >
                      {dropdownItem.label}
                    </Link>
                  )
                )}
              </div>
            ) : "isExternal" in item && item.isExternal ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={navStyles.mobileExternalLink}
              >
                {item.label}
              </a>
            ) : (
              <Link href={item.href} className={navStyles.mobileLink} onClick={onNavigate}>
                {item.label}
              </Link>
            )}
          </Fragment>
        );
      })}

      {showClaimFunds && claimFundsHref && !hasMoreDropdown && (
        <Link href={claimFundsHref} className={navStyles.mobileLink} onClick={onNavigate}>
          Claim Funds
        </Link>
      )}
    </>
  );
}
