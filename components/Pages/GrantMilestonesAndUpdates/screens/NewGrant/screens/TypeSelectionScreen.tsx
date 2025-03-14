import React from "react";
import { StepBlock } from "../StepBlock";
import { Button } from "@/components/Utilities/Button";
import { useGrantFormStore } from "../store";
import { useRouter } from "next/navigation";
import { PAGES } from "@/utilities/pages";
import { useProjectStore } from "@/store";
import Image from "next/image";
import { NextButton } from "./buttons/NextButton";
import { CancelButton } from "./buttons/CancelButton";

interface TypeOption {
  icon: string;
  type: "grant" | "program";
  title: string;
  description: string;
}

export const TypeSelectionScreen: React.FC = () => {
  const { setCurrentStep, setFlowType, flowType } = useGrantFormStore();
  const selectedProject = useProjectStore((state) => state.project);
  const router = useRouter();

  const options: TypeOption[] = [
    {
      icon: "/icons/moneybag.svg",
      type: "grant",
      title: "I want to add a grant",
      description:
        "Record details about a grant you have already received to track your funding and showcase your achievements.",
    },
    {
      icon: "/icons/rocket.svg",
      type: "program",
      title: "Join a Funding Program",
      description:
        "Apply to participate in available funding programs to access new financial opportunities for your work.",
    },
  ];

  const handleOptionSelect = (type: "grant" | "program") => {
    setFlowType(type);
  };

  const handleNext = () => {
    setCurrentStep(2);
  };

  const handleCancel = () => {
    if (!selectedProject) return;
    router.push(
      PAGES.PROJECT.GRANTS(
        selectedProject.details?.data?.slug || selectedProject?.uid
      )
    );
  };

  return (
    <StepBlock currentStep={1} totalSteps={4}>
      <div className="flex flex-col items-center w-full mx-auto">
        <h3 className="text-2xl text-black dark:text-zinc-100 font-semibold mb-6 text-center">
          What are you looking for?
        </h3>

        <div className="flex flex-row gap-6 w-full mb-10 max-md:flex-col">
          {options.map((option) => (
            <div
              key={option.type}
              onClick={() => handleOptionSelect(option.type)}
              className={`flex flex-col p-12 gap-6 border-2 rounded-lg cursor-pointer flex-1 transition-all ${
                flowType === option.type
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-center justify-center ">
                <Image
                  src={option.icon}
                  alt={option.title}
                  width={44}
                  height={44}
                />
              </div>
              <div className="flex flex-col items-center">
                <h4 className="text-xl text-brand-darkblue dark:text-brand-lightblue text-center font-bold">
                  {option.title}
                </h4>
                <p className="text-brand-darkblue dark:text-brand-lightblue text-base text-center">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-row justify-end w-full gap-4">
          <CancelButton onClick={handleCancel} />
          <NextButton onClick={handleNext} />
        </div>
      </div>
    </StepBlock>
  );
};
