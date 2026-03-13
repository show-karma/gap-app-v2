"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";
import { WhitelabelFooter } from "./whitelabel-footer";

/** Routes that use the in-app sidebar layout — suppress the marketing footer. */
function isAppRoute(pathname: string): boolean {
  return pathname.includes("/manage");
}

function MinimalFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="flex items-center justify-between px-6 py-3 text-xs text-muted-foreground max-w-[1920px] mx-auto">
        <span>© {new Date().getFullYear()} Karma. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <a
            href="https://gap.karmahq.xyz/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Terms
          </a>
          <a
            href="https://gap.karmahq.xyz/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}

export function FooterSwitcher({ isWhitelabel }: { isWhitelabel: boolean }) {
  const pathname = usePathname();

  if (isWhitelabel) return <WhitelabelFooter />;
  if (isAppRoute(pathname)) return <MinimalFooter />;
  return <Footer />;
}
