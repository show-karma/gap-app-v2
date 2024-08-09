import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useProjectStore } from "@/store";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useIntroModalStore } from "@/store/modals/intro";
import { envVars } from "@/utilities/enviromentVars";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { useParams } from "next/navigation";

export function ProjectBlocks() {
  const project = useProjectStore((state) => state.project);
  const { setIsEndorsementOpen } = useEndorsementStore();
  const [, copy] = useCopyToClipboard();
  const params = useParams();
  const { setIsIntroModalOpen } = useIntroModalStore();

  const blocks: {
    iconSrc: string;
    title: string;
    description: string;
    link?: string;
    action?: () => void;
    bg: string;
  }[] = [
    // {
    //   iconSrc: "/icons/donate-once.png",
    //   title: "Donate once",
    //   description: "Make a one-time contribution",
    //   link: "/",
    //   bg: "bg-[#DDF9F2]",
    // },
    // {
    //   iconSrc: "/icons/recurring-donate.png",
    //   title: "Recurring Donation",
    //   description: "Setup a monthly donation",
    //   link: "/",
    //   bg: "bg-[#ECE9FE]",
    // },
    // {
    //   iconSrc: "/icons/intro.png",
    //   title: "Request intro",
    //   description: "Get an introduction to connect",
    //   action: () => setIsIntroModalOpen(true),
    //   bg: "bg-[#DBFFC5]",
    // },
    {
      iconSrc: "/icons/endorsements.png",
      title: "Endorse the Project",
      description: "Publicly endorse our project",
      action: () => setIsEndorsementOpen(true),
      bg: "bg-[#FFF3D4]",
    },
    {
      iconSrc: "/icons/link.png",
      title: "Farcaster Link",
      description: "Share your project on Farcaster as a frame",
      bg: "bg-[#FFE6D5]",
      action: () => {
        copy(
          envVars.VERCEL_URL +
            PAGES.PROJECT.OVERVIEW(
              project?.details?.data.slug || (params.projectId as string)
            ),
          "Just post the link to Farcaster and it will be displayed as a frame!"
        );
      },
    },
    // {
    //   iconSrc: "/icons/support.png",
    //   title: "Support the Project",
    //   description: "Help us continue our work",
    //   link: "/",
    //   bg: "bg-[#FDE3FF]",
    // },
  ];

  function Block({ item }: { item: (typeof blocks)[number] }) {
    return (
      <div
        className={cn(
          `flex flex-row items-center gap-3 p-4 rounded-xl max-w-full w-full justify-start`,
          item.bg
        )}
      >
        <img src={item.iconSrc} alt={item.title} className="w-6 h-6" />
        <p className="text-sm font-bold text-black text-left">{item.title}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-row gap-3 flex-wrap max-lg:gap-1">
      {blocks.map((item) =>
        item.action ? (
          <button
            type="button"
            key={item.title}
            onClick={() => item?.action?.()}
            className="w-full"
          >
            <Block key={item.title} item={item} />
          </button>
        ) : (
          <ExternalLink href={item.link} key={item.title} className="w-full">
            <Block key={item.title} item={item} />
          </ExternalLink>
        )
      )}
    </div>
  );
}
