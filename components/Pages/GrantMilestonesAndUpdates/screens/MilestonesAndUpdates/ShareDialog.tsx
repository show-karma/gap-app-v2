import { FC, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import JSConfetti from "js-confetti";
import { Button } from "@/components/Utilities/Button";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useProjectStore } from "@/store";

interface ShareDialogProps {
  isOpen: boolean;
  closeDialog: () => void;
  milestoneName: string;
  milestoneRefUID: string;
}

export const ShareDialog: FC<ShareDialogProps> = ({
  isOpen,
  closeDialog,
  milestoneName,
  milestoneRefUID,
}) => {
  useEffect(() => {
    if (isOpen) {
      const jsConfetti = new JSConfetti();

      jsConfetti.addConfetti({
        confettiRadius: 3,
        confettiNumber: 500,
      });
    }
  }, [isOpen]);
  const project = useProjectStore((state) => state.project);
  const grant = project?.grants.find(
    (item) => item.uid.toLowerCase() === milestoneRefUID.toLowerCase()
  );

  // 🚀 Just hit a major milestone of my grant from <Grant Name>!
  // Check out my progress on @karmahq_ GAP and see how we’re advancing: [Link to Grant Milestone Page].
  // Your thoughts and feedback are invaluable—let me know what you think!

  const encoded = `🚀 Just hit a major milestone of my grant from ${
    grant?.details?.data?.title
  }!\nCheck out my progress on @karmahq_ GAP and and see how we’re advancing: https://gap.karmahq.xyz/project/${
    (project?.details?.data?.slug || project?.uid) as string
  }/grants?grantId=${
    grant?.uid
  }&tab=milestones-and-updates\nYour thoughts and feedback are invaluable—let me know what you think!`;
  const twitterURL = `https://twitter.com/intent/post?text=`;
  const shareURI = twitterURL + encodeURIComponent(encoded);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={closeDialog}>
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
                  className="p-2 text-black dark:text-white absolute top-4 right-4"
                  onClick={() => closeDialog()}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="flex flex-col gap-3 justify-center items-center pt-6 pb-12 px-[80px] bg-[#F5F8FF] rounded dark:bg-zinc-700 mt-8">
                  <h2 className="text-[40px] font-bold font-body">🎉</h2>
                  <div className="flex flex-col gap-0 justify-center items-center">
                    <h1 className="text-[#101828] dark:text-zinc-100 font-bold text-xl">
                      Congratulations on completing {milestoneName}!
                    </h1>
                    <p className="text-[#101828] dark:text-zinc-100 font-normal text-base">
                      {`We're thrilled to celebrate this achievement with you.
                      Your dedication and hard work have paid off, and we
                      couldn't be prouder of your progress. Keep up the
                      fantastic work!`}
                    </p>
                    <ExternalLink href={shareURI}>
                      <Button className="px-5 py-3 text-white bg-[#155EEF] dark:bg-[#155EEF] text-sm font-semibold mt-5">
                        Share Your Success on X
                      </Button>
                    </ExternalLink>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
