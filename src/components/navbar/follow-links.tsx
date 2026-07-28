"use client";

import { ScrollText } from "lucide-react";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { DiscordIcon, TelegramIcon, TwitterIcon } from "@/components/Icons";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";

interface FollowLink {
  name: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  external: boolean;
}

export const followLinks: ReadonlyArray<FollowLink> = [
  {
    name: "Twitter",
    href: SOCIALS.TWITTER,
    icon: TwitterIcon,
    external: true,
  },
  {
    name: "Telegram",
    href: SOCIALS.TELEGRAM,
    icon: TelegramIcon,
    external: true,
  },
  {
    name: "Discord",
    href: SOCIALS.DISCORD,
    icon: DiscordIcon,
    external: true,
  },
  {
    name: "Blog",
    href: PAGES.BLOG,
    icon: ScrollText,
    external: false,
  },
];

interface FollowLinkAnchorProps {
  link: FollowLink;
  className?: string;
  iconClassName?: string;
  onClick?: () => void;
}

// ExternalLink forces target="_blank" on a raw anchor, which would open the
// on-site blog in a new tab and bypass client-side routing.
export function FollowLinkAnchor({
  link,
  className,
  iconClassName,
  onClick,
}: FollowLinkAnchorProps) {
  const Icon = link.icon;
  const content = <Icon className={iconClassName} />;

  if (link.external) {
    return (
      <ExternalLink href={link.href} className={className} aria-label={link.name} onClick={onClick}>
        {content}
      </ExternalLink>
    );
  }

  return (
    <Link href={link.href} className={className} aria-label={link.name} onClick={onClick}>
      {content}
    </Link>
  );
}
