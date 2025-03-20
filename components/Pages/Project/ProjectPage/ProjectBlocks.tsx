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
    disabled?: boolean;
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
    {
      iconSrc: "/icons/deck.svg",
      title: "Read Pitch Deck",
      description: "Read the pitch deck of the project",
      bg: "bg-[#ECE9FE]",
      link: project?.details?.data.links
        ?.find((link) => link.type === "pitchDeck")
        ?.url.includes("http")
        ? project?.details?.data.links?.find(
            (link) => link.type === "pitchDeck"
          )?.url
        : `https://${
            project?.details?.data.links?.find(
              (link) => link.type === "pitchDeck"
            )?.url
          }`,
      disabled: !project?.details?.data.links?.find(
        (link) => link.type === "pitchDeck"
      )?.url,
    },
    {
      iconSrc: "/icons/video.svg",
      title: "Watch Demo Video",
      description: "Watch the demo video of the project",
      bg: "bg-[#FDE3FF]",
      link: project?.details?.data.links
        ?.find((link) => link.type === "demoVideo")
        ?.url.includes("http")
        ? project?.details?.data.links?.find(
            (link) => link.type === "demoVideo"
          )?.url
        : `https://${
            project?.details?.data.links?.find(
              (link) => link.type === "demoVideo"
            )?.url
          }`,
      disabled: !project?.details?.data.links?.find(
        (link) => link.type === "demoVideo"
      )?.url,
    },
    {
      iconSrc: "/icons/wave.svg",
      title: "Request intro",
      description: "Get an introduction to connect",
      action: () => setIsIntroModalOpen(true),
      bg: "bg-[#DBFFC5]",
    },
    {
      iconSrc: "/icons/thumbs-up.svg",
      title: "Endorse the Project",
      description: "Publicly endorse our project",
      action: () => setIsEndorsementOpen(true),
      bg: "bg-[#FFF3D4]",
    },
    // {
    //   iconSrc: "/icons/link.png",
    //   title: "Farcaster Link",
    //   description: "Share your project on Farcaster as a frame",
    //   bg: "bg-[#FFE6D5]",
    //   action: () => {
    //     copy(
    //       envVars.VERCEL_URL +
    //         PAGES.PROJECT.OVERVIEW(
    //           project?.details?.data.slug || (params.projectId as string)
    //         ),
    //       "Just post the link to Farcaster and it will be displayed as a frame!"
    //     );
    //   },
    // },
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
          `flex flex-col items-start gap-3 p-3 rounded-lg flex-1 max-w-full w-full justify-start h-full`,
          item.bg
        )}
      >
        <img src={item.iconSrc} alt={item.title} className="w-6 h-6" />
        <p className="text-sm font-bold text-black text-left">{item.title}</p>
      </div>
    );
  }

  const blocksWithCondition = blocks.filter((item) => !item.disabled);
  return (
    <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-3">
      {blocksWithCondition.map((item) =>
        item.action ? (
          <button
            type="button"
            key={item.title}
            onClick={() => item?.action?.()}
            className="w-full h-full min-h-max max-h-full"
          >
            <Block key={item.title} item={item} />
          </button>
        ) : (
          <ExternalLink
            href={item.link}
            key={item.title}
            className="w-full h-full min-h-max max-h-full"
          >
            <Block key={item.title} item={item} />
          </ExternalLink>
        )
      )}
    </div>
  );
}
