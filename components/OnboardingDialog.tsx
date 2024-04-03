/* eslint-disable @next/next/no-img-element */
import { FC, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "./Utilities/Button";
import { useOnboarding } from "@/store/onboarding";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

const WelcomeStep = () => {
  const { changeOnboardingStep } = useOnboarding();
  return (
    <div className="flex flex-row gap-6 items-center">
      <img
        src="/images/karma-gap-onboarding-welcome.png"
        alt="logo"
        className="h-[320px] w-[320px] max-sm:hidden"
      />
      <div className="flex flex-col gap-6">
        <img
          alt="Karma GAP"
          className="h-8 w-52"
          src="/logo/karma-gap-logo2.png"
        />
        <div className="flex flex-col gap-0">
          <h1 className="text-3xl font-bold max-sm:text-2xl">
            Welcome to Karma GAP!
          </h1>
          <p className="text-base font-normal text-black dark:text-zinc-400">
            {`We're thrilled to have you join our community of builders. This is a 30 second walkthrough to help you utilize GAP effectively.`}
          </p>
        </div>

        <div className="flex flex-row gap-4 mt-2 justify-end max-sm:flex-col">
          <Button
            className="text-white text-lg bg-black border-black max-sm:justify-center flex flex-row gap-2 items-center hover:bg-black hover:text-white py-2.5 px-10 rounded-sm"
            onClick={() => changeOnboardingStep("first")}
          >
            Next <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
const FirstStep = () => {
  const { changeOnboardingStep } = useOnboarding();
  return (
    <div className="flex flex-row gap-6 items-center">
      <img
        src="/images/karma-gap-onboarding-welcome.png"
        alt="logo"
        className="h-[320px] w-[320px] max-sm:hidden"
      />
      <div className="flex flex-col gap-6">
        <div className="mt-4 flex flex-col gap-0">
          <h3 className="text-sm font-semibold text-[#344054] dark:text-zinc-200">
            STEP 1
          </h3>
          <h4 className="text-black dark:text-white font-bold text-xl">
            Add your project/personal profile
          </h4>
          <div className="flex flex-col gap-4">
            <p className="text-base font-normal text-[#1D2939]  dark:text-zinc-300">{`Creating a project is the first big step. Add details about your project, social links and your team members. 
You do this just once!`}</p>
            <p className="text-base font-normal text-[#1D2939]  dark:text-zinc-300">{`Note: Don't add your grant details here. This is to just tell the entire world how awesome your project is :)`}</p>
          </div>
        </div>
        <div className="flex flex-row gap-4 mt-12 justify-end max-sm:flex-col">
          <Button
            className="text-black text-lg bg-white border max-sm:justify-center border-black dark:border-none flex flex-row gap-2 items-center hover:bg-white hover:text-black py-2.5 px-10 rounded-sm"
            onClick={() => changeOnboardingStep("welcome")}
          >
            <ChevronLeftIcon className="h-5 w-5" />
            Back
          </Button>
          <Button
            className="text-white text-lg bg-black border-black max-sm:justify-center flex flex-row gap-2 items-center hover:bg-black hover:text-white py-2.5 px-10 rounded-sm"
            onClick={() => changeOnboardingStep("grants")}
          >
            Next <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
const GrantStep = () => {
  const { changeOnboardingStep } = useOnboarding();
  return (
    <div className="flex flex-row gap-6 items-start pt-6">
      <img
        src="/images/karma-gap-onboarding-adding-grants.png"
        alt="logo"
        className="h-[320px] w-[320px] max-sm:hidden"
      />
      <div className="flex flex-col gap-6">
        <div className="mt-4 flex flex-col gap-0">
          <h3 className="text-sm font-semibold text-[#344054] dark:text-zinc-200">
            STEP 2
          </h3>
          <h4 className="text-black dark:text-white font-bold text-xl">
            Add Grant
          </h4>
          <div className="flex flex-col gap-4">
            <p className="text-base font-normal text-[#1D2939] dark:text-zinc-400">{`Once you've created your project, you can now add a grant you've received. You can add as many grants as you like. They will all be linked to your project!`}</p>
            <p className="text-base font-normal text-[#1D2939] dark:text-zinc-400">{`While you are at it, go ahead and answer some questions about impact and how you plan to use those funds.`}</p>
          </div>
        </div>
        <div className="flex flex-row gap-4 mt-12 justify-end max-sm:flex-col">
          <Button
            className="text-black text-lg bg-white border max-sm:justify-center border-black dark:border-none flex flex-row gap-2 items-center hover:bg-white hover:text-black py-2.5 px-10 rounded-sm"
            onClick={() => changeOnboardingStep("first")}
          >
            <ChevronLeftIcon className="h-5 w-5" />
            Back
          </Button>
          <Button
            className="text-white text-lg bg-black border-black max-sm:justify-center flex flex-row gap-2 items-center hover:bg-black hover:text-white py-2.5 px-10 rounded-sm"
            onClick={() => changeOnboardingStep("updates")}
          >
            Next <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
const UpdatesStep = () => {
  const { changeOnboardingStep } = useOnboarding();
  return (
    <div className="flex flex-col">
      <div className="flex flex-row gap-6 items-start pt-6">
        <img
          src="/images/karma-gap-onboarding-updates.png"
          alt="logo"
          className="h-[320px] w-[320px] max-sm:hidden"
        />
        <div className="flex flex-col gap-6 mt-6 max-sm:mt-0">
          <div className="mt-4 flex flex-col gap-0">
            <h4 className="text-black dark:text-white font-bold text-xl">
              Add Milestones and updates
            </h4>
            <div className="flex flex-col gap-4">
              <p className="text-base font-normal text-[#1D2939] dark:text-zinc-400">{`This is where you create milestones explaining everything you plan to accomplish through this grant.`}</p>
              <p className="text-base font-normal text-[#1D2939] dark:text-zinc-400">{`When you complete a milestone, you can post an update on that milestone! This is a great way to keep the community and program managers updated on your progress.`}</p>
              <p className="text-base font-normal text-[#1D2939] dark:text-zinc-400">{`It's that simple :)`}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-4 justify-end max-sm:mt-10 max-sm:flex-col">
        <Button
          className="text-black text-lg bg-white border max-sm:justify-center border-black dark:border-none flex flex-row gap-2 items-center hover:bg-white hover:text-black py-2.5 px-10 rounded-sm"
          onClick={() => changeOnboardingStep("grants")}
        >
          <ChevronLeftIcon className="h-5 w-5" />
          Back
        </Button>
        <Button
          className="max-sm:justify-center text-white text-lg bg-black border-black flex flex-row gap-2 items-center hover:bg-black hover:text-white py-2.5 px-10 rounded-sm"
          onClick={() => changeOnboardingStep("structure")}
        >
          Next <ChevronRightIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
const StructureStep = () => {
  const { changeOnboardingStep, setIsOnboarding } = useOnboarding();
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-6 items-center justify-center pt-6">
        <h3 className="text-black font-bold text-xl dark:text-white">
          This is the structure of our projects
        </h3>
        <img
          src="/images/karma-gap-onboarding-structure.png"
          alt="logo"
          className="max-h-[480px] max-w-[480px] max-sm:max-h-[280px] max-sm:max-w-[320px] w-auto h-auto  rounded-full"
        />
      </div>
      <div className="flex flex-row gap-4 justify-end max-sm:flex-col">
        <Button
          className="text-black text-lg  bg-white max-sm:justify-center border border-black dark:border-none flex flex-row gap-2 items-center hover:bg-white hover:text-black py-2.5 px-10 rounded-sm"
          onClick={() => changeOnboardingStep("updates")}
        >
          <ChevronLeftIcon className="h-5 w-5" />
          Back
        </Button>
        <Button
          className="text-white text-lg bg-black border-black max-sm:justify-center flex flex-row gap-2 items-center hover:bg-black hover:text-white py-2.5 px-10 rounded-sm"
          onClick={() => setIsOnboarding(false)}
        >
          Close
        </Button>
      </div>
    </div>
  );
};

export const OnboardingDialog: FC = () => {
  const {
    isOnboardingOpen: isOpen,
    setIsOnboarding,
    onboardingStep,
  } = useOnboarding();

  const closeModal = () => setIsOnboarding(false);

  const handleRender = () => {
    switch (onboardingStep) {
      case "welcome":
        return <WelcomeStep />;
      case "first":
        return <FirstStep />;
      case "grants":
        return <GrantStep />;
      case "updates":
        return <UpdatesStep />;
      case "structure":
        return <StructureStep />;
      default:
        return <WelcomeStep />;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl h-max transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                <button
                  className="p-2 text-black absolute top-4 right-4"
                  onClick={() => closeModal()}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
                {handleRender()}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
