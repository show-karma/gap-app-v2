"use client";

import { useRef } from "react";
import { useSnapCarousel } from "react-snap-carousel";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRightIcon } from "@heroicons/react/24/solid";
import { blo } from "blo";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import { ExternalLink } from "@/components/Utilities/ExternalLink";

const ProjectCardTextBlock = ({
  link,
  title,
  description,
  contributors,
}: {
  link: string;
  title: string;
  description: string;
  contributors: { address: string; avatar: string | undefined }[];
}) => {
  return (
    <ExternalLink
      href={link}
      className="flex relative h-max min-h-1/2 max-h-full z-[2]  justify-end items-start rounded-2xl p-6 bg-gradient-to-t from-black/60 to-black/0 overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md flex-col"
    >
      <div className="flex items-center justify-start flex-row gap-2 mb-2">
        <h3 className="text-2xl font-body font-semibold text-white">{title}</h3>
        <ArrowUpRightIcon className="w-3 h-3 text-white" />
      </div>
      <p className="text-white text-base mb-4 line-clamp-3">{description}</p>
      <div className="flex items-center">
        <span className="text-sm font-semibold text-white mr-2">Built by</span>
        <div className="flex -space-x-2">
          {contributors.map((contributor) => (
            <EthereumAddressToENSAvatar
              key={contributor.address + title}
              address={contributor.address}
              className="object-cover w-8 h-8 rounded-full border border-white"
            />
          ))}
        </div>
      </div>
    </ExternalLink>
  );
};

export default function FeaturedProjects() {
  const { scrollRef, pages, activePageIndex, goTo, next, prev } =
    useSnapCarousel();

  const projects = [
    {
      id: 1,
      title: "Project 3D NFT",
      description:
        "Lorem ipsum dolor sit amet consectetur. Lacinia ac felis parturient blandit scelerisque sed massa. Id turpis viverra eros ipsum scelerisque. Feugiat lacus.",
      image: "/images/explorer/featured-01.jpg",
      link: "#",
      contributors: [
        {
          address: "0x1234567890123456789012345678901234567891",
          avatar: undefined,
        },
        {
          address: "0x1234567890123456789012345678901234567892",
          avatar: undefined,
        },
        {
          address: "0x1234567890123456789012345678901234567893",
          avatar: undefined,
        },
      ],
    },
    {
      id: 2,
      title: "Project 2",
      description:
        "Lorem ipsum dolor sit amet consectetur. Lacinia ac felis parturient blandit scelerisque sed massa. Id turpis viverra eros ipsum scelerisque.",
      image: "/images/explorer/featured-02.jpg",
      link: "#",
      contributors: [
        {
          address: "0x1234567890523456789012345678901234567891",
          avatar: undefined,
        },
        {
          address: "0x1234567890153456789012345678901234567892",
          avatar: undefined,
        },
        {
          address: "0x1234567890125456789012345678901234567893",
          avatar: undefined,
        },
      ],
    },
    {
      id: 3,
      title: "Project 3",
      description:
        "Lorem ipsum dolor sit amet consectetur. Lacinia ac felis parturient blandit scelerisque sed massa. Id turpis viverra eros ipsum scelerisque.",
      image: "/images/explorer/featured-03.jpg",
      link: "#",
      contributors: [
        {
          address: "0x1234567810123456789012345678901234567891",
          avatar: undefined,
        },
        {
          address: "0x1234537890123456789012345678901234567892",
          avatar: undefined,
        },
        {
          address: "0x1235567890123456789012345678901234567893",
          avatar: undefined,
        },
      ],
    },
  ];

  // Group projects into sets of 3
  const projectGroups = [];
  for (let i = 0; i < projects.length; i += 3) {
    projectGroups.push(projects.slice(i, i + 3));
  }

  return (
    <section
      id="featured-projects"
      className="mb-20 px-16 py-12 flex flex-col gap-6 h-full min-h-screen  max-sm:px-4 max-sm:py-6"
    >
      <h2 className="text-4xl max-sm:text-2xl font-semibold text-black dark:text-zinc-100 max-sm:mb-0 mb-8">
        Featured projects
      </h2>

      <div className="flex flex-col w-full h-full">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {projectGroups.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className="flex-none w-full snap-start max-sm:flex max-sm:flex-col max-sm:w-full"
            >
              <div className="flex gap-4 h-[70vh] max-sm:flex max-sm:flex-col max-sm:w-full max-sm:h-[100vh]">
                {/* First project: 2/3 width, full height */}
                <div className="w-2/3 h-full relative flex justify-end items-end max-sm:h-1/3  max-sm:w-full">
                  <div className="position rounded-2xl flex-1 z-[1] overflow-hidden">
                    <Image
                      src={group[0].image}
                      alt={group[0].title}
                      fill
                      className="object-cover rounded-2xl"
                    />
                  </div>
                  <ProjectCardTextBlock
                    link={group[0].link}
                    title={group[0].title}
                    description={group[0].description}
                    contributors={group[0].contributors}
                  />
                </div>

                {/* Second column: 1/3 width with two projects stacked */}
                <div className="w-1/3 flex flex-col gap-4 rounded-2xl max-sm:flex-col max-sm:w-full  max-sm:h-2/3">
                  {/* Only render if we have more than 1 project in this group */}
                  {group.length > 1 && (
                    <div className="h-1/2 relative flex justify-end items-end  max-sm:h-1/2">
                      <div className="position rounded-2xl flex-1 z-[1] overflow-hidden">
                        <Image
                          src={group[1].image}
                          alt={group[1].title}
                          fill
                          className="object-cover rounded-2xl"
                        />
                      </div>
                      <ProjectCardTextBlock
                        link={group[1].link}
                        title={group[1].title}
                        description={group[1].description}
                        contributors={group[1].contributors}
                      />
                    </div>
                  )}

                  {/* Only render if we have more than 2 projects in this group */}
                  {group.length > 2 && (
                    <div className="h-1/2 relative flex justify-end items-end max-sm:h-1/2">
                      <div className="position rounded-2xl flex-1 z-[1] overflow-hidden">
                        <Image
                          src={group[2].image}
                          alt={group[2].title}
                          fill
                          className="object-cover rounded-2xl"
                        />
                      </div>
                      <ProjectCardTextBlock
                        link={group[2].link}
                        title={group[2].title}
                        description={group[2].description}
                        contributors={group[2].contributors}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-6 gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === activePageIndex
                  ? "bg-black dark:bg-white w-5"
                  : "bg-zinc-300 dark:bg-zinc-600"
              }`}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
