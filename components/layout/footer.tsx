/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { DiscordIcon, TelegramIcon, TwitterIcon } from "../Icons";
import { ExternalLink } from "@/components/ui/external-link";
import { SOCIALS } from "@/utilities/socials";
import { ParagraphIcon } from "../Icons/Paragraph";
import { PAGES } from "@/utilities/pages";
import { karmaLinks } from "@/utilities/karma/karma";

const navigation = {
  social: [
    {
      name: "Twitter",
      href: SOCIALS.TWITTER,
      icon: TwitterIcon,
    },
    {
      name: "Telegram",
      href: SOCIALS.TELEGRAM,
      icon: TelegramIcon,
    },
    {
      name: "Discord",
      href: SOCIALS.DISCORD,
      icon: DiscordIcon,
    },
    {
      name: "Paragraph",
      href: SOCIALS.PARAGRAPH,
      icon: ParagraphIcon,
    },
  ],
};

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#181b2a] dark:bg-black">
      <div className="flex w-full flex-row items-center justify-between gap-8 bg-[#181b2a] px-16 max-lg:px-8 py-12 max-md:flex-col max-md:gap-10 max-md:px-4 max-md:py-12">
        <div>
          <div className="flex items-center gap-x-2">
            <img
              src="/images/karma-logo-dark.svg"
              alt="Karma logo"
              className="h-16 w-[160px]"
            />
          </div>
          <div className="flex flex-row items-center gap-2">
            {navigation.social.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-400 hover:text-gray-500 dark:text-zinc-400 dark:hover:text-zinc-500"
                target="_blank"
                passHref={true}
              >
                <span className="sr-only">{item.name}</span>
                <item.icon className="h-6 w-6" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
        <p className="text-sm font-medium text-[#888ba2]">
          {" "}
          Copyright © {new Date().getFullYear()}
        </p>
        <div className="flex w-max flex-col items-start justify-end text-left">
          <div className="mb-3 text-sm font-medium uppercase text-white">
            Resources
          </div>
          <ExternalLink
            href={karmaLinks.githubSDK}
            className="text-[#A5A7C0] transition-all ease-in-out hover:text-gray-300"
          >
            SDK Docs
          </ExternalLink>
          <ExternalLink
            href="/sitemap.xml"
            className="text-[#A5A7C0] transition-all ease-in-out hover:text-gray-300"
          >
            Sitemap
          </ExternalLink>
          <ExternalLink
            href={karmaLinks.apiDocs}
            className="text-[#A5A7C0] transition-all ease-in-out hover:text-gray-300"
          >
            API Docs
          </ExternalLink>
          <ExternalLink
            href={PAGES.TERMS_AND_CONDITIONS}
            className="text-[#A5A7C0] transition-all ease-in-out hover:text-gray-300"
            target="_blank"
          >
            Terms and Conditions
          </ExternalLink>
          <ExternalLink
            href={PAGES.PRIVACY_POLICY}
            className="text-[#A5A7C0] transition-all ease-in-out hover:text-gray-300"
            target="_blank"
          >
            Privacy Policy
          </ExternalLink>
        </div>
      </div>
    </footer>
  );
}
