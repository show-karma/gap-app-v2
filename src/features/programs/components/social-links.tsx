"use client";

import type { LucideIcon } from "lucide-react";
import { FileText, Globe, MessageCircle, MessageSquare, Send, Twitter } from "lucide-react";
import Link from "next/link";

interface SocialLinksData {
  website?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
  blog?: string;
  forum?: string;
}

interface SocialLink {
  key: keyof SocialLinksData;
  icon: LucideIcon;
  label: string;
}

const SOCIAL_NETWORKS: SocialLink[] = [
  { key: "website", icon: Globe, label: "Website" },
  { key: "twitter", icon: Twitter, label: "Twitter" },
  { key: "discord", icon: MessageCircle, label: "Discord" },
  { key: "telegram", icon: Send, label: "Telegram" },
  { key: "blog", icon: FileText, label: "Blog" },
  { key: "forum", icon: MessageSquare, label: "Forum" },
];

interface SocialLinksProps {
  socialLinks?: SocialLinksData;
}

function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export function SocialLinks({ socialLinks }: SocialLinksProps) {
  if (!socialLinks) return null;

  const visibleLinks = SOCIAL_NETWORKS.filter((network) => socialLinks[network.key]);

  if (visibleLinks.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {visibleLinks.map(({ key, icon: Icon, label }) => (
        <Link
          key={key}
          href={normalizeUrl(socialLinks[key]!)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit ${label}`}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </div>
  );
}
