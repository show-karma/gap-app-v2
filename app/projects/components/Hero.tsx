import { PAGES } from "@/utilities/pages";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";

const ProjectDialog = dynamic(
  () =>
    import("@/components/Dialogs/ProjectDialog").then(
      (mod) => mod.ProjectDialog
    ),
  { ssr: false }
);

const areGrantOperatorLink = "/";

export default function Hero() {
  const icons = [
    {
      icon: "/icons/explorer/heart.svg",
      bgColor: "#FDE3FF",
    },
    {
      icon: "/icons/explorer/wave.svg",
      bgColor: "#DBFFC5",
    },
    {
      icon: "/icons/explorer/money.svg",
      bgColor: "#DDF9F2",
    },
    {
      icon: "/icons/explorer/recurring.svg",
      bgColor: "#ECE9FE",
    },
    {
      icon: "/icons/explorer/thumbs-up.svg",
      bgColor: "#FFF3D4",
    },
    {
      icon: "/icons/explorer/chain.svg",
      bgColor: "#FFE6D5",
    },
  ];
  return (
    <section className="flex flex-1 flex-col gap-2 relative h-full min-h-[95vh] mb-10">
      <div
        id="hero-top"
        className="flex flex-col gap-2 max-h-1/2 h-full w-full items-center justify-end pt-24 z-[2] max-sm:px-2"
      >
        <div
          id="icons-row"
          className="flex flex-row gap-4 flex-wrap mb-7 items-center max-sm:justify-center"
        >
          {icons.map((icon, index) => (
            <div
              key={index}
              className="flex flex-row gap-2 p-3 rounded items-center justify-center"
              style={{
                backgroundColor: icon.bgColor,
              }}
            >
              <Image src={icon.icon} alt="icon" width={20} height={20} />
            </div>
          ))}
        </div>
        <p className="text-[#6172F3] font-semibold text-xl font-body text-center">
          Show your work. Build your rep. Earn trust onchain
        </p>
        <h1 className="text-brand-darkblue dark:text-zinc-100 font-bold text-6xl font-body text-center max-sm:text-3xl">
          Projects on Karma GAP
        </h1>
        <p className="text-brand-darkblue  dark:text-zinc-200 font-body text-xl font-normal text-center max-sm:text-base">
          Track milestones, grow reputation, and connect with funders{" "}
          <br className="max-sm:hidden" /> using the Grantee Accountability
          Protocol.
        </p>
        <div className="flex flex-row gap-4 mt-4">
          <Link
            href={PAGES.PROJECTS_EXPLORER("browse-projects")}
            className="px-5 py-2.5 font-semibold text-sm rounded bg-white text-brand-blue dark:bg-zinc-900 border border-brand-blue transition-all ease-in-out duration-200 hover:opacity-80"
          >
            Explore Projects
          </Link>
          <ProjectDialog
            buttonElement={{
              text: "Create Project",
              iconSide: "left",
              styleClass: "",
            }}
          />
        </div>
        <div className="mt-4 text-sm text-brand-darkblue dark:text-zinc-200 font-normal">
          Are you a <span className="font-bold">grant operator?</span> Click{" "}
          <Link
            href={areGrantOperatorLink}
            className="text-brand-blue underline"
          >
            here
          </Link>
        </div>
      </div>
      <div
        id="hero-bottom"
        className="flex max-h-1/2 h-full flex-col gap-2 w-full"
      />
      <div className="absolute top-10 max-sm:top-0 bottom-0  overflow-x-hidden left-0 w-full h-full z-[1] flex items-end justify-center">
        <Image
          src="/images/explorer/artwork.svg"
          alt="hero-bottom"
          width="0"
          height="0"
          sizes="100vw"
          quality={100}
          className="w-[90%] h-auto max-sm:w-[300vw] "
        />
      </div>
    </section>
  );
}
