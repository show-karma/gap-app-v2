import type { IProjectDetails } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { GithubIcon, GlobeIcon, LinkedinIcon, MessageCircleIcon, TwitterIcon } from "lucide-react";
import React from "react";
import { FarcasterIcon } from "@/components/Icons/Farcaster";
import { formatFarcasterLink } from "@/utilities/farcaster";

interface SocialLink {
  name: string;
  url: string;
  icon: React.FC<{ className?: string }>;
}

export const useProjectSocials = (links?: IProjectDetails["data"]["links"]): SocialLink[] => {
  return React.useMemo(() => {
    if (!links) return [];

    const types = [
      {
        name: "Twitter",
        prefix: ["twitter.com/", "x.com/"],
        icon: TwitterIcon,
      },
      { name: "Github", prefix: "github.com/", icon: GithubIcon },
      { name: "Discord", prefix: "discord.gg/", icon: MessageCircleIcon },
      { name: "Website", prefix: "https://", icon: GlobeIcon },
      { name: "LinkedIn", prefix: "linkedin.com/", icon: LinkedinIcon },
      {
        name: "Farcaster",
        prefix: ["warpcast.com/", "farcaster.xyz/"],
        icon: FarcasterIcon,
      },
    ];

    const hasHttpOrWWW = (link?: string) => {
      if (!link) return false;
      if (link.includes("http://") || link.includes("https://") || link.includes("www.")) {
        return true;
      }
      return false;
    };

    const addPrefix = (link: string) => `https://${link}`;

    const formatPrefix = (prefix: string, link: string) => {
      const firstWWW = link.slice(0, 4) === "www.";
      if (firstWWW) {
        return addPrefix(link);
      }
      const alreadyHasPrefix = link.includes(prefix);
      if (alreadyHasPrefix) {
        if (hasHttpOrWWW(link)) {
          return link;
        }
        return addPrefix(link);
      }

      return hasHttpOrWWW(prefix + link) ? prefix + link : addPrefix(prefix + link);
    };

    return types
      .map(({ name, prefix, icon }) => {
        const socialLink = links?.find((link) => link.type === name.toLowerCase())?.url;

        if (socialLink) {
          if (name === "Twitter") {
            const url = socialLink?.includes("@") ? socialLink?.replace("@", "") || "" : socialLink;

            if (Array.isArray(prefix)) {
              if (url.includes("twitter.com/") || url.includes("x.com/")) {
                return {
                  name,
                  url: hasHttpOrWWW(url) ? url : addPrefix(url),
                  icon,
                };
              }
              return {
                name,
                url: formatPrefix(prefix[1], url),
                icon,
              };
            }
          }

          if (name === "Farcaster") {
            return {
              name,
              url: formatFarcasterLink(socialLink),
              icon,
            };
          }

          if (name === "Discord") {
            // Discord links can be full URLs or short codes
            // If it's already a full URL, use it directly
            if (hasHttpOrWWW(socialLink)) {
              return {
                name,
                url: socialLink,
                icon,
              };
            }
            // Otherwise format with discord.gg prefix
            return {
              name,
              url: formatPrefix(prefix as string, socialLink),
              icon,
            };
          }

          return {
            name,
            url: formatPrefix(typeof prefix === "string" ? prefix : prefix[0], socialLink),
            icon,
          };
        }

        return undefined;
      })
      .filter((social): social is NonNullable<typeof social> => social !== undefined);
  }, [links]);
};
