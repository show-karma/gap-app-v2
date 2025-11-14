import { ArrowUpRight } from "lucide-react"
import Image from "next/image"
import { ExternalLink } from "@/components/Utilities/ExternalLink"
import { cn } from "@/utilities/tailwind"
import { MenuItemClient } from "./menu-item-client"
import { exploreItems, forBuildersItems, forFundersItems, resourcesItems } from "./menu-items"
import { SimpleMenuItemClient } from "./simple-menu-item-client"

const menuStyles = {
  itemIcon: "text-muted-foreground w-4 h-4",
  itemText: "text-foreground text-sm font-medium",
  itemDescription: "text-muted-foreground text-sm font-normal",
}

// Re-export MenuItemClient as MenuItem for backward compatibility
export const MenuItem = MenuItemClient

// Re-export SimpleMenuItemClient as SimpleMenuItem for backward compatibility
export const SimpleMenuItem = SimpleMenuItemClient

interface MenuSectionProps {
  title: string
  variant?: "desktop" | "mobile"
  className?: string
}

export function MenuSection({ title, variant = "desktop", className }: MenuSectionProps) {
  if (variant === "mobile") {
    return <h3 className={cn(menuStyles.itemDescription, "mb-2", className)}>{title}</h3>
  }

  return <p className={cn(menuStyles.itemDescription, "mb-2", className)}>{title}</p>
}

// For Builders Section
interface ForBuildersContentProps {
  variant?: "desktop" | "mobile"
  onClose?: () => void
}

export function ForBuildersContent({ variant = "desktop", onClose }: ForBuildersContentProps) {
  if (variant === "mobile") {
    return (
      <>
        {forBuildersItems.map((item) => (
          <MenuItem key={item.href} {...item} variant="mobile" onClick={onClose} />
        ))}
      </>
    )
  }

  return (
    <div className="flex flex-row justify-between items-center gap-4">
      <div className="flex flex-col items-start justify-start">
        {forBuildersItems.map((item) => (
          <MenuItem key={item.href} {...item} variant="desktop" />
        ))}
      </div>
      <Image src="/images/homepage/nav-builder.png" alt="For Builders" width={170} height={132} />
    </div>
  )
}

// For Funders Section
interface ForFundersContentProps {
  variant?: "desktop" | "mobile"
  onClose?: () => void
}

export function ForFundersContent({ variant = "desktop", onClose }: ForFundersContentProps) {
  if (variant === "mobile") {
    return (
      <>
        <MenuItem {...forFundersItems.main} variant="mobile" onClick={onClose} />
        {forFundersItems.secondary.map((item) => (
          <MenuItem key={item.href} {...item} variant="mobile" onClick={onClose} />
        ))}
      </>
    )
  }

  return (
    <div className="flex flex-row justify-between items-center gap-4">
      <div className="flex flex-col">
        <MenuItem {...forFundersItems.main} variant="desktop" />
        <hr className="my-4 border-border" />
        <div className="flex flex-col">
          {forFundersItems.secondary.map((item) => (
            <MenuItem key={item.href} {...item} variant="desktop" />
          ))}
        </div>
      </div>
      <Image
        src="/images/homepage/nav-funder.png"
        className="w-auto h-auto object-cover"
        alt="For Funders"
        width={132}
        height={170}
      />
    </div>
  )
}

// Explore Section
interface ExploreContentProps {
  variant?: "desktop" | "mobile"
  onClose?: () => void
}

export function ExploreContent({ variant = "desktop", onClose }: ExploreContentProps) {
  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-2">
        <MenuSection title="Projects" variant="mobile" />
        {exploreItems.projects.map((item) => (
          <SimpleMenuItem key={item.title} {...item} variant="mobile" onClick={onClose} />
        ))}
        <MenuSection title="Communities" variant="mobile" className="mt-2" />
        {exploreItems.communities.map((item) => (
          <SimpleMenuItem key={item.href} {...item} variant="mobile" onClick={onClose} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 w-max">
      <div className="flex flex-col w-full">
        <MenuSection title="Projects" variant="desktop" />
        {exploreItems.projects.map((item) => (
          <SimpleMenuItem key={item.title} {...item} variant="desktop" />
        ))}
      </div>
      <hr className="h-[1px] w-full border-border" />
      <div className="flex flex-col w-full">
        <MenuSection title="Communities" variant="desktop" />
        {exploreItems.communities.map((item) => (
          <SimpleMenuItem key={item.href} {...item} variant="desktop" />
        ))}
      </div>
    </div>
  )
}

// Resources Section
interface ResourcesContentProps {
  variant?: "desktop" | "mobile"
  onClose?: () => void
}

export function ResourcesContent({ variant = "desktop", onClose }: ResourcesContentProps) {
  if (variant === "mobile") {
    return (
      <>
        {resourcesItems.map((item) => (
          <ExternalLink
            key={item.href}
            href={item.href}
            className="flex items-center justify-between px-0 py-3 rounded-md hover:bg-accent"
            onClick={onClose}
          >
            <div className="flex items-center gap-2">
              <item.icon className={menuStyles.itemIcon} />
              <span className={menuStyles.itemText}>{item.title}</span>
            </div>
            <ArrowUpRight className={menuStyles.itemIcon} />
          </ExternalLink>
        ))}
      </>
    )
  }

  return (
    <div className="flex flex-col">
      {resourcesItems.map((item) => (
        <SimpleMenuItem key={item.href} {...item} variant="desktop" />
      ))}
    </div>
  )
}
