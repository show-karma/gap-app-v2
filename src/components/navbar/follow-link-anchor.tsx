"use client";

import Link from "next/link";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import type { FollowLink } from "@/src/components/navbar/follow-links";

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
