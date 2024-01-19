import React from "react";
import Head from "next/head";
import { blo } from "blo";

export default function MyProjects() {
  const cards = [
    {
      name: "Open Source Observer",
      title: "Plurality labs - firestarters",
      createdDate: "2022-01-01",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      badges: ["Badge1", "Badge2", "Badge3"],
      createdBy: "0x1234567890123456789012345678901234567890",
    },
    {
      name: "Open Source Enthusiast",
      title: "Innovation labs - trailblazers",
      createdDate: "2022-02-01",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      badges: ["Badge4", "Badge5", "Badge6"],
      createdBy: "0x1234567890123456789012345678901234567890",
    },
    {
      name: "Open Source Contributor",
      title: "Tech labs - pioneers",
      createdDate: "2022-03-01",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      badges: ["Badge7", "Badge8", "Badge9"],
      createdBy: "0x1234567890123456789012345678901234567890",
    },
    {
      name: "Open Source Contributor",
      title: "Tech labs - pioneers",
      createdDate: "2022-03-01",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      badges: ["Badge7", "Badge8", "Badge9"],
      createdBy: "0x1234567890123456789012345678901234567890",
    },
  ];

  return (
    <>
      <Head>
        <title>Gap</title>
        <meta name="title" content="Gap" />
      </Head>

      <div className="px-4 sm:px-6 lg:px-8 py-5">
        <div className="text-2xl font-bold">My Projects</div>
        <div className="mt-5 grid grid-cols-4 gap-5">
          {cards.map((card, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 p-5 rounded-xl shadow-md"
            >
              <div className="text-lg font-bold">{card.name}</div>
              <div className="text-sm text-gray-900">{card.title}</div>

              <div className="mt-3 text-gray-600 text-sm font-semibold">
                Summary
              </div>
              <div className="text-sm text-gray-900 text-ellipsis line-clamp-2">
                {card.description}
              </div>

              <div className="mt-3 space-x-2">
                {card.badges.map((badge, index) => (
                  <span
                    className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                    key={index}
                  >
                    {badge}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Built by</span>
                  <span>
                    <img
                      src={blo(card.createdBy, 8)}
                      alt={card.createdBy}
                      className="h-12 w-12 rounded-md ring-4 ring-gray-50 dark:ring-black border-1 border-gray-100 dark:border-zinc-900 sm:h-5 sm:w-5"
                    />
                  </span>
                </div>

                <div className="text-xs text-gray-600">
                  Created on &nbsp;
                  {new Date(card.createdDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
