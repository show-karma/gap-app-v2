"use client";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { FC, ReactNode, useState } from "react";

interface GrantsAccordionProps {
  children: ReactNode;
}

export const GrantsAccordion: FC<GrantsAccordionProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };
  return (
    <div className="rounded-lg border border-[#E3E8EF] w-full  px-3 py-4">
      <button
        type="button"
        className="flex flex-row gap-4 items-center w-full justify-between text-start"
        onClick={toggleAccordion}
      >
        <p className="text-base font-semibold">Select grant</p>
        <div className="rounded-lg text-[#004EEB] p-2 bg-[#EEF4FF]">
          {isOpen ? (
            <ChevronDownIcon className="w-5 h-5" />
          ) : (
            <ChevronRightIcon className="w-5 h-5" />
          )}
        </div>
      </button>
      {isOpen ? (
        <div className="mt-4 flex flex-col gap-2">{children}</div>
      ) : null}
    </div>
  );
};
