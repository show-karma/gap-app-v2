import Image from "next/image";
import Link from "next/link";
import { DiscordIcon, MirrorIcon, TelegramIcon, TwitterIcon } from "../Icons";
import { SOCIALS } from "@/utilities";

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
      name: "Mirror",
      href: SOCIALS.MIRROR,
      icon: MirrorIcon,
    },
  ],
};

export default function Footer() {
  return (
    <footer id="contact" className="bg-gray-900 dark:bg-black">
      <div className="px-6 py-20 sm:py-14 lg:px-8 flex items-center justify-between flex-row max-lg:flex-col gap-8">
        <div>
          <div className="flex items-center gap-x-2">
            <Image
              src="/logo/logo-dark.png"
              className="h-12 w-12 lg:h-auto lg:w-[50px] ml-0 inline"
              width={464}
              height={500}
              alt="Gap"
            />
            <div className="text-white text-3xl font-black">karma</div>
          </div>
          <div className="flex justify-center space-x-3">
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
        <div className="text-gray-500 font-medium text-sm">
          {" "}
          Copyright © {new Date().getFullYear()}
        </div>
        <div className="font-medium">
          <div className="text-white uppercase text-sm font-semibold">
            Resources
          </div>
          <div className="mt-3 text-gray-500">SDK Docs</div>
          <div className="text-gray-500">Sitemap</div>
        </div>
      </div>
    </footer>
  );
}
