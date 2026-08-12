import { ScrollText } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { DiscordIcon, TelegramIcon, TwitterIcon } from "@/components/Icons";
import { PAGES } from "@/utilities/pages";
import { SOCIALS } from "@/utilities/socials";

export interface FollowLink {
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
