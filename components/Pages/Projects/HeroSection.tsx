"use client";

import Link from "next/link";
import { CreateProjectButton } from "@/src/features/homepage/components/create-project-button";
import { PAGES } from "@/utilities/pages";

const HERO_ICONS = [
  { emoji: "💖", id: "support", bgColor: "bg-[#FDE3FF]" },
  { emoji: "👋", id: "collaboration", bgColor: "bg-[#DBFFC5]" },
  { emoji: "💰", id: "funding", bgColor: "bg-[#DDF9F2]" },
  { emoji: "🔁", id: "communication", bgColor: "bg-[#ECE9FE]" },
  { emoji: "👍", id: "endorsement", bgColor: "bg-[#FFF3D4]" },
  { emoji: "🔗", id: "connection", bgColor: "bg-[#FFE6D5]" },
];

export const ProjectsHeroSection = () => {
  const handleScrollToProjects = () => {
    document.getElementById("browse-projects")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <section
      className="relative flex flex-col items-center justify-center py-16 px-4 bg-no-repeat bg-bottom bg-contain pb-32 sm:pb-48 md:pb-64 lg:pb-96"
      style={{
        backgroundImage: "url('/images/karma-projects-page-bg.svg')",
      }}
    >
      {/* Icon row - 44x44px decorative icons */}
      <div className="flex gap-3 mb-5" aria-hidden="true">
        {HERO_ICONS.map((icon) => (
          <span
            key={icon.id}
            className={`w-11 h-11 flex items-center justify-center text-xl rounded-sm ${icon.bgColor}`}
          >
            {icon.emoji}
          </span>
        ))}
      </div>

      {/* Tagline - Text xl/Semibold: 20px, 600, 30px line height */}
      <p className="text-blue-600 dark:text-blue-400 text-xl font-semibold leading-[30px] text-center mb-5">
        Show your work. Build your rep. Earn trust onchain
      </p>

      {/* Title - Display xl/Bold: 60px, 700, 72px line height, -2% letter spacing */}
      <h1 className="text-[60px] leading-[72px] font-bold text-center text-black dark:text-white tracking-[-0.02em] mb-5">
        Projects on Karma
      </h1>

      {/* Subtitle - Text xl/Regular: 20px, 400, 30px line height */}
      <p className="text-gray-600 dark:text-gray-400 text-xl font-normal leading-[30px] text-center max-w-2xl mb-8">
        Track milestones, grow reputation, and connect with funders using the Grantee Accountability
        Protocol.
      </p>

      {/* Buttons */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={handleScrollToProjects}
          className="px-5 py-2 border border-brand-blue text-brand-blue dark:border-zinc-600 rounded-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors dark:text-white h-[40px]"
        >
          Explore Projects
        </button>
        <CreateProjectButton styleClass="flex px-5 py-2 bg-blue-600 text-white rounded-sm font-medium hover:bg-blue-700 transition-colors h-[40px]" />
      </div>

      {/* Grant operator link */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Are you a <span className="font-semibold">grant operator</span>?{" "}
        <Link href={PAGES.REGISTRY.ADD_PROGRAM} className="text-blue-600 hover:underline">
          Add your program
        </Link>
      </p>
    </section>
  );
};
