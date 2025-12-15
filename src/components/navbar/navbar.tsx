import { cn } from "@/utilities/tailwind";
import { layoutTheme } from "../../helper/theme";
import { NavbarDesktopNavigation } from "./navbar-desktop-navigation";
import { NavbarMobileMenu } from "./navbar-mobile-menu";

export function Navbar() {
  return (
    <nav
      className={cn(
        "flex bg-background w-full items-center justify-center flex-row gap-8 max-w-full min-w-min border-b border-border z-10 fixed top-0 left-0 right-0"
      )}
    >
      <div
        className={cn(
          layoutTheme.padding,
          "flex justify-between w-full flex-row gap-8 py-3 max-w-[1920px] min-w-min items-center"
        )}
      >
        <NavbarDesktopNavigation />
        <NavbarMobileMenu />
      </div>
    </nav>
  );
}
